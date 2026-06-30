import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type DbBrandSettings = Database["public"]["Tables"]["brand_settings"]["Row"];
type DbBrandSettingsInsert = Database["public"]["Tables"]["brand_settings"]["Insert"];
type DbBrandSettingsUpdate = Database["public"]["Tables"]["brand_settings"]["Update"];

export interface BrandSettingsData {
  id: string;
  brandId: number;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  whatsappNumber: string | null;
  invoiceFooter: string | null;
  receiptFooter: string | null;
  businessHours: Record<string, any> | null;
  metadata: Record<string, any> | null;
  themePrimaryColor: string;
  themeAccentColor: string;
  themeMode: string;
  themeTokens: Record<string, any> | null;
  aiProvider: string | null;
  aiApiKeyEncrypted: string | null;
}

function mapRow(row: DbBrandSettings): BrandSettingsData {
  const r = row as any;
  return {
    id: r.id,
    brandId: r.brand_id,
    tagline: r.tagline,
    logoUrl: r.logo_url,
    faviconUrl: r.favicon_url,
    accentColor: r.accent_color,
    phone: r.phone,
    email: r.email,
    address: r.address,
    whatsappNumber: r.whatsapp_number,
    invoiceFooter: r.invoice_footer,
    receiptFooter: r.receipt_footer,
    businessHours: r.business_hours as Record<string, any> | null,
    metadata: r.metadata as Record<string, any> | null,
    themePrimaryColor: r.theme_primary_color ?? "#F59E0B",
    themeAccentColor: r.theme_accent_color ?? "#D4A017",
    themeMode: r.theme_mode ?? "light",
    themeTokens: (r.theme_tokens as Record<string, any> | null) ?? null,
    aiProvider: r.ai_provider ?? null,
    aiApiKeyEncrypted: r.ai_api_key_encrypted ?? null,
  };
}

export async function getBrandSettings(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
): Promise<BrandSettingsData | null> {
  const { data } = await supabase
    .from("brand_settings")
    .select("*")
    .eq("brand_id", brandId)
    .maybeSingle();

  if (!data) return null;
  return mapRow(data);
}

export async function upsertBrandSettings(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
  updates: {
    business_hours?: Record<string, any>;
    metadata?: Record<string, any>;
  },
): Promise<void> {
  const { data: existing } = await supabase
    .from("brand_settings")
    .select("id")
    .eq("brand_id", brandId)
    .maybeSingle();

  if (existing) {
    const payload: DbBrandSettingsUpdate = {};
    if (updates.business_hours !== undefined) payload.business_hours = updates.business_hours as any;
    if (updates.metadata !== undefined) payload.metadata = updates.metadata as any;

    const { error } = await supabase
      .from("brand_settings")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw new Error(`Gagal menyimpan pengaturan: ${error.message}`);
  } else {
    const payload: DbBrandSettingsInsert = {
      brand_id: brandId,
    } as any;
    if (updates.business_hours !== undefined) payload.business_hours = updates.business_hours as any;
    if (updates.metadata !== undefined) payload.metadata = updates.metadata as any;

    const { error } = await supabase
      .from("brand_settings")
      .insert(payload);

    if (error) throw new Error(`Gagal membuat pengaturan: ${error.message}`);
  }
}
