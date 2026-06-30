"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  requireBranchAccess,
  requireActiveStoreSession,
  handleActionError,
  type ActionResult,
} from "./action-helper";
import { sendOperationalNotification } from "@/server/notifications/notification.service";
import {
  getActiveShift,
  getShiftById,
  listShifts,
  getShiftMovements,
  resolveBranchCashAccount,
} from "@/repositories/store-shift.repository";
import type { StoreShift } from "@/types/app";
import {
  getShiftFinancialSummary,
  calculateExpectedCash,
  type ShiftFinancialSummary,
} from "@/server/lib/shift-financial-summary";

export interface PaymentBreakdownItem {
  methodName: string;
  methodType: string;
  total: number;
  count: number;
}

export interface TransactionItem {
  id: string;
  type: string;
  description: string;
  movementType: string;
  direction: string;
  amount: number;
  createdAt: string;
  accountName?: string;
  accountType?: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

export interface StoreShiftOverview {
  activeShift: StoreShift | null;
  expectedCash: number | null;
  cashInTotal: number;
  cashOutTotal: number;
  openingCash: number;
  paymentBreakdown: PaymentBreakdownItem[];
  transactions: TransactionItem[];
  totalIncome: number;
  totalExpense: number;
  cashSales: number;
  serviceCashPayments: number;
  refunds: number;
}

export interface StoreShiftReport {
  shift: StoreShift;
  expectedCash: number | null;
  cashInTotal: number;
  cashOutTotal: number;
  paymentBreakdown: PaymentBreakdownItem[];
  transactions: TransactionItem[];
  totalIncome: number;
  totalExpense: number;
  cashSales: number;
  serviceCashPayments: number;
  refunds: number;
}

export async function getStoreShiftOverviewAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<StoreShiftOverview>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "store_shift.view");
    requireBranchAccess(session, branchId, "getStoreShiftOverviewAction");

    const supabase = await createServerSupabase();

    const activeShift = await getActiveShift(supabase, branchId);

    let summary: ShiftFinancialSummary | null = null;
    if (activeShift) {
      summary = await getShiftFinancialSummary(supabase, activeShift.id);
    }

    return successResult({
      activeShift,
      expectedCash: summary?.expectedCash ?? null,
      cashInTotal: summary?.cashIn ?? 0,
      cashOutTotal: summary?.cashOut ?? 0,
      openingCash: activeShift?.openingCash ?? 0,
      paymentBreakdown: summary?.paymentBreakdown ?? [],
      transactions: summary?.transactions ?? [],
      totalIncome: summary?.totalIncome ?? 0,
      totalExpense: summary?.totalExpense ?? 0,
      cashSales: summary?.cashSales ?? 0,
      serviceCashPayments: summary?.serviceCashPayments ?? 0,
      refunds: summary?.refunds ?? 0,
    });
  } catch (err: any) {
    console.error("[StoreShiftActions] getStoreShiftOverviewAction:", err.message);
    return errorResult(err.message || "Gagal memuat data shift.");
  }
}

export async function getStoreShiftReportAction(
  brandSlug: string,
  shiftId: string,
): Promise<ActionResult<StoreShiftReport>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "store_shift.view");

    const supabase = await createServerSupabase();
    const shift = await getShiftById(supabase, shiftId);

    if (!shift) {
      return errorResult("Shift tidak ditemukan.");
    }

    requireBranchAccess(session, shift.branchId, "getStoreShiftReportAction");

    const summary = await getShiftFinancialSummary(supabase, shift.id);

    return successResult({
      shift,
      expectedCash: (summary.expectedCash || shift.expectedClosingCash) ?? null,
      cashInTotal: summary.cashIn,
      cashOutTotal: summary.cashOut,
      paymentBreakdown: summary.paymentBreakdown,
      transactions: summary.transactions,
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      cashSales: summary.cashSales,
      serviceCashPayments: summary.serviceCashPayments,
      refunds: summary.refunds,
    });
  } catch (err: any) {
    console.error("[StoreShiftActions] getStoreShiftReportAction:", err.message);
    return errorResult(err.message || "Gagal memuat rincian shift.");
  }
}

