import { createServerSupabase } from "@/lib/supabase/server";

/* ── DTOs ── */

export interface RevenueMetrics {
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
  trend: number;
  posRevenue: number;
  serviceRevenue: number;
}

export interface MarginMetrics {
  revenue: number;
  cogs: number;
  expenses: number;
  marginPercent: number;
}

export interface InventoryAlertItem {
  itemName: string;
  currentStock: number;
  minStock: number;
  branchName: string;
}

export interface InventoryMetrics {
  totalItems: number;
  belowMinCount: number;
  outOfStockCount: number;
  alerts: InventoryAlertItem[];
  healthPercent: number;
}

export interface ServiceMetrics {
  pending: number;
  inProgress: number;
  readyPickup: number;
  overdueSla: number;
  warranty: number;
  totalActive: number;
}

export interface TechnicianMetricItem {
  profileId: string;
  name: string;
  completedCount: number;
  pendingCount: number;
  avgRepairHours: number;
}

export interface TechnicianMetrics {
  totalTechnicians: number;
  leaderboard: TechnicianMetricItem[];
  avgRepairTimeHours: number;
  pendingWorkload: number;
}

export interface CashMetrics {
  hasOpenShift: boolean;
  expectedCash: number;
  cashDifference: number;
  cashIn: number;
  cashOut: number;
  openingCash: number;
}

export interface CustomerMetrics {
  returningCount: number;
  newCount: number;
  inactive90d: number;
  totalCustomers: number;
}

export interface BranchMetricItem {
  branchId: string;
  name: string;
  revenue: number;
  marginPercent: number;
}

export interface BranchMetrics {
  topBranch: BranchMetricItem | null;
  worstBranch: BranchMetricItem | null;
  branchCount: number;
  branches: BranchMetricItem[];
}

export interface BusinessHealthResult {
  score: number;
  trend: "up" | "down" | "stable";
  contributors: {
    revenue: number;
    inventory: number;
    sla: number;
    finance: number;
    customer: number;
    technician: number;
  };
}

/* ── Helpers ── */

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function daysAgoRange(n: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
  return { start: start.toISOString(), end: now.toISOString() };
}

/* ── 1. Revenue Metrics ── */

export async function getRevenueMetrics(
  brandId: number,
  branchIds: string[],
): Promise<RevenueMetrics> {
  const supabase = await (createServerSupabase() as Promise<any>);
  const today = todayRange();
  const yesterday = daysAgoRange(1);
  const last7 = daysAgoRange(7);
  const last30 = daysAgoRange(30);

  const todayStart = today.start;
  const todayEnd = today.end;
  const yesterdayStart = yesterday.start;
  const yesterdayEnd = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
  const last7Start = last7.start;
  const last30Start = last30.start;
  const now = last30.end;

  const [sp, ps] = await Promise.all([
    (supabase as any)
      .from("service_payments")
      .select("gross_amount, paid_at, payment_status")
      .eq("brand_id", brandId)
      .in("branch_id", branchIds)
      .in("payment_status", ["COMPLETED"]),
    (supabase as any)
      .from("pos_sales")
      .select("gross_amount, sold_at, sale_status")
      .eq("brand_id", brandId)
      .in("branch_id", branchIds)
      .in("sale_status", ["COMPLETED"]),
  ]);

  const servicePayments: any[] = sp.data ?? [];
  const posSales: any[] = ps.data ?? [];

  function sumInRange(data: any[], field: string, start: string, end: string): number {
    return data
      .filter((r: any) => r[field] >= start && r[field] <= end)
      .reduce((s: number, r: any) => s + Number(r.gross_amount || 0), 0);
  }

  const todayRev = sumInRange(servicePayments, "paid_at", todayStart, todayEnd) +
    sumInRange(posSales, "sold_at", todayStart, todayEnd);
  const yesterdayRev = sumInRange(servicePayments, "paid_at", yesterdayStart, yesterdayEnd) +
    sumInRange(posSales, "sold_at", yesterdayStart, yesterdayEnd);
  const last7Rev = sumInRange(servicePayments, "paid_at", last7Start, now) +
    sumInRange(posSales, "sold_at", last7Start, now);
  const last30Rev = sumInRange(servicePayments, "paid_at", last30Start, now) +
    sumInRange(posSales, "sold_at", last30Start, now);

  const posRev = sumInRange(posSales, "sold_at", last30Start, now);
  const svcRev = sumInRange(servicePayments, "paid_at", last30Start, now);

  const trend = yesterdayRev > 0
    ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100)
    : 0;

  return {
    today: todayRev,
    yesterday: yesterdayRev,
    last7Days: last7Rev,
    last30Days: last30Rev,
    trend,
    posRevenue: posRev,
    serviceRevenue: svcRev,
  };
}

