import type {
  V4PosSalesSummaryRow,
  V4PosItemSalesRow,
  V4PosPaymentSummaryRow,
  V4InventoryStockSummaryRow,
  V4InventoryValuationRow,
  V4UnitSecondSummaryRow,
  V4InventoryMovementSummaryRow,
  V4SparepartUsageSummaryRow,
  V4StockPurchaseSummaryRow,
  V4BranchBusinessSummaryRow,
  V4ReportFilter,
  V4InventoryReportTotals,
} from "@/server/domain/reporting-v4.types";

type SupabaseClientLike = any;

function parsePgErr(error: any): string {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  return "Unknown database error";
}

function applyViewFilters<T extends Record<string, any>>(
  query: any,
  filters: V4ReportFilter,
  dateField: string | null = "created_at",
  statusColumn: string | null = "status",
) {
  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.dateFrom && dateField) query = query.gte(dateField, filters.dateFrom);
  if (filters.dateTo && dateField) query = query.lte(dateField, filters.dateTo);
  if (filters.productKind) query = query.eq("product_kind", filters.productKind);
  if (filters.status && statusColumn) query = query.eq(statusColumn, filters.status);
  return query;
}

function buildPagination(page: number = 1, pageSize: number = 25) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

/* ─── POS Sales Summary ─── */

export async function getV4PosSalesSummary(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4PosSalesSummaryRow[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 25, 50);
  const { from, to } = buildPagination(filters.page ?? 1, pageSize);

  let query = (supabase as any)
    .from("v4_pos_sales_summary")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("sales_date", { ascending: false });

  query = applyViewFilters(query, filters, "sales_date");

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4PosSalesSummaryRow[], total: count ?? 0 };
}

/* ─── POS Item Sales ─── */

export async function getV4PosItemSales(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4PosItemSalesRow[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 25, 50);
  const { from, to } = buildPagination(filters.page ?? 1, pageSize);

  let query = (supabase as any)
    .from("v4_pos_item_sales")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  query = applyViewFilters(query, filters, "sales_date");

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4PosItemSalesRow[], total: count ?? 0 };
}

/* ─── POS Payment Summary ─── */

export async function getV4PosPaymentSummary(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4PosPaymentSummaryRow[]; total: number }> {
  let query = (supabase as any)
    .from("v4_pos_payment_summary")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("sales_date", { ascending: false });

  query = applyViewFilters(query, filters, "sales_date");

  const { data, error, count } = await query;
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4PosPaymentSummaryRow[], total: count ?? 0 };
}

/* ─── Inventory Stock Summary ─── */

export async function getV4InventoryStockSummary(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4InventoryStockSummaryRow[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 25, 50);
  const { from, to } = buildPagination(filters.page ?? 1, pageSize);

  let query = (supabase as any)
    .from("v4_inventory_stock_summary")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("product_name", { ascending: true });

  query = applyViewFilters(query, filters, null, "stock_status");

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4InventoryStockSummaryRow[], total: count ?? 0 };
}

/* ─── Inventory Valuation ─── */

export async function getV4InventoryValuation(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4InventoryValuationRow[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 25, 50);
  const { from, to } = buildPagination(filters.page ?? 1, pageSize);

  let query = (supabase as any)
    .from("v4_inventory_valuation")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("cost_value", { ascending: false });

  query = applyViewFilters(query, filters, null, null);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4InventoryValuationRow[], total: count ?? 0 };
}

/* ─── Unit Second Summary ─── */

export async function getV4UnitSecondSummary(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4UnitSecondSummaryRow[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 25, 50);
  const { from, to } = buildPagination(filters.page ?? 1, pageSize);

  let query = (supabase as any)
    .from("v4_unit_second_summary")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("updated_at", { ascending: false });

  query = applyViewFilters(query, filters);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4UnitSecondSummaryRow[], total: count ?? 0 };
}

/* ─── Inventory Movement Summary ─── */

export async function getV4MovementSummary(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4InventoryMovementSummaryRow[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 25, 50);
  const { from, to } = buildPagination(filters.page ?? 1, pageSize);

  let query = (supabase as any)
    .from("v4_inventory_movement_summary")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  query = applyViewFilters(query, filters, "created_at", "movement_type");

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4InventoryMovementSummaryRow[], total: count ?? 0 };
}

/* ─── Sparepart Usage Summary ─── */

export async function getV4SparepartUsageSummary(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4SparepartUsageSummaryRow[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 25, 50);
  const { from, to } = buildPagination(filters.page ?? 1, pageSize);

  let query = (supabase as any)
    .from("v4_sparepart_usage_summary")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("usage_date", { ascending: false });

  query = applyViewFilters(query, filters, "usage_date");

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4SparepartUsageSummaryRow[], total: count ?? 0 };
}

