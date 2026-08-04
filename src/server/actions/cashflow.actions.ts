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

/* ── Types ── */

export interface CashflowMovementRow {
  id: string;
  paymentAccountId: string;
  accountName: string;
  accountType: string;
  isCashAccount: boolean;
  branchId: string | null;
  branchName: string | null;
  direction: "IN" | "OUT";
  amount: number;
  beforeBalance: number;
  afterBalance: number;
  movementType: string;
  referenceType: string | null;
  referenceId: string | null;
  referenceLabel: string;
  referenceRaw: string | null;
  description: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface CashflowSummary {
  totalIn: number;
  totalOut: number;
  netCashflow: number;
  totalMdr: number;
}

export interface CashflowFilterInput {
  branchId?: string | null;
  accountId?: string | null;
  movementType?: string | null;
  direction?: "IN" | "OUT" | "ALL_DIRECTIONS" | null;
  search?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

/* ── Constants ── */

const MDR_RELATED_TYPES = new Set(["BANK_FEE"]);
const NON_OPERATIONAL_EVENTS = new Set(["OPENING_BALANCE","BALANCE_ADJUSTMENT","TRANSFER_IN","TRANSFER_OUT"]);

/* ── Helpers ── */

function mapMovement(row: any): CashflowMovementRow {
  return {
    id: row.id,
    paymentAccountId: row.payment_account_id,
    accountName: row.payment_accounts?.account_name ?? "-",
    accountType: row.payment_accounts?.type ?? "",
    isCashAccount: row.payment_accounts?.is_cash_account ?? false,
    branchId: row.branch_id ?? null,
    branchName: row.branches?.name ?? null,
    direction: row.direction,
    amount: Number(row.amount),
    beforeBalance: Number(row.before_balance),
    afterBalance: Number(row.after_balance),
    movementType: row.movement_type,
    referenceType: row.reference_type ?? null,
    referenceId: row.reference_id ?? null,
    referenceLabel: resolveReferenceLabel(row.movement_type, row.reference_type, row.reference_id, row._ref_label),
    referenceRaw: row.reference_type && row.reference_id ? `${row.reference_type}:${row.reference_id}` : null,
    description: row.description ?? null,
    createdBy: row.created_by ?? null,
    createdByName: row.profiles?.name ?? null,
    createdAt: row.created_at,
  };
}

function resolveReferenceLabel(
  movementType: string,
  referenceType: string | null,
  referenceId: string | null,
  refLabel: string | null | undefined,
): string {
  if (refLabel) return refLabel;
  if (referenceType === "BALANCE_ADJUSTMENT" || movementType === "BALANCE_ADJUSTMENT") return "Penyesuaian Saldo";
  if (referenceType === "OPENING_BALANCE" || movementType === "OPENING_BALANCE") return "Saldo Awal";
  if (referenceType && referenceId) return `${referenceType}:${referenceId.slice(0, 8)}`;
  return "-";
}

async function enrichReferenceLabels(
  supabase: any,
  movements: CashflowMovementRow[],
): Promise<CashflowMovementRow[]> {
  const posIds: string[] = [];
  const posTransIds: string[] = [];
  const payIds: string[] = [];
  const srvIds: string[] = [];

  for (const m of movements) {
    if (!m.referenceType || !m.referenceId) continue;
    if (m.referenceType === "pos_sale") posIds.push(m.referenceId);
    else if (m.referenceType === "pos_transaction") posTransIds.push(m.referenceId);
    else if (m.referenceType === "service_payment") payIds.push(m.referenceId);
    else if (m.referenceType === "service") srvIds.push(m.referenceId);
  }

  const posMap = await batchFetchLabels(supabase, "pos_sales", posIds, "sale_number");
  const posTransMap = await batchFetchLabels(supabase, "pos_transactions", posTransIds, "transaction_number");
  const payMap = await batchFetchLabels(supabase, "service_payments", payIds, "payment_number");
  const srvMap = await batchFetchLabels(supabase, "services", srvIds, "service_number");

  return movements.map((m) => {
    if (!m.referenceType || !m.referenceId) return m;
    let label: string | undefined;
    if (m.referenceType === "pos_sale") label = posMap.get(m.referenceId);
    else if (m.referenceType === "pos_transaction") label = posTransMap.get(m.referenceId);
    else if (m.referenceType === "service_payment") label = payMap.get(m.referenceId);
    else if (m.referenceType === "service") label = srvMap.get(m.referenceId);
    if (!label) return m;
    return { ...m, referenceLabel: label };
  });
}

async function batchFetchLabels(
  supabase: any,
  table: string,
  ids: string[],
  labelColumn: string,
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from(table)
    .select(`id, ${labelColumn}`)
    .in("id", ids);
  const map = new Map<string, string>();
  if (data) {
    for (const row of data) {
      map.set(row.id, row[labelColumn]);
    }
  }
  return map;
}

/* ── List Cashflow Movements ── */

export async function listCashflowMovementsAction(
  brandSlug: string,
  filters: CashflowFilterInput,
): Promise<ActionResult<{ movements: CashflowMovementRow[]; summary: CashflowSummary }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "cashflow.view");

