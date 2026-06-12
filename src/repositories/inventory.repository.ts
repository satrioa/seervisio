import { createServerSupabase } from "@/lib/supabase/server";

export interface InventoryItemRow {
  id: string;
  brand_id: number;
  name: string;
  type: string;
  sku: string | null;
  unit: string | null;
  selling_price: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BranchStockRow {
  id: string;
  brand_id: number;
  branch_id: string;
  item_id: string;
  current_stock: number;
  metadata: Record<string, unknown>;
  item?: InventoryItemRow | null;
}

export async function getInventoryItemsByBrand(
  brandId: number,
  type?: string
): Promise<InventoryItemRow[]> {
  const supabase = await createServerSupabase();
  let query = (supabase as any)
    .from("inventory_items")
    .select("*")
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (type) {
    query = query.eq("type", type);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getBranchStocks(branchId: string): Promise<BranchStockRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("branch_inventory_stocks")
    .select(`
      *,
      item:inventory_items(*)
    `)
    .eq("branch_id", branchId)
    .gte("current_stock", 0);
  if (error) throw error;
  return data ?? [];
}

export async function getBranchStockForItem(
  branchId: string,
  itemId: string
): Promise<BranchStockRow | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("branch_inventory_stocks")
    .select(`
      *,
      item:inventory_items(*)
    `)
    .eq("branch_id", branchId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getServiceSparepartUsages(
  serviceId: string
): Promise<any[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("service_sparepart_usages")
    .select(`
      *,
      item:inventory_items(id, name, type)
    `)
    .eq("service_id", serviceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
