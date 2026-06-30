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

/* ── Types ── */

export interface LinkedMethodInfo {
  methodType: string;
  branchId: string | null;
  branchName: string | null;
}

export interface PaymentAccountRow {
  id: string;
  brandId: number;
  branchId: string | null;
  accountName: string;
  type: string;
  accountNumber: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankCode: string | null;
  isCashAccount: boolean;
  isSystemAccount: boolean;
  isDefaultReceivingAccount: boolean;
  isActive: boolean;
  allowNegativeBalance: boolean;
  currentBalance: number;
  description: string | null;
  branchName?: string;
  linkedMethods: LinkedMethodInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface MovementRow {
  id: string;
  paymentAccountId: string;
  direction: string;
  amount: number;
  beforeBalance: number;
  afterBalance: number;
  movementType: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
}

/* ── Helpers ── */

function mapDbAccount(row: any, linkedMethods?: LinkedMethodInfo[]): PaymentAccountRow {
  return {
    id: row.id,
    brandId: row.brand_id,
    branchId: row.branch_id ?? null,
    accountName: row.account_name,
    type: row.type,
    accountNumber: row.account_number ?? null,
    accountHolderName: row.account_holder_name ?? null,
    bankName: row.bank_name ?? null,
    bankCode: row.bank_code ?? null,
    isCashAccount: row.is_cash_account,
    isSystemAccount: row.is_system_account,
    isDefaultReceivingAccount: row.is_default_receiving_account,
    isActive: row.is_active,
    allowNegativeBalance: row.allow_negative_balance,
    currentBalance: Number(row.current_balance),
    description: row.description ?? null,
    branchName: row.branches?.name ?? null,
    linkedMethods: linkedMethods ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMovement(row: any): MovementRow {
  return {
    id: row.id,
    paymentAccountId: row.payment_account_id,
    direction: row.direction,
    amount: Number(row.amount),
    beforeBalance: Number(row.before_balance),
    afterBalance: Number(row.after_balance),
    movementType: row.movement_type,
    referenceType: row.reference_type ?? null,
    referenceId: row.reference_id ?? null,
    description: row.description ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  };
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  OPENING_BALANCE: "Saldo Awal",
  BALANCE_ADJUSTMENT: "Penyesuaian Saldo",
  SERVICE_PAYMENT: "Pembayaran Servis",
  POS_PAYMENT: "Penjualan POS",
  OTHER_INCOME: "Pendapatan Lain",
  OPERATING_EXPENSE: "Pengeluaran Operasional",
  STOCK_PURCHASE: "Belanja Stok",
  STOCK_PURCHASE_PAYMENT: "Pembayaran Stok",
  TRANSFER_IN: "Transfer Masuk",
  TRANSFER_OUT: "Transfer Keluar",
  BANK_FEE: "Biaya Bank",
  QRIS_SETTLEMENT: "Settlement QRIS",
  SERVICE_REFUND: "Refund Servis",
  POS_REFUND: "Refund POS",
};

export async function resolveMovementTypeLabel(type: string): Promise<string> {
  return MOVEMENT_TYPE_LABELS[type] ?? type;
}

/* ── List Payment Accounts ── */

export async function listPaymentAccountsAction(
  brandSlug: string,
  branchId?: string | null,
  search?: string | null,
  scope?: "ALL" | "GLOBAL" | "BRANCH" | null,
): Promise<ActionResult<PaymentAccountRow[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_account.view");

    const supabase = await createServerSupabase();

    let query = (supabase as any)
      .from("payment_accounts")
      .select("*, branches!payment_accounts_branch_id_fkey(name)")
      .eq("brand_id", session.brandId);

    if (branchId && branchId !== "ALL_BRANCHES") {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }

    if (scope === "GLOBAL") {
      query = query.is("branch_id", null);
    } else if (scope === "BRANCH") {
      query = query.not("branch_id", "is", null);
    }

    if (search) {
      query = query.or(
        `account_name.ilike.%${search}%,bank_name.ilike.%${search}%,account_number.ilike.%${search}%`
      );
    }

    query = query.order("is_system_account", { ascending: false })
      .order("is_active", { ascending: false })
      .order("account_name", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("[PaymentAccounts] list error:", error);
      return errorResult("Gagal memuat akun pembayaran.");
    }

    const accountIds = (data ?? []).map((a: any) => a.id);

    const { data: methodLinks } = accountIds.length > 0 ? await (supabase as any)
      .from("branch_payment_methods")
      .select("payment_account_id, method_type, branch_id, branches!branch_payment_methods_branch_id_fkey(name)")
      .eq("brand_id", session.brandId)
      .in("payment_account_id", accountIds) : { data: [] };

    const linkMap = new Map<string, LinkedMethodInfo[]>();
    if (methodLinks) {
      for (const link of methodLinks) {
        const existing = linkMap.get(link.payment_account_id) ?? [];
        existing.push({
          methodType: link.method_type,
          branchId: link.branch_id,
          branchName: link.branches?.name ?? null,
        });
        linkMap.set(link.payment_account_id, existing);
      }
    }

    const visibleAccounts = (data ?? []).filter((a: any) => !a.metadata?.deleted_at);

    return successResult(
      visibleAccounts.map((a: any) => mapDbAccount(a, linkMap.get(a.id) ?? []))
    );
  } catch (err: any) {
    console.error("[PaymentAccounts] listPaymentAccountsAction:", err.message);
    return errorResult(err.message || "Gagal memuat akun pembayaran.");
  }
}

/* ── Create Payment Account ── */

export interface CreatePaymentAccountInput {
  branchId: string;
  accountName: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  initialBalance?: number;
  isActive?: boolean;
  description?: string | null;
  scope?: "BRANCH" | "GLOBAL";
}

export async function createPaymentAccountAction(
  brandSlug: string,
  input: CreatePaymentAccountInput,
): Promise<ActionResult<PaymentAccountRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_account.create");

    const isGlobal = input.scope === "GLOBAL";

    if (isGlobal) {
      requireActionPermission(session.role, "payment_account.create_global");
    } else {
      requireBranchAccess(session, input.branchId, "createPaymentAccountAction");
    }

    if (!input.accountName?.trim()) return errorResult("Nama akun wajib diisi.");
    if (!isGlobal && !input.branchId) return errorResult("Cabang wajib dipilih.");
    if ((input.initialBalance ?? 0) < 0) return errorResult("Saldo awal tidak boleh negatif.");

    const supabase = await createServerSupabase();
    const guardBranchId = isGlobal ? session.defaultBranchId : input.branchId;
    if (guardBranchId) {
      await requireActiveStoreSession(supabase, session.brandId, guardBranchId);
    }

    const internalType = input.bankName ? "BANK" : "OTHER";

    const { data: created, error: createError } = await (supabase as any)
      .from("payment_accounts")
      .insert({
        brand_id: session.brandId,
        branch_id: isGlobal ? null : input.branchId,
        account_name: input.accountName.trim(),
        type: internalType,
        bank_name: input.bankName || null,
        account_number: input.accountNumber || null,
        account_holder_name: input.accountHolderName || null,
        is_cash_account: false,
        is_system_account: false,
        is_default_receiving_account: false,
        is_active: input.isActive ?? true,
        allow_negative_balance: false,
        current_balance: 0,
        description: input.description || null,
      })
      .select()
      .single();

    if (createError || !created) {
      console.error("[PaymentAccounts] create error:", createError);
      return errorResult("Gagal membuat akun pembayaran.");
    }

    const initialBalance = input.initialBalance ?? 0;

    if (initialBalance > 0) {
      const { error: movError } = await (supabase as any).rpc("add_payment_account_movement", {
        p_payment_account_id: created.id,
        p_direction: "IN",
        p_amount: initialBalance,
        p_movement_type: "OPENING_BALANCE",
        p_description: "Saldo awal akun",
        p_reference_type: "PAYMENT_ACCOUNT",
        p_reference_id: created.id,
        p_created_by: session.profileId,
        p_metadata: {},
      });

      if (movError) {
        console.error("[PaymentAccounts] opening balance movement error:", movError);
      }
    }

    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      action: isGlobal ? "PAYMENT_ACCOUNT_GLOBAL_CREATED" : "PAYMENT_ACCOUNT_BRANCH_CREATED",
      target_type: "payment_account",
      target_id: created.id,
      actor_id: session.profileId,
      details: {
        account_name: input.accountName,
        scope: isGlobal ? "GLOBAL" : "BRANCH",
        branch_id: isGlobal ? null : input.branchId,
        initial_balance: initialBalance,
      },
    });

    const { data: withBranch } = await (supabase as any)
      .from("payment_accounts")
      .select("*, branches!payment_accounts_branch_id_fkey(name)")
      .eq("id", created.id)
      .single();

    return successResult(mapDbAccount(withBranch ?? created));
  } catch (err: any) {
    console.error("[PaymentAccounts] createPaymentAccountAction:", err.message);
    return handleActionError(err, "Gagal membuat akun pembayaran.");
  }
}

