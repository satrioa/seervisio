"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  type ActionResult,
} from "./action-helper";
import { getBranchesByBrandId } from "@/repositories/branch.repository";
import { getBrandTarget } from "@/repositories/brand-target.repository";

/* ── Types ── */

export interface DashboardInput {
  branchId?: string | null;
  dateFrom: string;
  dateTo: string;
}

export interface DashboardGeneral {
  activityHeatmap?: { date: string; count: number; intensity: number }[];
  operationalHeatmap?: { hour: string; count: number }[];
  revenue: number;
  revenueTarget: number;
  totalActivity: number;
  netProfit: number;
  revenueTrend: RevenueTrendPoint[];
  branchRevenueTrend: BranchRevenueTrendPoint[];
  recentActivity: ActivityLogItem[];
  todayActivityCounts: TodayActivityCount[];
  needActions: NeedActionItem[];
  shiftStatuses: ShiftStatusItem[];
  serviceCompletedToday?: number;
  unclosedShiftsCount: number;
  unpickedUnitsCount: number;
  unpaidInvoicesCount: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
}

export interface RevenueTrendPoint {
  date: string;
  label: string;
  serviceRevenue: number;
  posRevenue: number;
  otherIncome: number;
  totalRevenue: number;
  cashOut?: number;
}

export interface BranchRevenueTrendPoint {
  date: string;
  branchId: string;
  branchName: string;
  totalRevenue: number;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  description: string | null;
  type: string;
  category: "service" | "payment" | "inventory" | "finance" | "account" | "system";
  user: string;
  text: string;
  tag: string;
  time: string;
  groupKey: string;
  details?: Record<string, any> | null;
  targetLabel?: string | null;
}

export interface TodayActivityCount {
  label: string;
  count: number;
}

export interface NeedActionItem {
  label: string;
  count: number;
  severity: "high" | "medium" | "low";
}

export interface ShiftStatusItem {
  branch: string;
  status: string;
}

export interface DashboardService {
  totalServiceRevenue: number;
  serviceInCount: number;
  serviceDoneCount: number;
  serviceUnpaidCount: number;
  serviceUncollectedCount: number;
  pipelineData: PipelineItem[];
  recentServices: RecentServiceItem[];
  needAttention: NeedAttentionItem[];
  techPerformances: TechPerformanceItem[];
}

export interface PipelineItem {
  label: string;
  count: number;
  variant: "muted" | "secondary" | "default" | "outline" | "destructive";
  desc: string;
}

export interface RecentServiceItem {
  id: string;
  serviceNumber: string;
  customer: string;
  device: string;
  status: string;
  tech: string;
  time: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}

export interface NeedAttentionItem {
  customer: string;
  device: string;
  reason: string;
  severity: "high" | "medium" | "low";
}

export interface TechPerformanceItem {
  name: string;
  selesai: number;
  proses: number;
  rating: number;
}

export interface DashboardFinance {
  revenueTrend?: RevenueTrendPoint[];
  expenseCategoryRadar?: { category: string; amount: number; percentage: number }[];
  paymentMethodRadar?: { method: string; grossAmount: number; transactionCount: number; mdrAmount: number; netAmount: number; percentage: number }[];
  totalRevenue: number;
  serviceRevenue: number;
  posRevenue: number;
  otherIncome: number;
  cashIn: number;
  cashOut: number;
  netCashflow: number;
  mdrAmount: number;
}

export interface DashboardInventory {
  lowStockCount: number;
  outOfStockCount: number;
  stockUsedCount: number;
  stockPurchaseTotal: number;
  lowStockItems: LowStockItem[];
}

export interface LowStockItem {
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  branch: string;
  status: "menipis" | "habis";
}

export interface DashboardData {
  general: DashboardGeneral;
  service: DashboardService;
  finance: DashboardFinance;
  inventory: DashboardInventory;
}

/* ── Main Action ── */

