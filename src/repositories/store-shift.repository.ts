import type { StoreShift } from "@/types/app";

interface DbStoreShift {
  id: string;
  brand_id: number;
  branch_id: string;
  shift_number: string;
  shift_status: string;
  opening_cash: number;
  expected_closing_cash: number | null;
  counted_closing_cash: number | null;
  cash_difference: number | null;
  opened_at: string;
  closed_at: string | null;
  opened_by: string | null;
  closed_by: string | null;
  opening_notes: string | null;
  closing_notes: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  auto_closed: boolean | null;
  closing_reason: string | null;
  reconciliation_status: string | null;
  scheduled_open_time: string | null;
  scheduled_close_time: string | null;
  late_open_minutes: number | null;
  early_open_minutes: number | null;
  late_close_minutes: number | null;
  opened_by_profile?: { name: string; email: string } | null;
  closed_by_profile?: { name: string; email: string } | null;
}

function mapDbShiftToDomain(row: DbStoreShift): StoreShift {
  const openedByName =
    row.opened_by_profile?.name ??
    row.opened_by_profile?.email ??
    undefined;
  const closedByName =
    row.closed_by_profile?.name ??
    row.closed_by_profile?.email ??
    undefined;

  console.log("[store-shift:mapper] actor mapping", {
    openedBy: row.opened_by,
    openedByName,
    closedBy: row.closed_by,
    closedByName,
  });

  return {
    id: row.id,
    brandId: row.brand_id,
    branchId: row.branch_id,
    shiftNumber: row.shift_number,
    shiftStatus: row.shift_status as StoreShift["shiftStatus"],
    openingCash: Number(row.opening_cash),
    expectedClosingCash: row.expected_closing_cash != null ? Number(row.expected_closing_cash) : undefined,
    countedClosingCash: row.counted_closing_cash != null ? Number(row.counted_closing_cash) : undefined,
    cashDifference: row.cash_difference != null ? Number(row.cash_difference) : undefined,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? undefined,
    openedBy: row.opened_by ?? undefined,
    closedBy: row.closed_by ?? undefined,
    openedByName,
    closedByName,
    autoClosed: row.auto_closed ?? undefined,
    closingReason: (row.closing_reason as StoreShift["closingReason"]) ?? undefined,
    reconciliationStatus: (row.reconciliation_status as StoreShift["reconciliationStatus"]) ?? undefined,
    scheduledOpenTime: row.scheduled_open_time ?? undefined,
    scheduledCloseTime: row.scheduled_close_time ?? undefined,
    lateOpenMinutes: row.late_open_minutes ?? undefined,
    earlyOpenMinutes: row.early_open_minutes ?? undefined,
    lateCloseMinutes: row.late_close_minutes ?? undefined,
  };
}

export async function getActiveShift(supabase: any, branchId: string): Promise<StoreShift | null> {
  const { data, error } = await supabase
    .from("store_shifts")
    .select(`
      *,
      opened_by_profile:profiles!opened_by(name, email),
      closed_by_profile:profiles!closed_by(name, email)
    `)
    .eq("branch_id", branchId)
    .eq("shift_status", "OPEN")
    .maybeSingle();

  if (error || !data) return null;

  console.log("[store-shift:query] getActiveShift result", {
    openedBy: (data as any).opened_by,
    openedByProfile: (data as any).opened_by_profile,
  });

  return mapDbShiftToDomain(data as DbStoreShift);
}

export async function getShiftById(supabase: any, shiftId: string): Promise<StoreShift | null> {
  const { data, error } = await supabase
    .from("store_shifts")
    .select(`
      *,
      opened_by_profile:profiles!opened_by(name, email),
      closed_by_profile:profiles!closed_by(name, email)
    `)
    .eq("id", shiftId)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbShiftToDomain(data as DbStoreShift);
}

export async function listShifts(
  supabase: any,
  branchId: string,
  limit = 20,
): Promise<StoreShift[]> {
  const { data, error } = await supabase
    .from("store_shifts")
    .select(`
      *,
      opened_by_profile:profiles!opened_by(name, email),
      closed_by_profile:profiles!closed_by(name, email)
    `)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as DbStoreShift[]).map(mapDbShiftToDomain);
}

export async function getShiftMovements(
  supabase: any,
  branchId: string,
  openedAt: string,
  closedAt: string | null | undefined,
) {
  const endTime = closedAt ?? new Date().toISOString();
  const { data, error } = await supabase
    .from("payment_account_movements")
    .select(`
      id,
      payment_account_id,
      direction,
      amount,
      movement_type,
      description,
      reference_type,
      reference_id,
      created_at
    `)
    .eq("branch_id", branchId)
    .gte("created_at", openedAt)
    .lte("created_at", endTime)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data;
}

export async function getPendingReconciliation(
  supabase: any,
  branchId: string,
): Promise<StoreShift | null> {
  const { data, error } = await supabase
    .from("store_shifts")
    .select(`
      *,
      opened_by_profile:profiles!opened_by(name, email),
      closed_by_profile:profiles!closed_by(name, email)
    `)
    .eq("branch_id", branchId)
    .eq("reconciliation_status", "PENDING")
    .order("closed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbShiftToDomain(data as DbStoreShift);
}

export async function resolveBranchCashAccount(
  supabase: any,
  brandId: number,
  branchId: string,
  branchName?: string | null,
  createIfMissing = true,
): Promise<{ id: string; accountName: string } | null> {
  const { data: existing, error } = await supabase
    .from("payment_accounts")
    .select("id, account_name")
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .eq("type", "CASH")
    .eq("is_cash_account", true)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!error && existing) {
    return { id: existing.id, accountName: existing.account_name };
  }

  if (!createIfMissing) return null;

  const displayName = branchName ? `Kas Tunai - ${branchName}` : "Kas Tunai Cabang";

  const { data: created, error: createError } = await supabase
    .from("payment_accounts")
    .insert({
      brand_id: brandId,
      branch_id: branchId,
      account_name: displayName,
      type: "CASH",
      is_cash_account: true,
      is_system_account: true,
      is_default_receiving_account: true,
      is_active: true,
      allow_negative_balance: false,
      current_balance: 0,
    })
    .select("id, account_name")
    .single();

  if (createError || !created) {
    console.error("[StoreShiftRepository] resolveBranchCashAccount create error:", createError);
    return null;
  }

  console.log("[store-shift:open] cash account", {
    found: false,
    cashAccountId: created.id,
    created: true,
  });

  return { id: created.id, accountName: created.account_name };
}
