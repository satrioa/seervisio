"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  getSubscriptionsList,
  getPackagesList,
  type SubscriptionRow,
  type PackageRow,
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

export async function updateSubscriptionStatusAction(
  subscriptionId: string,
  status: string
): Promise<ActionResult<null>> {
  try {
    await requirePlatformOwner();
    const supabase = createServiceRoleSupabaseClient();
    const { error } = await (supabase as any)
      .from("licenses")
      .update({ status })
      .eq("id", subscriptionId);
    if (error) throw new Error(error.message);
    return successResult(null);
  } catch (err: any) {
    console.error("[Subscription] updateSubscriptionStatusAction:", err.message);
    return errorResult(err.message || "Gagal mengubah status subscription.");
  }
}

export async function getPackagesListAction(): Promise<ActionResult<PackageRow[]>> {
  try {
    await requirePlatformOwner();
    const data = await getPackagesList();
    return successResult(data);
  } catch (err: any) {
    console.error("[Subscription] getPackagesListAction:", err.message);
    return errorResult(err.message || "Gagal memuat daftar paket.");
  }
}

export async function changeSubscriptionPackageAction(
  subscriptionId: string,
  packageId: string,
  startDate: string,
  endDate: string | null
): Promise<ActionResult<null>> {
  try {
    await requirePlatformOwner();
    const supabase = createServiceRoleSupabaseClient();

    const pkg = await getPackagesList().then((list) => list.find((p) => p.id === packageId));
    if (!pkg) throw new Error("Paket tidak ditemukan.");

    if (endDate && new Date(endDate) <= new Date(startDate)) {
      throw new Error("Tanggal selesai harus setelah tanggal mulai.");
    }

    const { error } = await (supabase as any)
      .from("licenses")
      .update({
        package_id: packageId,
        started_at: startDate,
        expires_at: endDate,
        status: endDate && new Date(endDate) < new Date() ? "expired" : "active",
      })
      .eq("id", subscriptionId);

    if (error) throw new Error(error.message);
    return successResult(null);
  } catch (err: any) {
    console.error("[Subscription] changeSubscriptionPackageAction:", err.message);
    return errorResult(err.message || "Gagal mengubah paket subscription.");
  }
}
