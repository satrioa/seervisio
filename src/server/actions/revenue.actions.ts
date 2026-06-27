"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getRevenueMetrics,
  getRevenueTrend,
  getRevenueByPackage,
  getSubscriptionGrowth,
  type RevenueMetrics,
  type RevenueTrendPoint,
  type RevenueByPackage,
  type SubscriptionGrowthPoint,
} from "@/server/repositories/platform.repository";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import { ROLES } from "@/lib/permissions/roles";

export interface RevenueDashboardData {
  metrics: RevenueMetrics;
  revenueTrend: RevenueTrendPoint[];
  revenueByPackage: RevenueByPackage[];
  subscriptionGrowth: SubscriptionGrowthPoint[];
}

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

export async function getRevenueDashboardAction(): Promise<ActionResult<RevenueDashboardData>> {
  try {
    await requirePlatformOwner();

    const [metrics, revenueTrend, revenueByPackage, subscriptionGrowth] = await Promise.all([
      getRevenueMetrics(),
      getRevenueTrend(),
      getRevenueByPackage(),
      getSubscriptionGrowth(),
    ]);

    return successResult({ metrics, revenueTrend, revenueByPackage, subscriptionGrowth });
  } catch (err: any) {
    console.error("[Revenue] getRevenueDashboardAction:", err.message);
    return errorResult(err.message || "Gagal memuat data revenue.");
  }
}