/* ── Update Payment Account ── */

export interface UpdatePaymentAccountInput {
  accountId: string;
  accountName?: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  isActive?: boolean;
  description?: string | null;
}

export async function updatePaymentAccountAction(
  brandSlug: string,
  input: UpdatePaymentAccountInput,
): Promise<ActionResult<PaymentAccountRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_account.update");

    const supabase = await createServerSupabase();

    const { data: existing } = await (supabase as any)
      .from("payment_accounts")
      .select("*")
      .eq("id", input.accountId)
      .eq("brand_id", session.brandId)
      .single();

    if (!existing) return errorResult("Akun tidak ditemukan.");

    if (existing.branch_id) {
      await requireActiveStoreSession(supabase, session.brandId, existing.branch_id);
    } else if (session.defaultBranchId) {
      await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);
    }

    if (existing.is_system_account || existing.is_cash_account) {
      if (input.isActive === false) {
        return errorResult("Akun kas sistem tidak dapat dinonaktifkan.");
      }
    }

    const updates: Record<string, any> = {};
    if (input.accountName !== undefined) updates.account_name = input.accountName;
    if (input.bankName !== undefined) updates.bank_name = input.bankName;
    if (input.accountNumber !== undefined) updates.account_number = input.accountNumber;
    if (input.accountHolderName !== undefined) updates.account_holder_name = input.accountHolderName;
    if (input.isActive !== undefined) updates.is_active = input.isActive;
    if (input.description !== undefined) updates.description = input.description;

    if (Object.keys(updates).length === 0) return errorResult("Tidak ada perubahan.");

    const { data: updated, error: updateError } = await (supabase as any)
      .from("payment_accounts")
      .update(updates)
      .eq("id", input.accountId)
      .select("*, branches!payment_accounts_branch_id_fkey(name)")
      .single();

    if (updateError || !updated) {
      console.error("[PaymentAccounts] update error:", updateError);
      return errorResult("Gagal memperbarui akun.");
    }

    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      action: "PAYMENT_ACCOUNT_UPDATED",
      target_type: "payment_account",
      target_id: input.accountId,
      actor_id: session.profileId,
      details: { changes: updates },
    });

    return successResult(mapDbAccount(updated));
  } catch (err: any) {
    console.error("[PaymentAccounts] updatePaymentAccountAction:", err.message);
    return handleActionError(err, "Gagal memperbarui akun.");
  }
}

