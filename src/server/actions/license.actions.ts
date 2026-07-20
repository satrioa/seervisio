"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser, type UserSession } from "@/lib/auth/get-current-user";
import { getBrandBySlug } from "@/repositories/brand.repository";
import { getProfileByAuthUserId } from "@/repositories/profile.repository";
import { ROLES } from "@/lib/permissions/roles";
import { logPlatformAction } from "@/server/repositories/platform.repository";
import { insertBrandNotification } from "@/server/repositories/notification.repository";
import { Mailer } from "@/server/mail/mailer";
import { generateInvoice } from "@/server/mail/invoice";
import { getBillingLabel } from "@/lib/billing/billing-helpers";
import { successResult, errorResult, type ActionResult } from "./action-helper";
import {
  getActivePackages,
  getPackageById,
  createLicenseOrder as repoCreateOrder,
  getLicenseOrdersForBrand,
  getAllLicenseOrders,
  getAllLicenses,
  getLicenseOrderById,
  updateLicenseOrderStatus,
  createLicense,
  getActiveLicenseForBrand,
  getLicensesForBrand,
  updateLicenseFields,
  getPendingOrderForBrand,
  getDefaultTrialPackage,
  updateLicenseOrderFields,
} from "@/server/repositories/license.repository";
import type { LicenseOrder, License, LicensePackage, BankTransferInfo } from "@/types/license";
import { calculateLicenseExpiry } from "@/lib/license/license-duration";

/* ── Helpers ── */

async function requireAuth(): Promise<UserSession> {
  const authResult = await getCurrentUser();
  if (!authResult.user) throw new Error("Unauthorized");
  return authResult.user;
}

async function requirePlatformOwner(): Promise<UserSession> {
  const user = await requireAuth();
  const isPlatformOwner = user.memberships.some(
    (m: any) => m.role === ROLES.PLATFORM_OWNER,
  );
  if (!isPlatformOwner) throw new Error("Akses ditolak. Hanya Platform Owner.");
  return user;
}

function generateUniqueCode(): number {
  return Math.floor(100 + Math.random() * 900);
}

function getExpiresAt(pkg: LicensePackage): string | null {
  return calculateLicenseExpiry(pkg, new Date());
}

const BANK_INFO: BankTransferInfo = {
  bank_name: "Bank Mandiri",
  account_number: "123-00-1234567-8",
  account_holder: "PT Seervisio Teknologi Indonesia",
};

/* ── Public: Get active packages ── */

export async function getPackagesListPublicAction(): Promise<ActionResult<LicensePackage[]>> {
  try {
    const packages = await getActivePackages();
    return successResult(packages);
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat paket.");
  }
}

/* ── Public: Get license status for brand (by slug) ── */

export async function getLicenseStatusAction(
  brandSlug: string,
): Promise<ActionResult<{ license: License | null; hasActiveLicense: boolean; daysRemaining: number | null }>> {
  try {
    const supabase = await createServerSupabase();
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) return errorResult("Brand tidak ditemukan.");

    const license = await getActiveLicenseForBrand(brand.id);
    if (!license) {
      return successResult({ license: null, hasActiveLicense: false, daysRemaining: null });
    }

    let daysRemaining: number | null = null;
    if (license.expires_at) {
      const now = new Date();
      const expiry = new Date(license.expires_at);
      daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return successResult({
      license,
      hasActiveLicense: license.status === "active" || license.status === "trial",
      daysRemaining,
    });
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat status lisensi.");
  }
}

/* ── Public: Create license order ── */

export async function createLicenseOrderAction(
  brandSlug: string,
  input: {
    package_id: string;
    pic_name: string;
    pic_phone: string;
    company_address: string;
    npwp?: string;
    invoice_email?: string;
    notes?: string;
  },
): Promise<ActionResult<LicenseOrder>> {
  try {
    const auth = await requireAuth();
    const supabase = await createServerSupabase();
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) return errorResult("Brand tidak ditemukan.");

    const profile = await getProfileByAuthUserId(supabase as any, auth.authUserId);
    if (!profile) return errorResult("Profil tidak ditemukan.");

    const membership = auth.memberships.find(
      (m: any) => m.brandId === brand.id || m.brand_id === brand.id,
    );
    if (!membership && !auth.memberships.some((m: any) => m.role === ROLES.PLATFORM_OWNER)) {
      return errorResult("Anda tidak memiliki akses ke brand ini.");
    }

    const pkg = await getPackageById(input.package_id);
    if (!pkg) return errorResult("Paket tidak ditemukan.");
    if (!pkg.is_active) return errorResult("Paket tidak tersedia.");

    // Spec §5: block a new checkout while a pending order exists.
    await assertNoPendingOrder(brand.id);

    const uniqueCode = generateUniqueCode();
    const totalAmount = pkg.price + uniqueCode;

    const adminSupabase = createServiceRoleSupabaseClient();
    const { data: invoiceData, error: invoiceError } = await (adminSupabase as any)
      .rpc("generate_license_invoice_number")
      .single();
    if (invoiceError) throw new Error("Gagal membuat nomor invoice.");

    // Use auth user's email as fallback when invoice_email is not provided
    const invoiceEmail = input.invoice_email || auth.email || "";

    const order = await repoCreateOrder(brand.id, {
      package_id: input.package_id,
      price: pkg.price,
      unique_code: uniqueCode,
      total_amount: totalAmount,
      invoice_number: invoiceData,
      pic_name: input.pic_name,
      pic_phone: input.pic_phone,
      company_address: input.company_address,
      npwp: input.npwp,
      invoice_email: invoiceEmail,
      notes: input.notes,
      brand_info: { name: brand.name, slug: brand.slug },
    });

    // Non-critical: audit log + notification
    logPlatformAction({
      brandId: brand.id,
      actorId: auth.authUserId,
      actorName: profile.name ?? "",
      actorRole: membership?.role ?? "USER",
      action: "license_order_created",
      targetType: "license_order",
      targetLabel: order.invoice_number,
      description: `Pesanan lisensi ${order.invoice_number} untuk paket ${pkg.name} dibuat.`,
      details: { order_id: order.id, package: pkg.name, amount: totalAmount },
    });
    insertBrandNotification(brand.id, "Pesanan Lisensi Dibuat", `Pesanan ${order.invoice_number} untuk paket ${pkg.name} telah dibuat. Silakan lakukan pembayaran.`, "activity", "info", { order_id: order.id });

    return successResult(order);
  } catch (err: any) {
    console.error("[createLicenseOrderAction]", err);
    return errorResult(err.message || "Gagal membuat pesanan lisensi.");
  }
}

/* ── Public: Get brand orders ── */

export async function getLicenseOrdersAction(
  brandSlug: string,
): Promise<ActionResult<LicenseOrder[]>> {
  try {
    await requireAuth();
    const supabase = await createServerSupabase();
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) return errorResult("Brand tidak ditemukan.");

    const orders = await getLicenseOrdersForBrand(brand.id);
    return successResult(orders);
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat pesanan.");
  }
}

/* ── Public: Upload payment proof ── */