export async function getDashboardOverviewAction(
  brandSlug: string,
  input: DashboardInput,
): Promise<ActionResult<DashboardData>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "dashboard.view");

    const supabase = await createServerSupabase();
    const { branchId, dateFrom, dateTo } = input;
    const dateFromStr = dateFrom || "1970-01-01";
    const dateToEndOfDay = dateTo ? `${dateTo}T23:59:59.999Z` : "2099-12-31T23:59:59.999Z";
    const dateToStr = dateTo || "2099-12-31";

    const allBranches = await getBranchesByBrandId(supabase as any, session.brandId);
    const accessibleBranchIds =
      session.canAccessAllBranches
        ? allBranches.map((b: any) => b.id)
        : session.accessibleBranchIds;

    const branchFilter =
      branchId && branchId !== "ALL_BRANCHES" ? [branchId] : accessibleBranchIds;

    // OR-filter for audit_logs: selected branch(es) + brand-level (NULL) events.
    const auditBranchOr =
      branchFilter.length > 0
        ? `branch_id.in.(${branchFilter.join(",")}),branch_id.is.null`
        : `branch_id.is.null`;

    console.log("[dashboard] input", {
      brandId: session.brandId,
      branchId,
      dateFrom: dateFromStr,
      dateTo: dateToStr,
      role: session.role,
    });

    /* ── Parallel queries ── */
    const [
      movementsResult,
      servicePaymentsResult,
      posSalesResult,
      servicesResult,
      accountsResult,
      shiftsResult,
      auditResult,
      inventoryResult,
      paymentMethodsResult,
      branchStocksResult,
      servicesHeatmapResult,
      inventoryMovementsResult,
      activeServicesResult,
      completedServicesResult,
      customersResult,
      profilesResult,
      financeLedgerResult,
    ] = await Promise.all([
      (supabase as any)
        .from("payment_account_movements")
        .select("id, branch_id, direction, amount, movement_type, created_at, description, payment_accounts!payment_account_movements_payment_account_id_fkey(account_name)")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .gte("created_at", dateFromStr)
        .lte("created_at", dateToEndOfDay)
        .order("created_at", { ascending: false }),

      (supabase as any)
        .from("service_payments")
        .select("id, branch_id, gross_amount, mdr_amount, paid_at")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .eq("payment_status", "PAID")
        .gte("paid_at", dateFromStr)
        .lte("paid_at", dateToEndOfDay),

      (supabase as any)
        .from("pos_sales")
        .select("id, branch_id, gross_amount, net_amount, paid_amount, change_amount, mdr_amount, payment_method_id, sold_at")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .eq("sale_status", "COMPLETED")
        .gte("sold_at", dateFromStr)
        .lte("sold_at", dateToEndOfDay),

      (supabase as any)
        .from("services")
        .select("id, branch_id, final_cost, current_status, service_number, customer_id, device_type, device_brand, device_model, assigned_technician_id, intake_at, created_at")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .gte("created_at", dateFromStr)
        .lte("created_at", dateToEndOfDay)
        .order("created_at", { ascending: false }),

      (supabase as any)
        .from("payment_accounts")
        .select("id, account_name, type, current_balance, is_active")
        .eq("brand_id", session.brandId),

      (supabase as any)
        .from("store_shifts")
        .select("id, branch_id, shift_status, opened_at")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter),

      (supabase as any)
        .from("audit_logs")
        // Branch-scoped: include events for the selected branch(es) plus
        // brand-level events (branch_id IS NULL, e.g. settings/account/etc.).
        .select("id, action, branch_id, target_type, target_id, target_label, actor_id, description, details, created_at, profiles!audit_logs_actor_id_fkey(name)")
        .eq("brand_id", session.brandId)
        .or(auditBranchOr)
        .gte("created_at", dateFromStr)
        .lte("created_at", dateToEndOfDay)
        .order("created_at", { ascending: false })
        .limit(50),

      (supabase as any)
        .from("inventory_items")
        .select("id, name, sku, item_type, cost_price, selling_price, min_stock, is_active, category_id"),

      (supabase as any)
        .from("payment_methods")
        .select("id, name, type")
        .eq("brand_id", session.brandId),

      (supabase as any)
        .from("branch_inventory_stocks")
        .select("item_id, branch_id, current_stock")
        .in("branch_id", branchFilter)
        .eq("brand_id", session.brandId),

      (supabase as any)
        .from("services")
        .select("created_at")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .gte("created_at", dateFromStr)
        .lte("created_at", dateToEndOfDay),

      (supabase as any)
        .from("inventory_movements")
        .select("id, item_id, movement_type, direction, quantity, created_at")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .gte("created_at", dateFromStr)
        .lte("created_at", dateToEndOfDay),

      (supabase as any)
        .from("services")
        .select("id, branch_id, current_status, assigned_technician_id, service_number, customer_id, created_at, intake_at, done_at, final_cost, device_type, device_brand, device_model")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .is("deleted_at", null)
        .neq("current_status", "DONE")
        .neq("current_status", "CANCELLED"),

      (supabase as any)
        .from("services")
        .select("id, branch_id, done_at, assigned_technician_id, service_number")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .not("done_at", "is", null)
        .gte("done_at", dateFromStr)
        .lte("done_at", dateToEndOfDay),

      (supabase as any)
        .from("customers")
        .select("id, name")
        .eq("brand_id", session.brandId),

      (supabase as any)
        .from("profiles")
        .select("id, name"),

      /* Finance ledger */
      (supabase as any)
        .from("finance_ledger")
        .select("entry_type, direction, amount, branch_id, ledger_date, category")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .gte("ledger_date", dateFromStr)
        .lte("ledger_date", dateToStr),
    ]);
    
    const movements = (movementsResult.data ?? []) as any[];
    const servicePayments = (servicePaymentsResult.data ?? []) as any[];
    const posSales = (posSalesResult.data ?? []) as any[];
    const services = (servicesResult.data ?? []) as any[];
    const accounts = (accountsResult.data ?? []) as any[];
    const shifts = (shiftsResult.data ?? []) as any[];
    const auditLogs = (auditResult.data ?? []) as any[];
    const inventoryItems = (inventoryResult.data ?? []) as any[];
    const paymentMethods = (paymentMethodsResult.data ?? []) as any[];
    const branchStocks = (branchStocksResult.data ?? []) as any[];
    const servicesHeatmap = (servicesHeatmapResult.data ?? []) as any[];
    const inventoryMovements = (inventoryMovementsResult.data ?? []) as any[];
    const activeServices = (activeServicesResult.data ?? []) as any[];
    const completedServices = (completedServicesResult.data ?? []) as any[];
    const customers = (customersResult.data ?? []) as any[];
    const profiles = (profilesResult.data ?? []) as any[];
    const ledgerRows = (financeLedgerResult.data ?? []) as any[];

    const customerMap = new Map(customers.map((c: any) => [c.id, c.name]));
    const profileMap = new Map(profiles.map((p: any) => [p.id, p.name]));

    const branchMap = new Map(allBranches.map((b: any) => [b.id, b.name || b.id]));

    const NON_OPERATIONAL = new Set(["OPENING_BALANCE","BALANCE_ADJUSTMENT","TRANSFER_IN","TRANSFER_OUT"]);

    /* ── Revenue (source of truth: finance_ledger) ── */
    const serviceRevenue = ledgerRows
      .filter((r: any) => r.entry_type === "SERVICE_REVENUE" && r.direction === "CREDIT")
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const posRevenueLedger = ledgerRows
      .filter((r: any) => r.entry_type === "POS_REVENUE" && r.direction === "CREDIT")
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const otherIncomeLedger = ledgerRows
      .filter((r: any) => r.direction === "CREDIT" && r.entry_type !== "SERVICE_REVENUE" && r.entry_type !== "POS_REVENUE")
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const totalRevenue = serviceRevenue + posRevenueLedger + otherIncomeLedger;

    /* Legacy pos_sales value for backward compat calculations */
    const posRevenueRaw = posSales.reduce((s: number, p: any) => s + Math.max(0, Number(p.paid_amount || p.gross_amount || 0) - Number(p.change_amount || 0)), 0);
    const otherIncomeRaw = movements
      .filter((m: any) => m.movement_type === "OTHER_INCOME" && m.direction === "IN")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

    const totalExpense = movements
      .filter((m: any) => ["OPERATING_EXPENSE", "BANK_FEE", "STOCK_PURCHASE", "MDR_FEE"].includes(m.movement_type) && m.direction === "OUT")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const mdrFromPayments = servicePayments.reduce((s: number, p: any) => s + Number(p.mdr_amount || 0), 0)
      + posSales.reduce((s: number, p: any) => s + Number(p.mdr_amount || 0), 0);
    const totalMdr = movements
      .filter((m: any) => m.movement_type === "BANK_FEE")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0) + mdrFromPayments;
    const netProfit = totalRevenue - totalExpense;

    /* ── Finance ledger KPIs (V4 data) ── */
    const ledgerCreditTotal = ledgerRows
      .filter((r: any) => r.direction === "CREDIT")
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const ledgerMdr = ledgerRows
      .filter((r: any) => r.entry_type === "MDR_EXPENSE" && r.direction === "DEBIT")
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const effectiveRevenue = Math.max(totalRevenue, ledgerCreditTotal);
    const effectiveMdr = Math.max(totalMdr, ledgerMdr);
    const effectiveNetProfit = effectiveRevenue - totalExpense;

    /* ── Total activity count ── */
    const totalActivity =
      servicesHeatmap.length +
      servicePayments.length +
      posSales.length +
      movements.length +
      auditLogs.length;

    /* ── Revenue trend (grouped by date from finance_ledger) ── */
    const revMap = new Map<string, { svc: number; pos: number; oi: number; co: number }>();
    for (const r of ledgerRows) {
      if (r.direction !== "CREDIT") continue;
      if (r.entry_type === "COGS" || r.entry_type === "MDR_EXPENSE") continue;
      const d = (r.ledger_date || "").split("T")[0];
      if (!d) continue;
      const e = revMap.get(d) || { svc: 0, pos: 0, oi: 0, co: 0 };
      if (r.entry_type === "SERVICE_REVENUE") e.svc += Number(r.amount || 0);
      else if (r.entry_type === "POS_REVENUE") e.pos += Number(r.amount || 0);
      else e.oi += Number(r.amount || 0);
      revMap.set(d, e);
    }
    for (const m of movements) {
      if (m.direction !== "OUT") continue;
      if (NON_OPERATIONAL.has(m.movement_type)) continue;
      const d = (m.created_at || "").split("T")[0];
      if (!d) continue;
      const e = revMap.get(d) || { svc: 0, pos: 0, oi: 0, co: 0 };
      e.co += Number(m.amount || 0);
      revMap.set(d, e);
    }
    const sortedDates = Array.from(revMap.keys()).sort();
    const revenueTrend: RevenueTrendPoint[] = sortedDates.map((d) => {
      const e = revMap.get(d)!;
      return {
        date: d,
        label: new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        serviceRevenue: e.svc,
        posRevenue: e.pos,
        otherIncome: e.oi,
        totalRevenue: e.svc + e.pos + e.oi,
        cashOut: e.co,
      };
    });

    /* ── Branch revenue trend from finance_ledger ── */
    const brMap = new Map<string, Map<string, number>>();
    for (const r of ledgerRows) {
      if (r.direction !== "CREDIT") continue;
      if (r.entry_type === "COGS" || r.entry_type === "MDR_EXPENSE") continue;
      const d = (r.ledger_date || "").split("T")[0];
      if (!d) continue;
      if (!brMap.has(d)) brMap.set(d, new Map());
      const m = brMap.get(d)!;
      m.set(r.branch_id, (m.get(r.branch_id) || 0) + Number(r.amount || 0));
    }
    const sortedBrDates = Array.from(brMap.keys()).sort();
    const branchRevenueTrend: BranchRevenueTrendPoint[] = [];
    for (const d of sortedBrDates) {
      const m = brMap.get(d)!;
      for (const [bid, total] of m) {
        branchRevenueTrend.push({
          date: d,
          branchId: bid,
          branchName: branchMap.get(bid) || bid,
          totalRevenue: total,
        });
      }
    }

    console.log("[dashboard-chart-check]", {
      brandId: session.brandId,
      branchId,
      startDate: dateFromStr,
      endDate: dateToStr,
      sqlRows: ledgerRows.filter((r: any) => r.direction === "CREDIT").length,
      chartDataPoints: revenueTrend.length,
      chartTotal: revenueTrend.reduce((s: number, p: any) => s + p.totalRevenue, 0),
      cardTotalRevenue: effectiveRevenue,
    });

    /* ── Payment method breakdown ── */
    const paymentMethodsMap = new Map(paymentMethods.map((pm: any) => [pm.id, pm]));
    const paymentMethodMap = new Map<string, { method: string; grossAmount: number; transactionCount: number; mdrAmount: number; netAmount: number }>();
    
    const typeMap: Record<string, string> = {
      CASH: "Tunai",
      QRIS: "QRIS",
      TRANSFER: "Transfer",
      DEBIT: "Debit",
      EWALLET: "Ewallet",
      CREDIT: "Kredit",
    };

    for (const sale of posSales) {
      const pmId = sale.payment_method_id;
      if (!pmId) continue;
      const pm = paymentMethodsMap.get(pmId);
      const methodName = pm ? (typeMap[pm.type] || pm.name) : "Lainnya";
      const entry = paymentMethodMap.get(methodName) || { method: methodName, grossAmount: 0, transactionCount: 0, mdrAmount: 0, netAmount: 0 };
      entry.grossAmount += Number(sale.gross_amount || 0);
      entry.transactionCount++;
      entry.mdrAmount += Number(sale.mdr_amount || 0);
      entry.netAmount += Math.max(0, Number(sale.paid_amount || sale.gross_amount || 0) - Number(sale.change_amount || 0));
      paymentMethodMap.set(methodName, entry);
    }
    const allPaymentMethodNames = ["Tunai", "QRIS", "Transfer", "Debit", "Ewallet"];
    const paymentMethodRadar = allPaymentMethodNames.map((methodName) => {
      const fromPos = paymentMethodMap.get(methodName);
      return {
        method: methodName,
        grossAmount: fromPos?.grossAmount ?? 0,
        transactionCount: fromPos?.transactionCount ?? 0,
        mdrAmount: fromPos?.mdrAmount ?? 0,
        netAmount: fromPos?.netAmount ?? 0,
        percentage: 0,
      };
    });
    const totalRevenueForPct = paymentMethodRadar.reduce((s, p) => s + p.netAmount, 0);
    for (const p of paymentMethodRadar) {
      p.percentage = totalRevenueForPct > 0 ? Math.round((p.netAmount / totalRevenueForPct) * 100) : 0;
    }

    /* ── Expense category breakdown (by user-chosen category) ── */
    const SYSTEM_CATEGORY_LABELS: Record<string, string> = {
      adjustment: "Penyesuaian",
      mdr: "MDR",
      other: "Lainnya",
      pos: "POS",
      service: "Servis",
      cogs: "HPP",
      bank_fee: "Biaya Bank",
    };
    const titleCase = (s: string) =>
      s.replace(/[_-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const prettyCategory = (raw: string | null) => {
      const key = (raw || "Lainnya").toLowerCase();
      if (key === "lainnya") return "Lainnya";
      return SYSTEM_CATEGORY_LABELS[key] ?? titleCase(key);
    };

    const mdrFromPos = posSales.reduce((s: number, p: any) => s + Number(p.mdr_amount || 0), 0);
    const mdrFromSvcp = servicePayments.reduce((s: number, p: any) => s + Number(p.mdr_amount || 0), 0);
    const totalMdrFromSales = mdrFromPos + mdrFromSvcp;

    const expenseCategoryMap = new Map<string, number>();
    for (const r of ledgerRows) {
      if (r.direction !== "DEBIT") continue;
      const raw = r.category || "Lainnya";
      expenseCategoryMap.set(raw, (expenseCategoryMap.get(raw) || 0) + Number(r.amount || 0));
    }
    if (totalMdrFromSales > 0) {
      expenseCategoryMap.set("mdr", (expenseCategoryMap.get("mdr") || 0) + totalMdrFromSales);
    }

    const expenseCategoryRadar = Array.from(expenseCategoryMap.entries()).map(([raw, amount]) => ({
      category: prettyCategory(raw),
      amount,
      percentage: 0,
    }));
    const totalExpenseAmount = expenseCategoryRadar.reduce((s, e) => s + e.amount, 0);
    for (const e of expenseCategoryRadar) {
      e.percentage = totalExpenseAmount > 0 ? Math.round((e.amount / totalExpenseAmount) * 100) : 0;
    }

    /* ── Operational hour heatmap (service intake) ── */
    const hourCounts = new Map<string, number>();
    for (const s of servicesHeatmap) {
      const d = new Date(s.created_at);
      const wibHour = (d.getUTCHours() + 7) % 24;
      const hour = `${String(wibHour).padStart(2, "0")}:00`;
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    const operationalHeatmap = Array.from(hourCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, count]) => ({ hour, count }));
    const maxHeatmapCount = operationalHeatmap.reduce((m, h) => Math.max(m, h.count), 0);

    /* ── Activity log mapping ── */
    const ACTION_MAP: Record<string, { type: string; tag: string; category: ActivityLogItem["category"] }> = {
      SERVICE_CREATED:              { type: "service_created",      tag: "Servis Baru",     category: "service" },
      SERVICE_STATUS_UPDATED:       { type: "status_changed",       tag: "Update Status",   category: "service" },
      SERVICE_CANCELLED:            { type: "service_cancelled",    tag: "Servis Batal",     category: "service" },
      SERVICE_REOPENED:             { type: "service_reopened",     tag: "Servis Dibuka",    category: "service" },
      SERVICE_DP_RECEIVED:          { type: "dp_received",          tag: "DP Servis",        category: "payment" },
      SERVICE_TECHNICIAN_ASSIGNED:  { type: "technician_assigned",  tag: "Teknisi",          category: "service" },
      SERVICE_SPAREPART_ADDED:      { type: "sparepart_used",       tag: "Sparepart",        category: "inventory" },
      SERVICE_PAYMENT_RECEIVED:     { type: "payment_received",     tag: "Pembayaran",       category: "payment" },
      SERVICE_PICKUP_VERIFIED:      { type: "pickup_verified",      tag: "Pengambilan",      category: "service" },
      STOCK_ADJUSTMENT_IN:          { type: "stock_in",             tag: "Stok Masuk",       category: "inventory" },
      STOCK_ADJUSTMENT_OUT:         { type: "stock_out",            tag: "Stok Keluar",      category: "inventory" },
      STOCK_OPNAME_ADJUSTMENT:      { type: "stock_opname",         tag: "Opname Stok",      category: "inventory" },
      POS_CHECKOUT:                 { type: "pos_sale",             tag: "POS",              category: "inventory" },
      POS_VOID:                     { type: "pos_void",             tag: "Void POS",         category: "inventory" },
      PAYMENT_ACCOUNT_GLOBAL_CREATED: { type: "account_created",    tag: "Akun",             category: "finance" },
      PAYMENT_ACCOUNT_BRANCH_CREATED:  { type: "account_created",    tag: "Akun",           category: "finance" },
      PAYMENT_ACCOUNT_UPDATED:      { type: "account_updated",      tag: "Akun",             category: "finance" },
      PAYMENT_ACCOUNT_ARCHIVED:     { type: "account_archived",     tag: "Akun",             category: "finance" },
      PAYMENT_ACCOUNT_DELETED:      { type: "account_deleted",      tag: "Akun",             category: "finance" },
      PAYMENT_ACCOUNT_BALANCE_ADJUSTED: { type: "balance_adjusted", tag: "Penyesuaian",      category: "finance" },
      CASH_ACCOUNT_CREATED:         { type: "account_created",      tag: "Akun",             category: "finance" },
      PAYMENT_METHOD_LINKED:        { type: "payment_method",       tag: "Metode Bayar",     category: "finance" },
      VOID_SERVICE_PAYMENT:         { type: "void_payment",         tag: "Void",             category: "payment" },
      REFUND_SERVICE_PAYMENT:       { type: "refund_payment",       tag: "Refund",           category: "payment" },
      VOID_POS_SALE:                { type: "void_pos",             tag: "Void POS",         category: "inventory" },
      REFUND_POS_SALE:              { type: "refund_pos",           tag: "Refund POS",       category: "inventory" },
      OPEN_SHIFT:                   { type: "shift_opened",         tag: "Shift",            category: "system" },
      CLOSE_SHIFT:                  { type: "shift_closed",         tag: "Akhiri Shift",     category: "system" },
      STORE_SHIFT_OPENED:           { type: "shift_opened",         tag: "Shift",            category: "system" },
      STORE_SHIFT_CLOSED:           { type: "shift_closed",         tag: "Shift Tutup",      category: "system" },
      STORE_LATE_OPEN:              { type: "shift_opened",         tag: "Shift",            category: "system" },
      STORE_EARLY_OPEN:             { type: "shift_opened",         tag: "Shift",            category: "system" },
      STORE_AUTO_CLOSED:            { type: "shift_closed",         tag: "Shift Tutup",      category: "system" },
      STORE_LATE_CLOSE:             { type: "shift_closed",         tag: "Shift Tutup",      category: "system" },
      TARGET_GOAL_UPDATED:          { type: "target_updated",       tag: "Target",           category: "system" },
      SYSTEM_SETTINGS_UPDATED:      { type: "settings_updated",     tag: "Pengaturan",       category: "system" },
      BRAND_PROFILE_UPDATED:        { type: "profile_updated",      tag: "Profil",           category: "system" },
      BRANCH_CREATED:               { type: "branch_created",       tag: "Cabang",           category: "system" },
      BRANCH_UPDATED:               { type: "branch_updated",       tag: "Cabang",           category: "system" },
      BRANCH_ACTIVATED:             { type: "branch_activated",     tag: "Cabang",           category: "system" },
      BRANCH_DEACTIVATED:           { type: "branch_deactivated",   tag: "Cabang",           category: "system" },
      CACHE_CLEARED:                { type: "cache_cleared",        tag: "Cache",            category: "system" },
      RESET_DEMO_DATA:              { type: "data_reset",           tag: "Reset Demo",       category: "system" },
      DELETE_ALL_DATA:              { type: "data_delete",          tag: "Hapus Data",       category: "system" },
      FACTORY_RESET:                { type: "factory_reset",        tag: "Factory Reset",    category: "system" },
    };

    /* ── Account / user actions (lowercase keys) ── */
    const ACCOUNT_ACTION_MAP: Record<string, { type: string; tag: string; category: ActivityLogItem["category"] }> = {
      "account.create":            { type: "user_created",     tag: "Akun Pengguna",  category: "account" },
      "account.reset_password":    { type: "password_reset",   tag: "Keamanan",       category: "account" },
      "account.delete_from_brand": { type: "user_deleted",     tag: "Akun",           category: "account" },
      "account.link_auth":         { type: "auth_linked",      tag: "Autentikasi",    category: "account" },
      "account.update":            { type: "user_updated",     tag: "Akun",           category: "account" },
      "account.activate":          { type: "user_activated",   tag: "Akun",           category: "account" },
      "account.deactivate":        { type: "user_deactivated", tag: "Akun",           category: "account" },
    };

    const EXPORT_IMPORT_ACTIONS = new Set([
      "EXPORT_BRAND_CONFIG", "EXPORT_USERS", "EXPORT_CUSTOMERS", "EXPORT_SERVICES",
      "EXPORT_INVENTORY", "EXPORT_FINANCE", "EXPORT_FULL_BACKUP", "IMPORT_BACKUP",
    ]);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    function getGroupKey(createdAt: string): string {
      const d = new Date(createdAt);
      if (d.toDateString() === today.toDateString()) return "today";
      if (d.toDateString() === yesterday.toDateString()) return "yesterday";
      if (d >= lastWeek) return "thisWeek";
      return "older";
    }

    const actLog: ActivityLogItem[] = [];
    for (const log of auditLogs) {
      const rawAction = (log.action || "").trim();
      const actorName = log.profiles?.name || "System";
      let mapped = ACTION_MAP[rawAction];

      if (!mapped && ACCOUNT_ACTION_MAP[rawAction]) {
        mapped = ACCOUNT_ACTION_MAP[rawAction];
      }

      /* Finance CREATE / VOID — differentiate by description */
      if (!mapped && (rawAction === "CREATE" || rawAction === "VOID")) {
        const desc = (log.description || "").toLowerCase();
        if (rawAction === "CREATE") {
          if (desc.includes("pendapatan") || desc.includes("income") || desc.includes("pemasukan")) {
            mapped = { type: "income_created", tag: "Pemasukan", category: "finance" };
          } else {
            mapped = { type: "expense_created", tag: "Pengeluaran", category: "finance" };
          }
        } else {
          mapped = { type: "finance_void", tag: "Pembatalan", category: "finance" };
        }
      }

      /* Export / Import */
      if (!mapped && EXPORT_IMPORT_ACTIONS.has(rawAction)) {
        const isExport = rawAction.startsWith("EXPORT");
        mapped = {
          type: isExport ? "export" : "import",
          tag: isExport ? "Ekspor" : "Impor",
          category: "system",
        };
      }

      if (!mapped) {
        mapped = { type: "alert", tag: "Aktivitas", category: "system" };
      }

      const details = log.details || null;
      actLog.push({
        id: log.id,
        action: rawAction,
        description: log.description || null,
        type: mapped.type,
        category: mapped.category,
        user: actorName,
        text: log.description || rawAction,
        tag: mapped.tag,
        time: log.created_at,
        groupKey: getGroupKey(log.created_at),
        details,
        targetLabel: log.target_label || null,
      });
    }

    /* ── Today activity counts ── */
    const todayStr = new Date().toISOString().split("T")[0];
    const serviceInCountToday = services.filter((s: any) => (s.created_at || "").startsWith(todayStr)).length;
    const posCountToday = posSales.filter((s: any) => (s.sold_at || "").startsWith(todayStr)).length;
    const stockUsedCountToday = inventoryMovements.filter(
      (m: any) => m.movement_type === "POS_SALE" && m.direction === "OUT" && (m.created_at || "").startsWith(todayStr),
    ).reduce((s: number, m: any) => s + Number(m.quantity || 0), 0);
    const cashMovementCountToday = movements.filter((m: any) => (m.created_at || "").startsWith(todayStr)).length;

    const todayActivityCounts: TodayActivityCount[] = [
      { label: "Servis Masuk", count: serviceInCountToday },
      { label: "Transaksi POS", count: posCountToday },
      { label: "Mutasi Keuangan", count: cashMovementCountToday },
    ];

    /* ── Need actions ── */
    const needActions: NeedActionItem[] = [];
    const qcCount = services.filter((s: any) => s.current_status === "QC").length;
    if (qcCount > 0) needActions.push({ label: "Servis menunggu QC", count: qcCount, severity: "high" });
    const waitingApprovalCount = services.filter((s: any) => s.current_status === "WAITING_APPROVAL").length;
    if (waitingApprovalCount > 0) needActions.push({ label: "Servis menunggu persetujuan", count: waitingApprovalCount, severity: "medium" });
    const intakeCount = services.filter((s: any) => s.current_status === "INTAKE").length;
    if (intakeCount > 0) needActions.push({ label: "Servis baru perlu diagnosa", count: intakeCount, severity: "medium" });
    const openShiftCount = shifts.filter((s: any) => s.shift_status !== "OPEN").length;
    if (openShiftCount > 0) needActions.push({ label: "Shift toko belum dibuka", count: openShiftCount, severity: "low" });

    /* ── Shift statuses ── */
    const shiftStatuses: ShiftStatusItem[] = [];
    for (const b of allBranches) {
      if (!branchFilter.includes(b.id)) continue;
      const branchShift = shifts.find((s: any) => s.branch_id === b.id);
      const status = branchShift?.shift_status === "OPEN" ? "Sedang Berjalan" : "Tutup toko";
      shiftStatuses.push({ branch: b.name || b.id, status });
    }

    /* ══ SERVICE TAB ══ */

    const pipelineVariant = (status: string): "muted" | "secondary" | "default" | "outline" | "destructive" => {
      const map: Record<string, any> = {
        INTAKE: "muted",
        DIAGNOSIS: "secondary",
        WAITING_APPROVAL: "default",
        REPAIRING: "default",
        QC: "outline",
        DONE: "secondary",
        CANCELLED: "destructive",
      };
      return map[status] || "secondary";
    };

    const pipelineStatuses = ["INTAKE", "DIAGNOSIS", "WAITING_APPROVAL", "REPAIRING", "QC", "DONE", "CANCELLED"];
    const pipelineLabels: Record<string, string> = {
      INTAKE: "Masuk", DIAGNOSIS: "Diagnosa", WAITING_APPROVAL: "Menunggu", REPAIRING: "Perbaikan",
      QC: "QC", DONE: "Selesai", CANCELLED: "Batal",
    };
    const pipelineDescs: Record<string, string> = {
      INTAKE: "antrian awal", DIAGNOSIS: "deteksi kerusakan", WAITING_APPROVAL: "menunggu konfirmasi",
      REPAIRING: "sedang diperbaiki", QC: "quality check", DONE: "selesai", CANCELLED: "dibatalkan",
    };

    // Service counts: use created-in-range services for "masuk", done_at in range for "selesai"
    const serviceInCount = services.length;
    const serviceDoneCount = completedServices.length;
    const serviceUnpaidCount = services.filter((s: any) => s.current_status === "DONE" && Number(s.final_cost || 0) > 0).length;
    const serviceUncollectedCount = services.filter((s: any) => s.current_status === "DONE").length;

    // Pipeline distribution: use active services (not DONE/CANCELLED, not deleted) for current state
    const statusCounts: Record<string, number> = {};
    for (const st of pipelineStatuses) {
      statusCounts[st] = 0;
    }
    for (const s of activeServices) {
      const st = s.current_status;
      if (st in statusCounts) (statusCounts as any)[st]++;
    }
    // Include terminal statuses from the created-in-range services
    for (const s of services) {
      const st = s.current_status;
      if (st === "DONE" || st === "CANCELLED") {
        (statusCounts as any)[st] = ((statusCounts as any)[st] || 0) + 1;
      }
    }

    const pipelineData: PipelineItem[] = pipelineStatuses.map((st) => ({
      label: pipelineLabels[st] || st,
      count: Number(statusCounts[st]) || 0,
      variant: pipelineVariant(st),
      desc: pipelineDescs[st] || "",
    }));

    // Recent services: show latest created in range, resolve customer/tech names
    const recentServices: RecentServiceItem[] = services.slice(0, 10).map((s: any) => ({
      id: s.id,
      serviceNumber: s.service_number || s.id.slice(0, 8),
      customer: customerMap.get(s.customer_id) || "-",
      device: [s.device_brand, s.device_model].filter(Boolean).join(" ") || s.device_type || "-",
      status: pipelineLabels[s.current_status] || s.current_status,
      tech: profileMap.get(s.assigned_technician_id) || (s.assigned_technician_id ? s.assigned_technician_id.slice(0, 8) : "Belum ditugaskan"),
      time: s.created_at ? new Date(s.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-",
      variant: pipelineVariant(s.current_status) as any,
    }));

    // Need attention: active services stuck too long in non-terminal statuses
    const needAttention: NeedAttentionItem[] = [];
    const stuckThresholdHours: Record<string, number> = {
      QC: 2,
      WAITING_APPROVAL: 4,
      DIAGNOSIS: 24,
      INTAKE: 24,
      REPAIRING: 48,
    };
    const now = new Date();
    for (const s of activeServices.slice(0, 20)) {
      const status = s.current_status as string;
      const threshold = (stuckThresholdHours as any)[status];
      if (!threshold) continue;
      const createdDate = new Date(s.created_at || now);
      const ageHours = (now.getTime() - createdDate.getTime()) / 3600000;
      if (ageHours < threshold) continue;
      const deviceName = [s.device_brand, s.device_model].filter(Boolean).join(" ") || s.device_type || "Unknown";
      const categoryLabels: Record<string, string> = {
        QC: "Menunggu QC",
        WAITING_APPROVAL: "Menunggu persetujuan",
        DIAGNOSIS: "Menunggu diagnosa",
        INTAKE: "Belum diproses",
        REPAIRING: "Dalam perbaikan lama",
      };
      const categoryLabel = (categoryLabels as any)[status] || "Perlu perhatian";
      const severity: "high" | "medium" | "low" = threshold <= 2 ? "high" : threshold <= 24 ? "medium" : "low";
      needAttention.push({
        customer: customerMap.get(s.customer_id) || "Tanpa nama",
        device: deviceName,
        reason: `${categoryLabel} (${Math.round(ageHours)} jam)`,
        severity,
      });
    }

    // Technician performance: count completed vs active per tech from all services (active + completed)
    const techSelesaiMap = new Map<string, number>();
    const techProsesMap = new Map<string, number>();
    for (const s of completedServices) {
      const tid = s.assigned_technician_id || "unassigned";
      techSelesaiMap.set(tid, (techSelesaiMap.get(tid) || 0) + 1);
    }
    for (const s of activeServices) {
      const tid = s.assigned_technician_id || "unassigned";
      techProsesMap.set(tid, (techProsesMap.get(tid) || 0) + 1);
    }
    const allTechIds = new Set([...techSelesaiMap.keys(), ...techProsesMap.keys()]);
    const techPerformances: TechPerformanceItem[] = Array.from(allTechIds).map((id) => {
      const selesai = techSelesaiMap.get(id) || 0;
      const proses = techProsesMap.get(id) || 0;
      const total = selesai + proses;
      return {
        name: id === "unassigned" ? "Belum ditugaskan" : (profileMap.get(id) || id.slice(0, 8)),
        selesai,
        proses,
        rating: total > 0 ? Math.round((selesai / total) * 100) : 0,
      };
    });

    console.log("[dashboard-service]", {
      brandId: session.brandId,
      branchId,
      startDate: dateFromStr,
      endDate: dateToStr,
      serviceRevenue,
      serviceInCount,
      serviceDoneCount,
      recentServicesCount: recentServices.length,
      statusFieldUsed: "current_status",
      servicesQueryResultCount: services.length,
    });

    /* ══ FINANCE TAB ══ */
    const totalIn = movements
      .filter((m: any) => m.direction === "IN" && !NON_OPERATIONAL.has(m.movement_type))
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const totalOut = movements
      .filter((m: any) => m.direction === "OUT" && !NON_OPERATIONAL.has(m.movement_type))
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const effectiveCashIn = Math.max(totalIn, serviceRevenue + posRevenueLedger);
    const effectiveCashOut = Math.max(totalOut, totalExpense);

    /* ══ INVENTORY TAB ══ */
    const branchNamesMap = new Map(allBranches.map((b: any) => [b.id, b.name || b.id]));
    const stockMap = new Map<string, number>();
    for (const s of branchStocks) {
      stockMap.set(s.item_id, (stockMap.get(s.item_id) || 0) + Number(s.current_stock || 0));
    }
    const lowStockItems: LowStockItem[] = inventoryItems
      .filter((item: any) => {
        const min = Number(item.min_stock || 0);
        const current = stockMap.get(item.id) ?? 0;
        return min > 0 && current <= min;
      })
      .slice(0, 10)
      .map((item: any) => {
        const current = stockMap.get(item.id) ?? 0;
        return {
          name: item.name,
          sku: item.sku || "-",
          category: item.item_type || "Umum",
          currentStock: current,
          minStock: Number(item.min_stock || 0),
          branch: branchFilter.length === 1 ? (branchNamesMap.get(branchFilter[0]) || "Cabang") : "Semua Cabang",
          status: current === 0 ? "habis" as const : "menipis" as const,
        };
      });
    const outOfStockCount = lowStockItems.filter((i) => i.currentStock === 0).length;

    const unclosedShiftsCount = shifts.filter((s: any) => s.shift_status === "OPEN" && s.opened_at && new Date(s.opened_at).toDateString() !== new Date().toDateString()).length;
    const unpickedUnitsCount = serviceUncollectedCount;
    const unpaidInvoicesCount = serviceUnpaidCount;

    const brandTarget = await getBrandTarget(supabase as any, session.brandId);

    const result: DashboardData = {
      general: {
        revenueTarget: brandTarget?.monthlyAmount ?? 0,
        revenue: effectiveRevenue,
        totalActivity,
        netProfit: effectiveNetProfit,
        revenueTrend,
        branchRevenueTrend,
        recentActivity: actLog.slice(0, 30),
        todayActivityCounts,
        needActions,
        shiftStatuses,
        serviceCompletedToday: completedServices.filter((s: any) => (s.done_at || "").startsWith(todayStr)).length,
        unclosedShiftsCount,
        unpickedUnitsCount,
        unpaidInvoicesCount,
        lowStockItemsCount: lowStockItems.length,
        outOfStockItemsCount: outOfStockCount,
        activityHeatmap: (() => {
          const map = new Map<string, number>();
          for (const log of auditLogs) {
            const d = (log.created_at || "").split("T")[0];
            if (!d) continue;
            map.set(d, (map.get(d) ?? 0) + 1);
          }
          const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
          const maxCount = entries.reduce((m, [, c]) => Math.max(m, c), 0);
          return entries.map(([date, count]) => ({
            date,
            count,
            intensity: maxCount === 0 ? 0 : Math.ceil((count / maxCount) * 4),
          }));
        })(),
      },
      service: {
        totalServiceRevenue: serviceRevenue,
        serviceInCount,
        serviceDoneCount,
        serviceUnpaidCount,
        serviceUncollectedCount: serviceUncollectedCount,
        pipelineData,
        recentServices,
        needAttention,
        techPerformances,
      },
      finance: {
        revenueTrend,
        totalRevenue,
        serviceRevenue,
        posRevenue: posRevenueLedger,
        otherIncome: otherIncomeLedger,
        cashIn: effectiveCashIn,
        cashOut: effectiveCashOut,
        netCashflow: effectiveCashIn - effectiveCashOut,
        mdrAmount: effectiveMdr,
        expenseCategoryRadar,
        paymentMethodRadar,
      },
      inventory: {
        lowStockCount: lowStockItems.length,
        outOfStockCount,
        stockUsedCount: stockUsedCountToday,
        stockPurchaseTotal: totalExpense,
        lowStockItems,
      },
    };

    /* Integrity check */
    const sumCheck = serviceRevenue + posRevenueLedger + otherIncomeLedger;
    if (sumCheck !== totalRevenue) {
      console.error(`[Integrity] Dashboard revenue mismatch: ${serviceRevenue} + ${posRevenueLedger} + ${otherIncomeLedger} = ${sumCheck} ≠ totalRevenue=${totalRevenue}`);
    }

    console.log("[dashboard] summary", {
      revenue: totalRevenue,
      posRevenue: posRevenueLedger, serviceRevenue, otherIncome: otherIncomeLedger,
      totalActivity,
      netProfit: effectiveNetProfit,
      expenseCount: expenseCategoryRadar.length,
      paymentMethodCount: paymentMethodRadar.length,
      serviceCount: services.length,
      activeServiceCount: activeServices.length,
      completedServiceCount: completedServices.length,
      posCount: posSales.length,
      cashflow: { in: totalIn, out: totalOut },
      heatmapSlots: operationalHeatmap.length,
    });

    return successResult(result);
  } catch (err: any) {
    console.error("[Dashboard] getDashboardOverviewAction:", err.message);
    return errorResult(err.message || "Gagal memuat dashboard.");
  }
}
