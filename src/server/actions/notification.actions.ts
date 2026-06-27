"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLES } from "@/lib/permissions/roles";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  insertNotification,
  type NotificationRow,
} from "@/server/repositories/notification.repository";
import {
  getTenantsList,
} from "@/server/repositories/platform.repository";

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

export async function getNotificationsAction(
  category?: string,
): Promise<ActionResult<NotificationRow[]>> {
  try {
    await requirePlatformOwner();
    const data = await getNotifications(50, undefined, category);
    return successResult(data);
  } catch (err: any) {
    console.error("[Notification] getNotificationsAction:", err.message);
    return errorResult(err.message || "Failed to load notifications.");
  }
}

export async function getUnreadCountAction(): Promise<ActionResult<number>> {
  try {
    await requirePlatformOwner();
    const count = await getUnreadNotificationCount();
    return successResult(count);
  } catch (err: any) {
    console.error("[Notification] getUnreadCountAction:", err.message);
    return errorResult(err.message || "Failed to load unread count.");
  }
}

export async function markReadAction(
  notificationId: string,
): Promise<ActionResult> {
  try {
    await requirePlatformOwner();
    const ok = await markNotificationRead(notificationId);
    if (!ok) throw new Error("Failed to mark notification as read");
    return successResult(null as any);
  } catch (err: any) {
    console.error("[Notification] markReadAction:", err.message);
    return errorResult(err.message || "Failed to mark as read.");
  }
}

export async function markAllReadAction(): Promise<ActionResult> {
  try {
    await requirePlatformOwner();
    const ok = await markAllNotificationsRead();
    if (!ok) throw new Error("Failed to mark all as read");
    return successResult(null as any);
  } catch (err: any) {
    console.error("[Notification] markAllReadAction:", err.message);
    return errorResult(err.message || "Failed to mark all as read.");
  }
}

export async function deleteNotificationAction(
  notificationId: string,
): Promise<ActionResult> {
  try {
    await requirePlatformOwner();
    const ok = await deleteNotification(notificationId);
    if (!ok) throw new Error("Failed to delete notification");
    return successResult(null as any);
  } catch (err: any) {
    console.error("[Notification] deleteNotificationAction:", err.message);
    return errorResult(err.message || "Failed to delete notification.");
  }
}

export async function generateNotificationsAction(): Promise<ActionResult<{ created: number }>> {
  try {
    await requirePlatformOwner();

    const tenants = await getTenantsList();
    const now = new Date();
    let created = 0;

    const existing = await getNotifications(500);
    const existingKeys = new Set(existing.map((n) => n.title + (n.brand_id ?? "")));

    const tryInsert = async (
      title: string,
      description: string,
      category: string,
      severity: string,
      brand_id: number | null,
    ) => {
      const key = title + (brand_id ?? "");
      if (existingKeys.has(key)) return;
      const ok = await insertNotification({
        title,
        description,
        category,
        severity,
        brand_id,
        metadata: {},
      } as any);
      if (ok) {
        created++;
        existingKeys.add(key);
      }
    };

    const supabase = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient();
    const { data: subscriptions } = await (supabase as any)
      .from("brand_subscriptions")
      .select("brand_id, plan, status, expires_at, max_branches, max_users");

    const subMap = new Map<number, any>();
    if (subscriptions) {
      for (const s of subscriptions) {
        subMap.set(s.brand_id, s);
      }
    }

    for (const tenant of tenants) {
      const sub = subMap.get(tenant.id);

      if (tenant.subscriptionStatus === "expired" || tenant.subscriptionStatus === "suspended") {
        await tryInsert(
          `Tenant suspended: ${tenant.name}`,
          `Brand "${tenant.name}" has status "${tenant.subscriptionStatus}". Action may be required.`,
          "tenant",
          "critical",
          tenant.id,
        );
      }

      if (sub?.expires_at) {
        const expiresAt = new Date(sub.expires_at);
        const daysLeft = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysLeft > 0 && daysLeft <= 7) {
          await tryInsert(
            `Subscription expiring soon: ${tenant.name}`,
            `Brand "${tenant.name}" subscription expires in ${daysLeft} day(s).`,
            "subscription",
            daysLeft <= 3 ? "critical" : "warning",
            tenant.id,
          );
        }
      }

      if (sub) {
        const userPct = sub.max_users > 0
          ? (tenant.userCount / sub.max_users) * 100
          : 0;
        if (userPct >= 80) {
          await tryInsert(
            `User limit nearly reached: ${tenant.name}`,
            `Brand "${tenant.name}" has used ${Math.round(userPct)}% of user capacity (${tenant.userCount}/${sub.max_users}).`,
            "subscription",
            userPct >= 95 ? "critical" : "warning",
            tenant.id,
          );
        }

        const branchPct = sub.max_branches > 0
          ? (tenant.branchCount / sub.max_branches) * 100
          : 0;
        if (branchPct >= 80) {
          await tryInsert(
            `Branch limit nearly reached: ${tenant.name}`,
            `Brand "${tenant.name}" has used ${Math.round(branchPct)}% of branch capacity (${tenant.branchCount}/${sub.max_branches}).`,
            "subscription",
            branchPct >= 95 ? "critical" : "warning",
            tenant.id,
          );
        }
      }
    }

    return successResult({ created });
  } catch (err: any) {
    console.error("[Notification] generateNotificationsAction:", err.message);
    return errorResult(err.message || "Failed to generate notifications.");
  }
}
