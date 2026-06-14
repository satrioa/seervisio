"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  requireBranchAccess,
  type ActionResult,
} from "./action-helper";
import {
  getActiveShift,
  getShiftById,
  listShifts,
  getShiftMovements,
  resolveBranchCashAccount,
} from "@/repositories/store-shift.repository";
import type { StoreShift } from "@/types/app";

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
}

export interface StoreShiftOverview {
  activeShift: StoreShift | null;
  expectedCash: number | null;
  cashInTotal: number;
  cashOutTotal: number;
  openingCash: number;
  paymentBreakdown: PaymentBreakdownItem[];
  transactions: TransactionItem[];
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

    let expectedCash: number | null = null;
    let cashInTotal = 0;
    let cashOutTotal = 0;
    let paymentBreakdown: PaymentBreakdownItem[] = [];
    let transactions: TransactionItem[] = [];

    if (activeShift) {
      const { data: calcData } = await (supabase as any).rpc("calculate_shift_expected_cash", {
        p_shift_id: activeShift.id,
      });
      expectedCash = calcData != null ? Number(calcData) : null;

      const movements = await getShiftMovements(
        supabase,
        branchId,
        activeShift.openedAt,
        activeShift.closedAt,
      );

      const accountIds = [...new Set(movements.map((m: any) => m.payment_account_id))];

      let accounts: any[] = [];
      if (accountIds.length > 0) {
        const { data: accData } = await supabase
          .from("payment_accounts")
          .select("id, type, account_name")
          .in("id", accountIds);
        accounts = accData || [];
      }

      const accountMap = new Map<string, { type: string; name: string }>();
      for (const acc of accounts) {
        accountMap.set(acc.id, { type: acc.type, name: acc.account_name });
      }

      const typeMap = new Map<string, { total: number; count: number }>();
      const typeLabelMap = new Map<string, string>();

      for (const m of movements as any[]) {
        const accInfo = accountMap.get(m.payment_account_id);
        const typeKey = accInfo?.type || "UNKNOWN";
        const label = typeLabelMap.get(typeKey) || resolveAccountTypeLabel(typeKey);
        if (!typeLabelMap.has(typeKey)) typeLabelMap.set(typeKey, label);

        const entry = typeMap.get(typeKey) || { total: 0, count: 0 };
        entry.total += Number(m.amount);
        entry.count++;
        typeMap.set(typeKey, entry);

        if (m.movement_type === "CASH_IN") cashInTotal += Number(m.amount);
        if (m.movement_type === "CASH_OUT") cashOutTotal += Number(m.amount);
      }

      paymentBreakdown = Array.from(typeMap.entries()).map(([typeKey, val]) => ({
        methodName: typeLabelMap.get(typeKey) || typeKey,
        methodType: typeKey,
        total: val.total,
        count: val.count,
      }));

      transactions = (movements as any[]).map((m: any) => ({
        id: m.id,
        type: resolveMovementTypeLabel(m.movement_type),
        description: m.description || resolveMovementTypeLabel(m.movement_type),
        movementType: m.movement_type,
        direction: m.direction,
        amount: Number(m.amount),
        createdAt: m.created_at,
      }));
    }

    return successResult({
      activeShift,
      expectedCash,
      cashInTotal,
      cashOutTotal,
      openingCash: activeShift?.openingCash ?? 0,
      paymentBreakdown,
      transactions,
    });
  } catch (err: any) {
    console.error("[StoreShiftActions] getStoreShiftOverviewAction:", err.message);
    return errorResult(err.message || "Gagal memuat data shift.");
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

    const { data: shiftNumber } = await (supabase as any).rpc("generate_store_shift_number", {
      p_brand_id: session.brandId,
    });

    const { data: shiftId, error } = await (supabase as any).rpc("open_store_shift", {
      p_brand_id: session.brandId,
      p_branch_id: branchId,
      p_opening_cash: openingCash,
      p_opening_notes: notes || null,
      p_opened_by: session.profileId,
      p_metadata: {},
    });

    if (error || !shiftId) {
      console.error("[StoreShiftActions] open_store_shift RPC error:", error);
      return errorResult("Gagal membuka shift. Silakan coba lagi.");
    }

    console.log("[store-shift:open] created session", {
      sessionId: shiftId,
      branchId,
      openingCash,
    });

    await supabase.from("audit_logs").insert({
      brand_id: session.brandId,
      action: "STORE_SHIFT_OPENED",
      target_type: "store_shift",
      target_id: shiftId,
      actor_id: session.profileId,
      details: { opening_cash: openingCash, branch_id: branchId },
    } as any);

    const shiftNumberStr = shiftNumber ? String(shiftNumber) : "";

    return successResult({
      shiftId: shiftId as string,
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

    const { data: expectedData } = await (supabase as any).rpc("calculate_shift_expected_cash", {
      p_shift_id: shiftId,
    });
    const expectedCash = expectedData != null ? Number(expectedData) : 0;
    const cashDiff = actualCash - expectedCash;

    if (!notes && Math.abs(cashDiff) > 0) {
      return errorResult("Catatan diperlukan jika terdapat selisih kas.");
    }

    const { error } = await (supabase as any).rpc("close_store_shift", {
      p_shift_id: shiftId,
      p_counted_closing_cash: actualCash,
      p_closing_notes: notes || null,
      p_closed_by: session.profileId,
      p_metadata: {},
    });

    if (error) {
      console.error("[StoreShiftActions] close_store_shift RPC error:", error);
      return errorResult("Gagal menutup shift. Silakan coba lagi.");
    }

    await supabase.from("audit_logs").insert({
      brand_id: session.brandId,
      action: "STORE_SHIFT_CLOSED",
      target_type: "store_shift",
      target_id: shiftId,
      actor_id: session.profileId,
      details: {
        expected_closing_cash: expectedCash,
        counted_closing_cash: actualCash,
        cash_difference: cashDiff,
        branch_id: shift.branchId,
      },
    } as any);

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

    return successResult({ shiftId });
  } catch (err: any) {
    console.error("[StoreShiftActions] closeStoreShiftAction:", err.message);
    return errorResult(err.message || "Gagal menutup shift.");
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

function resolveAccountTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CASH: "Cash Tunai",
    BANK: "Transfer",
    QRIS: "QRIS",
    E_WALLET: "E-Wallet",
    DEBIT: "Debit",
    CREDIT: "Kredit",
    UNKNOWN: "Lainnya",
  };
  return map[type] || type;
}

function resolveMovementTypeLabel(type: string): string {
  const map: Record<string, string> = {
    OPENING_BALANCE: "Saldo Awal",
    BALANCE_ADJUSTMENT: "Penyesuaian Saldo",
    SERVICE_PAYMENT: "Pembayaran Service",
    POS_PAYMENT: "Penjualan POS",
    OTHER_INCOME: "Pendapatan Lain",
    OPERATING_EXPENSE: "Biaya Operasional",
    STOCK_PURCHASE: "Pembelian Stok",
    STOCK_PURCHASE_PAYMENT: "Pembayaran Stok",
    TRANSFER_IN: "Transfer Masuk",
    TRANSFER_OUT: "Transfer Keluar",
    BANK_FEE: "Biaya Bank",
    QRIS_SETTLEMENT: "Settlement QRIS",
    SERVICE_REFUND: "Refund Service",
    POS_REFUND: "Refund POS",
    CASH_IN: "Kas Masuk",
    CASH_OUT: "Kas Keluar",
  };
  return map[type] || type;
}
