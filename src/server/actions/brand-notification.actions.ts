"use server";

import { getSessionData, successResult, errorResult, type ActionResult } from "./action-helper";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  insertBrandNotification,
} from "@/server/repositories/notification.repository";

export interface BrandNotificationItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  severity: string;
  status: string;
  created_at: string;
  read_at: string | null;
}

export async function getBrandNotificationsAction(
  brandSlug: string,
  limit = 50,
  status?: string,
  category?: string,
): Promise<ActionResult<BrandNotificationItem[]>> {
  try {
    const session = await getSessionData(brandSlug);
    const supabase = await createServerSupabase();

    let query = (supabase as any)
      .from("notifications")
      .select("id, title, description, category, severity, status, created_at, read_at")
      .eq("brand_id", session.brandId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[brand-notification] getBrandNotificationsAction error:", error);
      return errorResult("Failed to load notifications.");
    }

    return successResult(data ?? []);
  } catch (err: any) {
    console.error("[brand-notification] getBrandNotificationsAction:", err.message);
    return errorResult(err.message || "Failed to load notifications.");
  }
}

export async function getBrandUnreadCountAction(
  brandSlug: string,
): Promise<ActionResult<number>> {
  try {
    const session = await getSessionData(brandSlug);
    const supabase = await createServerSupabase();

    const { count, error } = await (supabase as any)
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("brand_id", session.brandId)
      .eq("status", "unread");

    if (error) {
      console.error("[brand-notification] getBrandUnreadCountAction error:", error);
      return errorResult("Failed to load unread count.");
    }

    return successResult(count ?? 0);
  } catch (err: any) {
    console.error("[brand-notification] getBrandUnreadCountAction:", err.message);
    return errorResult(err.message || "Failed to load unread count.");
  }
}

export async function markBrandNotificationReadAction(
  brandSlug: string,
  notificationId: string,
): Promise<ActionResult> {
  try {
    const session = await getSessionData(brandSlug);
    const supabase = await createServerSupabase();

    const { error } = await (supabase as any)
      .from("notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("brand_id", session.brandId);

    if (error) {
      console.error("[brand-notification] markBrandNotificationReadAction error:", error);
      return errorResult("Failed to mark notification as read.");
    }

    return successResult(null as any);
  } catch (err: any) {
    console.error("[brand-notification] markBrandNotificationReadAction:", err.message);
    return errorResult(err.message || "Failed to mark notification as read.");
  }
}

export async function markBrandAllNotificationsReadAction(
  brandSlug: string,
): Promise<ActionResult> {
  try {
    const session = await getSessionData(brandSlug);
    const supabase = await createServerSupabase();

    const { error } = await (supabase as any)
      .from("notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .eq("brand_id", session.brandId)
      .eq("status", "unread");

    if (error) {
      console.error("[brand-notification] markBrandAllNotificationsReadAction error:", error);
      return errorResult("Failed to mark all as read.");
    }

    return successResult(null as any);
  } catch (err: any) {
    console.error("[brand-notification] markBrandAllNotificationsReadAction:", err.message);
    return errorResult(err.message || "Failed to mark all as read.");
  }
}

export async function createOperationalNotificationAction(
  brandSlug: string,
  title: string,
  description: string,
  category = "activity",
  severity: "info" | "warning" | "critical" = "info",
): Promise<ActionResult> {
  try {
    const session = await getSessionData(brandSlug);

    const ok = await insertBrandNotification(
      session.brandId,
      title,
      description,
      category,
      severity,
    );

    if (!ok) {
      return errorResult("Failed to create notification.");
    }

    return successResult(null as any);
  } catch (err: any) {
    console.error("[brand-notification] createOperationalNotificationAction:", err.message);
    return errorResult(err.message || "Failed to create notification.");
  }
}