export async function uploadLicenseProofAction(
  orderId: string,
  formData: FormData,
): Promise<ActionResult<LicenseOrder>> {
  try {
    const auth = await requireAuth();
    const file = formData.get("proof") as File | null;
    if (!file) return errorResult("Bukti pembayaran tidak ditemukan.");

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) return errorResult("Ukuran file maksimal 10MB.");

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return errorResult("Tipe file harus JPG, PNG, atau PDF.");
    }

    const order = await getLicenseOrderById(orderId);
    if (!order) return errorResult("Pesanan tidak ditemukan.");
    if (order.status !== "pending_payment") {
      return errorResult("Pesanan tidak dalam status menunggu pembayaran.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `license-proofs/${orderId}/proof-${Date.now()}.${ext}`;

    const adminSupabase = createServiceRoleSupabaseClient();
    const { error: uploadError } = await (adminSupabase as any).storage
      .from("license-proofs")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw new Error("Gagal mengunggah bukti pembayaran.");

    const { data: publicUrl } = (adminSupabase as any).storage
      .from("license-proofs")
      .getPublicUrl(filePath);

    const updated = await updateLicenseOrderStatus(orderId, "waiting_verification", {
      proof_url: publicUrl.publicUrl,
    });

    return successResult(updated);
  } catch (err: any) {
    console.error("[uploadLicenseProofAction]", err);
    return errorResult(err.message || "Gagal mengunggah bukti pembayaran.");
  }
}

/* ── Public: Get bank info from platform settings ── */

export async function getBankTransferInfoAction(): Promise<ActionResult<BankTransferInfo>> {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await (supabase as any)
      .from("platform_payment_methods")
      .select("name, account_name, account_number")
      .eq("type", "transfer")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return errorResult("Metode pembayaran tidak ditemukan.");
    }

    return successResult({
      bank_name: data.name,
      account_number: data.account_number || "",
      account_holder: data.account_name,
    });
  } catch (err: any) {
    console.error("[getBankTransferInfoAction]", err.message);
    return errorResult(err.message || "Gagal memuat info bank.");
  }
}

/* ── Public: Get all platform payment methods ── */

export async function getPlatformPaymentMethodsAction(): Promise<
  ActionResult<{ id: string; type: string; name: string; accountName: string; accountNumber: string | null; logoUrl: string | null }[]>
> {
  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await (supabase as any)
      .from("platform_payment_methods")
      .select("id, type, name, account_name, account_number")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return errorResult(error.message);
    }

    const methods = (data ?? []).map((m: any) => ({
      id: m.id,
      type: m.type,
      name: m.name,
      accountName: m.account_name,
      accountNumber: m.account_number,
      logoUrl: null,
    }));

    return successResult(methods);
  } catch (err: any) {
    console.error("[getPlatformPaymentMethodsAction]", err.message);
    return errorResult(err.message || "Gagal memuat metode pembayaran.");
  }
}

/* ── Admin: Get all orders ── */

export async function getAllLicenseOrdersAction(): Promise<ActionResult<LicenseOrder[]>> {
  try {
    await requirePlatformOwner();
    const orders = await getAllLicenseOrders();
    return successResult(orders);
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat semua pesanan.");
  }
}

/* ── Admin: Get all licenses ── */

export async function getAllLicensesAction(): Promise<ActionResult<License[]>> {
  try {
    await requirePlatformOwner();
    const licenses = await getAllLicenses();
    return successResult(licenses);
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat lisensi.");
  }
}

/* ── Admin: Verify / Approve order ── */

