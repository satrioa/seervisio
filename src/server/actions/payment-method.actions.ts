"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  type ActionResult,
} from "./action-helper";

/* ── Types ── */

export interface BranchPaymentMethodRow {
  id: string | null;
  brandId: number;
  branchId: string;
  methodCode: string;
  methodType: string;
  label: string;
  isActive: boolean;
  linkedAccountId: string | null;
  linkedAccountName: string | null;
  linkedAccountType: string | null;
  isSystem: boolean;
  branchName?: string;
  mdrEnabled: boolean;
  mdrRatePercent: number;
  mdrFixedFee: number;
  mdrMinAmount: number;
}

/* ── Configuration ── */

const SYSTEM_METHODS = [
  { code: "CASH", label: "Cash", type: "CASH", description: "Pembayaran tunai di kas cabang" },
  { code: "QRIS", label: "QRIS", type: "QRIS", description: "Pembayaran QRIS" },
  { code: "TRANSFER", label: "Transfer", type: "TRANSFER", description: "Transfer bank" },
  { code: "DEBIT", label: "Debit", type: "DEBIT", description: "Pembayaran kartu debit / EDC" },
  { code: "EWALLET", label: "E-Wallet", type: "EWALLET", description: "Pembayaran e-wallet" },
];

const METHOD_TYPE_ACCOUNT_TYPE: Record<string, string> = {
  CASH: "CASH",
  QRIS: "QRIS",
  TRANSFER: "BANK",
  DEBIT: "DEBIT",
  EWALLET: "EWALLET",
};

function methodCodeToType(code: string): string {
  const map: Record<string, string> = {
    "PM-CASH": "CASH", "PM-QRIS": "QRIS", "PM-TRF": "TRANSFER", "PM-DEBIT": "DEBIT",
    CASH: "CASH", QRIS: "QRIS", TRANSFER: "TRANSFER", DEBIT: "DEBIT", EWALLET: "EWALLET",
  };
  return map[code] || code;
}

/* ── Helpers ── */

function parseMdrConfig(methodsRow: any | null) {
  const mdr = methodsRow?.metadata?.mdr ?? {};
  return {
    mdrEnabled: mdr.enabled ?? false,
    mdrRatePercent: mdr.ratePercent ?? methodsRow?.mdr_percentage ?? 0,
    mdrFixedFee: mdr.fixedFee ?? 0,
    mdrMinAmount: mdr.minAmount ?? 0,
  };
}

function mapBranchMethodRow(row: any, methodDef: typeof SYSTEM_METHODS[0], branchName: string, mdr?: { mdrEnabled?: boolean; mdrRatePercent?: number; mdrFixedFee?: number; mdrMinAmount?: number }): BranchPaymentMethodRow {
  return {
    id: row?.id ?? null,
    brandId: row?.brand_id ?? 0,
    branchId: row?.branch_id ?? "",
    methodCode: methodDef.code,
    methodType: methodDef.type,
    label: methodDef.label,
    isActive: row?.is_active ?? false,
    linkedAccountId: row?.payment_account_id ?? null,
    linkedAccountName: row?.payment_account?.account_name ?? null,
    linkedAccountType: row?.payment_account?.type ?? null,
    isSystem: true,
    branchName,
    mdrEnabled: mdr?.mdrEnabled ?? false,
    mdrRatePercent: mdr?.mdrRatePercent ?? 0,
    mdrFixedFee: mdr?.mdrFixedFee ?? 0,
    mdrMinAmount: mdr?.mdrMinAmount ?? 0,
  };
}

/* ── List branch payment methods ── */

export async function listBranchPaymentMethodsAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<BranchPaymentMethodRow[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_method.view");

    const supabase = await createServerSupabase();

    const { data: branch } = await (supabase as any)
      .from("branches")
      .select("id, name")
      .eq("id", branchId)
      .single();

    if (!branch) return errorResult("Cabang tidak ditemukan.");
    const branchName = branch.name;

    const [mappingsResult, brandMethodsResult] = await Promise.all([
      (supabase as any)
        .from("branch_payment_methods")
        .select("*, payment_account:payment_accounts(id, account_name, type)")
        .eq("brand_id", session.brandId)
        .eq("branch_id", branchId),
      (supabase as any)
        .from("payment_methods")
        .select("type, metadata, mdr_percentage")
        .eq("brand_id", session.brandId),
    ]);

    const mappings = mappingsResult.data ?? [];
    const brandMethods = brandMethodsResult.data ?? [];

    const methodMdrMap = new Map<string, any>();
    for (const pm of brandMethods) {
      methodMdrMap.set(pm.type, pm);
    }

    const mappingMap = new Map<string, any>();
    for (const m of mappings) {
      mappingMap.set(m.method_type, m);
    }

    const results: BranchPaymentMethodRow[] = SYSTEM_METHODS.map((def) => {
      const row = mappingMap.get(def.type);
      const brandMethodRow = methodMdrMap.get(def.type);
      const mdr = parseMdrConfig(brandMethodRow ?? null);
      return mapBranchMethodRow(row ?? null, def, branchName, mdr);
    });

    return successResult(results);
  } catch (err: any) {
    console.error("[PaymentMethods] listBranchPaymentMethodsAction:", err.message);
    return errorResult(err.message || "Gagal memuat metode pembayaran.");
  }
}

