import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface UsageSummary {
  totalBrands: number;
  totalBranches: number;
  totalUsers: number;
  totalTransactionsMonth: number;
  totalRevenueMonth: number;
  totalServicesMonth: number;
}

export interface PerTenantUsage {
  brandId: number;
  brandName: string;
  brandSlug: string;
  brandStatus: string;
  plan: string;
  branchCount: number;
  branchLimit: number;
  userCount: number;
  userLimit: number;
  transactionsMonth: number;
  revenueMonth: number;
}

export interface MonthlyTransactionTrend {
  month: string;
  transactions: number;
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const supabase = createServiceRoleSupabaseClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const [
    brandsCount,
    branchesCount,
    usersCount,
    transactionsCount,
    servicesCount,
    ledgerData,
  ] = await Promise.all([
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase.from("branches").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    (supabase as any)
      .from("v4_pos_sales_summary")
      .select("transaction_count")
      .gte("sale_date", startOfMonth)
      .lte("sale_date", endOfToday),
    (supabase as any)
      .from("services")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth),
    (supabase as any)
      .from("finance_ledger")
      .select("amount")
      .eq("direction", "CREDIT")
      .gte("ledger_date", startOfMonth)
      .lte("ledger_date", endOfToday),
  ]);

  const transactionRows = (transactionsCount?.data ?? []) as any[];
  const totalTransactions = transactionRows.reduce(
    (sum: number, r: any) => sum + (Number(r.transaction_count) || 0),
    0,
  );

  const ledgerRows = (ledgerData?.data ?? []) as any[];
  const totalRevenue = ledgerRows.reduce(
    (sum: number, r: any) => sum + Math.abs(Number(r.amount) || 0),
    0,
  );

  return {
    totalBrands: brandsCount.count ?? 0,
    totalBranches: branchesCount.count ?? 0,
    totalUsers: usersCount.count ?? 0,
    totalTransactionsMonth: totalTransactions,
    totalRevenueMonth: totalRevenue,
    totalServicesMonth: servicesCount.count ?? 0,
  };
}

export async function getPerTenantUsage(): Promise<PerTenantUsage[]> {
  const supabase = createServiceRoleSupabaseClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const [brandsResult, subsResult, branchesResult, membershipsResult, txResult, ledgerResult] =
    await Promise.all([
      supabase.from("brands").select("id, name, slug, status"),
      (supabase as any).from("licenses").select("brand_id, packages:package_id(slug, max_branches, max_users)"),
      (supabase as any).from("branches").select("brand_id, id").is("deleted_at", null),
      (supabase as any).from("user_brand_memberships").select("brand_id, id"),
      (supabase as any)
        .from("pos_transactions")
        .select("brand_id, id")
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfToday),
      (supabase as any)
        .from("finance_ledger")
        .select("brand_id, amount")
        .eq("direction", "CREDIT")
        .gte("ledger_date", startOfMonth)
        .lte("ledger_date", endOfToday),
    ]);

  const brands = (brandsResult.data ?? []) as any[];
  const subscriptions = (subsResult.data ?? []) as any[];
  const branchRows = (branchesResult?.data ?? []) as any[];
  const memberRows = (membershipsResult?.data ?? []) as any[];
  const txRows = (txResult?.data ?? []) as any[];
  const ledgerRows = (ledgerResult?.data ?? []) as any[];

  const subMap = new Map<number, any>();
  for (const s of subscriptions) {
    subMap.set(s.brand_id, {
      plan: s.packages?.slug ?? "none",
      max_branches: s.packages?.max_branches ?? 0,
      max_users: s.packages?.max_users ?? 0,
    });
  }

  const branchCountMap = new Map<number, number>();
  for (const b of branchRows) {
    branchCountMap.set(b.brand_id, (branchCountMap.get(b.brand_id) ?? 0) + 1);
  }

  const userCountMap = new Map<number, number>();
  for (const m of memberRows) {
    userCountMap.set(m.brand_id, (userCountMap.get(m.brand_id) ?? 0) + 1);
  }

  const txCountMap = new Map<number, number>();
  for (const t of txRows) {
    txCountMap.set(t.brand_id, (txCountMap.get(t.brand_id) ?? 0) + 1);
  }

  const revenueMap = new Map<number, number>();
  for (const l of ledgerRows) {
    const prev = revenueMap.get(l.brand_id) ?? 0;
    revenueMap.set(l.brand_id, prev + Math.abs(Number(l.amount) || 0));
  }

  return brands.map((brand) => {
    const sub = subMap.get(brand.id);
    return {
      brandId: brand.id,
      brandName: brand.name,
      brandSlug: brand.slug,
      brandStatus: brand.status,
      plan: sub?.plan ?? "none",
      branchCount: branchCountMap.get(brand.id) ?? 0,
      branchLimit: sub?.max_branches ?? 0,
      userCount: userCountMap.get(brand.id) ?? 0,
      userLimit: sub?.max_users ?? 0,
      transactionsMonth: txCountMap.get(brand.id) ?? 0,
      revenueMonth: revenueMap.get(brand.id) ?? 0,
    };
  });
}

export async function getMonthlyTransactionTrend(): Promise<MonthlyTransactionTrend[]> {
  const supabase = createServiceRoleSupabaseClient();
  const months: MonthlyTransactionTrend[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

    const { data, error } = await (supabase as any)
      .from("pos_transactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", end);

    months.push({
      month: monthStr,
      transactions: data ?? 0,
    });
  }

  return months;
}