export async function verifyLicenseOrderAction(
  orderId: string,
): Promise<ActionResult<License>> {
  try {
    const auth = await requirePlatformOwner();

    let adminProfileId: string | null = null;

    const supabase = createServiceRoleSupabaseClient();
    const { data: p } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("auth_user_id", auth.authUserId)
      .maybeSingle();
    if (p) adminProfileId = p.id;

    if (!adminProfileId) return errorResult("Profil admin tidak ditemukan.");

    const order = await getLicenseOrderById(orderId);
    if (!order) return errorResult("Pesanan tidak ditemukan.");
    if (order.status !== "waiting_verification") {
      return errorResult("Pesanan tidak dalam status menunggu verifikasi.");
    }

    // Get package to determine expiry
    const pkg = await getPackageById(order.package_id);
    if (!pkg) return errorResult("Paket tidak ditemukan.");

    const expiresAt = getExpiresAt(pkg);

    // Mark order as paid
    await updateLicenseOrderStatus(orderId, "paid", {
      verified_by: adminProfileId || undefined,
    });

    // Create license with correct expiry based on package billing duration
    const license = await createLicense(
      order.brand_id,
      order.package_id,
      orderId,
      expiresAt,
    );

    // Non-critical: audit log + notification
    logPlatformAction({
      brandId: order.brand_id,
      actorId: auth.authUserId,
      actorName: auth.name ?? "",
      actorRole: "PLATFORM_OWNER",
      action: "license_order_verified",
      targetType: "license_order",
      targetLabel: order.invoice_number,
      description: `Pesanan lisensi ${order.invoice_number} untuk paket ${pkg.name} telah diverifikasi dan disetujui.`,
      details: { order_id: orderId, license_id: license.id, package: pkg.name },
    });
    insertBrandNotification(order.brand_id, "Lisensi Diaktifkan", `Pesanan ${order.invoice_number} telah diverifikasi. Lisensi ${pkg.name} aktif.`, "activity", "success", { order_id: orderId, license_id: license.id });

    // Non-critical: send approval email to brand owner.
    void (async () => {
      try {
        const { data: brand } = await (supabase as any)
          .from("brands")
          .select("name, owner_email, owner_name")
          .eq("id", order.brand_id)
          .maybeSingle();
        if (!brand?.owner_email) return;
        const expDate = expiresAt
          ? new Date(expiresAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : null;
        await Mailer.send({
          to: brand.owner_email,
          toName: brand.owner_name ?? brand.name,
          subject: "Lisensi Anda Telah Aktif",
          template: "payment-approved",
          data: {
            customerName: brand.owner_name ?? brand.name,
            packageName: pkg.name,
            licenseType: pkg.billing_duration_enabled === false ? "lifetime" : pkg.billing_duration_type,
            activationDate: new Date().toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            expirationDate: expDate,
            dashboardUrl: "https://app.seervisio.com/license",
          },
        });
      } catch (e) {
        console.error("[verifyLicenseOrderAction] email error:", e);
      }
    })();

    return successResult(license);
  } catch (err: any) {
    console.error("[verifyLicenseOrderAction]", err);
    return errorResult(err.message || "Gagal memverifikasi pembayaran.");
  }
}

/* ── Admin: Reject order ── */
export async function rejectLicenseOrderAction(
  orderId: string,
  reason: string,
): Promise<ActionResult<LicenseOrder>> {
  try {
    const auth = await requirePlatformOwner();

    let adminProfileId: string | null = null;
    const supabase = createServiceRoleSupabaseClient();
    const { data: p } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("auth_user_id", auth.authUserId)
      .maybeSingle();
    if (p) adminProfileId = p.id;

    if (!adminProfileId) return errorResult("Profil admin tidak ditemukan.");

    if (!reason || !reason.trim()) {
      return errorResult("Alasan penolakan harus diisi.");
    }

    const order = await getLicenseOrderById(orderId);
    if (!order) return errorResult("Pesanan tidak ditemukan.");
    if (!["pending_payment", "waiting_verification"].includes(order.status)) {
      return errorResult("Pesanan tidak dapat ditolak pada status ini.");
    }

    const updated = await updateLicenseOrderStatus(orderId, "rejected", {
      verified_by: adminProfileId || undefined,
      rejected_reason: reason,
    });

    // Non-critical: audit log + notification
    logPlatformAction({
      brandId: order.brand_id,
      actorId: auth.authUserId,
      actorName: auth.name ?? "",
      actorRole: "PLATFORM_OWNER",
      action: "license_order_rejected",
      targetType: "license_order",
      targetLabel: order.invoice_number,
      description: `Pesanan lisensi ${order.invoice_number} ditolak. Alasan: ${reason}`,
      details: { order_id: orderId, reason },
    });
    insertBrandNotification(order.brand_id, "Pesanan Lisensi Ditolak", `Pesanan ${order.invoice_number} ditolak. Alasan: ${reason}`, "activity", "error", { order_id: orderId });

    void (async () => {
      try {
        const { data: brand } = await (createServiceRoleSupabaseClient() as any)
          .from("brands")
          .select("name, owner_email, owner_name")
          .eq("id", order.brand_id)
          .maybeSingle();
        if (!brand?.owner_email) return;
        await Mailer.send({
          to: brand.owner_email,
          toName: brand.owner_name ?? brand.name,
          subject: "Pesanan Lisensi Ditolak",
          template: "license-rejected",
          data: {
            customerName: brand.owner_name ?? brand.name,
            packageName: order.package_name ?? "Lisensi",
            rejectionReason: reason,
            renewUrl: "https://app.seervisio.com/license",
          },
        });
      } catch (e) {
        console.error("[rejectLicenseOrderAction] email error:", e);
      }
    })();

    return successResult(updated);
  } catch (err: any) {
    console.error("[rejectLicenseOrderAction]", err);
    return errorResult(err.message || "Gagal menolak pembayaran.");
  }
}

/* ============================================================
 * Billing & Subscription Spec — Phase 3 actions
 *
 * Covers trial auto-assign, downgrade scheduling, renewal preference,
 * rejected-order replace/cancel, pending-order guard, and admin suspend.
 * ========================================================== */

/* ── Helper: block a new checkout while a pending/rejected order exists ── */

async function assertNoPendingOrder(brandId: number): Promise<void> {
  const pending = await getPendingOrderForBrand(brandId);
  if (!pending) return;
  if (pending.status === "waiting_verification") {
    throw new Error("Pembayaran Anda sedang diverifikasi. Tidak dapat membuat pesanan baru.");
  }
  if (pending.status === "rejected") {
    throw new Error("Pesanan Anda ditolak. Ganti bukti atau batalkan pesanan sebelum membeli paket lain.");
  }
  // pending_payment (proof not yet uploaded) — allow replacing it via the
  // normal create flow, so we don't block here. The create action supersedes it.
}

/* ── Action: assign the default trial package to a brand (spec §1.1) ── */
// Skips Checkout & Waiting Approval — license goes straight to `active`.
// Auto-assigned 1x per tenant (no re-grant if a non-cancelled license exists).

export async function assignTrialAction(
  brandId: number,
  profileId?: string | null,
): Promise<ActionResult<License>> {
  try {
    const adminDb = createServiceRoleSupabaseClient();

    const existing = await getActiveLicenseForBrand(brandId);
    if (existing && existing.status !== "cancelled") {
      return successResult(existing);
    }

    const pkg = await getDefaultTrialPackage();
    if (!pkg) return errorResult("Tidak ada paket trial yang aktif.");

    const expiresAt = getExpiresAt(pkg);

    const { data: license, error: licErr } = await (adminDb as any)
      .from("licenses")
      .insert({
        brand_id: brandId,
        profile_id: profileId ?? null,
        package_id: pkg.id,
        order_id: null,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        is_trial: true,
      })
      .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
      .single();
    if (licErr) throw new Error("Gagal mengassign lisensi trial.");

    insertBrandNotification(
      brandId,
      "Masa Trial Aktif",
      `Paket ${pkg.name} aktif sebagai trial. Berlaku hingga ${expiresAt ? new Date(expiresAt).toLocaleDateString("id-ID") : "-"}`,
      "activity",
      "info",
      { package_id: pkg.id },
    );

    const created = await getActiveLicenseForBrand(brandId);
    return successResult(created as License);
  } catch (err: any) {
    console.error("[assignTrialAction]", err);
    return errorResult(err.message || "Gagal mengassign trial.");
  }
}

/* ── Action: schedule a downgrade (spec §3.2) ── */
// Downgrade is NOT immediate: applies at current subscription expiry.

export async function scheduleDowngradeAction(
  brandSlug: string,
  targetPackageId: string,
): Promise<ActionResult<License>> {
  try {
    const auth = await requireAuth();
    const supabase = await createServerSupabase();
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) return errorResult("Brand tidak ditemukan.");

    const license = await getActiveLicenseForBrand(brand.id);
    if (!license) return errorResult("Tidak ada lisensi aktif.");
    if (license.package_type === "lifetime") {
      return errorResult("Paket lifetime tidak dapat didowngrade.");
    }
    if (license.package_type === "trial") {
      return errorResult("Trial tidak dapat didowngrade.");
    }

    const target = await getPackageById(targetPackageId);
    if (!target) return errorResult("Paket tujuan tidak ditemukan.");
    if (target.package_type === "lifetime") {
      return errorResult("Downgrade ke lifetime tidak diizinkan. Beli lifetime sebagai pembelian terpisah.");
    }

    const effectiveAt = license.expires_at ?? new Date().toISOString();
    const updated = await updateLicenseFields(license.id, {
      downgrade_to_package_id: targetPackageId,
      downgrade_effective_at: effectiveAt,
    });

    return successResult(updated);
  } catch (err: any) {
    console.error("[scheduleDowngradeAction]", err);
    return errorResult(err.message || "Gagal menjadwalkan downgrade.");
  }
}

/* ── Action: cancel a scheduled downgrade (spec §3.2) ── */

export async function cancelScheduledDowngradeAction(
  brandSlug: string,
): Promise<ActionResult<License>> {
  try {
    const auth = await requireAuth();
    const supabase = await createServerSupabase();
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) return errorResult("Brand tidak ditemukan.");

    const license = await getActiveLicenseForBrand(brand.id);
    if (!license) return errorResult("Tidak ada lisensi aktif.");
    if (!license.downgrade_to_package_id) {
      return errorResult("Tidak ada downgrade yang dijadwalkan.");
    }

    const updated = await updateLicenseFields(license.id, {
      downgrade_to_package_id: null,
      downgrade_effective_at: null,
    });

    return successResult(updated);
  } catch (err: any) {
    console.error("[cancelScheduledDowngradeAction]", err);
    return errorResult(err.message || "Gagal membatalkan downgrade.");
  }
}

/* ── Action: set renewal preference (spec §2.1) ── */

export async function setRenewalPreferenceAction(
  brandSlug: string,
  preference: "auto" | "manual",
): Promise<ActionResult<License>> {
  try {
    const auth = await requireAuth();
    const supabase = await createServerSupabase();
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) return errorResult("Brand tidak ditemukan.");

    const license = await getActiveLicenseForBrand(brand.id);
    if (!license) return errorResult("Tidak ada lisensi aktif.");
    if (license.package_type === "lifetime" || license.is_trial) {
      return errorResult("Renewal preference tidak berlaku untuk lifetime/trial.");
    }
    if (preference !== "auto" && preference !== "manual") {
      return errorResult("Renewal preference tidak valid.");
    }

    const updated = await updateLicenseFields(license.id, {
      renewal_preference: preference,
    });

    return successResult(updated);
  } catch (err: any) {
    console.error("[setRenewalPreferenceAction]", err);
    return errorResult(err.message || "Gagal menyimpan preferensi renewal.");
  }
}

