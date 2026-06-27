import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface PackageRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  maxBranches: number;
  maxUsers: number;
  maxStorageMb: number;
  maxTransactions: number;
  isActive: boolean;
}

export interface SubscriptionRow {
  id: string;
  brandId: number;
  brandName: string;
  plan: string;
  packageName: string | null;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  maxBranches: number;
  maxUsers: number;
}

export interface PlatformDashboardData {
  totalBrands: number;
  totalBranches: number;
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  trialAccounts: number;
  monthlyRevenue: number;
  annualRevenue: number;
}

export interface BrandSummary {
  id: number;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  branchCount: number;
  userCount: number;
  subscription: {
    plan: string;
    status: string;
  } | null;
}

export interface SubscriptionSummary {
  id: string;
  brandId: number;
  brandName: string;
  plan: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
}

export async function getPlatformDashboardData(): Promise<PlatformDashboardData> {
  const supabase = createServiceRoleSupabaseClient();

  const [brandsCount, branchesCount, usersCount, subscriptionsResult, packagesResult] = await Promise.all([
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase
      .from("branches")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    (supabase as any)
      .from("brand_subscriptions")
      .select("id, plan, status, package_id"),
    (supabase as any)
      .from("packages")
      .select("id, price"),
  ]);

  const totalBrands = brandsCount.count ?? 0;
  const totalBranches = branchesCount.count ?? 0;
  const totalUsers = usersCount.count ?? 0;

  const subRows = (subscriptionsResult.data ?? []) as any[];
  const activeSubscriptions = subRows.filter((s: any) => s.status === "active").length;
  const expiredSubscriptions = subRows.filter((s: any) => s.status === "expired" || s.status === "cancelled").length;
  const trialAccounts = subRows.filter((s: any) => s.status === "trial").length;

  // Platform revenue = subscription fees from active brands
  const packagePriceMap = new Map<string, number>();
  for (const pkg of (packagesResult.data ?? []) as any[]) {
    packagePriceMap.set(pkg.id, Number(pkg.price) || 0);
  }

  let monthlyRevenue = 0;
  for (const sub of subRows) {
    if (sub.status === "active" || sub.status === "trial") {
      let price = 0;
      if (sub.package_id && packagePriceMap.has(sub.package_id)) {
        price = packagePriceMap.get(sub.package_id)!;
      } else {
        // Fallback: use plan-based pricing
        const planPrices: Record<string, number> = { starter: 0, pro: 299000, enterprise: 999000 };
        price = planPrices[sub.plan] ?? 0;
      }
      monthlyRevenue += price;
    }
  }

  const annualRevenue = monthlyRevenue * 12;

  return {
    totalBrands,
    totalBranches,
    totalUsers,
    activeSubscriptions,
    expiredSubscriptions,
    trialAccounts,
    monthlyRevenue,
    annualRevenue,
  };
}

export interface TenantRow {
  id: number;
  name: string;
  slug: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string;
  subscriptionStatus: string;
  brandStatus: string;
  branchCount: number;
  userCount: number;
  createdAt: string;
}

export async function getTenantsList(): Promise<TenantRow[]> {
  const supabase = createServiceRoleSupabaseClient();

  const [brandsResult, subscriptionsResult, branchCountsResult, userCountsResult] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, slug, owner_name, owner_email, status, created_at")
      .order("created_at", { ascending: false }),
    (supabase as any)
      .from("brand_subscriptions")
      .select("brand_id, plan, status"),
    supabase
      .from("branches")
      .select("brand_id, id", { count: "exact", head: false })
      .is("deleted_at", null),
    supabase
      .from("user_brand_memberships")
      .select("brand_id, id", { count: "exact", head: false }),
  ]);

  const brands = (brandsResult.data ?? []) as any[];
  const subscriptions = (subscriptionsResult.data ?? []) as any[];
  const branchRows = (branchCountsResult.data ?? []) as any[];
  const userRows = (userCountsResult.data ?? []) as any[];

  const subMap = new Map<number, { plan: string; status: string }>();
  for (const s of subscriptions) {
    subMap.set(s.brand_id, { plan: s.plan, status: s.status });
  }

  const branchCountMap = new Map<number, number>();
  for (const b of branchRows) {
    branchCountMap.set(b.brand_id, (branchCountMap.get(b.brand_id) ?? 0) + 1);
  }

  const userCountMap = new Map<number, number>();
  for (const u of userRows) {
    userCountMap.set(u.brand_id, (userCountMap.get(u.brand_id) ?? 0) + 1);
  }

  return brands.map((b: any): TenantRow => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    ownerName: b.owner_name,
    ownerEmail: b.owner_email,
    plan: subMap.get(b.id)?.plan ?? "starter",
    subscriptionStatus: subMap.get(b.id)?.status ?? "active",
    brandStatus: b.status ?? "active",
    branchCount: branchCountMap.get(b.id) ?? 0,
    userCount: userCountMap.get(b.id) ?? 0,
    createdAt: b.created_at,
  }));
}