/* ── 2. Margin Metrics ── */

export async function getMarginMetrics(
  brandId: number,
  branchIds: string[],
): Promise<MarginMetrics> {
  const supabase = await (createServerSupabase() as Promise<any>);
  const { start } = daysAgoRange(30);

  const { data: ledger } = await (supabase as any)
    .from("finance_ledger")
    .select("entry_type, direction, amount")
    .eq("brand_id", brandId)
    .in("branch_id", branchIds)
    .gte("ledger_date", start.split("T")[0]);

  const rows: any[] = ledger ?? [];

  let revenue = 0;
  let cogs = 0;
  let expenses = 0;

  for (const r of rows) {
    const amt = Number(r.amount || 0);
    if (r.entry_type === "SERVICE_REVENUE" || r.entry_type === "POS_REVENUE" || r.entry_type === "OTHER_INCOME") {
      revenue += r.direction === "CREDIT" ? amt : -amt;
    } else if (r.entry_type === "COGS") {
      cogs += r.direction === "DEBIT" ? amt : -amt;
    } else if (r.entry_type === "OPERATING_EXPENSE" || r.entry_type === "MDR_EXPENSE") {
      expenses += r.direction === "DEBIT" ? amt : -amt;
    }
  }

  const totalCost = cogs + expenses;
  const marginPercent = revenue > 0 ? Math.round(((revenue - totalCost) / revenue) * 100) : 0;

  return { revenue, cogs, expenses, marginPercent };
}

/* ── 3. Inventory Metrics ── */

export async function getInventoryMetrics(
  brandId: number,
  branchIds: string[],
): Promise<InventoryMetrics> {
  const supabase = await (createServerSupabase() as Promise<any>);

  const [itemsRes, stocksRes] = await Promise.all([
    (supabase as any)
      .from("inventory_items")
      .select("id, name, min_stock, track_stock, is_active")
      .eq("brand_id", brandId)
      .eq("track_stock", true)
      .eq("is_active", true)
      .is("deleted_at", null),
    (supabase as any)
      .from("branch_inventory_stocks")
      .select("item_id, branch_id, current_stock")
      .eq("brand_id", brandId)
      .in("branch_id", branchIds),
  ]);

  const items: any[] = itemsRes.data ?? [];
  const stocks: any[] = stocksRes.data ?? [];

  const stockByItem = new Map<string, { current_stock: number; branch_id: string }[]>();
  for (const s of stocks) {
    const arr = stockByItem.get(s.item_id) ?? [];
    arr.push({ current_stock: Number(s.current_stock || 0), branch_id: s.branch_id });
    stockByItem.set(s.item_id, arr);
  }

  const itemMap = new Map(items.map((i: any) => [i.id, i]));

  let belowMinCount = 0;
  let outOfStockCount = 0;
  const alerts: InventoryAlertItem[] = [];

  for (const [itemId, branchStocks] of stockByItem) {
    const item = itemMap.get(itemId);
    if (!item) continue;
    const totalForItem = branchStocks.reduce((s, bs) => s + bs.current_stock, 0);

    if (totalForItem <= 0) {
      outOfStockCount++;
    }
    if (totalForItem <= Number(item.min_stock || 0)) {
      belowMinCount++;
      for (const bs of branchStocks) {
        if (bs.current_stock <= Number(item.min_stock || 0)) {
          alerts.push({
            itemName: item.name,
            currentStock: bs.current_stock,
            minStock: Number(item.min_stock || 0),
            branchName: bs.branch_id,
          });
        }
      }
    }
  }

  const totalItems = items.length;
  const healthyItems = totalItems - belowMinCount;
  const healthPercent = totalItems > 0 ? Math.round((healthyItems / totalItems) * 100) : 100;

  return { totalItems, belowMinCount, outOfStockCount, alerts, healthPercent };
}

