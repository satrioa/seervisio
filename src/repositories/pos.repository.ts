// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
/**
 * POS repository.
 * Queries for pos_sales, pos_sale_items, inventory_item_units, trade_ins.
 */

import type {
  PosCheckoutItemPayload,
  PosProductResult,
  PosSaleResult,
  PosTradeInPayload,
} from "@/domain/pos/types";

type SupabaseClientLike = any;

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
  trade_in_amount?: number;
  paid_amount?: number;
  change_amount?: number;
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
  inventory_item_unit_id?: string | null;
  item_type?: string | null;
  name_snapshot?: string | null;
  sku_snapshot?: string | null;
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
  track_stock: boolean;
  current_stock: number;
  available_stock: number;
  unit_name?: string;
  is_active: boolean;
}

/* ─── Queries ─── */

/** Search POS products by name/sku/category/type with stock info. */
export async function searchPosProducts(
  supabase: SupabaseClientLike,
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
      track_stock,
      unit_name,
      is_active,
      inventory_categories(name),
      branch_inventory_stocks(
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

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  dbQuery = dbQuery.range(from, to).order("name");

  const { data, error, count } = await dbQuery;

  if (error) {
    console.error("[PosRepository] searchPosProducts error:", {
      error,
      params: { brandId, branchId, query, itemType, categoryId, page, pageSize },
    });
    throw new Error(error.message || "Gagal mencari produk POS.");
  }

  // Map to PosProductResult
  const results: PosProductResult[] = (data || [])
    .map((item: any) => {
      const availableStock = Number(item.branch_inventory_stocks?.[0]?.available_stock) || 0;

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        itemType: item.item_type as PosProductResult["itemType"],
        categoryName: item.inventory_categories?.name,
        sellingPrice: Number(item.selling_price) || 0,
        costPrice: Number(item.cost_price) || 0,
        availableStock,
        availableUnitsCount: 0, // populated separately for DEVICE_UNIT
        unit: item.unit_name,
        isActive: item.is_active,
        trackStock: Boolean(item.track_stock),
      };
    })
    .filter((item: PosProductResult & { trackStock: boolean }) => {
      if (item.itemType === "DEVICE_UNIT") return true;
      return !item.trackStock || item.availableStock > 0;
    })
    .map(({ trackStock, ...item }) => item);

  return { data: results, total: count ?? results.length };
}

/** Count available DEVICE_UNIT units for a specific item. */
export async function countAvailableUnits(
  supabase: SupabaseClientLike,
  inventoryItemId: string,
  branchId?: string,
): Promise<number> {
  let query = supabase
    .from("inventory_item_units")
    .select("id", { count: "exact", head: true })
    .eq("inventory_item_id", inventoryItemId)
    .eq("status", "AVAILABLE");
  if (branchId) {
    query = query.eq("branch_id", branchId);
  }
  const { count, error } = await query;
  if (!error && (count ?? 0) > 0) return count ?? 0;

  // Fallback: check inventory_serialized_units (newer, from migration 023)
  let query2 = supabase
    .from("inventory_serialized_units")
    .select("id", { count: "exact", head: true })
    .eq("inventory_item_id", inventoryItemId)
    .eq("status", "READY_STOCK");
  if (branchId) {
    query2 = query2.eq("branch_id", branchId);
  }
  const { count: serializedCount, error: serializedError } = await query2;
  if (serializedError) return 0;
  return serializedCount ?? 0;
}

/** Get available DEVICE_UNIT units for a specific item. */
export async function getAvailableDeviceUnits(
  supabase: SupabaseClientLike,
  inventoryItemId: string,
  branchId?: string,
): Promise<InventoryItemUnitRow[]> {
  let query = supabase
    .from("inventory_item_units")
    .select("*")
    .eq("inventory_item_id", inventoryItemId)
    .eq("status", "AVAILABLE");
  if (branchId) {
    query = query.eq("branch_id", branchId);
  }
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) {
    console.error("[PosRepository] getAvailableDeviceUnits error:", error);
    return [];
  }
  return (data as InventoryItemUnitRow[]) || [];
}

function normalizePosSaleResult(data: any): PosSaleResult {
  return {
    posSaleId: data?.pos_sale_id || data?.id || "",
    saleNumber: data?.sale_number || "",
    grossAmount: Number(data?.gross_amount || 0),
    discountAmount: Number(data?.discount_amount || 0),
    tradeInAmount: Number(data?.trade_in_amount || 0),
    amountDue: Number(data?.amount_due || 0),
    paidAmount: Number(data?.paid_amount || 0),
    changeAmount: Number(data?.change_amount || 0),
    mdrAmount: Number(data?.mdr_amount || 0),
    netAmount: Number(data?.net_amount || 0),
    paymentAccountId: data?.payment_account_id || undefined,
    paymentAccountMovementId: data?.payment_account_movement_id || undefined,
    tradeInId: data?.trade_in_id || undefined,
    tradeInItemId: data?.trade_in_item_id || undefined,
    tradeInUnitId: data?.trade_in_unit_id || undefined,
    status: data?.status || "COMPLETED",
  };
}

/** Call the atomic full POS checkout RPC. */
export async function callRecordPosSaleV2(
  supabase: SupabaseClientLike,
  params: {
    brandId: number;
    branchId: string;
    paymentMethodId: string;
    items: PosCheckoutItemPayload[];
    paymentAmount: number;
    customerId?: string;
    discountAmount?: number;
    tradeIn?: PosTradeInPayload | null;
    soldAt?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    createdBy?: string;
    idempotencyKey?: string;
  },
): Promise<{ success: boolean; data?: PosSaleResult; raw?: any; error?: string }> {
  const { data, error } = await (supabase as any).rpc("record_pos_sale_v2", {
    p_brand_id: params.brandId,
    p_branch_id: params.branchId,
    p_payment_method_id: params.paymentMethodId,
    p_items: params.items,
    p_payment_amount: Number(params.paymentAmount || 0),
    p_customer_id: params.customerId || null,
    p_discount_amount: Number(params.discountAmount || 0),
    p_trade_in: params.tradeIn || null,
    p_sold_at: params.soldAt || new Date().toISOString(),
    p_notes: params.notes || null,
    p_metadata: params.metadata || {},
    p_created_by: params.createdBy || null,
    p_idempotency_key: params.idempotencyKey || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: normalizePosSaleResult(data), raw: data };
}

/** List POS sales for a branch. */
export async function getPosSalesByBranch(
  supabase: SupabaseClientLike,
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
  supabase: SupabaseClientLike,
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
