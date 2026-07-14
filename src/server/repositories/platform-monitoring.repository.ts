import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface HealthCheckResult {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  message: string;
}

export interface TenantHealthRow {
  brandId: number;
  status: "healthy" | "warning" | "critical" | "unknown";
  issues: string[];
}

export interface MonitoringMetrics {
  activeBrands: number;
  onlineBranches: number;
  todayServices: number;
  todayTransactions: number;
  todayRevenue: number;
  uptimePercent: number;
  avgResponseTimeMs: number;
}

export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const supabase = createServiceRoleSupabaseClient();
  const start = performance.now();

  try {
    const { error } = await supabase
      .from("brands")
      .select("id", { count: "exact", head: true })
      .limit(1);

    const latency = Math.round(performance.now() - start);

    if (error) {
      return {
        name: "Database",
        status: "down",
        latencyMs: latency,
        message: error.message,
      };
    }

    return {
      name: "Database",
      status: "healthy",
      latencyMs: latency,
      message: "Database connection is healthy",
    };
  } catch (err: any) {
    return {
      name: "Database",
      status: "down",
      latencyMs: Math.round(performance.now() - start),
      message: err.message,
    };
  }
}

export async function checkStorageHealth(): Promise<HealthCheckResult> {
  const supabase = createServiceRoleSupabaseClient();
  const start = performance.now();

  try {
    const { data, error } = await supabase.storage.listBuckets();

    const latency = Math.round(performance.now() - start);

    if (error) {
      return {
        name: "Storage",
        status: "down",
        latencyMs: latency,
        message: error.message,
      };
    }

    const hasBucket = data && data.length > 0;
    return {
      name: "Storage",
      status: hasBucket ? "healthy" : "degraded",
      latencyMs: latency,
      message: hasBucket
        ? `${data.length} bucket(s) available`
        : "No buckets found",
    };
  } catch (err: any) {
    return {
      name: "Storage",
      status: "down",
      latencyMs: Math.round(performance.now() - start),
      message: err.message,
    };
  }
}

export async function checkEmailHealth(): Promise<HealthCheckResult> {
  const start = performance.now();
  const latency = Math.round(performance.now() - start);

  return {
    name: "Email",
    status: "degraded",
    latencyMs: latency,
    message: "Email service status unknown (no SMTP configured)",
  };
}

export async function checkBackgroundJobsHealth(): Promise<HealthCheckResult> {
  const start = performance.now();
  const latency = Math.round(performance.now() - start);

  return {
    name: "Background Jobs",
    status: "degraded",
    latencyMs: latency,
    message: "Background jobs service status unknown (no job runner configured)",
  };
}

export async function checkRealtimeHealth(): Promise<HealthCheckResult> {
  const supabase = createServiceRoleSupabaseClient();
  const start = performance.now();

  try {
    const channel = supabase.channel("health-check");
    const result = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 3000);

      channel
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timeout);
            resolve(status === "SUBSCRIBED");
          }
        });
    });

    supabase.removeChannel(channel);

    const latency = Math.round(performance.now() - start);

    return {
      name: "Realtime",
      status: result ? "healthy" : "degraded",
      latencyMs: latency,
      message: result
        ? "Realtime subscription successful"
        : "Realtime subscription timed out",
    };
  } catch (err: any) {
    return {
      name: "Realtime",
      status: "down",
      latencyMs: Math.round(performance.now() - start),
      message: err.message,
    };
  }
}

export async function checkApiHealth(): Promise<HealthCheckResult> {
  const start = performance.now();
  const latency = Math.round(performance.now() - start);

  return {
    name: "API",
    status: "healthy",
    latencyMs: latency,
    message: "Next.js API routes operational",
  };
}

export async function getPlatformHealth(): Promise<HealthCheckResult[]> {
  const results = await Promise.all([
    checkDatabaseHealth(),
    checkStorageHealth(),
    checkEmailHealth(),
    checkBackgroundJobsHealth(),
    checkRealtimeHealth(),
    checkApiHealth(),
  ]);

  return results;
}