export async function openStoreShiftAction(
  brandSlug: string,
  branchId: string,
  openingCash: number,
  notes?: string | null,
): Promise<ActionResult<{ shiftId: string; shiftNumber: string }>> {
  try {
    console.log("[store-shift:open] input", { branchId, openingCash });

    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "store_shift.open");
    requireBranchAccess(session, branchId, "openStoreShiftAction");

    const supabase = await createServerSupabase();

    const existing = await getActiveShift(supabase, branchId);
    if (existing) {
      return errorResult("Shift untuk cabang ini sudah aktif.");
    }

    const cashAccount = await resolveBranchCashAccount(supabase, session.brandId, branchId);
    if (!cashAccount) {
      return errorResult("Shift gagal dibuka karena akun kas cabang belum dapat dibuat.");
    }

    console.log("[store-shift:open] cash account", {
      found: true,
      cashAccountId: cashAccount.id,
      created: false,
    });

    const { data: result, error } = await (supabase as any).rpc("open_store_shift", {
      p_brand_id: session.brandId,
      p_branch_id: branchId,
      p_opening_cash: openingCash,
      p_opening_notes: notes || null,
      p_opened_by: session.profileId,
      p_metadata: {},
    });

    if (error || !result) {
      console.error("[StoreShiftActions] open_store_shift RPC error:", error);
      return errorResult("Gagal membuka shift. Silakan coba lagi.");
    }

    let resultData: any = result;
    if (typeof result === "string") {
      try {
        resultData = JSON.parse(result);
      } catch (parseErr) {
        console.error("[StoreShiftActions] open_store_shift JSON parse error:", parseErr, "raw:", result);
        return errorResult("Gagal memproses hasil buka shift.");
      }
    }
    const shiftId: string = resultData.shift_id ?? (typeof resultData === "string" ? resultData : "");
    const shiftNumberStr: string = resultData.shift_number ?? "";

    console.log("[store-shift:open] created session", {
      sessionId: shiftId,
      branchId,
      openingCash,
      lateOpenMinutes: resultData.late_open_minutes,
      earlyOpenMinutes: resultData.early_open_minutes,
    });

    try {
      const { data: branchRow } = await (supabase as any)
        .from("branches")
        .select("name")
        .eq("id", branchId)
        .maybeSingle();

      console.log("[notification:event] OPEN_SHIFT triggered", {
        shiftNumber: shiftNumberStr,
        openingCash,
      });
      await sendOperationalNotification({
        brandId: session.brandId,
        branchId,
        eventType: "OPEN_SHIFT",
        actorProfileId: session.profileId,
        payload: {
          branchName: branchRow?.name ?? "",
          shiftNumber: shiftNumberStr,
          openingCash,
          lateOpenMinutes: resultData.late_open_minutes,
          earlyOpenMinutes: resultData.early_open_minutes,
        },
      });
    } catch (notifErr: any) {
      console.warn("[notification:error] OPEN_SHIFT failed:", notifErr.message);
    }

    return successResult({
      shiftId,
      shiftNumber: shiftNumberStr,
    });
  } catch (err: any) {
    console.error("[StoreShiftActions] openStoreShiftAction:", err.message);
    return errorResult(err.message || "Gagal membuka shift.");
  }
}

