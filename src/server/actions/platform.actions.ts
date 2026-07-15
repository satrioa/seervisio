"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getPlatformDashboardData,
  getPlatformConsoleData,
  getRevenueTrend,
  getSubscriptionGrowth,
  type PlatformConsoleData,
  type RevenueTrendPoint,
  type SubscriptionGrowthPoint,
} from "@/server/repositories/platform.repository";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import { ROLES } from "@/lib/permissions/roles";

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

async function requirePlatformOwner(): Promise<void> {
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

export async function getPlatformDashboardAction(): Promise<ActionResult<PlatformDashboardData>> {
  try {
    await requirePlatformOwner();

    const data = await getPlatformDashboardData();

    return successResult(data);
  } catch (err: any) {
    console.error("[Platform] getPlatformDashboardAction:", err.message);
    return errorResult(err.message || "Gagal memuat data platform.");
  }
}

export async function getRevenueTrendAction(): Promise<
  ActionResult<RevenueTrendPoint[]>
> {
  try {
    await requirePlatformOwner();
    const data = await getRevenueTrend();
    return successResult(data);
  } catch (err: any) {
    console.error("[Platform] getRevenueTrendAction:", err.message);
    return errorResult(err.message || "Failed to load revenue trend.");
  }
}

export async function getSubscriptionGrowthAction(): Promise<
  ActionResult<SubscriptionGrowthPoint[]>
> {
  try {
    await requirePlatformOwner();
    const data = await getSubscriptionGrowth();
    return successResult(data);
  } catch (err: any) {
    console.error("[Platform] getSubscriptionGrowthAction:", err.message);
    return errorResult(err.message || "Failed to load subscription growth.");
  }
}

export async function getPlatformConsoleAction(): Promise<
  ActionResult<PlatformConsoleData>
> {
  try {
    await requirePlatformOwner();
    const data = await getPlatformConsoleData();
    return successResult(data);
  } catch (err: any) {
    console.error("[Platform] getPlatformConsoleAction:", err.message);
    return errorResult(err.message || "Gagal memuat konsol platform.");
  }
}
