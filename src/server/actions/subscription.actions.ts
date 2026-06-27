"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getSubscriptionsList,
  type SubscriptionRow,
} from "@/server/repositories/platform.repository";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import { ROLES } from "@/lib/permissions/roles";

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

export async function getSubscriptionsListAction(): Promise<ActionResult<SubscriptionRow[]>> {
  try {
    await requirePlatformOwner();
    const data = await getSubscriptionsList();
    return successResult(data);
  } catch (err: any) {
    console.error("[Subscription] getSubscriptionsListAction:", err.message);
    return errorResult(err.message || "Gagal memuat daftar subscription.");
  }
}
