"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser, type UserSession } from "@/lib/auth/get-current-user";
import { getBrandBySlug } from "@/repositories/brand.repository";
import { getProfileByAuthUserId } from "@/repositories/profile.repository";
import { ROLES } from "@/lib/permissions/roles";
import { logPlatformAction } from "@/server/repositories/platform.repository";
import { insertBrandNotification } from "@/server/repositories/notification.repository";
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
    invoice_email: string;
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

    const uniqueCode = generateUniqueCode();
    const totalAmount = pkg.price + uniqueCode;

    const adminSupabase = createServiceRoleSupabaseClient();
    const { data: invoiceData, error: invoiceError } = await (adminSupabase as any)
      .rpc("generate_license_invoice_number")
      .single();
    if (invoiceError) throw new Error("Gagal membuat nomor invoice.");

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
      invoice_email: input.invoice_email,
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

/* ── Public: Get bank info ── */

export async function getBankTransferInfoAction(): Promise<ActionResult<BankTransferInfo>> {
  return successResult(BANK_INFO);
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

    return successResult(updated);
  } catch (err: any) {
    console.error("[rejectLicenseOrderAction]", err);
    return errorResult(err.message || "Gagal menolak pembayaran.");
  }
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
  currency: string;
  couponCode: string | null;
  invoiceNumber: string | null;
  proofUrl: string | null;
  bankInfo: BankTransferInfo;
  estimatedVerificationHours: number;
}

// Create a license_payment from a (bound) checkout session.
export async function createLicensePaymentAction(input: {
  token: string;
  picName: string;
  picPhone: string;
  companyAddress: string;
  npwp?: string;
  invoiceEmail: string;
}): Promise<ActionResult<LicensePaymentView>> {
  try {
    const auth = await requireAuth();
    const adminDb = createServiceRoleSupabaseClient();

    const session = await getCheckoutSessionRaw(input.token);
    if (!session) return errorResult("Sesi checkout tidak valid atau kedaluwarsa.");
    if (session.profile_id && session.profile_id !== auth.profileId) {
      return errorResult("Sesi checkout bukan milik Anda.");
    }

    // One active (non-terminal) payment per profile at a time.
    const { data: existing } = await (adminDb as any)
      .from("license_payments")
      .select("id, status")
      .eq("profile_id", auth.profileId)
      .in("status", ["pending_payment", "waiting_verification"])
      .maybeSingle();
    if (existing) {
      return errorResult("Anda sudah memiliki pesanan lisensi yang sedang diproses.");
    }

    const { data: invoiceData, error: invErr } = await (adminDb as any)
      .rpc("generate_license_invoice_number")
      .single();
    if (invErr) throw new Error("Gagal membuat nomor invoice.");

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

    return successResult(mapLicensePaymentView(inserted as any));
  } catch (err: any) {
    console.error("[createLicensePaymentAction]", err);
    return errorResult(err.message || "Gagal membuat pesanan lisensi.");
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
    const filePath = `license-proofs/${paymentId}/proof-${Date.now()}.${ext}`;

    const { error: uploadError } = await (adminDb as any).storage
      .from("license-proofs")
      .upload(filePath, buffer, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error("Gagal mengunggah bukti pembayaran.");

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

    // Mark payment paid.
    await (adminDb as any)
      .from("license_payments")
      .update({
        status: "paid",
        verified_by: (await platformProfileId(auth)) ?? null,
        verified_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    // Issue the license (brand_id NULL until the Welcome Wizard back-fills it).
    const { data: license, error: licErr } = await (adminDb as any)
      .from("licenses")
      .insert({
        profile_id: p.profile_id,
        brand_id: null,
        package_id: p.package_id,
        order_id: null,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        is_trial: false,
      })
      .select("id")
      .single();
    if (licErr) throw new Error("Gagal menerbitkan lisensi.");

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
      .select("*, packages:package_id(name, slug)")
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

function mapLicensePaymentView(row: any): LicensePaymentView {
  return {
    id: row.id,
    status: row.status,
    packageName: row.packages?.name ?? row.package_name ?? "Paket",
    packageSlug: row.packages?.slug ?? row.package_slug ?? "",
    price: Number(row.price),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    billingCycle: row.billing_cycle,
    currency: row.currency,
    couponCode: row.coupon_code ?? null,
    invoiceNumber: row.invoice_number ?? null,
    proofUrl: row.proof_url ?? null,
    bankInfo: BANK_INFO,
    estimatedVerificationHours: 24,
  };
}