/* ── Delete Payment Account ── */

export async function deletePaymentAccountAction(
  brandSlug: string,
  accountId: string,
): Promise<ActionResult<true>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_account.archive");

    const supabase = await createServerSupabase();

    const { data: existing } = await (supabase as any)
      .from("payment_accounts")
      .select("id, brand_id, branch_id, account_name, is_cash_account, is_system_account, metadata")
      .eq("id", accountId)
      .eq("brand_id", session.brandId)
      .single();

    if (!existing) return errorResult("Akun tidak ditemukan.");

    if (existing.is_system_account || existing.is_cash_account) {
      return errorResult("Akun kas sistem tidak dapat dihapus.");
    }

    if (existing.branch_id) {
      requireBranchAccess(session, existing.branch_id, "deletePaymentAccountAction");
    }

    const guardDeleteBranchId = existing.branch_id || session.defaultBranchId;
    if (guardDeleteBranchId) {
      await requireActiveStoreSession(supabase, session.brandId, guardDeleteBranchId);
    }

    await (supabase as any)
      .from("branch_payment_methods")
      .update({ payment_account_id: null, is_active: false })
      .eq("brand_id", session.brandId)
      .eq("payment_account_id", accountId);

    await (supabase as any)
      .from("payment_methods")
      .update({ default_payment_account_id: null })
      .eq("brand_id", session.brandId)
      .eq("default_payment_account_id", accountId);

    const { error } = await (supabase as any)
      .from("payment_accounts")
      .delete()
      .eq("id", accountId)
      .eq("brand_id", session.brandId);

    if (error) {
      const metadata = {
        ...(existing.metadata ?? {}),
        deleted_at: new Date().toISOString(),
        deleted_by: session.profileId,
      };

      const { error: archiveError } = await (supabase as any)
        .from("payment_accounts")
        .update({
          is_active: false,
          metadata,
        })
        .eq("id", accountId)
        .eq("brand_id", session.brandId);

      if (archiveError) {
        console.error("[PaymentAccounts] archive after delete error:", archiveError);
        return errorResult("Gagal menghapus akun.");
      }
    }

    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      action: error ? "PAYMENT_ACCOUNT_ARCHIVED" : "PAYMENT_ACCOUNT_DELETED",
      target_type: "payment_account",
      target_id: accountId,
      actor_id: session.profileId,
      details: { accountName: existing.account_name, unlinkedPaymentMethods: true },
    });

    return successResult(true);
  } catch (err: any) {
    console.error("[PaymentAccounts] deletePaymentAccountAction:", err.message);
    return handleActionError(err, "Gagal menghapus akun.");
  }
}

