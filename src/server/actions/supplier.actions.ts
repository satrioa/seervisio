"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  handleActionError,
  type ActionResult,
} from "./action-helper";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export interface SupplierRow {
  id: string;
  name: string;
  whatsapp: string | null;
  storeName: string | null;
  bankAccountInfo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierInput {
  name: string;
  whatsapp?: string | null;
  storeName?: string | null;
  bankAccountInfo?: string | null;
}

function mapSupplier(s: any): SupplierRow {
  return {
    id: s.id,
    name: s.name,
    whatsapp: s.whatsapp ?? null,
    storeName: s.store_name ?? null,
    bankAccountInfo: s.bank_account_info ?? null,
    isActive: s.is_active,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

/* ── List suppliers (for management page) ── */

export async function listSuppliersAction(
  brandSlug: string,
  input?: { search?: string | null; includeInactive?: boolean },
): Promise<ActionResult<SupplierRow[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();

    let query = (supabase as any)
      .from("suppliers")
      .select("id, name, whatsapp, store_name, bank_account_info, is_active, created_at, updated_at")
      .eq("brand_id", session.brandId);

    if (!input?.includeInactive) {
      query = query.eq("is_active", true);
    }

    if (input?.search && input.search.trim()) {
      const term = `%${input.search.trim()}%`;
      query = query.or(`name.ilike.${term},store_name.ilike.${term},whatsapp.ilike.${term}`);
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) return errorResult(error.message);

    return successResult((data ?? []).map(mapSupplier));
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat supplier");
  }
}

/* ── List active suppliers (for purchase form selection) ── */

export async function getSuppliersForPurchaseAction(
  brandSlug: string,
): Promise<ActionResult<SupplierRow[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any)
      .from("suppliers")
      .select("id, name, whatsapp, store_name, bank_account_info, is_active, created_at, updated_at")
      .eq("brand_id", session.brandId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) return errorResult(error.message);

    return successResult((data ?? []).map(mapSupplier));
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat supplier");
  }
}

/* ── Create supplier ── */

export async function createSupplierAction(
  brandSlug: string,
  input: SupplierInput,
): Promise<ActionResult<SupplierRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    if (!input.name || !input.name.trim()) {
      return errorResult("Nama supplier wajib diisi");
    }

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any)
      .from("suppliers")
      .insert({
        brand_id: session.brandId,
        name: input.name.trim(),
        whatsapp: input.whatsapp?.trim() || null,
        store_name: input.storeName?.trim() || null,
        bank_account_info: input.bankAccountInfo?.trim() || null,
      })
      .select("id, name, whatsapp, store_name, bank_account_info, is_active, created_at, updated_at")
      .single();

    if (error) return errorResult(error.message);

    return successResult(mapSupplier(data));
  } catch (e: any) {
    return handleActionError(e, "Gagal membuat supplier");
  }
}

/* ── Update supplier ── */

export async function updateSupplierAction(
  brandSlug: string,
  id: string,
  input: SupplierInput,
): Promise<ActionResult<SupplierRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    if (!input.name || !input.name.trim()) {
      return errorResult("Nama supplier wajib diisi");
    }

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any)
      .from("suppliers")
      .update({
        name: input.name.trim(),
        whatsapp: input.whatsapp?.trim() || null,
        store_name: input.storeName?.trim() || null,
        bank_account_info: input.bankAccountInfo?.trim() || null,
      })
      .eq("id", id)
      .eq("brand_id", session.brandId)
      .select("id, name, whatsapp, store_name, bank_account_info, is_active, created_at, updated_at")
      .single();

    if (error) return errorResult(error.message);

    return successResult(mapSupplier(data));
  } catch (e: any) {
    return handleActionError(e, "Gagal memperbarui supplier");
  }
}

/* ── Soft-delete (deactivate) supplier ── */

export async function deleteSupplierAction(
  brandSlug: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    const supabase = await createServerSupabase();

    const { error } = await (supabase as any)
      .from("suppliers")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("brand_id", session.brandId);

    if (error) return errorResult(error.message);

    return successResult({ id });
  } catch (e: any) {
    return handleActionError(e, "Gagal menghapus supplier");
  }
}