export async function getPackagesList(): Promise<PackageRow[]> {
  const supabase = createServiceRoleSupabaseClient();

  const { data } = await (supabase as any)
    .from("packages")
    .select("*")
    .order("price", { ascending: true });

  const rows = (data ?? []) as any[];
  return rows.map((r: any): PackageRow => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: r.price,
    maxBranches: r.max_branches,
    maxUsers: r.max_users,
    maxStorageMb: r.max_storage_mb,
    maxTransactions: r.max_transactions,
    isActive: r.is_active,
  }));
}

export async function getPackageById(id: string): Promise<PackageRow | null> {
  const supabase = createServiceRoleSupabaseClient();

  const { data } = await (supabase as any)
    .from("packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const r = data as any;
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: r.price,
    maxBranches: r.max_branches,
    maxUsers: r.max_users,
    maxStorageMb: r.max_storage_mb,
    maxTransactions: r.max_transactions,
    isActive: r.is_active,
  };
}

export async function createPackage(input: {
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  maxBranches: number;
  maxUsers: number;
  maxStorageMb: number;
  maxTransactions: number;
}): Promise<PackageRow> {
  const supabase = createServiceRoleSupabaseClient();

  const { data, error } = await (supabase as any)
    .from("packages")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      price: input.price,
      max_branches: input.maxBranches,
      max_users: input.maxUsers,
      max_storage_mb: input.maxStorageMb,
      max_transactions: input.maxTransactions,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const r = data as any;
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: r.price,
    maxBranches: r.max_branches,
    maxUsers: r.max_users,
    maxStorageMb: r.max_storage_mb,
    maxTransactions: r.max_transactions,
    isActive: r.is_active,
  };
}

export async function updatePackage(id: string, input: {
  name?: string;
  description?: string | null;
  price?: number;
  maxBranches?: number;
  maxUsers?: number;
  maxStorageMb?: number;
  maxTransactions?: number;
  isActive?: boolean;
}): Promise<PackageRow> {
  const supabase = createServiceRoleSupabaseClient();

  const payload: any = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.price !== undefined) payload.price = input.price;
  if (input.maxBranches !== undefined) payload.max_branches = input.maxBranches;
  if (input.maxUsers !== undefined) payload.max_users = input.maxUsers;
  if (input.maxStorageMb !== undefined) payload.max_storage_mb = input.maxStorageMb;
  if (input.maxTransactions !== undefined) payload.max_transactions = input.maxTransactions;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const { data, error } = await (supabase as any)
    .from("packages")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  const r = data as any;
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: r.price,
    maxBranches: r.max_branches,
    maxUsers: r.max_users,
    maxStorageMb: r.max_storage_mb,
    maxTransactions: r.max_transactions,
    isActive: r.is_active,
  };
}