/* ── 4. Service Metrics ── */

export async function getServiceMetrics(
  brandId: number,
  branchIds: string[],
): Promise<ServiceMetrics> {
  const supabase = await (createServerSupabase() as Promise<any>);

  const { data: services } = await (supabase as any)
    .from("services")
    .select("id, current_status, intake_at, done_at, warranty_until, picked_up_at")
    .eq("brand_id", brandId)
    .in("branch_id", branchIds)
    .is("deleted_at", null);

  const rows: any[] = services ?? [];

  const pending = rows.filter((s) => ["INTAKE", "DIAGNOSIS", "WAITING_APPROVAL"].includes(s.current_status)).length;
  const inProgress = rows.filter((s) => s.current_status === "REPAIRING").length;
  const readyPickup = rows.filter((s) => s.current_status === "QC" || (s.current_status === "DONE" && !s.picked_up_at)).length;
  const warranty = rows.filter((s) => s.warranty_until && new Date(s.warranty_until) > new Date()).length;

  // Overdue SLA: DONE services where completion exceeds 7 days from intake
  const overdueSla = rows.filter((s) => {
    if (!s.done_at || !s.intake_at) return false;
    const days = (new Date(s.done_at).getTime() - new Date(s.intake_at).getTime()) / 86400000;
    return days > 7;
  }).length;

  const totalActive = rows.filter((s) => s.current_status !== "DONE" && s.current_status !== "CANCELLED").length;

  return { pending, inProgress, readyPickup, overdueSla, warranty, totalActive };
}

/* ── 5. Technician Metrics ── */

export async function getTechnicianMetrics(
  brandId: number,
  branchIds: string[],
): Promise<TechnicianMetrics> {
  const supabase = await (createServerSupabase() as Promise<any>);

  // Get technician profiles
  const { data: membershipsData } = await (supabase as any)
    .from("user_brand_memberships")
    .select("profile_id, profiles:profile_id(id, name)")
    .eq("brand_id", brandId)
    .eq("role", "TECHNICIAN");

  const memberships: any[] = membershipsData ?? [];

  const techProfiles = new Map<string, string>();
  for (const m of memberships) {
    const p = m.profiles;
    if (p) techProfiles.set(p.id, p.name ?? p.id);
  }

  const techIds = [...techProfiles.keys()];
  if (techIds.length === 0) {
    return { totalTechnicians: 0, leaderboard: [], avgRepairTimeHours: 0, pendingWorkload: 0 };
  }

  // Get completed services per technician (last 30 days)
  const { start } = daysAgoRange(30);
  const { data: servicesData } = await (supabase as any)
    .from("services")
    .select("id, assigned_technician_id, current_status, intake_at, done_at, created_at")
    .eq("brand_id", brandId)
    .in("branch_id", branchIds)
    .in("assigned_technician_id", techIds)
    .is("deleted_at", null);

  const rows: any[] = servicesData ?? [];

  // Group by technician
  const techMap = new Map<string, { completed: number; pending: number; totalRepairMs: number; count: number }>();
  for (const id of techIds) {
    techMap.set(id, { completed: 0, pending: 0, totalRepairMs: 0, count: 0 });
  }

  for (const s of rows) {
    const tid = s.assigned_technician_id;
    if (!tid || !techMap.has(tid)) continue;
    const entry = techMap.get(tid)!;
    if (s.current_status === "DONE") {
      entry.completed++;
      if (s.intake_at && s.done_at) {
        entry.totalRepairMs += new Date(s.done_at).getTime() - new Date(s.intake_at).getTime();
        entry.count++;
      }
    }
    if (s.current_status !== "DONE" && s.current_status !== "CANCELLED") {
      entry.pending++;
    }
  }

  let totalRepairMs = 0;
  let totalCount = 0;
  let totalPending = 0;
  const leaderboard: TechnicianMetricItem[] = [];

  for (const [profileId, stats] of techMap) {
    totalRepairMs += stats.totalRepairMs;
    totalCount += stats.count;
    totalPending += stats.pending;
    leaderboard.push({
      profileId,
      name: techProfiles.get(profileId) ?? "Unknown",
      completedCount: stats.completed,
      pendingCount: stats.pending,
      avgRepairHours: stats.count > 0 ? Math.round((stats.totalRepairMs / stats.count) / 3600000) : 0,
    });
  }

  leaderboard.sort((a, b) => b.completedCount - a.completedCount);

  const avgRepairTimeHours = totalCount > 0 ? Math.round(totalRepairMs / totalCount / 3600000) : 0;

  return {
    totalTechnicians: techIds.length,
    leaderboard,
    avgRepairTimeHours,
    pendingWorkload: totalPending,
  };
}

