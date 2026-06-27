/**
 * Branch repository.
 * Handles access to public.branches, public.brand_subscriptions tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type DbBranch = Database["public"]["Tables"]["branches"]["Row"];
type DbBranchInsert = Database["public"]["Tables"]["branches"]["Insert"];
type DbBranchUpdate = Database["public"]["Tables"]["branches"]["Update"];

export interface BranchDetail extends DbBranch {
  userCount: number;
  adminName: string | null;
}

export interface BranchStats {
  total: number;
  active: number;
  totalUsers: number;
  openStores: number;
}

export interface BranchSubscription {
  id: string;
  brandId: number;
  plan: string;
  maxBranches: number;
  maxUsers: number;
  status: string;
}

export interface BranchCreateInput {
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}

export interface BranchUpdateInput {
  name?: string;
  code?: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}

/**
 * Get all active branches for a brand.
 */
export async function getBranchesByBrandId(
  supabase: SupabaseClient<any, any, any>,
  brandId: number
): Promise<DbBranch[]> {
  const { data } = await supabase
    .from("branches")
    .select("*")
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .order("name");

  return data ?? [];
}

/**
 * Find a branch by its ID.
 */
export async function getBranchById(
  supabase: SupabaseClient<any, any, any>,
  id: string
): Promise<DbBranch | null> {
  const { data } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .single();

  return data ?? null;
}

/**
 * Get branch list with admin names and user counts.
 */
export async function getBranchDetailList(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
): Promise<BranchDetail[]> {
  const branches = await getBranchesByBrandId(supabase, brandId);

  const results: BranchDetail[] = [];

  for (const branch of branches) {
    const { count: userCount } = await supabase
      .from("user_branch_access")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branch.id)
      .eq("is_active", true);

    const { data: adminRows } = await supabase
      .from("user_branch_access")
      .select("membership_id")
      .eq("branch_id", branch.id)
      .eq("is_active", true);

    let adminName: string | null = null;
    if (adminRows && adminRows.length > 0) {
      const { data: members } = await supabase
        .from("user_brand_memberships")
        .select("profile_id, role")
        .in("id", adminRows.map(r => r.membership_id))
        .in("role", ["ADMIN"])
        .limit(1);

      if (members && members.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", members[0].profile_id)
          .maybeSingle();
        adminName = profiles?.name ?? null;
      }
    }

    results.push({
      ...branch,
      userCount: userCount ?? 0,
      adminName,
    });
  }

  return results;
}

/**
 * Get single branch detail with stats.
 */
export async function getBranchDetail(
  supabase: SupabaseClient<any, any, any>,
  branchId: string,
): Promise<BranchDetail | null> {
  const branch = await getBranchById(supabase, branchId);
  if (!branch) return null;

  const { count: userCount } = await supabase
    .from("user_branch_access")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", branchId)
    .eq("is_active", true);

  const { data: adminRows } = await supabase
    .from("user_branch_access")
    .select("membership_id")
    .eq("branch_id", branchId)
    .eq("is_active", true);

  let adminName: string | null = null;
  if (adminRows && adminRows.length > 0) {
    const { data: members } = await supabase
      .from("user_brand_memberships")
      .select("profile_id, role")
      .in("id", adminRows.map(r => r.membership_id))
      .in("role", ["ADMIN"])
      .limit(1);

    if (members && members.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", members[0].profile_id)
        .maybeSingle();
      adminName = profiles?.name ?? null;
    }
  }

  return {
    ...branch,
    userCount: userCount ?? 0,
    adminName,
  };
}

/**
 * Get branch stats for a brand.
 */
export async function getBranchStats(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
): Promise<BranchStats> {
  const branches = await getBranchesByBrandId(supabase, brandId);

  const active = branches.filter(b => b.is_active).length;

  const { count: totalUsers } = await supabase
    .from("user_brand_memberships")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("is_active", true);

  const { count: openStores } = await supabase
    .from("store_shifts")
    .select("id", { count: "exact", head: true })
    .in("branch_id", branches.map(b => b.id))
    .is("closed_at", null);

  return {
    total: branches.length,
    active,
    totalUsers: totalUsers ?? 0,
    openStores: openStores ?? 0,
  };
}

/**
 * Create a new branch.
 */
export async function createBranch(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
  input: BranchCreateInput,
): Promise<DbBranch> {
  const payload: any = {
    brand_id: brandId,
    name: input.name,
    code: input.code,
    address: input.address ?? null,
    city: input.city ?? null,
    province: input.province ?? null,
    phone: input.phone ?? null,
    whatsapp: input.whatsapp ?? null,
    email: input.email ?? null,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("branches")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`Gagal membuat cabang: ${error.message}`);
  return data;
}

/**
 * Update an existing branch.
 */
export async function updateBranch(
  supabase: SupabaseClient<any, any, any>,
  id: string,
  input: BranchUpdateInput,
): Promise<void> {
  const payload: any = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.code !== undefined) payload.code = input.code;
  if (input.address !== undefined) payload.address = input.address;
  if (input.city !== undefined) payload.city = input.city;
  if (input.province !== undefined) payload.province = input.province;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.whatsapp !== undefined) payload.whatsapp = input.whatsapp;
  if (input.email !== undefined) payload.email = input.email;

  const { error } = await supabase
    .from("branches")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(`Gagal mengupdate cabang: ${error.message}`);
}

/**
 * Toggle branch active status.
 */
export async function toggleBranchActive(
  supabase: SupabaseClient<any, any, any>,
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("branches")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(`Gagal mengubah status cabang: ${error.message}`);
}

/**
 * Soft-delete a branch.
 */
export async function softDeleteBranch(
  supabase: SupabaseClient<any, any, any>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("branches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Gagal menghapus cabang: ${error.message}`);
}

/**
 * Get current branch count for a brand.
 */
export async function getBranchCount(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
): Promise<number> {
  const { count, error } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .is("deleted_at", null);

  if (error) throw new Error(`Gagal menghitung cabang: ${error.message}`);
  return count ?? 0;
}

/**
 * Get brand subscription.
 */
export async function getBrandSubscription(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
): Promise<BranchSubscription | null> {
  const { data } = await supabase
    .from("brand_subscriptions")
    .select("*")
    .eq("brand_id", brandId)
    .maybeSingle();

  if (!data) return null;

  const r = data as any;
  return {
    id: r.id,
    brandId: r.brand_id,
    plan: r.plan,
    maxBranches: r.max_branches,
    maxUsers: r.max_users ?? 5,
    status: r.status,
  };
}

/**
 * Get users for a specific branch with their roles.
 */
export async function getBranchUsers(
  supabase: SupabaseClient<any, any, any>,
  branchId: string,
): Promise<Array<{ name: string; role: string; isActive: boolean }>> {
  const { data: accessRows } = await supabase
    .from("user_branch_access")
    .select("membership_id, is_active")
    .eq("branch_id", branchId)
    .eq("is_active", true);

  if (!accessRows || accessRows.length === 0) return [];

  const { data: members } = await supabase
    .from("user_brand_memberships")
    .select("profile_id, role")
    .in("id", accessRows.map(r => r.membership_id))
    .eq("is_active", true);

  if (!members || members.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", members.map(m => m.profile_id));

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.name]));

  return members.map(m => ({
    name: profileMap.get(m.profile_id) ?? "Unknown",
    role: m.role,
    isActive: true,
  }));
}