export async function getSubscriptionsList(): Promise<SubscriptionRow[]> {
  const supabase = createServiceRoleSupabaseClient();

  const [brandsResult, subsResult] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name"),
    (supabase as any)
      .from("brand_subscriptions")
      .select("*, packages!left(name)"),
  ]);

  const brandMap = new Map<number, string>();
  for (const b of (brandsResult.data ?? []) as any[]) {
    brandMap.set(b.id, b.name);
  }

  const rows = (subsResult.data ?? []) as any[];
  return rows.map((r: any): SubscriptionRow => ({
    id: r.id,
    brandId: r.brand_id,
    brandName: brandMap.get(r.brand_id) ?? `Brand #${r.brand_id}`,
    plan: r.plan,
    packageName: r.packages?.name ?? null,
    status: r.status,
    startedAt: r.started_at,
    expiresAt: r.expires_at,
    maxBranches: r.max_branches,
    maxUsers: r.max_users ?? 5,
  }));
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  churn: number;
  totalBrands: number;
  totalActiveUsers: number;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
}

export interface RevenueByPackage {
  package: string;
  revenue: number;
  brandCount: number;
}

export interface SubscriptionGrowthPoint {
  month: string;
  total: number;
  active: number;
}

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const supabase = createServiceRoleSupabaseClient();

  const [activeSubsResult, totalBrandsResult, userCountResult] = await Promise.all([
    (supabase as any)
      .from("brand_subscriptions")
      .select("plan, status, brands!inner(id)"),
    supabase
      .from("brands")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("user_brand_memberships")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const allSubs = (activeSubsResult.data ?? []) as any[];
  const activeSubs = allSubs.filter((s: any) => s.status === "active");

  const planPrices: Record<string, number> = {
    starter: 0,
    pro: 299000,
    enterprise: 999000,
  };

  const mrr = activeSubs.reduce(
    (sum: number, s: any) => sum + (planPrices[s.plan] ?? 0),
    0
  );
  const arr = mrr * 12;
  const totalActiveUsers = userCountResult.count ?? 0;
  const arpu = totalActiveUsers > 0 ? Math.round(mrr / totalActiveUsers) : 0;
  const totalBrands = totalBrandsResult.count ?? 0;
  const churnTotal = allSubs.filter(
    (s: any) => s.status === "expired" || s.status === "cancelled"
  ).length;
  const churn = totalBrands > 0 ? Math.round((churnTotal / totalBrands) * 100) : 0;

  return { mrr, arr, arpu, churn, totalBrands, totalActiveUsers };
}

export async function getRevenueTrend(): Promise<RevenueTrendPoint[]> {
  const supabase = createServiceRoleSupabaseClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate = sixMonthsAgo.toISOString().split("T")[0];

  const { data } = await supabase
    .from("finance_ledger")
    .select("amount, ledger_date")
    .eq("direction", "CREDIT")
    .gte("ledger_date", startDate)
    .order("ledger_date", { ascending: true });

  const rows = (data ?? []) as any[];
  const monthMap = new Map<string, number>();

  for (const r of rows) {
    const month = (r.ledger_date ?? "").slice(0, 7);
    if (!month) continue;
    monthMap.set(month, (monthMap.get(month) ?? 0) + Number(r.amount || 0));
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({
      month,
      revenue,
    }));
}

export async function getRevenueByPackage(): Promise<RevenueByPackage[]> {
  const supabase = createServiceRoleSupabaseClient();

  const { data } = await (supabase as any)
    .from("brand_subscriptions")
    .select("plan, brand_id");

  const rows = (data ?? []) as any[];
  const planMap = new Map<string, { revenue: number; brandCount: number }>();

  const planPrices: Record<string, number> = {
    starter: 0,
    pro: 299000,
    enterprise: 999000,
  };

  for (const r of rows) {
    const plan = r.plan || "starter";
    const entry = planMap.get(plan) ?? { revenue: 0, brandCount: 0 };
    entry.revenue += planPrices[plan] ?? 0;
    entry.brandCount++;
    planMap.set(plan, entry);
  }

  return Array.from(planMap.entries())
    .map(([pkg, data]) => ({
      package: pkg,
      revenue: data.revenue,
      brandCount: data.brandCount,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getSubscriptionGrowth(): Promise<SubscriptionGrowthPoint[]> {
  const supabase = createServiceRoleSupabaseClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate = sixMonthsAgo.toISOString();

  const { data } = await (supabase as any)
    .from("brand_subscriptions")
    .select("started_at, status, created_at")
    .gte("created_at", startDate)
    .order("created_at", { ascending: true });

  const allRows = (data ?? []) as any[];

  const monthMap = new Map<string, { total: number; active: number }>();

  for (const r of allRows) {
    const month = (r.created_at ?? r.started_at ?? "").slice(0, 7);
    if (!month) continue;
    const entry = monthMap.get(month) ?? { total: 0, active: 0 };
    entry.total++;
    if (r.status === "active") entry.active++;
    monthMap.set(month, entry);
  }

  let cumulativeTotal = 0;
  let cumulativeActive = 0;
  const result: SubscriptionGrowthPoint[] = [];

  const sorted = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [month, entry] of sorted) {
    cumulativeTotal += entry.total;
    cumulativeActive += entry.active;
    result.push({
      month,
      total: cumulativeTotal,
      active: cumulativeActive,
    });
  }

  return result;
}

export type HealthStatus = "healthy" | "warning" | "critical";

export interface SystemHealthItem {
  component: string;
  status: HealthStatus;
  message: string;
  latencyMs: number;
}

export interface PlatformAuditLogRow {
  id: string;
  brandId: number | null;
  brandName: string | null;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetLabel: string | null;
  description: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface PlatformAuditLogQueryParams {
  startDate?: string;
  endDate?: string;
  actions?: string[] | null;
  searchQuery?: string | null;
  limit?: number;
  offset?: number;
}

export const PLATFORM_ACTION_TYPES = [
  "BRAND_CREATED",
  "BRAND_PROFILE_UPDATED",
  "BRANCH_CREATED",
  "BRANCH_UPDATED",
  "BRANCH_DEACTIVATED",
  "BRANCH_ACTIVATED",
  "SUBSCRIPTION_CHANGED",
  "SUBSCRIPTION_UPDATED",
  "FACTORY_RESET",
  "EXPORT_BRAND_CONFIG",
  "EXPORT_USERS",
  "EXPORT_CUSTOMERS",
  "EXPORT_SERVICES",
  "EXPORT_INVENTORY",
  "EXPORT_FINANCE",
  "EXPORT_FULL_BACKUP",
  "LOGIN_AS_TENANT",
] as const;

export async function getPlatformAuditLogs(
  params: PlatformAuditLogQueryParams,
): Promise<{ rows: PlatformAuditLogRow[]; total: number }> {
  const supabase = createServiceRoleSupabaseClient();
  const limit = params.limit ?? 25;
  const offset = params.offset ?? 0;

  let query = (supabase as any)
    .from("audit_logs")
    .select(`
      id,
      brand_id,
      actor_id,
      action,
      target_type,
      target_id,
      target_label,
      description,
      details,
      ip_address,
      request_id,
      created_at,
      profiles!audit_logs_actor_id_fkey(name, email),
      brands!audit_logs_brand_id_fkey(name)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.startDate) {
    query = query.gte("created_at", params.startDate);
  }
  if (params.endDate) {
    query = query.lte("created_at", params.endDate);
  }
  if (params.actions && params.actions.length > 0) {
    query = query.in("action", params.actions);
  }
  if (params.searchQuery) {
    const q = `%${params.searchQuery}%`;
    query = query.or(
      `profiles.name.ilike.${q},profiles.email.ilike.${q},description.ilike.${q},action.ilike.${q},target_label.ilike.${q},target_type.ilike.${q}`,
    );
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const rows: PlatformAuditLogRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    brandId: r.brand_id,
    brandName: r.brands?.name ?? null,
    actorId: r.actor_id,
    actorName: r.profiles?.name ?? null,
    actorEmail: r.profiles?.email ?? null,
    action: r.action,
    targetType: r.target_type,
    targetLabel: r.target_label,
    description: r.description,
    details: r.details as Record<string, any> | null,
    ipAddress: r.ip_address ?? null,
    requestId: r.request_id ?? null,
    createdAt: r.created_at,
  }));

  return { rows, total: count ?? rows.length };
}

export async function logPlatformAction(params: {
  brandId?: number | null;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType?: string;
  targetLabel?: string;
  description?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  requestId?: string | null;
}): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const { error } = await (supabase as any)
    .from("audit_logs")
    .insert({
      brand_id: params.brandId ?? null,
      actor_id: params.actorId,
      actor_name: params.actorName,
      actor_role: params.actorRole,
      action: params.action,
      target_type: params.targetType ?? null,
      target_label: params.targetLabel ?? null,
      description: params.description ?? null,
      details: params.details ?? {},
      ip_address: params.ipAddress ?? null,
      request_id: params.requestId ?? null,
      created_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
}

export async function checkSystemHealth(): Promise<SystemHealthItem[]> {
  const results: SystemHealthItem[] = [];

  /* ── Database ── */
  {
    const start = Date.now();
    try {
      const supabase = createServiceRoleSupabaseClient();
      const { error } = await supabase.from("brands").select("id", { count: "exact", head: true });
      const latency = Date.now() - start;
      if (error) {
        results.push({ component: "Database", status: "critical", message: error.message, latencyMs: latency });
      } else {
        results.push({ component: "Database", status: "healthy", message: "Connected and responsive", latencyMs: latency });
      }
    } catch (err: any) {
      results.push({ component: "Database", status: "critical", message: err.message, latencyMs: Date.now() - start });
    }
  }

  /* ── Storage ── */
  {
    const start = Date.now();
    try {
      const supabase = createServiceRoleSupabaseClient();
      const { data, error } = await supabase.storage.listBuckets();
      const latency = Date.now() - start;
      if (error) {
        results.push({ component: "Storage", status: "warning", message: error.message, latencyMs: latency });
      } else if (!data || data.length === 0) {
        results.push({ component: "Storage", status: "warning", message: "No buckets found", latencyMs: latency });
      } else {
        results.push({ component: "Storage", status: "healthy", message: `${data.length} bucket(s) available`, latencyMs: latency });
      }
    } catch (err: any) {
      results.push({ component: "Storage", status: "warning", message: err.message, latencyMs: Date.now() - start });
    }
  }

  /* ── Email ── */
  {
    const start = Date.now();
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const resendKey = process.env.RESEND_API_KEY;
    const latency = Date.now() - start;
    if (smtpHost || resendKey) {
      results.push({
        component: "Email",
        status: "healthy",
        message: smtpHost ? `SMTP configured (${smtpHost})` : "Resend API configured",
        latencyMs: latency,
      });
    } else {
      results.push({
        component: "Email",
        status: "warning",
        message: "No email provider configured",
        latencyMs: latency,
      });
    }
  }

  /* ── Background Jobs ── */
  {
    const start = Date.now();
    try {
      const supabase = createServiceRoleSupabaseClient();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo);
      const latency = Date.now() - start;
      if (error) {
        results.push({ component: "Background Jobs", status: "warning", message: error.message, latencyMs: latency });
      } else {
        results.push({
          component: "Background Jobs",
          status: "healthy",
          message: `${count ?? 0} events in last 7 days`,
          latencyMs: latency,
        });
      }
    } catch (err: any) {
      results.push({ component: "Background Jobs", status: "warning", message: err.message, latencyMs: Date.now() - start });
    }
  }

  /* ── API ── */
  {
    const start = Date.now();
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${appUrl}/api/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      const latency = Date.now() - start;
      if (response && response.ok) {
        results.push({ component: "API", status: "healthy", message: "API responding", latencyMs: latency });
      } else if (response) {
        results.push({ component: "API", status: "warning", message: `API returned ${response.status}`, latencyMs: latency });
      } else {
        results.push({ component: "API", status: "warning", message: "No API health endpoint (ok for dev)", latencyMs: latency });
      }
    } catch (err: any) {
      results.push({ component: "API", status: "warning", message: err.message, latencyMs: Date.now() - start });
    }
  }

  return results;
}