/* ── Link payment method to account ── */

export interface LinkMethodAccountInput {
  branchId: string;
  methodCode: string;
  paymentAccountId: string;
  isActive: boolean;
}

export async function linkPaymentMethodAccountAction(
  brandSlug: string,
  input: LinkMethodAccountInput,
): Promise<ActionResult<BranchPaymentMethodRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_method.link_account");

    const supabase = await createServerSupabase();
    const methodType = methodCodeToType(input.methodCode);

    if (!input.paymentAccountId) {
      return errorResult("Akun pembayaran wajib dipilih.");
    }

    if (methodType === "CASH") {
      return errorResult("Akun kas tunai tidak dapat diubah tautannya.");
    }

    const { data: account } = await (supabase as any)
      .from("payment_accounts")
      .select("id")
      .eq("id", input.paymentAccountId)
      .eq("brand_id", session.brandId)
      .single();

    if (!account) return errorResult("Akun pembayaran tidak ditemukan.");

    const { data: existing } = await (supabase as any)
      .from("branch_payment_methods")
      .select("*")
      .eq("brand_id", session.brandId)
      .eq("branch_id", input.branchId)
      .eq("method_type", methodType)
      .maybeSingle();

    let updatedRow: any;

    if (existing) {
      const { data, error: updError } = await (supabase as any)
        .from("branch_payment_methods")
        .update({
          payment_account_id: input.paymentAccountId,
          is_active: input.isActive,
        })
        .eq("id", existing.id)
        .select("*, payment_account:payment_accounts(id, account_name, type)")
        .single();

      if (updError) {
        console.error("[PaymentMethods] link update error:", updError);
        return errorResult("Gagal menautkan akun.");
      }
      updatedRow = data;
    } else {
      const { data, error: insError } = await (supabase as any)
        .from("branch_payment_methods")
        .insert({
          brand_id: session.brandId,
          branch_id: input.branchId,
          method_type: methodType,
          payment_account_id: input.paymentAccountId,
          is_active: input.isActive,
        })
        .select("*, payment_account:payment_accounts(id, account_name, type)")
        .single();

      if (insError) {
        console.error("[PaymentMethods] link insert error:", insError);
        return errorResult("Gagal menautkan akun.");
      }
      updatedRow = data;
    }

    const { data: branch } = await (supabase as any)
      .from("branches")
      .select("name")
      .eq("id", input.branchId)
      .single();

    const def = SYSTEM_METHODS.find((m) => m.type === methodType) || SYSTEM_METHODS[0];
    const result = mapBranchMethodRow(updatedRow, def, branch?.name ?? "");

    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      action: "PAYMENT_METHOD_LINKED",
      target_type: "branch_payment_method",
      target_id: updatedRow.id,
      actor_id: session.profileId,
      details: {
        branch_id: input.branchId,
        method_type: methodType,
        payment_account_id: input.paymentAccountId,
        is_active: input.isActive,
      },
    });

    return successResult(result);
  } catch (err: any) {
    console.error("[PaymentMethods] linkPaymentMethodAccountAction:", err.message);
    return errorResult(err.message || "Gagal menautkan akun.");
  }
}

/* ── Toggle active state ── */