/* ── 6. Cash Metrics ── */

export async function getCashMetrics(
  brandId: number,
  branchIds: string[],
): Promise<CashMetrics> {
  const supabase = await (createServerSupabase() as Promise<any>);

  const { data: shiftsData } = await (supabase as any)
    .from("store_shifts")
    .select("id, opening_cash, expected_closing_cash, counted_closing_cash, cash_difference, shift_status")
    .eq("brand_id", brandId)
    .in("branch_id", branchIds)
    .order("created_at", { ascending: false })
    .limit(10);

  const shifts: any[] = shiftsData ?? [];

  const openShift = shifts.find((s) => s.shift_status === "OPEN");
  const lastClosed = shifts.find((s) => s.shift_status === "CLOSED");

  if (!openShift) {
    return {
      hasOpenShift: false,
      expectedCash: lastClosed ? Number(lastClosed.expected_closing_cash || 0) : 0,
      cashDifference: lastClosed ? Number(lastClosed.cash_difference || 0) : 0,
      cashIn: 0,
      cashOut: 0,
      openingCash: lastClosed ? Number(lastClosed.opening_cash || 0) : 0,
    };
  }

  // Get cash movements for the current open shift
  const { data: movementsData } = await (supabase as any)
    .from("store_shift_cash_movements")
    .select("direction, amount")
    .eq("shift_id", openShift.id);

  const movs: any[] = movementsData ?? [];
  const cashIn = movs.filter((m) => m.direction === "IN").reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
  const cashOut = movs.filter((m) => m.direction === "OUT").reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

  return {
    hasOpenShift: true,
    expectedCash: Number(openShift.expected_closing_cash || 0),
    cashDifference: 0,
    cashIn,
    cashOut,
    openingCash: Number(openShift.opening_cash || 0),
  };
}

/* ── 7. Customer Metrics ── */

export async function getCustomerMetrics(
  brandId: number,
  branchIds: string[],
): Promise<CustomerMetrics> {
  const supabase = await (createServerSupabase() as Promise<any>);
  const cutoff90d = new Date(Date.now() - 90 * 86400000).toISOString();

  const [custRes, serviceRes] = await Promise.all([
    (supabase as any)
      .from("customers")
      .select("id, created_at")
      .eq("brand_id", brandId)
      .is("deleted_at", null),
    (supabase as any)
      .from("services")
      .select("customer_id, created_at")
      .eq("brand_id", brandId)
      .in("branch_id", branchIds)
      .is("deleted_at", null),
  ]);

  const customers: any[] = custRes.data ?? [];
  const allServices: any[] = serviceRes.data ?? [];

  const totalCustomers = customers.length;

  // New = first service within last 90 days
  const newCount = customers.filter((c) => {
    const firstVisit = allServices.find((s) => s.customer_id === c.id);
    return firstVisit && new Date(firstVisit.created_at) >= new Date(cutoff90d);
  }).length;

  // Returning = has more than 1 service
  const visitCount = new Map<string, number>();
  for (const s of allServices) {
    if (s.customer_id) visitCount.set(s.customer_id, (visitCount.get(s.customer_id) ?? 0) + 1);
  }
  const returningCount = [...visitCount.values()].filter(c => c > 1).length;

  // Inactive 90d: last service was >90 days ago
  const lastVisit = new Map<string, string>();
  for (const s of allServices) {
    if (s.customer_id && (!lastVisit.has(s.customer_id) || s.created_at > lastVisit.get(s.customer_id)!)) {
      lastVisit.set(s.customer_id, s.created_at);
    }
  }
  const inactive90d = [...lastVisit.values()].filter(d => d < cutoff90d).length;

  return { returningCount, newCount, inactive90d, totalCustomers };
}

/* ── 8. Branch Metrics ── */

