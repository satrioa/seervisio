"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, type ActionResult } from "./action-helper";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getBrandSettings } from "@/repositories/brand-settings.repository";

export type BrandProfileData = {
  storeName: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  whatsappNumber: string | null;
  invoiceFooter: string | null;
  receiptFooter: string | null;
  slug: string;
};

export async function getBrandProfileAction(
  brandSlug: string,
): Promise<ActionResult<BrandProfileData>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const settings = await getBrandSettings(adminDb as any, session.brandId);

    if (!settings) {
      return successResult({
        storeName: session.brandName,
        tagline: null,
        phone: null,
        email: null,
        address: null,
        logoUrl: null,
        whatsappNumber: null,
        invoiceFooter: null,
        receiptFooter: null,
        slug: session.brandSlug,
      });
    }

    return successResult({
      storeName: session.brandName,
      tagline: settings.tagline,
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      logoUrl: settings.logoUrl,
      whatsappNumber: settings.whatsappNumber,
      invoiceFooter: settings.invoiceFooter,
      receiptFooter: settings.receiptFooter,
      slug: session.brandSlug,
    });
  } catch (err: any) {
    console.error("[getBrandProfileAction]", err);
    return errorResult(err.message ?? "Gagal memuat profil brand.");
  }
}

export async function updateBrandProfileAction(
  brandSlug: string,
  data: BrandProfileData,
): Promise<ActionResult<{ newSlug?: string }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    if (!data.storeName || data.storeName.trim().length === 0) {
      return errorResult("Nama brand tidak boleh kosong.");
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return errorResult("Format email tidak valid.");
    }

    if (data.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) {
      return errorResult("Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (contoh: toko-saya).");
    }

    const adminDb = createServiceRoleSupabaseClient();

    /* Handle slug change */
    let slugChanged = false;
    if (data.slug && data.slug !== session.brandSlug) {
      const { data: existing } = await (adminDb as any)
        .from("brands")
        .select("id")
        .eq("slug", data.slug)
        .neq("id", session.brandId)
        .maybeSingle();

      if (existing) {
        return errorResult("Slug sudah digunakan brand lain.");
      }

      const { error: slugError } = await (adminDb as any)
        .from("brands")
        .update({ slug: data.slug })
        .eq("id", session.brandId);

      if (slugError) throw new Error(`Gagal memperbarui slug: ${slugError.message}`);
      slugChanged = true;
    }

    const existing = await getBrandSettings(adminDb as any, session.brandId);

    if (existing) {
      const { error } = await (adminDb as any)
        .from("brand_settings")
        .update({
          tagline: data.tagline ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          logo_url: data.logoUrl ?? null,
          whatsapp_number: data.whatsappNumber ?? null,
          invoice_footer: data.invoiceFooter ?? null,
          receipt_footer: data.receiptFooter ?? null,
        })
        .eq("id", existing.id);

      if (error) throw new Error(`Gagal menyimpan profil brand: ${error.message}`);
    } else {
      const { error } = await (adminDb as any)
        .from("brand_settings")
        .insert({
          brand_id: session.brandId,
          tagline: data.tagline ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          logo_url: data.logoUrl ?? null,
          whatsapp_number: data.whatsappNumber ?? null,
          invoice_footer: data.invoiceFooter ?? null,
          receipt_footer: data.receiptFooter ?? null,
        });

      if (error) throw new Error(`Gagal membuat profil brand: ${error.message}`);
    }

    /* Sync brand display name to brands table */
    const { error: nameSyncError } = await (adminDb as any)
      .from("brands")
      .update({ name: data.storeName.trim() })
      .eq("id", session.brandId);

    if (nameSyncError) {
      console.warn("[updateBrandProfileAction] failed to sync brands.name:", nameSyncError.message);
    }

    await (adminDb as any).from("audit_logs").insert({
      brand_id: session.brandId,
      actor_id: session.profileId,
      action: "BRAND_PROFILE_UPDATED",
      target_type: "BRAND",
      target_label: session.brandName,
      description: "Profil brand diperbarui.",
      details: { section: "brand_profile" },
    });

    return successResult({ newSlug: slugChanged ? data.slug : undefined });
  } catch (err: any) {
    console.error("[updateBrandProfileAction]", err);
    return errorResult(err.message ?? "Gagal menyimpan profil brand.");
  }
}

export async function uploadBrandLogoFileAction(
  brandSlug: string,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const file = formData.get("file") as File | null;
    if (!file) return { error: "File tidak ditemukan." };

    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      return { error: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP." };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { error: "File terlalu besar. Maksimal 5MB." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext =
      file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const filePath = `${session.brandId}/logo-${Date.now()}.${ext}`;

    const adminDb = createServiceRoleSupabaseClient();
    const { error: uploadError } = await (adminDb as any).storage
      .from("brands")
      .upload(filePath, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return { error: "Gagal mengunggah logo." };

    const { data: publicUrlData } = (adminDb as any).storage
      .from("brands")
      .getPublicUrl(filePath);

    return { url: publicUrlData?.publicUrl ?? "" };
  } catch (err: any) {
    return { error: err.message || "Gagal mengunggah logo." };
  }
}
