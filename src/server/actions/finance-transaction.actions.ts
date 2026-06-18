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

export type SourceFilter = "ALL" | "MANUAL" | "POS" | "SERVICE" | "EXPENSE";

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
  /** Source label: POS, Servis, MDR, Manual, etc. */
  sourceLabel: string;
  /** Whether this row is automatic (POS/service/etc) or manual */
  isAutomatic: boolean;
  /** Original entry_type from finance_ledger */
  entryType?: string;
  /** source_table from finance_ledger */
  sourceTable?: string | null;
  /** category from finance_ledger */
  category?: string | null;
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
  sourceFilter?: SourceFilter;
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

/* ── Mapper from payment_account_movements ── */

function mapMovement(row: any): FinanceTransactionRow {
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
    sourceLabel: "Manual",
    isAutomatic: false,
  };
}

function getEntrySourceLabel(entryType: string, category?: string | null, sourceTable?: string | null): string {
  if (entryType === "POS_REVENUE" || entryType === "COGS") return "POS";
  if (entryType === "SERVICE_REVENUE") return "Servis";
  if (entryType === "MDR_EXPENSE") return "MDR";
  if (sourceTable === "pos_transactions" || category === "pos") return "POS";
  if (sourceTable === "service_payments" || sourceTable === "services" || category === "service") return "Servis";
  if (entryType === "MANUAL_INCOME" || entryType === "MANUAL_EXPENSE" || sourceTable === "manual") return "Manual";
  if (entryType === "OTHER_INCOME" || entryType === "OTHER_EXPENSE") return "Manual";
  return entryType || "Manual";
}

function isAutomaticEntry(entryType: string, sourceTable?: string | null): boolean {
  if (sourceTable === "manual") return false;
  if (entryType === "MANUAL_INCOME" || entryType === "MANUAL_EXPENSE") return false;
  if (entryType === "OTHER_INCOME" || entryType === "OTHER_EXPENSE") return false;
  return true;
}