/* ─── Stock Purchase Summary ─── */

export async function getV4StockPurchaseSummary(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4StockPurchaseSummaryRow[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 25, 50);
  const { from, to } = buildPagination(filters.page ?? 1, pageSize);

  let query = (supabase as any)
    .from("v4_stock_purchase_summary")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("purchase_date", { ascending: false });

  query = applyViewFilters(query, filters, "purchase_date");
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4StockPurchaseSummaryRow[], total: count ?? 0 };
}

/* ─── Branch Business Summary ─── */

export async function getV4BranchBusinessSummary(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<{ data: V4BranchBusinessSummaryRow[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 25, 50);
  const { from, to } = buildPagination(filters.page ?? 1, pageSize);

  let query = (supabase as any)
    .from("v4_branch_business_summary")
    .select("*", { count: "exact" })
    .eq("brand_id", brandId)
    .order("summary_date", { ascending: false });

  query = applyViewFilters(query, filters, "summary_date");

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  return { data: (data ?? []) as V4BranchBusinessSummaryRow[], total: count ?? 0 };
}

/* ─── Inventory Report Totals ─── */

async function aggregateColumn(
  supabase: SupabaseClientLike,
  table: string,
  brandId: number,
  column: string,
  scope: (q: any) => any,
): Promise<number> {
  // PostgREST aggregate functions are disabled on this project (PGRST123),
  // and `sum:column` is an alias, not an aggregate. Fetch the column rows and
  // sum in JS instead.
  const { data, error } = await scope(
    (supabase as any).from(table).select(column).eq("brand_id", brandId),
  );
  if (error) throw new Error(parsePgErr(error));
  return (data ?? []).reduce(
    (acc: number, row: any) => acc + (Number(row?.[column]) || 0),
    0,
  );
}

async function countRows(
  supabase: SupabaseClientLike,
  table: string,
  brandId: number,
  scope: (q: any) => any,
): Promise<number> {
  const { count, error } = await scope(
    (supabase as any).from(table).select("*", { count: "exact", head: true }).eq("brand_id", brandId),
  );
  if (error) throw new Error(parsePgErr(error));
  return count ?? 0;
}

export async function getV4InventoryReportTotals(
  supabase: SupabaseClientLike,
  brandId: number,
  filters: V4ReportFilter,
): Promise<V4InventoryReportTotals> {
  const scopeStock = (q: any) => {
    if (filters.branchId) q = q.eq("branch_id", filters.branchId);
    if (filters.productKind) q = q.eq("product_kind", filters.productKind);
    if (filters.status) q = q.eq("stock_status", filters.status);
    return q;
  };
  const scopeUnit = (q: any) => {
    if (filters.branchId) q = q.eq("branch_id", filters.branchId);
    return q;
  };

  const [totalCurrentStock, totalReservedStock, totalAvailableStock, totalCostValue, totalPotentialSalesValue, totalPotentialGrossProfit, variantCount, lowStockCount, outOfStockCount, unitSecondReadyCount, unitSecondSoldCount] = await Promise.all([
    aggregateColumn(supabase, "v4_inventory_stock_summary", brandId, "current_stock", scopeStock),
    aggregateColumn(supabase, "v4_inventory_stock_summary", brandId, "reserved_stock", scopeStock),
    aggregateColumn(supabase, "v4_inventory_stock_summary", brandId, "available_stock", scopeStock),
    aggregateColumn(supabase, "v4_inventory_valuation", brandId, "cost_value", scopeStock),
    aggregateColumn(supabase, "v4_inventory_valuation", brandId, "potential_sales_value", scopeStock),
    aggregateColumn(supabase, "v4_inventory_valuation", brandId, "potential_gross_profit", scopeStock),
    countRows(supabase, "v4_inventory_stock_summary", brandId, scopeStock),
    countRows(
      supabase,
      "v4_inventory_stock_summary",
      brandId,
      (q) => scopeStock(q).eq("stock_status", "LOW_STOCK"),
    ),
    countRows(
      supabase,
      "v4_inventory_stock_summary",
      brandId,
      (q) => scopeStock(q).eq("stock_status", "OUT_OF_STOCK"),
    ),
    countRows(
      supabase,
      "v4_unit_second_summary",
      brandId,
      (q) => scopeUnit(q).eq("status", "READY_STOCK"),
    ),
    countRows(
      supabase,
      "v4_unit_second_summary",
      brandId,
      (q) => scopeUnit(q).eq("status", "SOLD"),
    ),
  ]);

  return {
    variantCount,
    totalCurrentStock,
    totalReservedStock,
    totalAvailableStock,
    lowStockCount,
    outOfStockCount,
    totalCostValue,
    totalPotentialSalesValue,
    totalPotentialGrossProfit,
    unitSecondReadyCount,
    unitSecondSoldCount,
  };
}