export async function getBranchMetrics(
  brandId: number,
  branchIds: string[],
): Promise<BranchMetrics> {
  const supabase = await (createServerSupabase() as Promise<any>);

  const [branchRes, spRes, psRes] = await Promise.all([
    (supabase as any)
      .from("branches")
      .select("id, name")
      .eq("brand_id", brandId)
      .in("id", branchIds)
      .eq("is_active", true)
      .is("deleted_at", null),
    (supabase as any)
      .from("service_payments")
      .select("branch_id, gross_amount")
      .eq("brand_id", brandId)
      .in("branch_id", branchIds)
      .in("payment_status", ["COMPLETED"]),
    (supabase as any)
      .from("pos_sales")
      .select("branch_id, gross_amount")
      .eq("brand_id", brandId)
      .in("branch_id", branchIds)
      .in("sale_status", ["COMPLETED"]),
  ]);

  const branches: any[] = branchRes.data ?? [];
  const spData: any[] = spRes.data ?? [];
  const psData: any[] = psRes.data ?? [];

  const branchNames = new Map(branches.map((b) => [b.id, b.name]));

  const revByBranch = new Map<string, number>();
  for (const b of branches) revByBranch.set(b.id, 0);
  for (const p of spData) {
    const cur = revByBranch.get(p.branch_id) ?? 0;
    revByBranch.set(p.branch_id, cur + Number(p.gross_amount || 0));
  }
  for (const p of psData) {
    const cur = revByBranch.get(p.branch_id) ?? 0;
    revByBranch.set(p.branch_id, cur + Number(p.gross_amount || 0));
  }

  const branchList: BranchMetricItem[] = branches.map((b) => ({
    branchId: b.id,
    name: branchNames.get(b.id) ?? "Unknown",
    revenue: revByBranch.get(b.id) ?? 0,
    marginPercent: 0,
  }));

  branchList.sort((a, b) => b.revenue - a.revenue);

  return {
    topBranch: branchList[0] ?? null,
    worstBranch: branchList.length > 1 ? branchList[branchList.length - 1] : null,
    branchCount: branches.length,
    branches: branchList,
  };
}

/* ── 9. Business Health (aggregator) ── */

export async function getBusinessHealth(
  brandId: number,
  branchIds: string[],
): Promise<BusinessHealthResult> {
  const [revenue, margin, inventory, service, tech, cust] = await Promise.all([
    getRevenueMetrics(brandId, branchIds),
    getMarginMetrics(brandId, branchIds),
    getInventoryMetrics(brandId, branchIds),
    getServiceMetrics(brandId, branchIds),
    getTechnicianMetrics(brandId, branchIds),
    getCustomerMetrics(brandId, branchIds),
  ]);

  // Revenue Trend (20%)
  const revenueScore = Math.min(100, Math.max(0, 50 + revenue.trend * 5));

  // Profit Margin (20%)
  const marginScore = margin.revenue > 0 ? Math.min(100, Math.max(0, margin.marginPercent * 2)) : 50;

  // Inventory Health (15%)
  const invScore = inventory.healthPercent;

  // SLA Compliance (15%)
  const slaScore = service.overdueSla > 0
    ? Math.max(0, 100 - service.overdueSla * 10)
    : 100;

  // Technician Productivity (10%)
  const avgPending = tech.totalTechnicians > 0 ? tech.pendingWorkload / tech.totalTechnicians : 0;
  const techScore = Math.max(0, 100 - avgPending * 5);

  // Cash Difference (10%) — not available for current open shifts, use default
  const cashScore = 80;

  // Customer Return Rate (10%)
  const returnRate = cust.totalCustomers > 0 ? (cust.returningCount / cust.totalCustomers) * 100 : 50;
  const custScore = returnRate;

  const score = Math.round(
    revenueScore * 0.20 +
    marginScore * 0.20 +
    invScore * 0.15 +
    slaScore * 0.15 +
    techScore * 0.10 +
    cashScore * 0.10 +
    custScore * 0.10,
  );

  const trend: "up" | "down" | "stable" = revenue.trend > 5 ? "up" : revenue.trend < -5 ? "down" : "stable";

  return {
    score,
    trend,
    contributors: {
      revenue: Math.round(revenueScore),
      inventory: Math.round(invScore),
      sla: Math.round(slaScore),
      finance: Math.round(marginScore),
      customer: Math.round(custScore),
      technician: Math.round(techScore),
    },
  };
}
