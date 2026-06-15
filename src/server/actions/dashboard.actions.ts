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
  totalActivity: number;
  netProfit: number;
  revenueTrend: RevenueTrendPoint[];
  branchRevenueTrend: BranchRevenueTrendPoint[];
  recentActivity: ActivityLogItem[];
  todayActivityCounts: TodayActivityCount[];
  needActions: NeedActionItem[];
  shiftStatuses: ShiftStatusItem[];
  serviceCompletedToday?: number;
}

export interface RevenueTrendPoint {
  date: string;
  label: string;
  serviceRevenue: number;
  posRevenue: number;
  otherIncome: number;
  totalRevenue: number;
}

export interface BranchRevenueTrendPoint {
  date: string;
  branchId: string;
  branchName: string;
  totalRevenue: number;
}

export interface ActivityLogItem {
  id: string;
  type: string;
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
        .select("id, branch_id, final_cost, current_status, service_number, customer_name, device_type, device_brand, device_model, assigned_technician_id, intake_at, created_at")
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
        .select("id, action, target_type, target_id, target_label, actor_id, details, created_at, profiles!audit_logs_actor_id_fkey(name)")
        .eq("brand_id", session.brandId)
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

    const customerMap = new Map(customers.map((c: any) => [c.id, c.name]));
    const profileMap = new Map(profiles.map((p: any) => [p.id, p.name]));

    const branchMap = new Map(allBranches.map((b: any) => [b.id, b.name || b.id]));

    /* ── Revenue ── */
    const serviceRevenue = servicePayments.reduce((s: number, p: any) => s + Number(p.gross_amount || 0), 0);
    const posRevenue = posSales.reduce((s: number, p: any) => s + Math.max(0, Number(p.paid_amount || p.gross_amount || 0) - Number(p.change_amount || 0)), 0);
    const otherIncome = movements
      .filter((m: any) => m.movement_type === "OTHER_INCOME" && m.direction === "IN")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const totalRevenue = serviceRevenue + posRevenue + otherIncome;