export async function togglePaymentMethodActiveAction(
  brandSlug: string,
  branchId: string,
  methodCode: string,
  isActive: boolean,
): Promise<ActionResult<BranchPaymentMethodRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_method.toggle_active");

    const supabase = await createServerSupabase();
    const methodType = methodCodeToType(methodCode);

    if (methodType === "CASH" && !isActive) {
      return errorResult("Metode Cash tidak dapat dinonaktifkan.");
    }

    const { data: existing } = await (supabase as any)
      .from("branch_payment_methods")
      .select("*")
      .eq("brand_id", session.brandId)
      .eq("branch_id", branchId)
      .eq("method_type", methodType)
      .maybeSingle();

    let updatedRow: any;

    if (existing) {
      const { data, error } = await (supabase as any)
        .from("branch_payment_methods")
        .update({ is_active: isActive })
        .eq("id", existing.id)
        .select("*, payment_account:payment_accounts(id, account_name, type)")
        .single();

      if (error) {
        console.error("[PaymentMethods] toggle error:", error);
        return errorResult("Gagal mengubah status metode.");
      }
      updatedRow = data;
    } else {
      if (!isActive) {
        const def = SYSTEM_METHODS.find((m) => m.type === methodType);
        const result: BranchPaymentMethodRow = {
          id: null, brandId: session.brandId, branchId,
          methodCode: def?.code ?? methodType, methodType,
          label: def?.label ?? methodType, isActive: false,
          linkedAccountId: null, linkedAccountName: null, linkedAccountType: null,
          isSystem: true, mdrEnabled: false, mdrRatePercent: 0, mdrFixedFee: 0, mdrMinAmount: 0,
        };
        return successResult(result);
      }

      return errorResult("Metode belum memiliki tautan akun. Tautkan akun terlebih dahulu.");
    }

    const { data: branch } = await (supabase as any)
      .from("branches")
      .select("name")
      .eq("id", branchId)
      .single();

    const def = SYSTEM_METHODS.find((m) => m.type === methodType) || SYSTEM_METHODS[0];
    return successResult(mapBranchMethodRow(updatedRow, def, branch?.name ?? ""));
  } catch (err: any) {
    console.error("[PaymentMethods] togglePaymentMethodActiveAction:", err.message);
    return errorResult(err.message || "Gagal mengubah status metode.");
  }
}

/* ── Ensure system methods for branch ── */

export async function ensureSystemPaymentMethodsAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<{ created: number; linked: number }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_method.repair");

    const supabase = await createServerSupabase();

    const { data: branch } = await (supabase as any)
      .from("branches")
      .select("id, name")
      .eq("id", branchId)
      .single();

    if (!branch) return errorResult("Cabang tidak ditemukan.");

    const { data: cashAccount } = await (supabase as any)
      .from("payment_accounts")
      .select("id")
      .eq("brand_id", session.brandId)
      .eq("branch_id", branchId)
      .eq("type", "CASH")
      .eq("is_cash_account", true)
      .maybeSingle();

    let cashAccountId: string;

    if (cashAccount) {
      cashAccountId = cashAccount.id;
    } else {
      const accountName = `Kas - ${branch.name}`;
      const { data: created, error: createErr } = await (supabase as any)
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
        .select("id")
        .single();

      if (createErr || !created) {
        console.error("[PaymentMethods] ensure cash account error:", createErr);
        return errorResult("Gagal membuat akun kas cabang.");
      }
      cashAccountId = created.id;
    }

    let created = 0;
    let linked = 0;

    const { data: existingMappings } = await (supabase as any)
      .from("branch_payment_methods")
      .select("method_type, payment_account_id, is_active")
      .eq("brand_id", session.brandId)
      .eq("branch_id", branchId);

    const existingTypes = new Set((existingMappings ?? []).map((m: any) => m.method_type));

    for (const def of SYSTEM_METHODS) {
      if (existingTypes.has(def.type)) continue;

      const accountType = METHOD_TYPE_ACCOUNT_TYPE[def.type];
      let paymentAccountId: string | null = null;

      if (def.type === "CASH") {
        paymentAccountId = cashAccountId;
      } else {
        const { data: compatible } = await (supabase as any)
          .from("payment_accounts")
          .select("id")
          .eq("brand_id", session.brandId)
          .eq("branch_id", branchId)
          .eq("type", accountType)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (compatible) {
          paymentAccountId = compatible.id;
        }
      }

      const { error: insErr } = await (supabase as any)
        .from("branch_payment_methods")
        .insert({
          brand_id: session.brandId,
          branch_id: branchId,
          method_type: def.type,
          payment_account_id: paymentAccountId,
          is_active: def.type === "CASH" || paymentAccountId != null,
        });

      if (!insErr) {
        created++;
        if (paymentAccountId) linked++;
      }
    }

    return successResult({ created, linked });
  } catch (err: any) {
    console.error("[PaymentMethods] ensureSystemPaymentMethodsAction:", err.message);
    return errorResult(err.message || "Gagal menyiapkan metode pembayaran.");
  }
}

/* ── List available compatible accounts for linking ── */

export async function listCompatibleAccountsAction(
  brandSlug: string,
  branchId: string,
  _methodCode: string,
): Promise<ActionResult<{ id: string; accountName: string; type: string; bankName: string | null }[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_method.view");

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any)
      .from("payment_accounts")
      .select("id, account_name, type, bank_name, branch_id")
      .eq("brand_id", session.brandId)
      .eq("is_active", true)
      .neq("is_cash_account", true)
      .order("branch_id", { ascending: false, nullsFirst: true })
      .order("account_name", { ascending: true });

    if (error) {
      console.error("[PaymentMethods] compatible accounts error:", error);
      return errorResult("Gagal memuat akun yang sesuai.");
    }

    const filtered = (data ?? []).filter(
      (a: any) => a.branch_id === branchId || a.branch_id === null
    );

    return successResult(
      filtered.map((a: any) => ({
        id: a.id,
        accountName: a.account_name,
        type: a.type,
        bankName: a.bank_name ?? null,
      }))
    );
  } catch (err: any) {
    console.error("[PaymentMethods] listCompatibleAccountsAction:", err.message);
    return errorResult(err.message || "Gagal memuat akun yang sesuai.");
  }
}

