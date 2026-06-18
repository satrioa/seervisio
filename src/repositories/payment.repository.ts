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
      payment_account:payment_accounts(id, name, account_type)
    `)
    .eq("service_id", serviceId)
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

export interface BranchPaymentMethodOption {
  branchPaymentMethodId: string;
  paymentMethodId: string;
  methodType: string;
  methodName: string;
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

  // Step 1: Load branch_payment_methods with active status and linked account
  const { data: bpmRows, error: bpmErr } = await (supabase as any)
    .from("branch_payment_methods")
    .select(`
      id,
      method_type,
      mdr_percentage,
      mdr_min_transaction,
      payment_account_id,
      payment_method:payment_methods!inner(id, name, type, is_active)
    `)
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .not("payment_account_id", "is", null)
    .eq("payment_method.is_active", true)
    .order("payment_method.name", { ascending: true });

  if (bpmErr) throw bpmErr;

  // Step 2: Load payment_accounts that are valid (active + global or branch-specific)
  const accountIds = [...new Set((bpmRows as any[] ?? []).map(r => r.payment_account_id).filter(Boolean))];
  if (accountIds.length === 0) {
    console.log("[service-payment/method-options/final]", {
      brandId,
      branchId,
      count: 0,
      methods: [],
    });
    return [];
  }

  const { data: paRows, error: paErr } = await (supabase as any)
    .from("payment_accounts")
    .select("id, name, branch_id, is_active")
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

  const methods: BranchPaymentMethodOption[] = [];
  for (const row of (bpmRows as any[] ?? [])) {
    if (!validAccountIds.has(row.payment_account_id)) continue;
    const account = accountById.get(row.payment_account_id);
    methods.push({
      branchPaymentMethodId: row.id,
      paymentMethodId: row.payment_method.id,
      methodType: row.method_type,
      methodName: row.payment_method.name,
      paymentAccountId: row.payment_account_id,
      accountName: account.name,
      accountBranchId: account.branch_id,
      mdrPercentage: Number(row.mdr_percentage ?? 0),
      mdrMinTransaction: Number(row.mdr_min_transaction ?? 0),
    });
  }

  console.log("[service-payment/method-options/final]", {
    brandId,
    branchId,
    count: methods.length,
    methods: methods.map(m => ({
      branchPaymentMethodId: m.branchPaymentMethodId,
      methodType: m.methodType,
      paymentAccountId: m.paymentAccountId,
      accountName: m.accountName,
      accountBranchId: m.accountBranchId,
      isGlobalAccount: m.accountBranchId === null,
    })),
  });

  return methods;
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
): Promise<any> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any).rpc("record_service_payment", {
    p_service_id: serviceId,
    p_payment_method_id: paymentMethodId,
    p_amount: amount,
    p_notes: notes ?? null,
    p_metadata: metadata ?? {},
    p_created_by: createdBy,
    p_idempotency_key: idempotencyKey ?? null,
  });
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
