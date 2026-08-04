import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface ServicePaymentRow {
  id: string;
  brand_id: number;
  branch_id: string;
  service_id: string;
  payment_method_id: string;
  payment_account_id: string;
  payment_account_movement_id: string | null;
  payment_number: string;
  payment_status: string;
  gross_amount: number;
  mdr_amount: number;
  net_amount: number;
  idempotency_key: string | null;
  paid_at: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export async function getServicePayments(
  serviceId: string
): Promise<ServicePaymentRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("service_payments")
    .select(`
      *,
      payment_method:payment_methods(id, name, type),
      payment_account:payment_accounts(id, account_name, type)
    `)
    .eq("service_id", serviceId)
    .in("payment_status", ["COMPLETED", "PAID", "SUCCESS"])
    .order("paid_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getPaymentMethodsByBrand(brandId: number): Promise<any[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("payment_methods")
    .select("*")
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  DEBIT: "Debit",
  EWALLET: "E-Wallet",
  E_WALLET: "E-Wallet",
};

function buildMethodLabel(methodType: string, mdrPercentage: number): string {
  const base = METHOD_LABELS[methodType] ?? methodType;
  if (mdrPercentage > 0) {
    return `${base} (MDR ${mdrPercentage}%)`;
  }
  return base;
}

export interface BranchPaymentMethodOption {
  branchPaymentMethodId: string;
  methodType: string;
  label: string;
  paymentAccountId: string;
  accountName: string;
  accountBranchId: string | null;
  mdrPercentage: number;
  mdrMinTransaction: number;
}

export async function getBranchPaymentMethods(
  brandId: number,
  branchId: string,
): Promise<BranchPaymentMethodOption[]> {
  const supabase = await createServerSupabase();

  // Step 1: Load branch_payment_methods with active status and linked account.
  // No FK relationship between branch_payment_methods and payment_methods exists,
  // so we only query branch_payment_methods + payment_accounts.
  const { data: bpmRows, error: bpmErr } = await (supabase as any)
    .from("branch_payment_methods")
    .select(`
      id,
      method_type,
      mdr_percentage,
      mdr_min_transaction,
      payment_account_id,
      is_active
    `)
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .not("payment_account_id", "is", null);

  if (bpmErr) throw bpmErr;

  // Step 1b: Auto-seed default Cash method if no branch_payment_methods exist
  const rawRows = (bpmRows as any[] ?? []);
  if (rawRows.length === 0) {
    const admin = createServiceRoleSupabaseClient();
    const { data: cashAccount } = await (admin as any)
      .from("payment_accounts")
      .select("id")
      .eq("brand_id", brandId)
      .eq("branch_id", branchId)
      .eq("type", "CASH")
      .eq("is_cash_account", true)
      .eq("is_active", true)
      .maybeSingle();

    let cashAccountId: string | null = cashAccount?.id ?? null;

    if (!cashAccountId) {
      const { data: branch } = await (admin as any)
        .from("branches")
        .select("name")
        .eq("id", branchId)
        .single();
      if (branch) {
        const { data: created } = await (admin as any)
          .from("payment_accounts")
          .insert({
            brand_id: brandId,
            branch_id: branchId,
            account_name: `Kas - ${branch.name}`,
            type: "CASH",
            is_cash_account: true,
            is_system_account: true,
            is_default_receiving_account: true,
            is_active: true,
            allow_negative_balance: false,
            current_balance: 0,
            description: "Akun kas tunai sistem cabang",
          })
          .select("id")
          .single();
        if (created) cashAccountId = created.id;
      }
    }

    if (cashAccountId) {
      await (admin as any)
        .from("branch_payment_methods")
        .insert({
          brand_id: brandId,
          branch_id: branchId,
          method_type: "CASH",
          payment_account_id: cashAccountId,
          is_active: true,
        })
        .select("id")
        .maybeSingle();

      // Retry query after seeding
      const { data: retryRows } = await (supabase as any)
        .from("branch_payment_methods")
        .select(`id, method_type, mdr_percentage, mdr_min_transaction, payment_account_id, is_active`)
        .eq("brand_id", brandId)
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .not("payment_account_id", "is", null);

      if (retryRows && retryRows.length > 0) {
        (bpmRows as any) = retryRows;
      }
    }
  }

  // Step 2: Load payment_accounts that are valid (active + global or branch-specific)
  const accountIds = [...new Set((bpmRows as any[] ?? []).map(r => r.payment_account_id).filter(Boolean))];
  if (accountIds.length === 0) {
    console.log("[service-payment/method-options/final]", {
      brandId,
      branchId,
      count: 0,
      options: [],
    });
    return [];
  }

  const { data: paRows, error: paErr } = await (supabase as any)
    .from("payment_accounts")
    .select("id, account_name, branch_id, is_active, is_cash_account")
    .in("id", accountIds)
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .or(`branch_id.is.null,branch_id.eq.${branchId}`);

  if (paErr) throw paErr;

  // Step 3: Build valid account lookup and merge
  const validAccountIds = new Set((paRows as any[] ?? []).map((r: any) => r.id));
  const accountById = new Map<string, any>();
  for (const pa of (paRows as any[] ?? [])) {
    accountById.set(pa.id, pa);
  }

  const options: BranchPaymentMethodOption[] = [];
  for (const row of (bpmRows as any[] ?? [])) {
    if (!validAccountIds.has(row.payment_account_id)) continue;
    const account = accountById.get(row.payment_account_id);
    const mdrPct = Number(row.mdr_percentage ?? 0);
    options.push({
      branchPaymentMethodId: row.id,
      methodType: row.method_type,
      label: buildMethodLabel(row.method_type, mdrPct),
      paymentAccountId: row.payment_account_id,
      accountName: account.account_name,
      accountBranchId: account.branch_id,
      mdrPercentage: mdrPct,
      mdrMinTransaction: Number(row.mdr_min_transaction ?? 0),
    });
  }

  // Step 4: Sort manually in TypeScript
  const methodTypeOrder: Record<string, number> = { CASH: 0, QRIS: 1, TRANSFER: 2, DEBIT: 3, EWALLET: 4 };
  options.sort((a, b) => {
    const orderA = methodTypeOrder[a.methodType] ?? 99;
    const orderB = methodTypeOrder[b.methodType] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.label.localeCompare(b.label);
  });

  console.log("[service-payment/method-options/final]", {
    brandId,
    branchId,
    count: options.length,
    options: options.map(o => ({
      branchPaymentMethodId: o.branchPaymentMethodId,
      methodType: o.methodType,
      label: o.label,
      paymentAccountId: o.paymentAccountId,
      accountName: o.accountName,
      accountBranchId: o.accountBranchId,
      isGlobalAccount: o.accountBranchId === null,
    })),
  });

  return options;
}

export async function getPaymentAccountsByBranch(branchId: string): Promise<any[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("payment_accounts")
    .select("*")
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function callRecordServicePayment(
  serviceId: string,
  paymentMethodId: string,
  amount: number,
  createdBy: string,
  notes?: string | null,
  metadata?: Record<string, unknown>,
  idempotencyKey?: string | null,
  paidAt?: string | null,
): Promise<any> {
  const supabase = await createServerSupabase();
  const params: Record<string, unknown> = {
    p_service_id: serviceId,
    p_payment_method_id: paymentMethodId,
    p_amount: amount,
    p_notes: notes ?? null,
    p_metadata: metadata ?? {},
    p_created_by: createdBy,
    p_idempotency_key: idempotencyKey ?? null,
    p_paid_at: paidAt ?? null,
  };

  console.log("[callRecordServicePayment/rpc-params]", {
    p_service_id: params.p_service_id,
    p_amount: params.p_amount,
    p_payment_method_id: params.p_payment_method_id,
    p_paid_at: params.p_paid_at,
    p_created_by: params.p_created_by,
    hasIdempotencyKey: Boolean(params.p_idempotency_key),
  });

  const { data, error } = await (supabase as any).rpc("record_service_payment", params);
  if (error) throw error;
  return data;
}

export async function callCalculateServicePaymentSummary(
  serviceId: string
): Promise<any> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any).rpc("calculate_service_payment_summary", {
    p_service_id: serviceId,
  });
  if (error) throw error;
  return data;
}

