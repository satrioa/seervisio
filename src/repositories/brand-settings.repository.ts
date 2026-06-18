import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type DbBrandSettings = Database["public"]["Tables"]["brand_settings"]["Row"];
type DbBrandSettingsInsert = Database["public"]["Tables"]["brand_settings"]["Insert"];
type DbBrandSettingsUpdate = Database["public"]["Tables"]["brand_settings"]["Update"];

export interface BrandSettingsData {
  id: string;
  brandId: number;
  storeName: string;
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
}

function mapRow(row: DbBrandSettings): BrandSettingsData {
  return {
    id: row.id,
    brandId: row.brand_id,
    storeName: row.store_name,
    tagline: row.tagline,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    accentColor: row.accent_color,
    phone: row.phone,
    email: row.email,
    address: row.address,
    whatsappNumber: row.whatsapp_number,
    invoiceFooter: row.invoice_footer,
    receiptFooter: row.receipt_footer,
    businessHours: row.business_hours as Record<string, any> | null,
    metadata: row.metadata as Record<string, any> | null,
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
  storeName: string,
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
      store_name: storeName,
    };
    if (updates.business_hours !== undefined) payload.business_hours = updates.business_hours as any;
    if (updates.metadata !== undefined) payload.metadata = updates.metadata as any;

    const { error } = await supabase
      .from("brand_settings")
      .insert(payload);

    if (error) throw new Error(`Gagal membuat pengaturan: ${error.message}`);
  }
}
