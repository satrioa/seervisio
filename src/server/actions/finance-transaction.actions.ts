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

export interface FinanceTransactionRow {
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
  description: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  isVoided: boolean;
}

export interface FinanceTransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netManual: number;
  totalTransactions: number;
}

export interface FilterInput {
  brandSlug: string;
  branchId?: string | null;
  accountId?: string | null;
  movementType?: string | null;
  direction?: "IN" | "OUT" | "ALL_DIRECTIONS" | null;
  search?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  pageSize?: number;
}

export interface CreateIncomeInput {
  brandSlug: string;
  branchId: string;
  paymentAccountId: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

export interface CreateExpenseInput {
  brandSlug: string;
  branchId: string;
  paymentAccountId: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

export interface VoidTransactionInput {
  brandSlug: string;
  movementId: string;
  reason: string;
}

/* ── Constants ── */

const MANUAL_TYPES = new Set(["OTHER_INCOME", "OPERATING_EXPENSE", "BANK_FEE"]);

/* ── Mapper ── */

function mapTransaction(row: any): FinanceTransactionRow {
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
    description: row.description ?? null,
    createdBy: row.created_by ?? null,
    createdByName: row.profiles?.name ?? null,
    createdAt: row.created_at,
    isVoided: row.is_voided ?? false,
  };
}

/* ── List Transactions ── */

export async function listFinanceTransactionsAction(
  input: FilterInput,
): Promise<ActionResult<{ transactions: FinanceTransactionRow[]; totalCount: number; summary: FinanceTransactionSummary }>> {
  try {
    const session = await getSessionData(input.brandSlug);
    requireActionPermission(session.role, "finance_transaction.view");

    const supabase = await createServerSupabase();

    let query = (supabase as any)
      .from("payment_account_movements")
      .select("*, payment_accounts!payment_account_movements_payment_account_id_fkey(account_name, type, is_cash_account), branches!payment_account_movements_branch_id_fkey(name), profiles!payment_account_movements_created_by_fkey(name)", { count: "exact" })
      .in("movement_type", ["OTHER_INCOME", "OPERATING_EXPENSE", "BANK_FEE"])
      .eq("brand_id", session.brandId)
      .order("created_at", { ascending: false });

    if (input.branchId && input.branchId !== "ALL_BRANCHES") {
      query = query.eq("branch_id", input.branchId);
    }

    if (input.accountId && input.accountId !== "ALL_ACCOUNTS") {
      query = query.eq("payment_account_id", input.accountId);
    }

    if (input.movementType && input.movementType !== "ALL_TYPES") {
      query = query.eq("movement_type", input.movementType);
    }

    if (input.direction && input.direction !== "ALL_DIRECTIONS") {
      query = query.eq("direction", input.direction);
    }

    if (input.dateFrom) {
      query = query.gte("created_at", input.dateFrom);
    }

    if (input.dateTo) {
      query = query.lte("created_at", input.dateTo);
    }

    if (input.search) {
      query = query.or(
        `description.ilike.%${input.search}%`,
      );
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[FinanceTransaction] list error:", error);
      return errorResult("Gagal memuat transaksi.");
    }

    const transactions: FinanceTransactionRow[] = (data ?? []).map(mapTransaction);
    const totalCount = count ?? 0;

    const totalIncome = transactions
      .filter((t) => t.direction === "IN")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.direction === "OUT")
      .reduce((s, t) => s + t.amount, 0);

    return successResult({
      transactions,
      totalCount,
      summary: {
        totalIncome,
        totalExpense,
        netManual: totalIncome - totalExpense,
        totalTransactions: totalCount,
      },
    });
  } catch (err: any) {
    console.error("[FinanceTransaction] listFinanceTransactionsAction:", err.message);
    return errorResult(err.message || "Gagal memuat transaksi.");
  }
}

/* ── Create Other Income ── */

export async function createOtherIncomeAction(
  input: CreateIncomeInput,
): Promise<ActionResult<FinanceTransactionRow>> {
  try {
    const session = await getSessionData(input.brandSlug);
    requireActionPermission(session.role, "finance_transaction.create_income");
    requireBranchAccess(session, input.branchId, "createOtherIncomeAction");

    const supabase = await createServerSupabase();

    const { error: movError, data: movementId } = await (supabase as any).rpc("add_payment_account_movement", {
      p_payment_account_id: input.paymentAccountId,
      p_direction: "IN",
      p_amount: input.amount,
      p_movement_type: "OTHER_INCOME",
      p_description: `[${input.category}] ${input.description}`,
      p_reference_type: "OTHER_INCOME",
      p_reference_id: null,
      p_created_by: session.profileId,
      p_metadata: { category: input.category, txn_date: input.date },
    });

    if (movError) {
      console.error("[FinanceTransaction] create income movement error:", movError);
      return errorResult(movError.message || "Gagal membuat pergerakan akun.");
    }

    const { data: created } = await (supabase as any)
      .from("payment_account_movements")
      .select("*, payment_accounts!payment_account_movements_payment_account_id_fkey(account_name, type, is_cash_account), branches!payment_account_movements_branch_id_fkey(name), profiles!payment_account_movements_created_by_fkey(name)")
      .eq("id", movementId)
      .single();

    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      actor_id: session.profileId,
      action: "CREATE",
      entity_type: "FINANCE_TRANSACTION",
      entity_id: movementId,
      description: `Pendapatan lain: ${input.category} - ${input.description} (${input.amount})`,
    });

    return successResult(mapTransaction(created));
  } catch (err: any) {
    console.error("[FinanceTransaction] createOtherIncomeAction:", err.message);
    return errorResult(err.message || "Gagal membuat pendapatan.");
  }
}

