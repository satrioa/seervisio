// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
/**
 * POS repository.
 * Queries for pos_sales, pos_sale_items, inventory_item_units, trade_ins.
 */

import { createClient } from "@/lib/utils/supabase/client";
import type { PosProductResult } from "@/domain/pos/types";

/* ─── Row Types ─── */

export interface PosSaleRow {
  id: string;
  brand_id: number;
  branch_id: string;
  customer_id?: string;
  sale_number: string;
  sale_status: string;
  payment_method_id: string;
  payment_account_id: string;
  gross_amount: number;
  discount_amount: number;
  mdr_amount: number;
  net_amount: number;
  notes?: string;
  sold_at: string;
  created_by?: string;
  created_at: string;
}

export interface PosSaleItemRow {
  id: string;
  pos_sale_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount_amount: number;
  line_total: number;
  inventory_movement_id?: string;
  metadata?: Record<string, unknown>;
}

export interface InventoryItemUnitRow {
  id: string;
  brand_id: number;
  branch_id: string;
  inventory_item_id: string;
  imei?: string;
  serial_number?: string;
  device_brand?: string;
  device_model?: string;
  storage?: string;
  color?: string;
  condition_grade?: string;
  battery_health?: string;
  purchase_price?: number;
  selling_price?: number;
  source: string;
  status: string;
  note?: string;
  created_at: string;
}

export interface TradeInRow {
  id: string;
  brand_id: number;
  branch_id: string;
  pos_sale_id: string;
  customer_id?: string;
  device_brand: string;
  device_model: string;
  storage?: string;
  color?: string;
  imei?: string;
  serial_number?: string;
  condition_grade?: string;
  battery_health?: string;
  appraisal_value: number;
  status: string;
  note?: string;
  created_at: string;
}

export interface ProductSearchRow {
  id: string;
  name: string;
  sku?: string;
  item_type: string;
  category_name?: string;
  selling_price: number;
  cost_price: number;
  current_stock: number;
  available_stock: number;
  unit_name?: string;
  is_active: boolean;
}

/* ─── Queries ─── */

/** Search POS products by name/sku/category/type with stock info. */
export async function searchPosProducts(
  supabase: ReturnType<typeof createClient>,
  params: {
    brandId: number;
    branchId: string;
    query?: string;
    itemType?: string;
    categoryId?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<{ data: PosProductResult[]; total: number }> {
  const { brandId, branchId, query, itemType, categoryId, page = 1, pageSize = 50 } = params;

  // Build the base query
  let dbQuery = supabase
    .from("inventory_items")
    .select(`
      id,
      name,
      sku,
      item_type,
      selling_price,
      cost_price,
      unit_name,
      is_active,
      inventory_categories!inner(name),
      branch_inventory_stocks!inner(
        current_stock,
        available_stock
      )
    `, { count: "exact" })
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .eq("branch_inventory_stocks.branch_id", branchId);

  // Filter by type
  if (itemType) {
    dbQuery = dbQuery.eq("item_type", itemType);
  }

  // Filter by category
  if (categoryId) {
    dbQuery = dbQuery.eq("category_id", categoryId);
  }

  // Text search
  if (query) {
    dbQuery = dbQuery.or(
      `name.ilike.%${query}%,sku.ilike.%${query}%`,
    );
  }

  // Only show items with stock > 0 or that are non-tracked
  // For DEVICE_UNIT, we need to check inventory_item_units separately
  dbQuery = dbQuery.or("track_stock.eq.false,and(track_stock.eq.true,branch_inventory_stocks.available_stock.gt.0)");

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  dbQuery = dbQuery.range(from, to).order("name");

  const { data, error, count } = await dbQuery;

  if (error) {
    console.error("[PosRepository] searchPosProducts error:", error);
    return { data: [], total: 0 };
  }

  // Map to PosProductResult
  const results: PosProductResult[] = (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    itemType: item.item_type as PosProductResult["itemType"],
    categoryName: item.inventory_categories?.name,
    sellingPrice: Number(item.selling_price) || 0,
    costPrice: Number(item.cost_price) || 0,
    availableStock: Number(item.branch_inventory_stocks?.[0]?.available_stock) || 0,
    availableUnitsCount: 0, // populated separately for DEVICE_UNIT
    unit: item.unit_name,
    isActive: item.is_active,
  }));

  return { data: results, total: count ?? results.length };
}

/** Count available DEVICE_UNIT units for a specific item. */
export async function countAvailableUnits(
  supabase: ReturnType<typeof createClient>,
  inventoryItemId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("inventory_item_units")
    .select("id", { count: "exact", head: true })
    .eq("inventory_item_id", inventoryItemId)
    .eq("status", "AVAILABLE");

  if (error) return 0;
  return count ?? 0;
}

