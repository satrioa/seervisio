/**
 * Customer server actions.
 */
"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, type ActionResult } from "./action-helper";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  totalSpend: number;
  totalServices: number;
  activeServices: number;
  activeWarranties: number;
  lastServiceAt: string | null;
  branchNames: string[];
  createdAt: string;
}

export async function listCustomersAction(
  brandSlug: string,
  branchId?: string | null,
  searchQuery?: string,
): Promise<ActionResult<CustomerListItem[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "customer.view");

    const adminDb = createServiceRoleSupabaseClient();

    let query = (adminDb as any)
      .from("customers")
      .select(`
        id,
        brand_id,
        name,
        phone,
        email,
        address,
        created_at,
        updated_at,
        services!left(
          id,
          final_cost,
          current_status,
          warranty_until,
          branch_id,
          created_at,
          branches!left(name)
        )
      `)
      .eq("brand_id", session.brandId)
      .is("deleted_at", null);

    if (searchQuery?.trim()) {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`name.ilike.${q},phone.ilike.${q},email.ilike.${q}`);
    }

    const { data: customers, error } = await query;
    if (error) throw error;
    if (!customers || customers.length === 0) {
      console.log("[customers/list] no customers found for brand", session.brandId);
      return successResult([]);
    }

    const now = new Date().toISOString();
    const result: CustomerListItem[] = customers.map((c: any) => {
      const svcs: any[] = Array.isArray(c.services) ? c.services : [];

      const branchNamesSet = new Set<string>();
      for (const s of svcs) {
        const branchName = s.branches?.name;
        if (branchName) branchNamesSet.add(branchName);
      }

      return {
        id: c.id,
        name: c.name,
        phone: c.phone ?? null,
        email: c.email ?? null,
        address: c.address ?? null,
        totalSpend: svcs.reduce((sum: number, s: any) => sum + Number(s.final_cost ?? 0), 0),
        totalServices: svcs.length,
        activeServices: svcs.filter((s: any) => !["DONE", "CANCELLED"].includes(s.current_status)).length,
        activeWarranties: svcs.filter((s: any) => s.warranty_until && s.warranty_until > now).length,
        lastServiceAt: svcs.length > 0
          ? svcs.reduce((latest: string | null, s: any) =>
              !latest || s.created_at > latest ? s.created_at : latest, null)
          : null,
        branchNames: Array.from(branchNamesSet).sort(),
        createdAt: c.created_at,
      };
    });

    let filtered = result;
    if (branchId) {
      filtered = filtered.filter((customer) => {
        const svcs: any[] = Array.isArray(
          customers.find((c: any) => c.id === customer.id)?.services
        ) ? customers.find((c: any) => c.id === customer.id)!.services : [];
        return svcs.some((s: any) => s.branch_id === branchId);
      });
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    console.log("[customers/list]", {
      brandId: session.brandId,
      branchFilter: branchId ?? null,
      search: searchQuery ?? null,
      totalRows: filtered.length,
      customerNames: filtered.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        branchNames: c.branchNames,
      })),
    });

    return successResult(filtered);
  } catch (err: any) {
    console.error("[listCustomersAction]", err);
    return errorResult(err.message ?? "Gagal memuat daftar pelanggan.");
  }
}
