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
      });
    }

    return successResult({
      storeName: settings.storeName,
      tagline: settings.tagline,
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      logoUrl: settings.logoUrl,
      whatsappNumber: settings.whatsappNumber,
      invoiceFooter: settings.invoiceFooter,
      receiptFooter: settings.receiptFooter,
    });
  } catch (err: any) {
    console.error("[getBrandProfileAction]", err);
    return errorResult(err.message ?? "Gagal memuat profil brand.");
  }
}

export async function updateBrandProfileAction(
  brandSlug: string,
  data: BrandProfileData,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    if (!data.storeName || data.storeName.trim().length === 0) {
      return errorResult("Nama brand tidak boleh kosong.");
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return errorResult("Format email tidak valid.");
    }

    const adminDb = createServiceRoleSupabaseClient();

    const existing = await getBrandSettings(adminDb as any, session.brandId);

    if (existing) {
      const { error } = await (adminDb as any)
        .from("brand_settings")
        .update({
          store_name: data.storeName,
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
          store_name: data.storeName,
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

    await (adminDb as any).from("audit_logs").insert({
      brand_id: session.brandId,
      actor_id: session.profileId,
      action: "BRAND_PROFILE_UPDATED",
      target_type: "BRAND",
      target_label: session.brandName,
      description: "Profil brand diperbarui.",
      details: { section: "brand_profile" },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[updateBrandProfileAction]", err);
    return errorResult(err.message ?? "Gagal menyimpan profil brand.");
  }
}