/* ── Action: replace proof on a rejected order (spec §5) ── */
// Re-uses the SAME order id; does not create a new checkout.

export async function replaceProofAction(
  orderId: string,
  formData: FormData,
): Promise<ActionResult<LicenseOrder>> {
  try {
    const auth = await requireAuth();
    const file = formData.get("proof") as File | null;
    if (!file) return errorResult("Bukti pembayaran tidak ditemukan.");

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) return errorResult("Ukuran file maksimal 10MB.");

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return errorResult("Tipe file harus JPG, PNG, atau PDF.");
    }

    const adminDb = createServiceRoleSupabaseClient();
    const { data: order, error: ordErr } = await (adminDb as any)
      .from("license_orders")
      .select("id, brand_id, status")
      .eq("id", orderId)
      .maybeSingle();
    if (ordErr || !order) return errorResult("Pesanan tidak ditemukan.");
    if (order.status !== "rejected") {
      return errorResult("Hanya pesanan yang ditolak yang dapat mengganti bukti.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `license-proofs/${orderId}/proof-${Date.now()}.${ext}`;
    const { error: uploadError } = await (adminDb as any).storage
      .from("license-proofs")
      .upload(filePath, buffer, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error("Gagal mengunggah bukti pembayaran.");

    const { data: publicUrl } = (adminDb as any).storage
      .from("license-proofs")
      .getPublicUrl(filePath);

    // Re-open the order and reset the deadline (Q4 continues to apply).
    const updated = await updateLicenseOrderFields(orderId, {
      status: "pending_payment",
      proof_url: publicUrl.publicUrl,
      rejected_reason: null,
      payment_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return successResult(updated);
  } catch (err: any) {
    console.error("[replaceProofAction]", err);
    return errorResult(err.message || "Gagal mengganti bukti pembayaran.");
  }
}

/* ── Action: cancel an order (spec §5) ── */

export async function cancelOrderAction(
  orderId: string,
): Promise<ActionResult<LicenseOrder>> {
  try {
    const auth = await requireAuth();
    const adminDb = createServiceRoleSupabaseClient();
    const { data: order, error: ordErr } = await (adminDb as any)
      .from("license_orders")
      .select("id, brand_id, status")
      .eq("id", orderId)
      .maybeSingle();
    if (ordErr || !order) return errorResult("Pesanan tidak ditemukan.");
    if (!["pending_payment", "waiting_verification", "rejected"].includes(order.status)) {
      return errorResult("Pesanan tidak dapat dibatalkan pada status ini.");
    }

    const updated = await updateLicenseOrderFields(orderId, { status: "cancelled" });

    return successResult(updated);
  } catch (err: any) {
    console.error("[cancelOrderAction]", err);
    return errorResult(err.message || "Gagal membatalkan pesanan.");
  }
}

/* ── Action: replace proof on a rejected license_payment (spec §5) ── */
// Re-uses the SAME payment row; re-opens to pending_payment and resets the
// 24h deadline (Q4 continues to apply). Does not create a new checkout.

export async function replacePaymentProofAction(
  paymentId: string,
  formData: FormData,
): Promise<ActionResult<LicensePaymentView>> {
  try {
    const auth = await requireAuth();
    const file = formData.get("proof") as File | null;
    if (!file) return errorResult("Bukti pembayaran tidak ditemukan.");

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) return errorResult("Ukuran file maksimal 10MB.");

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return errorResult("Tipe file harus JPG, PNG, atau PDF.");
    }

    const adminDb = createServiceRoleSupabaseClient();
    const { data: payment, error: payErr } = await (adminDb as any)
      .from("license_payments")
      .select("id, profile_id, status")
      .eq("id", paymentId)
      .maybeSingle();
    if (payErr || !payment) return errorResult("Pesanan tidak ditemukan.");
    if (payment.profile_id !== auth.profileId && !isPlatformOwnerSession(auth)) {
      return errorResult("Akses ditolak.");
    }
    if (payment.status !== "rejected") {
      return errorResult("Hanya pesanan yang ditolak yang dapat mengganti bukti.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${paymentId}/proof-${Date.now()}.${ext}`;
    const { error: uploadError } = await (adminDb as any).storage
      .from("license-proofs")
      .upload(filePath, buffer, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error("Gagal mengunggah bukti pembayaran.");

    const { data: publicUrl } = (adminDb as any).storage
      .from("license-proofs")
      .getPublicUrl(filePath);

    const { data: updated, error: updErr } = await (adminDb as any)
      .from("license_payments")
      .update({
        status: "pending_payment",
        proof_url: publicUrl.publicUrl,
        rejected_reason: null,
        payment_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", paymentId)
      .select("*")
      .single();
    if (updErr) throw new Error("Gagal memperbarui pesanan.");

    return successResult(mapLicensePaymentView(updated as any));
  } catch (err: any) {
    console.error("[replacePaymentProofAction]", err);
    return errorResult(err.message || "Gagal mengganti bukti pembayaran.");
  }
}

/* ── Action: read pending-order + downgrade state for the UI guard (spec §5) ── */

export async function getBillingGuardsAction(
  brandSlug: string,
): Promise<
  ActionResult<{
    pendingOrder: LicenseOrder | null;
    downgradeScheduled: { toPackageId: string; toPackageName: string; effectiveAt: string } | null;
  }>
> {
  try {
    const auth = await requireAuth();
    const supabase = await createServerSupabase();
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) return errorResult("Brand tidak ditemukan.");

    const pendingOrder = await getPendingOrderForBrand(brand.id);
    const license = await getActiveLicenseForBrand(brand.id);

    let downgradeScheduled: { toPackageId: string; toPackageName: string; effectiveAt: string } | null = null;
    if (license?.downgrade_to_package_id) {
      const target = await getPackageById(license.downgrade_to_package_id);
      downgradeScheduled = {
        toPackageId: license.downgrade_to_package_id,
        toPackageName: target?.name ?? "Paket",
        effectiveAt: license.downgrade_effective_at ?? license.expires_at ?? new Date().toISOString(),
      };
    }

    return successResult({ pendingOrder, downgradeScheduled });
  } catch (err: any) {
    console.error("[getBillingGuardsAction]", err);
    return errorResult(err.message || "Gagal memuat status billing.");
  }
}

/* ── Admin: suspend / unsuspend a license (spec §6.4, Q3) ── */

export async function suspendLicenseAction(
  licenseId: string,
  reason: string,
): Promise<ActionResult<License>> {
  try {
    const auth = await requirePlatformOwner();
    if (!reason || !reason.trim()) {
      return errorResult("Alasan suspend harus diisi.");
    }
    const adminProfileId = await platformProfileId(auth);
    if (!adminProfileId) return errorResult("Profil admin tidak ditemukan.");

    const updated = await updateLicenseFields(licenseId, {
      status: "suspended",
      suspended_reason: reason,
      suspended_by: adminProfileId,
      suspended_at: new Date().toISOString(),
    });

    logPlatformAction({
      brandId: (updated.brand_id as number) ?? 0,
      actorId: auth.authUserId,
      actorName: auth.name ?? "",
      actorRole: "PLATFORM_OWNER",
      action: "license_suspended",
      targetType: "license",
      targetLabel: updated.id,
      description: `Lisensi ${updated.id} ditangguhkan. Alasan: ${reason}`,
      details: { license_id: updated.id, reason },
    });

    return successResult(updated);
  } catch (err: any) {
    console.error("[suspendLicenseAction]", err);
    return errorResult(err.message || "Gagal menangguhkan lisensi.");
  }
}

export async function unsuspendLicenseAction(
  licenseId: string,
): Promise<ActionResult<License>> {
  try {
    const auth = await requirePlatformOwner();
    const updated = await updateLicenseFields(licenseId, {
      status: "active",
      suspended_reason: null,
      suspended_by: null,
      suspended_at: null,
    });
    return successResult(updated);
  } catch (err: any) {
    console.error("[unsuspendLicenseAction]", err);
    return errorResult(err.message || "Gagal mencabut suspend.");
  }
}

/* ── Wrap license mapper that already folds joined package_type ── */

/* ── Cron: daily billing maintenance (spec §4.1, §5, §6.4) ── */
// Called only by the app cron route /api/cron/billing. Runs the pure-DB
// RPCs (timeout + downgrade apply) and the H-30 expiry reminder scan.
// The expiry reminder sends exactly once per license via expiry_notified_at.

export async function runBillingCronAction(): Promise<{
  expiredOrders: number;
  appliedDowngrades: number;
  expiredLicenses: number;
  expiryNotified: number;
}> {
  const adminDb = createServiceRoleSupabaseClient();

  const { data: expiredOrders } = await (adminDb as any).rpc("expire_pending_orders");
  const { data: appliedDowngrades } = await (adminDb as any).rpc("apply_scheduled_downgrades");
  const { data: expiredLicenses } = await (adminDb as any).rpc("expire_active_licenses");

  // H-30 expiry reminder: active, non-trial, non-lifetime licenses expiring
  // between 29 and 31 days from now, not yet notified.
  const from = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

  const { data: due, error: dueErr } = await (adminDb as any)
    .from("licenses")
    .select("id, brand_id, package_id, expires_at, expiry_notified_at, packages:package_id(name, package_type, billing_duration_enabled)")
    .eq("status", "active")
    .is("expiry_notified_at", null)
    .gte("expires_at", from)
    .lte("expires_at", to);

  if (dueErr) {
    console.error("[runBillingCronAction] expiry scan error:", dueErr.message);
    return {
      expiredOrders: Number(expiredOrders ?? 0),
      appliedDowngrades: Number(appliedDowngrades ?? 0),
      expiredLicenses: Number(expiredLicenses ?? 0),
      expiryNotified: 0,
    };
  }

  let expiryNotified = 0;
  for (const lic of due ?? []) {
    const pkg = lic.packages as any;
    const isLifetime = pkg?.package_type === "lifetime" || pkg?.billing_duration_enabled === false;
    if (isLifetime || lic.is_trial) continue;

    const { data: brand } = await (adminDb as any)
      .from("brands")
      .select("name, owner_email, owner_name")
      .eq("id", lic.brand_id)
      .maybeSingle();
    if (!brand?.owner_email) {
      // Still mark notified so we don't retry forever without an address.
      await (adminDb as any)
        .from("licenses")
        .update({ expiry_notified_at: new Date().toISOString() })
        .eq("id", lic.id);
      continue;
    }

    const expDate = new Date(lic.expires_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    insertBrandNotification(
      lic.brand_id,
      "Lisensi Akan Berakhir",
      `Lisensi ${pkg?.name ?? "Anda"} akan berakhir pada ${expDate}. Segera perpanjang untuk menghindari gangguan.`,
      "billing",
      "warning",
      { license_id: lic.id, expires_at: lic.expires_at },
    );

    void (async () => {
      try {
        await Mailer.send({
          to: brand.owner_email,
          toName: brand.owner_name ?? brand.name,
          subject: "Lisensi Anda Akan Berakhir",
          template: "license-expiring",
          data: {
            customerName: brand.owner_name ?? brand.name,
            packageName: pkg?.name ?? "Lisensi",
            expirationDate: expDate,
            renewUrl: "https://app.seervisio.com/license",
          },
        });
      } catch (e) {
        console.error("[runBillingCronAction] email error:", e);
      }
    })();

    await (adminDb as any)
      .from("licenses")
      .update({ expiry_notified_at: new Date().toISOString() })
      .eq("id", lic.id);

    expiryNotified += 1;
  }

  // License-expired notification: licenses just flipped to 'expired' by the
  // RPC above (they carry a fresh expiry_notified_at stamp). Notify once.
  const { data: justExpired, error: expErr } = await (adminDb as any)
    .from("licenses")
    .select("id, brand_id, package_id, expires_at, packages:package_id(name)")
    .eq("status", "expired")
    .gte("expiry_notified_at", new Date(Date.now() - 60 * 1000).toISOString());

  if (!expErr) {
    for (const lic of justExpired ?? []) {
      const pkg = lic.packages as any;
      const expDate = lic.expires_at
        ? new Date(lic.expires_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "";

      const { data: brand } = await (adminDb as any)
        .from("brands")
        .select("name, owner_email, owner_name")
        .eq("id", lic.brand_id)
        .maybeSingle();

      if (brand?.owner_email) {
        insertBrandNotification(
          lic.brand_id,
          "Lisensi Berakhir",
          `Lisensi ${pkg?.name ?? "Anda"} telah berakhir. Perpanjang untuk mengaktifkan kembali.`,
          "billing",
          "error",
          { license_id: lic.id, expires_at: lic.expires_at },
        );
        void (async () => {
          try {
            await Mailer.send({
              to: brand.owner_email,
              toName: brand.owner_name ?? brand.name,
              subject: "Lisensi Anda Telah Berakhir",
              template: "license-expired",
              data: {
                customerName: brand.owner_name ?? brand.name,
                packageName: pkg?.name ?? "Lisensi",
                expirationDate: expDate,
                renewalUrl: "https://app.seervisio.com/license",
              },
            });
          } catch (e) {
            console.error("[runBillingCronAction] expired email error:", e);
          }
        })();
      }
    }
  }

  return {
    expiredOrders: Number(expiredOrders ?? 0),
    appliedDowngrades: Number(appliedDowngrades ?? 0),
    expiredLicenses: Number(expiredLicenses ?? 0),
    expiryNotified,
  };
}

/* ============================================================
 * NEW (profile-scoped) license_payments flow.
 *
 * The brand is created LATER (Welcome Wizard, Phase 4), so the
 * purchase + payment + license are anchored to the PROFILE until then.
 * The Welcome Wizard back-fills brand_id on both rows.
 * ========================================================== */

export interface LicensePaymentView {
  id: string;
  status: string;
  packageName: string;
  packageSlug: string;
  price: number;
  discountAmount: number;
  totalAmount: number;
  billingCycle: string;
  billingDurationEnabled: boolean;
  currency: string;
  couponCode: string | null;
  invoiceNumber: string | null;
  proofUrl: string | null;
  bankInfo: BankTransferInfo;
  estimatedVerificationHours: number;
  paymentDeadline: string | null;
  createdAt: string;
  rejectedReason?: string | null;
}

// Create a license_payment from a (bound) checkout session.
export async function createLicensePaymentAction(input: {
  token: string;
  picName: string;
  picPhone: string;
  companyAddress: string;
  npwp?: string;
  invoiceEmail: string;
  paymentMethodId?: string;
  renewalPreference?: "auto" | "manual";
}): Promise<ActionResult<LicensePaymentView>> {
  try {
    const auth = await requireAuth();
    const adminDb = createServiceRoleSupabaseClient();

    const session = await getCheckoutSessionRaw(input.token);
    if (!session) return errorResult("Sesi checkout tidak valid atau kedaluwarsa.");
    if (session.profile_id && session.profile_id !== auth.profileId) {
      return errorResult("Sesi checkout bukan milik Anda.");
    }

    // Check for existing non-terminal payments that block a new order.
    const { data: existing } = await (adminDb as any)
      .from("license_payments")
      .select("id, status")
      .eq("profile_id", auth.profileId)
      .in("status", ["pending_payment", "waiting_verification", "paid"])
      .maybeSingle();

    if (existing) {
      if (existing.status === "waiting_verification") {
        return errorResult("Pembayaran Anda sedang diverifikasi. Paket tidak dapat diubah sampai proses verifikasi selesai.");
      }
      if (existing.status === "paid") {
        return errorResult("Anda sudah memiliki lisensi aktif. Lakukan upgrade melalui menu Lisensi.");
      }
      // pending_payment → auto-replace so user can change packages freely.
      const { error: replaceErr } = await (adminDb as any)
        .from("license_payments")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (replaceErr) throw new Error("Gagal mengganti pesanan sebelumnya.");
    }

    const { data: invoiceData, error: invErr } = await (adminDb as any)
      .rpc("generate_license_invoice_number")
      .single();
    if (invErr) throw new Error("Gagal membuat nomor invoice.");

    // Resolve selected payment method bank info
    let bankName: string | null = null;
    let accountNumber: string | null = null;
    let accountHolder: string | null = null;
    if (input.paymentMethodId) {
      const { data: pm } = await (adminDb as any)
        .from("platform_payment_methods")
        .select("name, account_name, account_number")
        .eq("id", input.paymentMethodId)
        .maybeSingle();
      if (pm) {
        bankName = pm.name;
        accountNumber = pm.account_number;
        accountHolder = pm.account_name;
      }
    }

    const { data: inserted, error: insErr } = await (adminDb as any)
      .from("license_payments")
      .insert({
        checkout_session_id: session.id,
        profile_id: auth.profileId,
        brand_id: null,
        package_id: session.package_id,
        price: session.price,
        billing_cycle: session.billing_cycle,
        currency: session.currency,
        coupon_code: session.coupon_code,
        discount_amount: session.discount_amount,
        total_amount: session.total_amount,
        status: "pending_payment",
        pic_name: input.picName,
        pic_phone: input.picPhone,
        company_address: input.companyAddress,
        npwp: input.npwp || null,
        invoice_email: input.invoiceEmail,
        invoice_number: invoiceData,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        renewal_preference: input.renewalPreference ?? null,
      })
      .select("*")
      .single();

    if (insErr || !inserted) {
      console.error("[createLicensePaymentAction]", insErr);
      return errorResult("Gagal membuat pesanan lisensi.");
    }

    // Mark the checkout session as converted.
    await (adminDb as any)
      .from("checkout_sessions")
      .update({ status: "converted" })
      .eq("token", input.token);

    // Backfill license_orders (deprecated but still read by admin dashboard).
    await (adminDb as any)
      .from("license_orders")
      .insert({
        invoice_number: invoiceData,
        package_id: session.package_id,
        price: session.price,
        total_amount: session.total_amount,
        status: "pending_payment",
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        pic_name: input.picName,
        pic_phone: input.picPhone,
        company_address: input.companyAddress,
        npwp: input.npwp || null,
        invoice_email: input.invoiceEmail,
        notes: null,
        brand_info: null,
      })
      .select("id")
      .maybeSingle();

    return successResult(mapLicensePaymentView(inserted as any));
  } catch (err: any) {
    console.error("[createLicensePaymentAction]", err);
    return errorResult(err.message || "Gagal membuat pesanan lisensi.");
  }
}

// Replace an existing pending-payment order so the user can change packages.
// Only allowed when status is still pending_payment (proof not yet uploaded).
export async function replacePaymentAction(
  paymentId: string,
): Promise<ActionResult<{ redirect: string }>> {
  try {
    const auth = await requireAuth();
    const adminDb = createServiceRoleSupabaseClient();

    const { data: payment, error: fetchErr } = await (adminDb as any)
      .from("license_payments")
      .select("id, profile_id, status")
      .eq("id", paymentId)
      .maybeSingle();

    if (fetchErr || !payment) {
      return errorResult("Pesanan tidak ditemukan.");
    }
    if (payment.profile_id !== auth.profileId) {
      return errorResult("Akses ditolak.");
    }
    if (payment.status !== "pending_payment") {
      return errorResult("Pesanan tidak dapat diubah karena sudah diupload atau diverifikasi.");
    }

    const { error: cancelErr } = await (adminDb as any)
      .from("license_payments")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", paymentId);

    if (cancelErr) throw new Error("Gagal membatalkan pesanan.");

    return successResult({ redirect: "/license" });
  } catch (err: any) {
    console.error("[replacePaymentAction]", err.message);
    return errorResult(err.message || "Gagal mengganti paket.");
  }
}

// Upload transfer proof -> status WAITING_VERIFICATION.
export async function uploadLicensePaymentProofAction(
  paymentId: string,
  formData: FormData,
): Promise<ActionResult<LicensePaymentView>> {
  try {
    const auth = await requireAuth();
    const file = formData.get("proof") as File | null;
    if (!file) return errorResult("Bukti pembayaran tidak ditemukan.");

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) return errorResult("Ukuran file maksimal 10MB.");

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return errorResult("Tipe file harus JPG, PNG, atau PDF.");
    }

    const adminDb = createServiceRoleSupabaseClient();
    const { data: payment, error: payErr } = await (adminDb as any)
      .from("license_payments")
      .select("id, profile_id, status")
      .eq("id", paymentId)
      .maybeSingle();
    if (payErr || !payment) return errorResult("Pesanan tidak ditemukan.");
    if (payment.profile_id !== auth.profileId && !isPlatformOwnerSession(auth)) {
      return errorResult("Akses ditolak.");
    }
    if (payment.status !== "pending_payment") {
      return errorResult("Pesanan tidak dalam status menunggu pembayaran.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${paymentId}/proof-${Date.now()}.${ext}`;

    const { error: uploadError } = await (adminDb as any).storage
      .from("license-proofs")
      .upload(filePath, buffer, { contentType: file.type, upsert: false });
    if (uploadError) {
      if (uploadError.message?.includes("Bucket not found")) {
        return errorResult("Bucket license-proofs belum dibuat. Jalankan migration 112.");
      }
      throw new Error("Gagal mengunggah bukti pembayaran.");
    }

    const { data: publicUrl } = (adminDb as any).storage
      .from("license-proofs")
      .getPublicUrl(filePath);

    const { data: insertedProof, error: proofErr } = await (adminDb as any)
      .from("payment_proofs")
      .insert({
        license_payment_id: paymentId,
        profile_id: auth.profileId,
        proof_url: publicUrl.publicUrl,
        file_name: file.name,
        status: "submitted",
      })
      .select("id")
      .single();
    if (proofErr) throw new Error("Gagal menyimpan bukti.");

    const { data: updated, error: updErr } = await (adminDb as any)
      .from("license_payments")
      .update({ status: "waiting_verification" })
      .eq("id", paymentId)
      .select("*")
      .single();
    if (updErr) throw new Error("Gagal memperbarui status pesanan.");

    // Non-blocking: send payment pending email
    void (async () => {
      try {
        const { data: profile } = await (adminDb as any)
          .from("profiles")
          .select("name, email")
          .eq("id", auth.profileId)
          .maybeSingle();
        if (!profile?.email) return;
        const paymentsRow = updated as any;
        await Mailer.send({
          to: profile.email,
          toName: profile.name,
          subject: "Pembayaran Anda Sedang Diverifikasi",
          template: "payment-pending",
          data: {
            customerName: profile.name,
            orderNumber: paymentsRow.invoice_number ?? paymentsRow.id,
            packageName: paymentsRow.package_name ?? paymentsRow.package_slug ?? "Paket Lisensi",
            amount: Number(paymentsRow.total_amount),
            uploadTime: new Date().toLocaleString("id-ID"),
          },
        });
      } catch (e) {
        console.error("[uploadLicensePaymentProofAction] email error:", e);
      }
    })();

    return successResult(mapLicensePaymentView(updated as any));
  } catch (err: any) {
    console.error("[uploadLicensePaymentProofAction]", err);
    return errorResult(err.message || "Gagal mengunggah bukti pembayaran.");
  }
}

// Platform approves a payment -> issues the (profile-scoped) LICENSE.
export async function approveLicensePaymentAction(
  paymentId: string,
): Promise<ActionResult<{ licenseId: string }>> {
  try {
    const auth = await requirePlatformOwner();
    const adminDb = createServiceRoleSupabaseClient();

    const { data: p, error: payErr } = await (adminDb as any)
      .from("license_payments")
      .select("*, packages:package_id(id, name, slug, billing_duration_enabled, billing_duration_type, billing_duration_value)")
      .eq("id", paymentId)
      .maybeSingle();
    if (payErr || !p) return errorResult("Pesanan tidak ditemukan.");
    if (p.status !== "waiting_verification") {
      return errorResult("Pesanan tidak dalam status menunggu verifikasi.");
    }

    const pkg = (p.packages as any);
    const expiresAt = calculateLicenseExpiry(
      {
        billing_duration_enabled: pkg?.billing_duration_enabled ?? true,
        billing_duration_type: pkg?.billing_duration_type ?? "month",
        billing_duration_value: pkg?.billing_duration_value ?? 1,
      },
      new Date(),
    );

    // The checkout funnel is profile-scoped (the brand is created later in the
    // Welcome Wizard). If the brand already exists by approval time, link it now
    // so brand_id isn't left NULL until a back-fill. Falls back to the payment's
    // own brand_id when present.
    const brandId = p.brand_id ?? (await resolveBrandIdForProfile(p.profile_id));

    // Mark payment paid.
    await (adminDb as any)
      .from("license_payments")
      .update({
        status: "paid",
        brand_id: brandId,
        verified_by: (await platformProfileId(auth)) ?? null,
        verified_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    // Issue the license (brand_id back-filled by the Welcome Wizard if still NULL).
    const { data: license, error: licErr } = await (adminDb as any)
      .from("licenses")
      .insert({
        profile_id: p.profile_id,
        brand_id: brandId,
        package_id: p.package_id,
        order_id: null,
        license_payment_id: paymentId,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        is_trial: false,
        renewal_preference: p.renewal_preference ?? null,
      })
      .select("id")
      .single();
    if (licErr) throw new Error("Gagal menerbitkan lisensi.");

    // Grant the license owner MASTER_ADMIN membership for the brand.
    // The buyer who holds the license is always the brand owner, so they
    // must have full access once the license is active — even if the
    // Welcome Wizard membership step was skipped or failed.
    if (brandId) {
      try {
        const { data: existingMem } = await (adminDb as any)
          .from("user_brand_memberships")
          .select("id, is_active, deleted_at")
          .eq("profile_id", p.profile_id)
          .eq("brand_id", brandId)
          .maybeSingle();

        if (existingMem) {
          if (!existingMem.is_active || existingMem.deleted_at) {
            await (adminDb as any)
              .from("user_brand_memberships")
              .update({ is_active: true, deleted_at: null, role: "MASTER_ADMIN" })
              .eq("id", (existingMem as any).id);
          }
        } else {
          await (adminDb as any)
            .from("user_brand_memberships")
            .insert({
              profile_id: p.profile_id,
              brand_id: brandId,
              role: "MASTER_ADMIN",
              is_active: true,
            });
        }
      } catch (memErr) {
        console.error("[approveLicensePaymentAction] membership grant error:", memErr);
      }
    }

    // Non-blocking: send payment approved + invoice emails
    void (async () => {
      try {
        const { data: profile } = await (adminDb as any)
          .from("profiles")
          .select("name, email, business_name")
          .eq("id", p.profile_id)
          .maybeSingle();
        if (!profile?.email) return;

        const pkgName = (p.packages as any)?.name ?? "Paket Lisensi";
        const billingCycle = p.billing_cycle ?? "monthly";
        const licenseType = getBillingLabel(billingCycle);
        const now = new Date();
        const activationDate = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        const expirationDate = expiresAt
          ? new Date(expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
          : null;

        // Generate invoice PDF
        const invoice = await generateInvoice({
          customerName: profile.name ?? profile.email,
          customerEmail: profile.email,
          companyName: profile.business_name ?? profile.name ?? "Perusahaan",
          packageName: pkgName,
          amount: Number(p.total_amount ?? 0),
          billingCycle,
          paymentMethod: "Transfer Bank",
        });

        // Send payment approved email
        await Mailer.send({
          to: profile.email,
          toName: profile.name,
          subject: "Lisensi Anda Telah Aktif!",
          template: "payment-approved",
          data: {
            customerName: profile.name ?? profile.email,
            packageName: pkgName,
            licenseType,
            activationDate,
            expirationDate,
            dashboardUrl: "https://app.seervisio.com",
          },
        });

        // Send invoice email with PDF attachment
        if (invoice.pdfBuffer) {
          const base64Pdf = invoice.pdfBuffer.toString("base64");
          await Mailer.send({
            to: profile.email,
            toName: profile.name,
            subject: `Invoice ${invoice.invoiceNumber}`,
            template: "invoice-email",
            data: {
              customerName: profile.name ?? profile.email,
              invoiceNumber: invoice.invoiceNumber,
              packageName: pkgName,
              amount: Number(p.total_amount ?? 0),
              invoiceDate: activationDate,
              paymentMethod: "Transfer Bank",
            },
            attachments: [
              {
                name: `${invoice.invoiceNumber}.pdf`,
                content: base64Pdf,
              },
            ],
          });
        }
      } catch (e) {
        console.error("[approveLicensePaymentAction] email error:", e);
      }
    })();

    return successResult({ licenseId: (license as any).id });
  } catch (err: any) {
    console.error("[approveLicensePaymentAction]", err);
    return errorResult(err.message || "Gagal memverifikasi pembayaran.");
  }
}

// Platform rejects a payment.
export async function rejectLicensePaymentAction(
  paymentId: string,
  reason: string,
): Promise<ActionResult<void>> {
  try {
    await requirePlatformOwner();
    if (!reason || !reason.trim()) {
      return errorResult("Alasan penolakan harus diisi.");
    }
    const adminDb = createServiceRoleSupabaseClient();
    const { data: payment, error: loadErr } = await (adminDb as any)
      .from("license_payments")
      .select("id, brand_id, profile_id, package_name, packages:package_id(name)")
      .eq("id", paymentId)
      .maybeSingle();
    if (loadErr) throw new Error("Gagal memuat pesanan.");
    if (!payment) return errorResult("Pesanan tidak ditemukan.");

    const { error } = await (adminDb as any)
      .from("license_payments")
      .update({
        status: "rejected",
        rejected_reason: reason,
        verified_by: (await platformProfileId(await requirePlatformOwner())) ?? null,
      })
      .eq("id", paymentId)
      .in("status", ["pending_payment", "waiting_verification"]);
    if (error) throw new Error("Gagal menolak pesanan.");

    if (payment.brand_id) {
      insertBrandNotification(
        payment.brand_id,
        "Pesanan Lisensi Ditolak",
        `Pesanan lisensi ${payment.package_name ?? ""} ditolak. Alasan: ${reason}`,
        "activity",
        "error",
        { payment_id: paymentId },
      );
    }

    void (async () => {
      try {
        const email =
          payment.brand_id != null
            ? ((
                await (adminDb as any)
                  .from("brands")
                  .select("owner_email, owner_name, name")
                  .eq("id", payment.brand_id)
                  .maybeSingle()
              ).data?.owner_email ?? null)
            : ((
                await (adminDb as any)
                  .from("profiles")
                  .select("email, full_name")
                  .eq("id", payment.profile_id)
                  .maybeSingle()
              ).data?.email ?? null);
        const name =
          payment.brand_id != null
            ? ((
                await (adminDb as any)
                  .from("brands")
                  .select("owner_name, name")
                  .eq("id", payment.brand_id)
                  .maybeSingle()
              ).data?.owner_name ?? null)
            : ((
                await (adminDb as any)
                  .from("profiles")
                  .select("full_name")
                  .eq("id", payment.profile_id)
                  .maybeSingle()
              ).data?.full_name ?? null);
        if (!email) return;
        await Mailer.send({
          to: email,
          toName: name ?? "Pelanggan",
          subject: "Pesanan Lisensi Ditolak",
          template: "license-rejected",
          data: {
            customerName: name ?? "Pelanggan",
            packageName: payment.package_name ?? "Lisensi",
            rejectionReason: reason,
            renewUrl: "https://app.seervisio.com/license",
          },
        });
      } catch (e) {
        console.error("[rejectLicensePaymentAction] email error:", e);
      }
    })();

    return successResult(undefined);
  } catch (err: any) {
    return errorResult(err.message || "Gagal menolak pembayaran.");
  }
}

// Profile-scoped license center state for the logged-in customer.
export async function getLicenseCenterStatusAction(): Promise<
  ActionResult<{
    hasPayment: boolean;
    payment: LicensePaymentView | null;
    hasActiveLicense: boolean;
    licensePackage: string | null;
    daysRemaining: number | null;
  }>
> {
  try {
    const auth = await requireAuth();
    const adminDb = createServiceRoleSupabaseClient();

    const { data: payment, error } = await (adminDb as any)
      .from("license_payments")
      .select("*, packages:package_id(name, slug, billing_duration_enabled)")
      .eq("profile_id", auth.profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return errorResult("Gagal memuat pusat lisensi.");

    const { getActiveLicenseForProfile } = await import("@/server/repositories/license.repository");
    const license = await getActiveLicenseForProfile(auth.profileId);

    let daysRemaining: number | null = null;
    if (license?.expires_at) {
      daysRemaining = Math.ceil(
        (new Date(license.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
    }

    return successResult({
      hasPayment: Boolean(payment),
      payment: payment ? mapLicensePaymentView(payment as any) : null,
      hasActiveLicense: Boolean(license),
      licensePackage: license?.package_name ?? null,
      daysRemaining,
    });
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat pusat lisensi.");
  }
}

/* ── internals ── */

async function getCheckoutSessionRaw(token: string): Promise<any | null> {
  const adminDb = createServiceRoleSupabaseClient();
  const { data } = await (adminDb as any)
    .from("checkout_sessions")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return (data as any) ?? null;
}

async function platformProfileId(auth: UserSession): Promise<string | null> {
  const adminDb = createServiceRoleSupabaseClient();
  const { data: p } = await (adminDb as any)
    .from("profiles")
    .select("id")
    .eq("auth_user_id", auth.authUserId)
    .maybeSingle();
  return (p as any)?.id ?? null;
}

function isPlatformOwnerSession(auth: UserSession): boolean {
  return auth.memberships.some((m: any) => m.role === ROLES.PLATFORM_OWNER);
}

/**
 * Resolve the tenant brand a purchase belongs to from the buyer's
 * MASTER_ADMIN membership. Used at approval time so that when the Welcome
 * Wizard already created the brand, the license + payment are linked
 * immediately instead of waiting for a back-fill that may never re-run.
 * Prefers an active, non-deleted membership.
 */
async function resolveBrandIdForProfile(profileId: string | null): Promise<number | null> {
  if (!profileId) return null;
  const adminDb = createServiceRoleSupabaseClient();
  const { data } = await (adminDb as any)
    .from("user_brand_memberships")
    .select("brand_id, is_active, deleted_at")
    .eq("profile_id", profileId)
    .eq("role", "MASTER_ADMIN");
  const rows = (data ?? []) as { brand_id: number | null; is_active: boolean; deleted_at: string | null }[];
  if (rows.length === 0) return null;
  const active = rows.find((m) => m.is_active && !m.deleted_at);
  return (active ?? rows[0]).brand_id ?? null;
}

function mapLicensePaymentView(row: any): LicensePaymentView {
  const createdAt = row.created_at ?? new Date().toISOString();
  const deadline = new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000);

  return {
    id: row.id,
    status: row.status,
    packageName: row.packages?.name ?? row.package_name ?? "Paket",
    packageSlug: row.packages?.slug ?? row.package_slug ?? "",
    price: Number(row.price),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    billingCycle: row.billing_cycle,
    billingDurationEnabled: row.packages?.billing_duration_enabled ?? row.billing_cycle !== "lifetime",
    currency: row.currency,
    couponCode: row.coupon_code ?? null,
    invoiceNumber: row.invoice_number ?? null,
    proofUrl: row.proof_url ?? null,
    bankInfo: {
      bank_name: row.bank_name ?? BANK_INFO.bank_name,
      account_number: row.account_number ?? BANK_INFO.account_number,
      account_holder: row.account_holder ?? BANK_INFO.account_holder,
    },
    estimatedVerificationHours: 24,
    paymentDeadline: deadline.toISOString(),
    createdAt,
    rejectedReason: row.rejected_reason ?? null,
  };
}