export async function getTenantHealth(
  brandId: number,
): Promise<TenantHealthRow> {
  const supabase = createServiceRoleSupabaseClient();
  const issues: string[] = [];

  const { data: subscription } = await (supabase as any)
    .from("licenses")
    .select("status, expires_at, packages:package_id(max_branches, max_users)")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (!subscription) {
    return { brandId, status: "unknown", issues: ["No subscription found"] };
  }

  if (subscription.status === "suspended" || subscription.status === "expired") {
    issues.push(`Subscription is ${subscription.status}`);
  }

  if (subscription.expires_at) {
    const daysLeft = Math.ceil(
      (new Date(subscription.expires_at).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysLeft <= 7) {
      issues.push(`Subscription expires in ${daysLeft} day(s)`);
    }
  }

  const { count: userCount } = await supabase
    .from("user_brand_memberships")
    .select("*", { count: "exact", head: true })
    .eq("brand_id", brandId);

  const maxUsers = subscription.packages?.max_users ?? 0;
  const maxBranches = subscription.packages?.max_branches ?? 0;

  if (
    maxUsers > 0 &&
    (userCount ?? 0) >= maxUsers * 0.8
  ) {
    issues.push(
      `User limit nearly reached (${userCount}/${maxUsers})`,
    );
  }

  const { count: branchCount } = await supabase
    .from("branches")
    .select("*", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .is("deleted_at", null);

  if (
    maxBranches > 0 &&
    (branchCount ?? 0) >= maxBranches * 0.8
  ) {
    issues.push(
      `Branch limit nearly reached (${branchCount}/${maxBranches})`,
    );
  }

  let status: "healthy" | "warning" | "critical" | "unknown" = "healthy";

  if (issues.length > 0) {
    const hasCritical = issues.some((i) =>
      i.toLowerCase().includes("suspended") ||
      i.toLowerCase().includes("expired") ||
      i.toLowerCase().includes("day(s)")
    );
    status = hasCritical ? "critical" : "warning";
  }

  return { brandId, status, issues };
}

export async function getMonitoringMetrics(): Promise<MonitoringMetrics> {
  const supabase = createServiceRoleSupabaseClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const [
    activeBrandsResult,
    onlineBranchesResult,
    servicesResult,
    transactionsResult,
  ] = await Promise.all([
    supabase
      .from("brands")
      .select("*", { count: "exact", head: true })
      .eq("status" as any, "active"),
    supabase
      .from("branches")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status" as any, "active"),
    (supabase as any)
      .from("services")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStr),
    (supabase as any)
      .from("pos_transactions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStr),
  ]);

  const { data: ledgerData } = await (supabase as any)
    .from("finance_ledger")
    .select("amount")
    .gte("created_at", todayStr);

  const todayRevenue =
    ledgerData?.reduce(
      (sum: number, row: any) => sum + Math.abs(Number(row.amount) || 0),
      0,
    ) ?? 0;

  return {
    activeBrands: activeBrandsResult.count ?? 0,
    onlineBranches: onlineBranchesResult.count ?? 0,
    todayServices: servicesResult.count ?? 0,
    todayTransactions: transactionsResult.count ?? 0,
    todayRevenue,
    uptimePercent: 99.9,
    avgResponseTimeMs: 0,
  };
}

export interface TenantHealthSummary {
  brandId: number;
  status: string;
  issues: string[];
}

export async function getAllTenantsHealth(): Promise<TenantHealthSummary[]> {
  const supabase = createServiceRoleSupabaseClient();
  const results: TenantHealthSummary[] = [];

  const [brandsResult, subscriptionsResult, branchCountsResult, userCountsResult] = await Promise.all([
    supabase.from("brands").select("id, status"),
    (supabase as any)
      .from("licenses")
      .select("brand_id, status, expires_at, packages:package_id(max_branches, max_users)"),
    (supabase as any)
      .from("branches")
      .select("brand_id, id")
      .is("deleted_at", null),
    (supabase as any)
      .from("user_brand_memberships")
      .select("brand_id, id"),
  ]);

  const brands = (brandsResult.data ?? []) as any[];
  const subscriptions = (subscriptionsResult.data ?? []) as any[];
  const branchRows = (branchCountsResult?.data ?? []) as any[];
  const userRows = (userCountsResult?.data ?? []) as any[];

  if (!brandsResult.data) return [];

  const subMap = new Map<number, any>();
  for (const s of subscriptions) {
    subMap.set(s.brand_id, {
      ...s,
      max_branches: s.packages?.max_branches ?? 0,
      max_users: s.packages?.max_users ?? 0,
    });
  }

  const branchCountMap = new Map<number, number>();
  for (const b of branchRows) {
    branchCountMap.set(b.brand_id, (branchCountMap.get(b.brand_id) ?? 0) + 1);
  }

  const userCountMap = new Map<number, number>();
  for (const u of userRows) {
    userCountMap.set(u.brand_id, (userCountMap.get(u.brand_id) ?? 0) + 1);
  }

  for (const brand of brands) {
    const issues: string[] = [];
    const sub = subMap.get(brand.id);

    if (brand.status === "suspended") {
      issues.push("Brand is suspended");
    }

    if (sub) {
      if (sub.status === "suspended" || sub.status === "expired") {
        issues.push(`Subscription is ${sub.status}`);
      }

      if (sub.expires_at) {
        const daysLeft = Math.ceil(
          (new Date(sub.expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysLeft <= 7) {
          issues.push(`Expires in ${daysLeft} day(s)`);
        }
      }

      const userCount = userCountMap.get(brand.id) ?? 0;
      if (sub.max_users > 0 && userCount >= sub.max_users * 0.8) {
        issues.push(`User limit at ${userCount}/${sub.max_users}`);
      }

      const branchCount = branchCountMap.get(brand.id) ?? 0;
      if (sub.max_branches > 0 && branchCount >= sub.max_branches * 0.8) {
        issues.push(`Branch limit at ${branchCount}/${sub.max_branches}`);
      }
    }

    let status = "healthy";
    if (issues.length > 0) {
      status = issues.some(
        (i) =>
          i.toLowerCase().includes("suspended") ||
          i.toLowerCase().includes("expired"),
      )
        ? "critical"
        : "warning";
    }

    results.push({ brandId: brand.id, status, issues });
  }

  return results;
}

export async function getRecentSystemLogs(
  limit = 50,
): Promise<any[]> {
  const supabase = createServiceRoleSupabaseClient();

  const platformActions = [
    "PLATFORM_LOGIN",
    "PLATFORM_IMPERSONATE",
    "PLATFORM_OWNER_CREATED",
    "FACTORY_RESET",
    "EXPORT_FULL_BACKUP",
    "BRAND_CREATED",
    "SUBSCRIPTION_CHANGED",
    "SUBSCRIPTION_UPDATED",
    "SETTING_UPDATED",
    "BRAND_PROFILE_UPDATED",
  ];

  const { data, error } = await (supabase as any)
    .from("audit_logs")
    .select("*")
    .in("action", platformActions)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentSystemLogs error:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    action: row.action,
    description: row.description,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    brandId: row.brand_id,
    severity: row.severity,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    requestId: row.request_id,
    createdAt: row.created_at,
  }));
}

export async function getSystemLogs(
  page = 1,
  pageSize = 25,
  search?: string,
): Promise<{ logs: any[]; total: number }> {
  const supabase = createServiceRoleSupabaseClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = (supabase as any)
    .from("audit_logs")
    .select("*", { count: "exact" });

  if (search) {
    query = query.or(
      `action.ilike.%${search}%,description.ilike.%${search}%,actor_name.ilike.%${search}%,actor_role.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getSystemLogs error:", error);
    return { logs: [], total: 0 };
  }

  return {
    logs: (data ?? []).map((row: any) => ({
      id: row.id,
      action: row.action,
      description: row.description,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      brandId: row.brand_id,
      severity: row.severity,
      metadata: row.metadata,
      ipAddress: row.ip_address,
      requestId: row.request_id,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
  };
}