/* ── Repair CASH method link (auto-link to branch cash account) ── */

export async function repairBranchCashMethodAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<BranchPaymentMethodRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_method.link_account");

    const supabase = await createServerSupabase();

    const { data: branch } = await (supabase as any)
      .from("branches")
      .select("id, name")
      .eq("id", branchId)
      .single();

    if (!branch) return errorResult("Cabang tidak ditemukan.");
    const branchName = branch.name;

    let { data: cashAccount } = await (supabase as any)
      .from("payment_accounts")
      .select("id, account_name, type")
      .eq("brand_id", session.brandId)
      .eq("branch_id", branchId)
      .eq("type", "CASH")
      .eq("is_cash_account", true)
      .maybeSingle();

    if (!cashAccount) {
      const accountName = `Kas - ${branchName}`;
      const { data: created, error: createErr } = await (supabase as any)
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
        .select("id, account_name, type")
        .single();

      if (createErr || !created) {
        return errorResult("Gagal membuat akun kas cabang.");
      }
      cashAccount = created;
    }

    const { data: existing } = await (supabase as any)
      .from("branch_payment_methods")
      .select("*")
      .eq("brand_id", session.brandId)
      .eq("branch_id", branchId)
      .eq("method_type", "CASH")
      .maybeSingle();

    let updatedRow: any;

    if (existing) {
      const { data, error: updErr } = await (supabase as any)
        .from("branch_payment_methods")
        .update({
          payment_account_id: cashAccount.id,
          is_active: true,
        })
        .eq("id", existing.id)
        .select("*, payment_account:payment_accounts(id, account_name, type)")
        .single();

      if (updErr) return errorResult("Gagal memperbaiki metode Cash.");
      updatedRow = data;
    } else {
      const { data, error: insErr } = await (supabase as any)
        .from("branch_payment_methods")
        .insert({
          brand_id: session.brandId,
          branch_id: branchId,
          method_type: "CASH",
          payment_account_id: cashAccount.id,
          is_active: true,
        })
        .select("*, payment_account:payment_accounts(id, account_name, type)")
        .single();

      if (insErr) return errorResult("Gagal memperbaiki metode Cash.");
      updatedRow = data;
    }

    const def = SYSTEM_METHODS.find((m) => m.type === "CASH") || SYSTEM_METHODS[0];
    return successResult(mapBranchMethodRow(updatedRow, def, branchName));
  } catch (err: any) {
    console.error("[PaymentMethods] repairBranchCashMethodAction:", err.message);
    return errorResult(err.message || "Gagal memperbaiki metode Cash.");
  }
}

/* ── Update MDR config for a payment method ── */

export interface MdrConfigInput {
  enabled: boolean;
  ratePercent: number;
  fixedFee: number;
  minAmount: number;
}

export async function updateMethodMdrAction(
  brandSlug: string,
  methodType: string,
  config: MdrConfigInput,
): Promise<ActionResult<null>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment_method.manage_mdr");

    const supabase = await createServerSupabase();
    const normalizedType = methodCodeToType(methodType);

    const { data: existing } = await (supabase as any)
      .from("payment_methods")
      .select("id, metadata")
      .eq("brand_id", session.brandId)
      .eq("type", normalizedType)
      .maybeSingle();

    const mdrPayload = {
      mdr: {
        enabled: config.enabled,
        ratePercent: config.ratePercent,
        fixedFee: config.fixedFee,
        minAmount: config.minAmount,
        borneBy: "MERCHANT",
      },
    };

    if (existing) {
      const metadata = { ...(existing.metadata ?? {}), ...mdrPayload };
      const { error: updErr } = await (supabase as any)
        .from("payment_methods")
        .update({ metadata })
        .eq("id", existing.id);

      if (updErr) return errorResult("Gagal menyimpan konfigurasi MDR.");
    } else {
      const { error: insErr } = await (supabase as any)
        .from("payment_methods")
        .insert({
          brand_id: session.brandId,
          type: normalizedType,
          name: normalizedType,
          is_active: true,
          metadata: mdrPayload,
        });

      if (insErr) return errorResult("Gagal menyimpan konfigurasi MDR.");
    }

    return successResult(null);
  } catch (err: any) {
    console.error("[PaymentMethods] updateMethodMdrAction:", err.message);
    return errorResult(err.message || "Gagal menyimpan konfigurasi MDR.");
  }
}