export async function closeStoreShiftAction(
  brandSlug: string,
  shiftId: string,
  actualCash: number,
  notes?: string | null,
): Promise<ActionResult<{ shiftId: string }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "store_shift.close");

    const supabase = await createServerSupabase();

    const shift = await getShiftById(supabase, shiftId);
    if (!shift) return errorResult("Shift tidak ditemukan.");
    if (shift.shiftStatus !== "OPEN") return errorResult("Shift sudah ditutup.");

    requireBranchAccess(session, shift.branchId, "closeStoreShiftAction");

    await requireActiveStoreSession(supabase, session.brandId, shift.branchId);

    const summary = await getShiftFinancialSummary(supabase, shiftId);
    const expectedCash = summary.expectedCash;
    const cashDiff = actualCash - expectedCash;

    if (!notes && Math.abs(cashDiff) > 0) {
      return errorResult("Catatan diperlukan jika terdapat selisih kas.");
    }

    const { error } = await (supabase as any).rpc("close_store_shift", {
      p_shift_id: shiftId,
      p_counted_closing_cash: actualCash,
      p_closing_notes: notes || null,
      p_closed_by: session.profileId,
      p_metadata: { auto_closed: false },
    });

    if (error) {
      console.error("[StoreShiftActions] close_store_shift RPC error:", error);
      return errorResult("Gagal menutup shift. Silakan coba lagi.");
    }

    if (Math.abs(cashDiff) > 0) {
      await (supabase as any).rpc("add_shift_cash_movement", {
        p_shift_id: shiftId,
        p_direction: cashDiff > 0 ? "IN" : "OUT",
        p_amount: Math.abs(cashDiff),
        p_description: `Penyesuaian kas akhir shift: ${cashDiff > 0 ? "lebih" : "kurang"} Rp ${Math.abs(cashDiff).toLocaleString("id-ID")}`,
        p_created_by: session.profileId,
        p_metadata: { reason: "closing_adjustment", cash_difference: cashDiff },
      });
    }

    try {
      const { data: branchRow } = await (supabase as any)
        .from("branches")
        .select("name")
        .eq("id", shift.branchId)
        .maybeSingle();

      console.log("[notification:event] CLOSE_SHIFT triggered", {
        shiftNumber: shift.shiftNumber,
        cashDiff,
      });
      await sendOperationalNotification({
        brandId: session.brandId,
        branchId: shift.branchId,
        eventType: "CLOSE_SHIFT",
        actorProfileId: session.profileId,
        payload: {
          branchName: branchRow?.name ?? "",
          shiftNumber: shift.shiftNumber,
          expectedCash: expectedCash,
          countedCash: actualCash,
          cashDifference: cashDiff,
        },
      });

      if (Math.abs(cashDiff) > 0) {
        console.log("[notification:event] CASH_DIFFERENCE_DETECTED triggered", {
          cashDiff,
        });
        await sendOperationalNotification({
          brandId: session.brandId,
          branchId: shift.branchId,
          eventType: "CASH_DIFFERENCE_DETECTED",
          actorProfileId: session.profileId,
          payload: {
            branchName: branchRow?.name ?? "",
            cashDifference: cashDiff,
            expectedCash: expectedCash,
            countedCash: actualCash,
          },
        });
      }
    } catch (notifErr: any) {
      console.warn("[notification:error] store-shift notification failed:", notifErr.message);
    }

    return successResult({ shiftId });
  } catch (err: any) {
    console.error("[StoreShiftActions] closeStoreShiftAction:", err.message);
    return handleActionError(err, "Gagal menutup shift.");
  }
}

export async function getActiveShiftAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<StoreShift | null>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "store_shift.view");
    requireBranchAccess(session, branchId, "getActiveShiftAction");

    const supabase = await createServerSupabase();
    const shift = await getActiveShift(supabase, branchId);

    return successResult(shift);
  } catch (err: any) {
    console.error("[StoreShiftActions] getActiveShiftAction:", err.message);
    return errorResult(err.message || "Gagal memuat shift aktif.");
  }
}

export async function listStoreShiftsAction(
  brandSlug: string,
  branchId: string,
  limit = 20,
): Promise<ActionResult<StoreShift[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "store_shift.view");
    requireBranchAccess(session, branchId, "listStoreShiftsAction");

    const supabase = await createServerSupabase();
    const shifts = await listShifts(supabase, branchId, limit);

    return successResult(shifts);
  } catch (err: any) {
    console.error("[StoreShiftActions] listStoreShiftsAction:", err.message);
    return errorResult(err.message || "Gagal memuat riwayat shift.");
  }
}


