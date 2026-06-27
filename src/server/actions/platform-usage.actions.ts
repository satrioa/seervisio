"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLES } from "@/lib/permissions/roles";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import {
  getUsageSummary,
  getPerTenantUsage,
  getMonthlyTransactionTrend,
  type UsageSummary,
  type PerTenantUsage,
  type MonthlyTransactionTrend,
} from "@/server/repositories/platform-usage.repository";

async function requirePlatformOwner() {
  const authResult = await getCurrentUser();
  if (!authResult.user) {
    throw new Error("Unauthorized");
  }
  const isPlatformOwner = authResult.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER,
  );
  if (!isPlatformOwner) {
    throw new Error("Access denied. Platform Owner only.");
  }
}

export async function getUsageSummaryAction(): Promise<
  ActionResult<UsageSummary>
> {
  try {
    await requirePlatformOwner();
    const data = await getUsageSummary();
    return successResult(data);
  } catch (err: any) {
    console.error("[Usage] getUsageSummaryAction:", err.message);
    return errorResult(err.message || "Failed to load usage summary.");
  }
}

export async function getPerTenantUsageAction(): Promise<
  ActionResult<PerTenantUsage[]>
> {
  try {
    await requirePlatformOwner();
    const data = await getPerTenantUsage();
    return successResult(data);
  } catch (err: any) {
    console.error("[Usage] getPerTenantUsageAction:", err.message);
    return errorResult(err.message || "Failed to load per-tenant usage.");
  }
}

export async function getMonthlyTransactionTrendAction(): Promise<
  ActionResult<MonthlyTransactionTrend[]>
> {
  try {
    await requirePlatformOwner();
    const data = await getMonthlyTransactionTrend();
    return successResult(data);
  } catch (err: any) {
    console.error("[Usage] getMonthlyTransactionTrendAction:", err.message);
    return errorResult(err.message || "Failed to load transaction trend.");
  }
}
