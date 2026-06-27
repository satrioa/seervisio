"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLES } from "@/lib/permissions/roles";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import {
  getPlatformHealth,
  getTenantHealth,
  getMonitoringMetrics,
  getSystemLogs,
  getRecentSystemLogs,
  getAllTenantsHealth,
  type HealthCheckResult,
  type MonitoringMetrics,
  type TenantHealthSummary,
} from "@/server/repositories/platform-monitoring.repository";

async function requirePlatformOwner() {
  const authResult = await getCurrentUser();
  if (!authResult.user) {
    throw new Error("Unauthorized");
  }
  const isPlatformOwner = authResult.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER
  );
  if (!isPlatformOwner) {
    throw new Error("Akses ditolak. Hanya Platform Owner yang dapat mengakses panel ini.");
  }
}

export async function getPlatformHealthAction(): Promise<
  ActionResult<HealthCheckResult[]>
> {
  try {
    await requirePlatformOwner();
    const data = await getPlatformHealth();
    return successResult(data);
  } catch (err: any) {
    console.error("[Monitoring] getPlatformHealthAction:", err.message);
    return errorResult(err.message || "Failed to load platform health.");
  }
}

export async function getTenantHealthAction(
  brandId: number,
): Promise<ActionResult<{ status: string; issues: string[] }>> {
  try {
    await requirePlatformOwner();
    const health = await getTenantHealth(brandId);
    return successResult({ status: health.status, issues: health.issues });
  } catch (err: any) {
    console.error("[Monitoring] getTenantHealthAction:", err.message);
    return errorResult(err.message || "Failed to load tenant health.");
  }
}

export async function getAllTenantsHealthAction(): Promise<
  ActionResult<TenantHealthSummary[]>
> {
  try {
    await requirePlatformOwner();
    const data = await getAllTenantsHealth();
    return successResult(data);
  } catch (err: any) {
    console.error("[Monitoring] getAllTenantsHealthAction:", err.message);
    return errorResult(err.message || "Failed to load tenant health.");
  }
}

export async function getMonitoringMetricsAction(): Promise<
  ActionResult<MonitoringMetrics>
> {
  try {
    await requirePlatformOwner();
    const data = await getMonitoringMetrics();
    return successResult(data);
  } catch (err: any) {
    console.error("[Monitoring] getMonitoringMetricsAction:", err.message);
    return errorResult(err.message || "Failed to load monitoring metrics.");
  }
}

export async function getSystemLogsAction(
  page = 1,
  pageSize = 25,
  search?: string,
): Promise<ActionResult<{ logs: any[]; total: number }>> {
  try {
    await requirePlatformOwner();
    const data = await getSystemLogs(page, pageSize, search);
    return successResult(data);
  } catch (err: any) {
    console.error("[Monitoring] getSystemLogsAction:", err.message);
    return errorResult(err.message || "Failed to load system logs.");
  }
}

export async function getRecentSystemLogsAction(
  limit = 10,
): Promise<ActionResult<any[]>> {
  try {
    await requirePlatformOwner();
    const data = await getRecentSystemLogs(limit);
    return successResult(data);
  } catch (err: any) {
    console.error("[Monitoring] getRecentSystemLogsAction:", err.message);
    return errorResult(err.message || "Failed to load recent system logs.");
  }
}