function mapLedgerRow(row: any, branchNameMap?: Map<string, string>): FinanceTransactionRow {
  const dir: "IN" | "OUT" = row.direction === "CREDIT" ? "IN" : "OUT";
  const entryType = row.entry_type || "";
  const sourceLabel = getEntrySourceLabel(entryType, row.category, row.source_table);
  const auto = isAutomaticEntry(entryType, row.source_table);
  return {
    id: row.id,
    paymentAccountId: "",
    accountName: sourceLabel,
    accountType: "",
    isCashAccount: false,
    branchId: row.branch_id ?? null,
    branchName: (branchNameMap?.get(row.branch_id)) ?? null,
    direction: dir,
    amount: Number(row.amount || 0),
    beforeBalance: 0,
    afterBalance: 0,
    movementType: entryType,
    description: row.description ?? null,
    createdBy: row.created_by ?? null,
    createdByName: null,
    createdAt: row.occurred_at || row.created_at || new Date().toISOString(),
    isVoided: false,
    sourceLabel,
    isAutomatic: auto,
    entryType,
    sourceTable: row.source_table ?? null,
    category: row.category ?? null,
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
    const sourceFilter = input.sourceFilter ?? "ALL";

    /* Fetch branches for name map */
    const { data: allBranches } = await (supabase as any)
      .from("branches")
      .select("id, name")
      .eq("brand_id", session.brandId);
    const branchNameMap = new Map<string, string>((allBranches ?? []).map((b: any) => [b.id, b.name]));

    const buildBaseQuery = (selectStr: string) => {
      let q = (supabase as any)
        .from("finance_ledger")
        .select(selectStr, { count: "exact" })
        .eq("brand_id", session.brandId)
        .order("occurred_at", { ascending: false });

      if (input.branchId && input.branchId !== "ALL_BRANCHES") {
        q = q.eq("branch_id", input.branchId);
      }
      if (input.dateFrom) {
        q = q.gte("ledger_date", input.dateFrom);
      }
      if (input.dateTo) {
        q = q.lte("ledger_date", input.dateTo);
      }
      if (input.search) {
        q = q.ilike("description", `%${input.search}%`);
      }

      return q;
    };

    /* Determine finance_ledger filters based on source */
    let ledgerRows: any[] = [];
    let ledgerTotalCount = 0;

    if (sourceFilter === "ALL") {
      const q = buildBaseQuery("*");
      const { data, error, count } = await q;
      if (!error) { ledgerRows = data ?? []; ledgerTotalCount = count ?? 0; }
    } else if (sourceFilter === "POS") {
      const q = buildBaseQuery("*")
        .or("category.eq.pos,entry_type.eq.POS_REVENUE,entry_type.eq.COGS");
      const { data, error, count } = await q;
      if (!error) { ledgerRows = data ?? []; ledgerTotalCount = count ?? 0; }
    } else if (sourceFilter === "SERVICE") {
      const q = buildBaseQuery("*")
        .or("category.eq.service,entry_type.eq.SERVICE_REVENUE");
      const { data, error, count } = await q;
      if (!error) { ledgerRows = data ?? []; ledgerTotalCount = count ?? 0; }
    } else if (sourceFilter === "EXPENSE") {
      const q = buildBaseQuery("*")
        .eq("direction", "DEBIT");
      const { data, error, count } = await q;
      if (!error) { ledgerRows = data ?? []; ledgerTotalCount = count ?? 0; }
    }

    /* MANUAL: query finance_ledger for manual-type entries + payment_account_movements */
    let movementRows: any[] = [];
    let movementTotalCount = 0;

    if (sourceFilter === "MANUAL") {
      // finance_ledger manual entries
      const q = buildBaseQuery("*")
        .or("source_table.is.null,source_table.eq.manual,entry_type.eq.MANUAL_INCOME,entry_type.eq.MANUAL_EXPENSE");
      const { data, error, count } = await q;
      if (!error) { ledgerRows = data ?? []; ledgerTotalCount = count ?? 0; }

      // payment_account_movements (backward compat)
      let mq = (supabase as any)
        .from("payment_account_movements")
        .select("*, payment_accounts!payment_account_movements_payment_account_id_fkey(account_name, type, is_cash_account), branches!payment_account_movements_branch_id_fkey(name), profiles!payment_account_movements_created_by_fkey(name)", { count: "exact" })
        .in("movement_type", ["OTHER_INCOME", "OPERATING_EXPENSE", "BANK_FEE"])
        .eq("brand_id", session.brandId)
        .order("created_at", { ascending: false });

      if (input.branchId && input.branchId !== "ALL_BRANCHES") {
        mq = mq.eq("branch_id", input.branchId);
      }
      if (input.accountId && input.accountId !== "ALL_ACCOUNTS") {
        mq = mq.eq("payment_account_id", input.accountId);
      }
      if (input.direction && input.direction !== "ALL_DIRECTIONS") {
        mq = mq.eq("direction", input.direction);
      }
      if (input.dateFrom) {
        mq = mq.gte("created_at", input.dateFrom);
      }
      if (input.dateTo) {
        mq = mq.lte("created_at", input.dateTo);
      }
      if (input.search) {
        mq = mq.or(`description.ilike.%${input.search}%`);
      }

      const { data: mData, count: mCount } = await mq;
      movementRows = (mData ?? []).filter((m: any) => !m.is_voided);
      movementTotalCount = mCount ?? 0;
    }

    // For ALL filter, also include payment_account_movements
    if (sourceFilter === "ALL") {
      let mq = (supabase as any)
        .from("payment_account_movements")
        .select("*, payment_accounts!payment_account_movements_payment_account_id_fkey(account_name, type, is_cash_account), branches!payment_account_movements_branch_id_fkey(name), profiles!payment_account_movements_created_by_fkey(name)", { count: "exact" })
        .in("movement_type", ["OTHER_INCOME", "OPERATING_EXPENSE", "BANK_FEE"])
        .eq("brand_id", session.brandId)
        .order("created_at", { ascending: false });

      if (input.branchId && input.branchId !== "ALL_BRANCHES") {
        mq = mq.eq("branch_id", input.branchId);
      }
      if (input.dateFrom) {
        mq = mq.gte("created_at", input.dateFrom);
      }
      if (input.dateTo) {
        mq = mq.lte("created_at", input.dateTo);
      }
      if (input.search) {
        mq = mq.or(`description.ilike.%${input.search}%`);
      }

      const { data: mData } = await mq;
      movementRows = (mData ?? []).filter((m: any) => !m.is_voided);
    }

    /* Merge ledger rows + movement rows */
    const mappedLedger = ledgerRows.map((r: any) => mapLedgerRow(r, branchNameMap));
    const mappedMovements = movementRows.map(mapMovement);

    // Deduplicate by id (ledger takes priority, but movements are separate table so no id collision)
    const allRows: FinanceTransactionRow[] = [...mappedLedger, ...mappedMovements];

    // Apply direction filter (if not already filtered by source)
    if (input.direction && input.direction !== "ALL_DIRECTIONS" && sourceFilter !== "EXPENSE" && sourceFilter !== "MANUAL") {
      const filtered = allRows.filter((r) => r.direction === input.direction);
      allRows.length = 0;
      allRows.push(...filtered);
    }

    // Sort by createdAt descending
    allRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = allRows.length;

    /* Paginate */
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const paginated = allRows.slice(from, to + 1);

    /* Summary */
    const totalIncome = allRows
      .filter((t) => t.direction === "IN")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = allRows
      .filter((t) => t.direction === "OUT")
      .reduce((s, t) => s + t.amount, 0);

    return successResult({
      transactions: paginated,
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

    // Also insert into finance_ledger via SECURITY DEFINER RPC
    await (supabase as any).rpc("add_finance_ledger_entry", {
      p_brand_id: session.brandId,
      p_branch_id: input.branchId,
      p_entry_type: "MANUAL_INCOME",
      p_direction: "CREDIT",
      p_amount: input.amount,
      p_category: input.category || "other",
      p_description: input.description,
      p_source_table: "manual",
      p_occurred_at: new Date().toISOString(),
      p_ledger_date: input.date || new Date().toISOString().split("T")[0],
      p_created_by: session.profileId,
    });

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

    return successResult(mapMovement(created));
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

    // Also insert into finance_ledger via SECURITY DEFINER RPC
    await (supabase as any).rpc("add_finance_ledger_entry", {
      p_brand_id: session.brandId,
      p_branch_id: input.branchId,
      p_entry_type: "MANUAL_EXPENSE",
      p_direction: "DEBIT",
      p_amount: input.amount,
      p_category: input.category || "other",
      p_description: input.description,
      p_source_table: "manual",
      p_occurred_at: new Date().toISOString(),
      p_ledger_date: input.date || new Date().toISOString().split("T")[0],
      p_created_by: session.profileId,
    });

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

    return successResult(mapMovement(created));
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

    // Add reversing finance_ledger entry
    const ledgerDirection = original.direction === "IN" ? "DEBIT" : "CREDIT";
    await (supabase as any).rpc("add_finance_ledger_entry", {
      p_brand_id: session.brandId,
      p_branch_id: original.branch_id,
      p_entry_type: "VOID_ADJUSTMENT",
      p_direction: ledgerDirection,
      p_amount: Number(original.amount),
      p_category: "adjustment",
      p_description: `Pembatalan: ${input.reason}`,
      p_source_table: "manual",
      p_reference_type: "VOID",
      p_reference_id: original.id,
      p_occurred_at: new Date().toISOString(),
      p_ledger_date: new Date().toISOString().split("T")[0],
      p_created_by: session.profileId,
    });

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