/* ── Create Operating Expense ── */

export async function createOperatingExpenseAction(
  input: CreateExpenseInput,
): Promise<ActionResult<FinanceTransactionRow>> {
  try {
    const session = await getSessionData(input.brandSlug);
    requireActionPermission(session.role, "finance_transaction.create_expense");
    requireBranchAccess(session, input.branchId, "createOperatingExpenseAction");

    const supabase = await createServerSupabase();

    const { error: movError, data: movementId } = await (supabase as any).rpc("add_payment_account_movement", {
      p_payment_account_id: input.paymentAccountId,
      p_direction: "OUT",
      p_amount: input.amount,
      p_movement_type: "OPERATING_EXPENSE",
      p_description: `[${input.category}] ${input.description}`,
      p_reference_type: "OPERATING_EXPENSE",
      p_reference_id: null,
      p_created_by: session.profileId,
      p_metadata: { category: input.category, txn_date: input.date },
    });

    if (movError) {
      console.error("[FinanceTransaction] create expense movement error:", movError);
      return errorResult(movError.message || "Gagal membuat pergerakan akun.");
    }

    const { data: created } = await (supabase as any)
      .from("payment_account_movements")
      .select("*, payment_accounts!payment_account_movements_payment_account_id_fkey(account_name, type, is_cash_account), branches!payment_account_movements_branch_id_fkey(name), profiles!payment_account_movements_created_by_fkey(name)")
      .eq("id", movementId)
      .single();

    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      actor_id: session.profileId,
      action: "CREATE",
      entity_type: "FINANCE_TRANSACTION",
      entity_id: movementId,
      description: `Pengeluaran: ${input.category} - ${input.description} (${input.amount})`,
    });

    return successResult(mapTransaction(created));
  } catch (err: any) {
    console.error("[FinanceTransaction] createOperatingExpenseAction:", err.message);
    return errorResult(err.message || "Gagal membuat pengeluaran.");
  }
}

/* ── Void Transaction ── */

export async function voidFinanceTransactionAction(
  input: VoidTransactionInput,
): Promise<ActionResult<null>> {
  try {
    const session = await getSessionData(input.brandSlug);
    requireActionPermission(session.role, "finance_transaction.void");

    const supabase = await createServerSupabase();

    const { data: original } = await (supabase as any)
      .from("payment_account_movements")
      .select("*")
      .eq("id", input.movementId)
      .single();

    if (!original) {
      return errorResult("Transaksi tidak ditemukan.");
    }

    if (original.is_voided) {
      return errorResult("Transaksi sudah dibatalkan.");
    }

    if (!MANUAL_TYPES.has(original.movement_type)) {
      return errorResult("Tipe transaksi ini tidak dapat dibatalkan dari halaman ini.");
    }

    const reverseDirection = original.direction === "IN" ? "OUT" : "IN";

    const { error: revError } = await (supabase as any).rpc("add_payment_account_movement", {
      p_payment_account_id: original.payment_account_id,
      p_direction: reverseDirection,
      p_amount: Number(original.amount),
      p_movement_type: "BALANCE_ADJUSTMENT",
      p_description: `Pembatalan: ${input.reason}`,
      p_reference_type: "VOID",
      p_reference_id: original.id,
      p_created_by: session.profileId,
      p_metadata: { voided_movement_id: original.id, reason: input.reason },
    });

    if (revError) {
      console.error("[FinanceTransaction] void reversal error:", revError);
      return errorResult(revError.message || "Gagal membuat transaksi pembatalan.");
    }

    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      actor_id: session.profileId,
      action: "VOID",
      entity_type: "FINANCE_TRANSACTION",
      entity_id: original.id,
      description: `Pembatalan transaksi: ${input.reason}`,
    });

    return successResult(null);
  } catch (err: any) {
    console.error("[FinanceTransaction] voidFinanceTransactionAction:", err.message);
    return errorResult(err.message || "Gagal membatalkan transaksi.");
  }
}