    const totalExpense = movements
      .filter((m: any) => ["OPERATING_EXPENSE", "BANK_FEE", "STOCK_PURCHASE", "MDR_FEE"].includes(m.movement_type) && m.direction === "OUT")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const mdrFromPayments = servicePayments.reduce((s: number, p: any) => s + Number(p.mdr_amount || 0), 0)
      + posSales.reduce((s: number, p: any) => s + Number(p.mdr_amount || 0), 0);
    const totalMdr = movements
      .filter((m: any) => m.movement_type === "BANK_FEE")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0) + mdrFromPayments;
    const netProfit = totalRevenue - totalExpense;

    /* ── Total activity count ── */
    const totalActivity =
      servicesHeatmap.length +
      servicePayments.length +
      posSales.length +
      movements.length +
      auditLogs.length;

    /* ── Revenue trend (grouped by date) ── */
    const revMap = new Map<string, { svc: number; pos: number; oi: number }>();
    for (const p of servicePayments) {
      const d = (p.paid_at || "").split("T")[0];
      if (!d) continue;
      const e = revMap.get(d) || { svc: 0, pos: 0, oi: 0 };
      e.svc += Number(p.gross_amount || 0);
      revMap.set(d, e);
    }
    for (const s of posSales) {
      const d = (s.sold_at || "").split("T")[0];
      if (!d) continue;
      const e = revMap.get(d) || { svc: 0, pos: 0, oi: 0 };
      e.pos += Number(s.gross_amount || 0);
      revMap.set(d, e);
    }
    for (const m of movements) {
      if (m.movement_type !== "OTHER_INCOME" || m.direction !== "IN") continue;
      const d = (m.created_at || "").split("T")[0];
      if (!d) continue;
      const e = revMap.get(d) || { svc: 0, pos: 0, oi: 0 };
      e.oi += Number(m.amount || 0);
      revMap.set(d, e);
    }
    const sortedDates = Array.from(revMap.keys()).sort();
    const revenueTrend: RevenueTrendPoint[] = sortedDates.map((d) => {
      const e = revMap.get(d)!;
      return {
        date: d,
        label: new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        serviceRevenue: e.svc,
        posRevenue: e.pos,
        otherIncome: e.oi,
        totalRevenue: e.svc + e.pos + e.oi,
      };
    });

    /* ── Branch revenue trend ── */
    const brMap = new Map<string, Map<string, number>>();
    for (const p of servicePayments) {
      const d = (p.paid_at || "").split("T")[0];
      if (!d) continue;
      if (!brMap.has(d)) brMap.set(d, new Map());
      const m = brMap.get(d)!;
      m.set(p.branch_id, (m.get(p.branch_id) || 0) + Number(p.gross_amount || 0));
    }
    for (const s of posSales) {
      const d = (s.sold_at || "").split("T")[0];
      if (!d) continue;
      if (!brMap.has(d)) brMap.set(d, new Map());
      const m = brMap.get(d)!;
      m.set(s.branch_id, (m.get(s.branch_id) || 0) + Number(s.gross_amount || 0));
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

    /* ── Payment method breakdown ── */
    const paymentMethodsMap = new Map(paymentMethods.map((pm: any) => [pm.id, pm]));
    const paymentMethodMap = new Map<string, { method: string; grossAmount: number; transactionCount: number; mdrAmount: number; netAmount: number }>();
    for (const sale of posSales) {
      const pmId = sale.payment_method_id;
      if (!pmId) continue;
      const pm = paymentMethodsMap.get(pmId);
      const methodName = pm?.name || pmId;
      const entry = paymentMethodMap.get(pmId) || { method: methodName, grossAmount: 0, transactionCount: 0, mdrAmount: 0, netAmount: 0 };
      entry.grossAmount += Number(sale.gross_amount || 0);
      entry.transactionCount++;
      entry.mdrAmount += Number(sale.mdr_amount || 0);
      entry.netAmount += Math.max(0, Number(sale.paid_amount || sale.gross_amount || 0) - Number(sale.change_amount || 0));
      paymentMethodMap.set(pmId, entry);
    }
    const allPaymentMethodNames = ["Tunai", "QRIS", "Transfer", "Debit", "QRIS Test"];
    const paymentMethodRadar = allPaymentMethodNames.map((methodName) => {
      const fromPos = Array.from(paymentMethodMap.values()).find(pm => pm.method === methodName);
      return {
        method: methodName,
        grossAmount: fromPos?.grossAmount ?? 0,
        transactionCount: fromPos?.transactionCount ?? 0,
        mdrAmount: fromPos?.mdrAmount ?? 0,
        netAmount: fromPos?.netAmount ?? 0,
        percentage: 0,
      };
    }).filter(p => {
      // Only include methods with transactions, plus Tunai and QRIS
      const knownBaseMethods = ["Tunai", "QRIS"];
      return p.transactionCount > 0 || knownBaseMethods.includes(p.method);
    });
    const totalRevenueForPct = paymentMethodRadar.reduce((s, p) => s + p.netAmount, 0);
    for (const p of paymentMethodRadar) {
      p.percentage = totalRevenueForPct > 0 ? Math.round((p.netAmount / totalRevenueForPct) * 100) : 0;
    }

    /* ── Expense category breakdown ── */
    const expenseLabels: Record<string, string> = {
      STOCK_PURCHASE: "Belanja Stok",
      OPERATING_EXPENSE: "Operasional",
      BANK_FEE: "Fee Bank",
      MDR_FEE: "MDR",
      CASH_EXPENSE: "Pengeluaran Tunai",
      POS_PAYMENT: "Pembayaran POS",
      SERVICE_PAYMENT: "Pembayaran Servis",
      OTHER_INCOME: "Pemasukan Lain",
    };
    const expenseMap = new Map<string, number>();
    for (const m of movements) {
      if (m.direction !== "OUT") continue;
      const type = m.movement_type || "OTHER";
      expenseMap.set(type, (expenseMap.get(type) || 0) + Number(m.amount || 0));
    }
    // Add MDR from pos_sales and service_payments as an expense category
    const mdrFromPos = posSales.reduce((s: number, p: any) => s + Number(p.mdr_amount || 0), 0);
    const mdrFromSvcp = servicePayments.reduce((s: number, p: any) => s + Number(p.mdr_amount || 0), 0);
    const totalMdrFromSales = mdrFromPos + mdrFromSvcp;
    if (totalMdrFromSales > 0) {
      // Add to existing MDR_FEE category or create a new one
      const existingMdr = expenseMap.get("MDR_FEE") || 0;
      expenseMap.set("MDR_FEE", existingMdr + totalMdrFromSales);
    }
    const expenseCategoryRadar = Array.from(expenseMap.entries())
      .filter(([, amount]) => amount > 0)
      .map(([type, amount]) => ({
        category: expenseLabels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        amount,
        percentage: 0,
      }))
      .sort((a, b) => b.amount - a.amount);
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

    /* ── Activity log ── */
    const actLog: ActivityLogItem[] = [];
    for (const log of auditLogs) {
      const action = (log.action || "").toLowerCase();
      const actorName = log.profiles?.name || "System";
      let type = "alert";
      let tag = "Aktivitas";
      let text = `${action}`;

      if (action.includes("service") && action.includes("create")) {
        type = "service_created"; tag = "Servis Baru";
        text = `membuat servis baru`;
      } else if (action.includes("service") && action.includes("status")) {
        type = "status_changed"; tag = "Update Status";
        text = `memindahkan status servis`;
      } else if (action.includes("service") && (action.includes("cancel") || action.includes("delete"))) {
        type = "service_cancelled"; tag = "Servis Dibatalkan";
        text = `membatalkan servis`;
      } else if (action.includes("payment") || action.includes("income") || action.includes("expense")) {
        type = "payment_received"; tag = "Pembayaran";
        text = `mencatat pembayaran`;
      } else if (action.includes("shift") && action.includes("open")) {
        type = "shift_opened"; tag = "Shift";
        text = `membuka shift toko`;
      } else if (action.includes("shift") && action.includes("close")) {
        type = "shift_closed"; tag = "Akhiri Shift";
        text = `menutup shift`;
      } else if (action.includes("stock") || action.includes("sparepart")) {
        type = "stock_used"; tag = "Sparepart";
        text = `mencatat penggunaan sparepart`;
      } else if (action.includes("pos") && action.includes("sale")) {
        type = "purchase_created"; tag = "POS";
        text = `membuat penjualan POS`;
      } else if (action.includes("adjust")) {
        type = "note_added"; tag = "Penyesuaian";
        text = `melakukan penyesuaian saldo`;
      }

      const details = log.details || null;
      actLog.push({
        id: log.id,
        type,
        user: actorName,
        text,
        tag,
        time: new Date(log.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        groupKey: "today",
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

    /* ══ FINANCE TAB ══ */
    const totalIn = movements
      .filter((m: any) => m.direction === "IN")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const totalOut = movements
      .filter((m: any) => m.direction === "OUT")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    // Ensure cash in/out reflects real revenue even when movement records are sparse
    const effectiveCashIn = Math.max(totalIn, serviceRevenue + posRevenue);
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

    const result: DashboardData = {
      general: {
        revenue: totalRevenue,
        totalActivity,
        netProfit,
        revenueTrend,
        branchRevenueTrend,
        recentActivity: actLog.slice(0, 30),
        todayActivityCounts,
        needActions,
        shiftStatuses,
        serviceCompletedToday: completedServices.filter((s: any) => (s.done_at || "").startsWith(todayStr)).length,
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
        serviceUncollectedCount: 0,
        pipelineData,
        recentServices,
        needAttention,
        techPerformances,
      },
      finance: {
        revenueTrend,
        totalRevenue,
        cashIn: effectiveCashIn,
        cashOut: effectiveCashOut,
        netCashflow: effectiveCashIn - effectiveCashOut,
        mdrAmount: totalMdr,
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

    console.log("[dashboard] summary", {
      revenue: totalRevenue,
      posRevenue, serviceRevenue, otherIncome,
      totalActivity,
      netProfit,
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
