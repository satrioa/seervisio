"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionData, successResult, errorResult, requireActionPermission, type ActionResult } from "./action-helper";
import { sendOperationalNotification } from "@/server/notifications/notification.service";
import { insertBrandNotification } from "@/server/repositories/notification.repository";

export interface AutoCloseResult {
  shiftId: string;
  branchId: string;
  branchName: string;
  shiftNumber: string;
  brandId: number;
  brandName: string;
  scheduledCloseTime: string | null;
  lateMinutes: number;
  gracePeriodMinutes: number;
}

/**
 * runAutoCloseCheckAction
 *
 * Scans all open shifts across all brands/branches and auto-closes any
 * that exceed their scheduled closing time + grace period.
 *
 * This can be called:
 *   - From a cron job (e.g., Supabase pg_cron every 5 minutes)
 *   - Manually by an admin
 *   - On dashboard load (as a best-effort cleanup)
 */
export async function runAutoCloseCheckAction(
  brandSlug?: string,
): Promise<ActionResult<AutoCloseResult[]>> {
  try {
    if (brandSlug) {
      const session = await getSessionData(brandSlug);
      requireActionPermission(session.role, "store_shift.close");
    }

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any).rpc("check_and_auto_close_shifts");

    if (error) {
      console.error("[auto-close] RPC error:", error);
      return errorResult(error.message || "Gagal menjalankan pengecekan auto-close.");
    }

    const results: AutoCloseResult[] = (data || []).map((row: any) => ({
      shiftId: row.shift_id,
      branchId: row.branch_id,
      branchName: row.branch_name,
      shiftNumber: row.shift_number,
      brandId: row.brand_id,
      brandName: row.brand_name,
      scheduledCloseTime: row.scheduled_close_time,
      lateMinutes: row.late_minutes,
      gracePeriodMinutes: row.grace_period_minutes,
    }));

    /* Send notifications for each auto-closed shift */
    for (const r of results) {
      try {
        await sendOperationalNotification({
          brandId: r.brandId,
          branchId: r.branchId,
          eventType: "AUTO_CLOSE",
          payload: {
            branchName: r.branchName,
            shiftNumber: r.shiftNumber,
            brandName: r.brandName,
            scheduledCloseTime: r.scheduledCloseTime,
            lateMinutes: r.lateMinutes,
            gracePeriodMinutes: r.gracePeriodMinutes,
          },
        });
      } catch (notifErr: any) {
        console.warn("[auto-close] notification failed for shift", r.shiftId, notifErr.message);
      }

      try {
        await insertBrandNotification(
          r.brandId,
          "Rekonsiliasi Diperlukan",
          `Shift #${r.shiftNumber} di ${r.branchName} ditutup otomatis dan memerlukan rekonsiliasi kas sebelum shift baru dapat dibuka.`,
          "activity",
          "warning",
        );
      } catch (notifErr: any) {
        console.warn("[auto-close] reconciliation notification failed for shift", r.shiftId, notifErr.message);
      }
    }

    return successResult(results);
  } catch (err: any) {
    console.error("[auto-close] runAutoCloseCheckAction:", err.message);
    return errorResult(err.message || "Gagal menjalankan pengecekan auto-close.");
  }
}

/**
 * runAutoCloseScheduledAction
 *
 * Same RPC call as runAutoCloseCheckAction but scoped to a brand.
 * Requires store_shift.close permission for the given brand.
 * Designed to be called from the client-side scheduler/hook.
 *
 * The SQL function check_and_auto_close_shifts handles all validation internally
 * (shift must be open, hours exceeded, auto-close enabled, etc.)
 */
export async function runAutoCloseScheduledAction(
  brandSlug?: string,
): Promise<ActionResult<AutoCloseResult[]>> {
  try {
    if (brandSlug) {
      const session = await getSessionData(brandSlug);
      requireActionPermission(session.role, "store_shift.close");
    }

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any).rpc("check_and_auto_close_shifts");

    if (error) {
      console.error("[auto-close/scheduled] RPC error:", error);
      return errorResult(error.message || "Gagal menjalankan pengecekan auto-close.");
    }

    const results: AutoCloseResult[] = (data || []).map((row: any) => ({
      shiftId: row.shift_id,
      branchId: row.branch_id,
      branchName: row.branch_name,
      shiftNumber: row.shift_number,
      brandId: row.brand_id,
      brandName: row.brand_name,
      scheduledCloseTime: row.scheduled_close_time,
      lateMinutes: row.late_minutes,
      gracePeriodMinutes: row.grace_period_minutes,
    }));

    for (const r of results) {
      try {
        await sendOperationalNotification({
          brandId: r.brandId,
          branchId: r.branchId,
          eventType: "AUTO_CLOSE",
          payload: {
            branchName: r.branchName,
            shiftNumber: r.shiftNumber,
            brandName: r.brandName,
            scheduledCloseTime: r.scheduledCloseTime,
            lateMinutes: r.lateMinutes,
            gracePeriodMinutes: r.gracePeriodMinutes,
          },
        });
      } catch (notifErr: any) {
        console.warn("[auto-close/scheduled] notification failed for shift", r.shiftId, notifErr.message);
      }

      try {
        await insertBrandNotification(
          r.brandId,
          "Rekonsiliasi Diperlukan",
          `Shift #${r.shiftNumber} di ${r.branchName} ditutup otomatis dan memerlukan rekonsiliasi kas sebelum shift baru dapat dibuka.`,
          "activity",
          "warning",
        );
      } catch (notifErr: any) {
        console.warn("[auto-close/scheduled] reconciliation notification failed for shift", r.shiftId, notifErr.message);
      }
    }

    return successResult(results);
  } catch (err: any) {
    console.error("[auto-close/scheduled] runAutoCloseScheduledAction:", err.message);
    return errorResult(err.message || "Gagal menjalankan pengecekan auto-close.");
  }
}

/**
 * getAutoCloseConfigAction
 *
 * Returns the auto-close configuration for a brand from brand_settings metadata.
 */
export async function getAutoCloseConfigAction(
  brandSlug: string,
): Promise<ActionResult<{ enabled: boolean; gracePeriodMinutes: number }>> {
  try {
    const session = await getSessionData(brandSlug);
    const supabase = await createServerSupabase();

    const { data: settings } = await (supabase as any)
      .from("brand_settings")
      .select("metadata")
      .eq("brand_id", session.brandId)
      .maybeSingle();

    const autoClose = settings?.metadata?.auto_close_settings;
    return successResult({
      enabled: autoClose?.enabled ?? false,
      gracePeriodMinutes: autoClose?.grace_period_minutes ?? autoClose?.gracePeriodMinutes ?? 120,
    });
  } catch (err: any) {
    console.error("[auto-close] getAutoCloseConfigAction:", err.message);
    return errorResult(err.message || "Gagal memuat konfigurasi auto-close.");
  }
}
