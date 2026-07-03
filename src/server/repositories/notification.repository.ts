import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface NotificationRow {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  metadata: Record<string, unknown>;
  brand_id: number | null;
  created_at: string;
  read_at: string | null;
}

export async function getNotifications(
  limit = 50,
  status?: string,
  category?: string,
  brandId?: number,
): Promise<NotificationRow[]> {
  const supabase = createServiceRoleSupabaseClient();

  let query = (supabase as any)
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }
  if (category && category !== "all") {
    query = query.eq("category", category);
  }
  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getNotifications error:", error);
    return [];
  }

  return (data ?? []).map((n: Record<string, unknown>) => ({
    id: n.id as string,
    category: n.category as string,
    severity: n.severity as string,
    title: n.title as string,
    description: (n.description as string) ?? null,
    status: n.status as string,
    metadata: (n.metadata as Record<string, unknown>) ?? {},
    brand_id: (n.brand_id as number) ?? null,
    created_at: n.created_at as string,
    read_at: (n.read_at as string) ?? null,
  }));
}

export async function getUnreadNotificationCount(brandId?: number): Promise<number> {
  const supabase = createServiceRoleSupabaseClient();

  let query = (supabase as any)
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread");

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("getUnreadNotificationCount error:", error);
    return 0;
  }

  return count ?? 0;
}

export async function markNotificationRead(
  notificationId: string,
  brandId?: number,
): Promise<boolean> {
  const supabase = createServiceRoleSupabaseClient();

  let query = (supabase as any)
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { error } = await query;

  if (error) {
    console.error("markNotificationRead error:", error);
    return false;
  }

  return true;
}

export async function markAllNotificationsRead(brandId?: number): Promise<boolean> {
  const supabase = createServiceRoleSupabaseClient();

  let query = (supabase as any)
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("status", "unread");

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { error } = await query;

  if (error) {
    console.error("markAllNotificationsRead error:", error);
    return false;
  }

  return true;
}

export async function deleteNotification(
  notificationId: string,
  brandId?: number,
): Promise<boolean> {
  const supabase = createServiceRoleSupabaseClient();

  let query = (supabase as any)
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { error } = await query;

  if (error) {
    console.error("deleteNotification error:", error);
    return false;
  }

  return true;
}

export async function insertNotification(
  notification: Omit<NotificationRow, "id" | "created_at" | "read_at" | "status"> & {
    status?: string;
  },
): Promise<boolean> {
  const supabase = createServiceRoleSupabaseClient();

  const { error } = await (supabase as any).from("notifications").insert({
    category: notification.category,
    severity: notification.severity,
    title: notification.title,
    description: notification.description,
    status: notification.status ?? "unread",
    metadata: notification.metadata,
    brand_id: notification.brand_id,
  });

  if (error) {
    console.error("insertNotification error:", error);
    return false;
  }

  return true;
}

export async function insertBrandNotification(
  brandId: number,
  title: string,
  description: string,
  category = "activity",
  severity = "info",
  metadata: Record<string, unknown> = {},
): Promise<boolean> {
  return insertNotification({
    title,
    description,
    category,
    severity,
    brand_id: brandId,
    metadata,
  });
}