/* ── Adjust Balance ── */

export interface AdjustBalanceInput {
  accountId: string;
  direction: "IN" | "OUT";
  amount: number;
  reason: string;
}

export async function adjustPaymentAccountBalanceAction(
  brandSlug: string,
  input: AdjustBalanceInput,
): Promise<ActionResult<PaymentAccountRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_account.adjust_balance");

    if (input.amount <= 0) return errorResult("Jumlah harus lebih dari 0.");
    if (!input.reason?.trim()) return errorResult("Alasan penyesuaian wajib diisi.");

    const supabase = await createServerSupabase();

    const { data: account } = await (supabase as any)
      .from("payment_accounts")
      .select("id, brand_id, branch_id, current_balance, is_cash_account, is_system_account")
      .eq("id", input.accountId)
      .eq("brand_id", session.brandId)
      .single();

    if (!account) return errorResult("Akun tidak ditemukan.");

    const adjBranchId = account.branch_id || session.defaultBranchId;
    if (adjBranchId) {
      await requireActiveStoreSession(supabase, session.brandId, adjBranchId);
    }

    const { error: movError } = await (supabase as any).rpc("add_payment_account_movement", {
      p_payment_account_id: input.accountId,
      p_direction: input.direction,
      p_amount: input.amount,
      p_movement_type: "BALANCE_ADJUSTMENT",
      p_description: input.reason.trim(),
      p_reference_type: "PAYMENT_ACCOUNT",
      p_reference_id: input.accountId,
      p_created_by: session.profileId,
      p_metadata: {},
    });

    if (movError) {
      console.error("[PaymentAccounts] adjust balance movement error:", movError);
      return errorResult("Gagal menyesuaikan saldo.");
    }

    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      action: "PAYMENT_ACCOUNT_BALANCE_ADJUSTED",
      target_type: "payment_account",
      target_id: input.accountId,
      actor_id: session.profileId,
      details: {
        direction: input.direction,
        amount: input.amount,
        reason: input.reason,
      },
    });

    const { data: updated } = await (supabase as any)
      .from("payment_accounts")
      .select("*, branches!payment_accounts_branch_id_fkey(name)")
      .eq("id", input.accountId)
      .single();

    return successResult(mapDbAccount(updated));
  } catch (err: any) {
    console.error("[PaymentAccounts] adjustPaymentAccountBalanceAction:", err.message);
    return handleActionError(err, "Gagal menyesuaikan saldo.");
  }
}

