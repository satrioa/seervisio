"use server";

import { getSessionData, successResult, errorResult, type ActionResult } from "./action-helper";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface GlobalSearchResult {
  services: Array<{ id: string; serviceNumber: string; deviceModel: string | null; customerName: string | null; status: string }>;
  customers: Array<{ id: string; name: string; phone: string | null }>;
  products: Array<{ id: string; name: string; sku: string | null }>;
}

export async function globalSearchAction(
  brandSlug: string,
  query: string,
): Promise<ActionResult<GlobalSearchResult>> {
  try {
    const session = await getSessionData(brandSlug);
    const adminDb = createServiceRoleSupabaseClient();
    const q = `%${query.trim()}%`;

    const [servicesRes, customersRes, productsRes] = await Promise.all([
      (adminDb as any)
        .from("services")
        .select(`id, service_number, device_brand, device_model, current_status, customers!left(name)`)
        .eq("brand_id", session.brandId)
        .or(`service_number.ilike.${q},device_brand.ilike.${q},device_model.ilike.${q},device_imei.ilike.${q}`)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
      (adminDb as any)
        .from("customers")
        .select(`id, name, phone`)
        .eq("brand_id", session.brandId)
        .or(`name.ilike.${q},phone.ilike.${q}`)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .limit(5),
      (adminDb as any)
        .from("inventory_items")
        .select(`id, name, sku`)
        .eq("brand_id", session.brandId)
        .or(`name.ilike.${q},sku.ilike.${q}`)
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .limit(5),
    ]);

    const services = (servicesRes.data ?? []).map((s: any) => ({
      id: s.id,
      serviceNumber: s.service_number,
      deviceModel: s.device_brand && s.device_model ? `${s.device_brand} ${s.device_model}` : (s.device_brand || s.device_model || null),
      customerName: s.customers?.name ?? null,
      status: s.current_status,
    }));

    const customers = (customersRes.data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? null,
    }));

    const products = (productsRes.data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku ?? null,
    }));

    return successResult({ services, customers, products });
  } catch (err: any) {
    console.error("[globalSearchAction]", err);
    return errorResult(err.message ?? "Gagal mencari.");
  }
}