/** Get available DEVICE_UNIT units for a specific item. */
export async function getAvailableDeviceUnits(
  supabase: ReturnType<typeof createClient>,
  inventoryItemId: string,
): Promise<InventoryItemUnitRow[]> {
  const { data, error } = await supabase
    .from("inventory_item_units")
    .select("*")
    .eq("inventory_item_id", inventoryItemId)
    .eq("status", "AVAILABLE")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[PosRepository] getAvailableDeviceUnits error:", error);
    return [];
  }

  return (data as InventoryItemUnitRow[]) || [];
}

/** Call the record_pos_sale RPC. */
export async function callRecordPosSale(
  supabase: ReturnType<typeof createClient>,
  params: {
    brandId: number;
    branchId: string;
    paymentMethodId: string;
    paymentAccountId: string;
    items: Array<{
      inventory_item_id: string;
      quantity: number;
      unit_price: number;
      discount_amount?: number;
      line_total: number;
    }>;
    customerId?: string;
    discountAmount?: number;
    notes?: string;
    createdBy?: string;
  },
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { data, error } = await (supabase as any).rpc("record_pos_sale", {
    p_brand_id: params.brandId,
    p_branch_id: params.branchId,
    p_payment_method_id: params.paymentMethodId,
    p_items: JSON.stringify(
      params.items.map((item) => ({
        inventory_item_id: item.inventory_item_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount_amount: Number(item.discount_amount || 0),
        line_total: Number(item.line_total),
      })),
    ),
    p_customer_id: params.customerId || null,
    p_discount_amount: Number(params.discountAmount || 0),
    p_sold_at: new Date().toISOString(),
    p_notes: params.notes || null,
    p_metadata: {},
    p_created_by: params.createdBy || null,
    p_idempotency_key: null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/** Insert a trade-in record. */
export async function createTradeIn(
  supabase: ReturnType<typeof createClient>,
  params: {
    brandId: number;
    branchId: string;
    posSaleId: string;
    customerId?: string;
    deviceBrand: string;
    deviceModel: string;
    storage?: string;
    color?: string;
    imei?: string;
    serialNumber?: string;
    conditionGrade?: string;
    batteryHealth?: string;
    appraisalValue: number;
    inventoryItemId?: string;
    inventoryItemUnitId?: string;
    note?: string;
    createdBy?: string;
  },
): Promise<{ success: boolean; data?: TradeInRow; error?: string }> {
  const { data, error } = await supabase
    .from("trade_ins")
    .insert({
      brand_id: params.brandId,
      branch_id: params.branchId,
      pos_sale_id: params.posSaleId,
      customer_id: params.customerId || null,
      device_brand: params.deviceBrand,
      device_model: params.deviceModel,
      storage: params.storage || null,
      color: params.color || null,
      imei: params.imei || null,
      serial_number: params.serialNumber || null,
      condition_grade: params.conditionGrade || null,
      battery_health: params.batteryHealth || null,
      appraisal_value: params.appraisalValue,
      inventory_item_id: params.inventoryItemId || null,
      inventory_item_unit_id: params.inventoryItemUnitId || null,
      status: "ACCEPTED",
      note: params.note || null,
      appraised_by: params.createdBy || null,
      created_by: params.createdBy || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as TradeInRow };
}

/** List POS sales for a branch. */
export async function getPosSalesByBranch(
  supabase: ReturnType<typeof createClient>,
  brandId: number,
  branchId: string,
  options?: { limit?: number; offset?: number },
) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const { data, error, count } = await supabase
    .from("pos_sales")
    .select(`
      *,
      customers!left(name, phone),
      profiles!left(name)
    `, { count: "exact" })
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[PosRepository] getPosSalesByBranch error:", error);
    return { data: [], total: 0 };
  }

  return { data: data as any[], total: count ?? 0 };
}

/** Get a single POS sale with items. */
export async function getPosSaleById(
  supabase: ReturnType<typeof createClient>,
  id: string,
) {
  const { data: sale, error: saleError } = await supabase
    .from("pos_sales")
    .select(`
      *,
      customers!left(name, phone),
      profiles!left(name)
    `)
    .eq("id", id)
    .single();

  if (saleError || !sale) return null;

  const { data: items } = await supabase
    .from("pos_sale_items")
    .select(`
      *,
      inventory_items!left(name, sku, item_type)
    `)
    .eq("pos_sale_id", id);

  return { ...sale, items: items || [] };
}