    const supabase = await createServerSupabase();

    if (filters.branchId && filters.branchId !== "ALL_BRANCHES") {
      requireBranchAccess(session, filters.branchId, "listCashflowMovementsAction");
    }

    let query = (supabase as any)
      .from("payment_account_movements")
      .select("*, payment_accounts!payment_account_movements_payment_account_id_fkey(account_name, type, is_cash_account), branches!payment_account_movements_branch_id_fkey(name), profiles!payment_account_movements_created_by_fkey(name)")
      .eq("brand_id", session.brandId)
      .order("created_at", { ascending: false });

    if (filters.branchId && filters.branchId !== "ALL_BRANCHES") {
      query = query.eq("branch_id", filters.branchId);
    }

    if (filters.accountId && filters.accountId !== "ALL_ACCOUNTS") {
      query = query.eq("payment_account_id", filters.accountId);
    }

    if (filters.movementType && filters.movementType !== "ALL_TYPES") {
      query = query.eq("movement_type", filters.movementType);
    }

    if (filters.direction && filters.direction !== "ALL_DIRECTIONS") {
      query = query.eq("direction", filters.direction);
    }

    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lt("created_at", filters.dateTo);
    }

    if (filters.search) {
      query = query.or(
        `description.ilike.%${filters.search}%,reference_type.ilike.%${filters.search}%,reference_id.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Cashflow] list error:", error);
      return errorResult("Gagal memuat mutasi kas.");
    }

    let movements: CashflowMovementRow[] = (data ?? []).map(mapMovement);
    movements = await enrichReferenceLabels(supabase, movements);

    const totalIn = movements
      .filter((m) => m.direction === "IN" && !NON_OPERATIONAL_EVENTS.has(m.movementType))
      .reduce((s, m) => s + m.amount, 0);
    const totalOut = movements
      .filter((m) => m.direction === "OUT" && !NON_OPERATIONAL_EVENTS.has(m.movementType))
      .reduce((s, m) => s + m.amount, 0);
    const totalMdr = movements
      .filter((m) => MDR_RELATED_TYPES.has(m.movementType))
      .reduce((s, m) => s + m.amount, 0);

    console.log("[mutasi-kas-bank]", {
      brandId: session.brandId,
      selectedBranch: filters.branchId,
      branchId: filters.branchId,
      accountId: filters.accountId,
      startDate: filters.dateFrom,
      endDateExclusive: filters.dateTo
        ? (() => { const d = new Date(filters.dateTo + "T00:00:00"); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })()
        : null,
      typeFilter: filters.movementType,
      totalRows: movements.length,
      movementTypes: [...new Set(movements.map((r) => r.movementType))],
      totalMasuk: totalIn,
      totalKeluar: totalOut,
    });

    return successResult({
      movements,
      summary: {
        totalIn,
        totalOut,
        netCashflow: totalIn - totalOut,
        totalMdr,
      },
    });
  } catch (err: any) {
    console.error("[Cashflow] listCashflowMovementsAction:", err.message);
    return errorResult(err.message || "Gagal memuat mutasi kas.");
  }
}
