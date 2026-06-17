// src/server/repositories/account.repository.ts

import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * Fetch accounts for a brand and optionally a branch.
 * Returns profile info joined with membership and branch access.
 */
export async function getAccounts(brandId: number, branchId: string | null) {
  const supabase = await createServerSupabase();
  const { data: memberships, error: memErr } = await (supabase as any)
    .from("user_brand_memberships")
    .select("profile_id, role, is_active")
    .eq("brand_id", brandId)
    .eq("is_active", true);
  if (memErr) throw memErr;
  const profileIds = memberships.map((m: any) => m.profile_id);
  const { data: profiles, error: profErr } = await (supabase as any)
    .from("profiles")
    .select("id, name, email, auth_user_id, is_active")
    .in("id", profileIds);
  if (profErr) throw profErr;

  let branchAccess: Record<string, string[]> = {};
  if (branchId) {
    const { data: access, error: accErr } = await (supabase as any)
      .from("user_branch_access")
      .select("profile_id, branch_id")
      .eq("branch_id", branchId);
    if (!accErr && access) {
      for (const a of access) {
        if (!branchAccess[a.profile_id]) branchAccess[a.profile_id] = [];
        branchAccess[a.profile_id].push(a.branch_id);
      }
    }
  }

  const rows = profiles.map((p: any) => {
    const mem = memberships.find((m: any) => m.profile_id === p.id) || {};
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      role: mem.role ?? "",
      isActive: mem.is_active ?? false,
      authUserId: p.auth_user_id ?? null,
      branchIds: branchAccess[p.id] ?? [],
    };
  });
  return rows;
}

export async function createAccount(
  brandId: number,
  name: string,
  email: string,
  role: string,
  branchIds: string[]
) {
  const supabase = await createServerSupabase();
  const { data: profile, error: profErr } = await (supabase as any)
    .from("profiles")
    .insert({ name, email, is_active: true })
    .select("id")
    .single();
  if (profErr) throw profErr;
  const { error: memErr } = await (supabase as any)
    .from("user_brand_memberships")
    .insert({ brand_id: brandId, profile_id: profile.id, role, is_active: true });
  if (memErr) throw memErr;
  if (branchIds.length > 0) {
    const rows = branchIds.map((bid) => ({ profile_id: profile.id, branch_id: bid }));
    const { error: baErr } = await (supabase as any).from("user_branch_access").insert(rows);
    if (baErr) throw baErr;
  }
  return profile.id;
}

export async function updateAccount(
  accountId: string,
  updates: { name?: string; email?: string; role?: string; branchIds?: string[] },
  brandId: number
) {
  const supabase = await createServerSupabase();
  if (updates.name !== undefined || updates.email !== undefined) {
    const { error: updErr } = await (supabase as any)
      .from("profiles")
      .update({ name: updates.name, email: updates.email })
      .eq("id", accountId);
    if (updErr) throw updErr;
  }
  if (updates.role !== undefined) {
    const { error: memErr } = await (supabase as any)
      .from("user_brand_memberships")
      .update({ role: updates.role })
      .eq("profile_id", accountId)
      .eq("brand_id", brandId);
    if (memErr) throw memErr;
  }
  if (updates.branchIds !== undefined) {
    await (supabase as any).from("user_branch_access").delete().eq("profile_id", accountId);
    if (updates.branchIds.length > 0) {
      const rows = updates.branchIds.map((bid) => ({ profile_id: accountId, branch_id: bid }));
      const { error: baErr } = await (supabase as any).from("user_branch_access").insert(rows);
      if (baErr) throw baErr;
    }
  }
}

export async function setAccountActive(accountId: string, active: boolean) {
  const supabase = await createServerSupabase();
  const { error } = await (supabase as any)
    .from("user_brand_memberships")
    .update({ is_active: active })
    .eq("profile_id", accountId);
  if (error) throw error;
}

export async function deleteAccount(accountId: string) {
  await setAccountActive(accountId, false);
}