/* ── Get Movements ── */

export async function getPaymentAccountMovementsAction(
  brandSlug: string,
  accountId: string,
  limit = 50,
): Promise<ActionResult<MovementRow[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_account.view");

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any)
      .from("payment_account_movements")
      .select("*")
      .eq("payment_account_id", accountId)
      .eq("brand_id", session.brandId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[PaymentAccounts] movements error:", error);
      return errorResult("Gagal memuat riwayat mutasi.");
    }

    return successResult((data ?? []).map(mapMovement));
  } catch (err: any) {
    console.error("[PaymentAccounts] getPaymentAccountMovementsAction:", err.message);
    return errorResult(err.message || "Gagal memuat riwayat mutasi.");
  }
}

/* ── Repair Branch Cash Account ── */

export async function repairBranchCashAccountAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<PaymentAccountRow | null>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_account.create");
    requireBranchAccess(session, branchId, "repairBranchCashAccountAction");

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, branchId);

    const { data: existing } = await (supabase as any)
      .from("payment_accounts")
      .select("*, branches!payment_accounts_branch_id_fkey(name)")
      .eq("brand_id", session.brandId)
      .eq("branch_id", branchId)
      .eq("type", "CASH")
      .eq("is_cash_account", true)
      .maybeSingle();

    if (existing) {
      return successResult(mapDbAccount(existing));
    }

    const { data: branch } = await (supabase as any)
      .from("branches")
      .select("id, name")
      .eq("id", branchId)
      .single();

    if (!branch) return errorResult("Cabang tidak ditemukan.");

    const accountName = `Kas - ${branch.name}`;

    const { data: created, error: createError } = await (supabase as any)
      .from("payment_accounts")
      .insert({
        brand_id: session.brandId,
        branch_id: branchId,
        account_name: accountName,
        type: "CASH",
        is_cash_account: true,
        is_system_account: true,
        is_default_receiving_account: true,
        is_active: true,
        allow_negative_balance: false,
        current_balance: 0,
        description: "Akun kas tunai sistem cabang",
      })
      .select("*, branches!payment_accounts_branch_id_fkey(name)")
      .single();

    if (createError || !created) {
      console.error("[PaymentAccounts] repair cash account error:", createError);
      return errorResult("Gagal membuat akun kas cabang.");
    }

    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      action: "CASH_ACCOUNT_CREATED",
      target_type: "payment_account",
      target_id: created.id,
      actor_id: session.profileId,
      details: { branch_id: branchId, account_name: accountName },
    });

    return successResult(mapDbAccount(created));
  } catch (err: any) {
    console.error("[PaymentAccounts] repairBranchCashAccountAction:", err.message);
    return handleActionError(err, "Gagal memperbaiki akun kas cabang.");
  }
}

/* ── Get total MDR deductions ── */

export async function getPaymentMdrTotalAction(
  brandSlug: string,
  branchId?: string | null,
): Promise<ActionResult<number>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_account.view");

    const supabase = await createServerSupabase();

    let svcQuery = (supabase as any)
      .from("service_payments")
      .select("mdr_amount")
      .eq("brand_id", session.brandId);

    let posQuery = (supabase as any)
      .from("pos_sales")
      .select("mdr_amount")
      .eq("brand_id", session.brandId);

    if (branchId) {
      svcQuery = svcQuery.eq("branch_id", branchId);
      posQuery = posQuery.eq("branch_id", branchId);
    }

    const [svcResult, posResult] = await Promise.all([
      svcQuery,
      posQuery,
    ]);

    const svcTotal = (svcResult.data ?? []).reduce((s: number, r: any) => s + Number(r.mdr_amount || 0), 0);
    const posTotal = (posResult.data ?? []).reduce((s: number, r: any) => s + Number(r.mdr_amount || 0), 0);

    return successResult(svcTotal + posTotal);
  } catch (err: any) {
    console.error("[PaymentAccounts] getPaymentMdrTotalAction:", err.message);
    return errorResult(err.message || "Gagal memuat total MDR.");
  }
}