export async function callRecordServicePaymentFinanceEntries(
  servicePaymentId: string,
  createdBy?: string | null
): Promise<any> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any).rpc("record_service_payment_finance_entries", {
    p_service_payment_id: servicePaymentId,
    p_created_by: createdBy ?? null,
  });
  if (error) throw error;
  return data;
}

export async function callTransitionServiceStatus(
  serviceId: string,
  toStatus: string,
  changedBy: string,
  reason?: string | null
): Promise<any> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any).rpc("transition_service_status", {
    p_service_id: serviceId,
    p_to_status: toStatus,
    p_reason: reason ?? null,
    p_metadata: {},
    p_changed_by: changedBy,
  });
  if (error) throw error;
  return data;
}

export async function callGenerateServiceNumber(brandId: number): Promise<string> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any).rpc("generate_service_number", {
    p_brand_id: brandId,
  });
  if (error) throw error;
  return data as string;
}

export async function callAddServiceSparepartUsage(
  serviceId: string,
  inventoryItemId: string,
  quantity: number,
  unitCost: number | null,
  sellingPrice: number | null,
  createdBy: string,
  notes?: string | null,
  serializedUnitId?: string | null,
): Promise<string> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any).rpc("add_service_sparepart_usage", {
    p_service_id: serviceId,
    p_inventory_item_id: inventoryItemId,
    p_quantity: quantity,
    p_unit_cost: unitCost,
    p_selling_price: sellingPrice,
    p_notes: notes ?? null,
    p_created_by: createdBy,
    p_serialized_unit_id: serializedUnitId ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function callReturnServiceSparepartUsage(
  usageId: string,
  returnedBy: string,
  reason?: string | null
): Promise<string> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any).rpc("return_service_sparepart_usage", {
    p_usage_id: usageId,
    p_reason: reason ?? null,
    p_returned_by: returnedBy,
  });
  if (error) throw error;
  return data as string;
}
