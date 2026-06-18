// src/server/repositories/account.repository.ts

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface AccountRow {
  id: string;
  profileId: string;
  membershipId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  branchIds: string[];
  isActive: boolean;
  authUserId: string | null;
  avatarUrl: string | null;
}
function adminDb() {
  return createServiceRoleSupabaseClient() as any;
}

export async function getAccounts(brandId: number) {
  const db = adminDb();

  const { data: memberships, error: memErr } = await db
    .from("user_brand_memberships")
    .select("id, profile_id, role, is_active, created_at, updated_at")
    .eq("brand_id", brandId)
    .is("deleted_at", null);
  if (memErr) throw memErr;
  if (!memberships || memberships.length === 0) return [];

  const profileIds = memberships.map((m: any) => m.profile_id);

  const { data: profiles, error: profErr } = await db
    .from("profiles")
    .select("id, name, email, phone, auth_user_id, avatar_url")
    .in("id", profileIds);
  if (profErr) throw profErr;

  const membershipIds = memberships.map((m: any) => m.id);

  const { data: branchAccess, error: baErr } = await db
    .from("user_branch_access")
    .select("membership_id, branch_id")
    .in("membership_id", membershipIds)
    .eq("is_active", true);
  if (baErr) throw baErr;

  const accessByMembership: Record<string, string[]> = {};
  if (branchAccess) {
    for (const row of branchAccess) {
      if (!accessByMembership[row.membership_id]) {
        accessByMembership[row.membership_id] = [];
      }
      accessByMembership[row.membership_id].push(row.branch_id);
    }
  }

  const profileMap = new Map<string, any>();
  if (profiles) {
    for (const p of profiles) profileMap.set(p.id, p);
  }

  const rows: AccountRow[] = memberships.map((m: any) => {
    const profile = profileMap.get(m.profile_id) || {};
    return {
      id: m.profile_id,
      profileId: m.profile_id,
      membershipId: m.id,
      name: profile.name ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? null,
      role: m.role,
      branchIds: accessByMembership[m.id] ?? [],
      isActive: m.is_active ?? false,
      authUserId: profile.auth_user_id ?? null,
      avatarUrl: profile.avatar_url ?? null,
    };
  });

  return rows;
}

export async function validateBranchIdsForBrand(
  branchIds: string[],
  brandId: number,
): Promise<string[]> {
  if (branchIds.length === 0) return [];
  const db = adminDb();
  const { data: validBranches } = await db
    .from("branches")
    .select("id")
    .in("id", branchIds)
    .eq("brand_id", brandId)
    .is("deleted_at", null);
  return (validBranches ?? []).map((b: any) => b.id);
}

export async function createAccount(
  brandId: number,
  name: string,
  email: string,
  phone: string | null,
  role: string,
  branchIds: string[],
) {
  const db = adminDb();

  /* Reuse existing profile if same email exists */
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let profileId = "";
  if (existing) {
    profileId = existing.id;
  } else {
    const { data: newProfile, error: profErr } = await db
      .from("profiles")
      .insert({ name, email, phone, is_active: true })
      .select("id")
      .single();
    if (profErr) throw new Error(`Gagal membuat profil: ${profErr.message}`);
    profileId = newProfile.id;
  }

  /* Validate branch IDs belong to this brand */
  const validBranchIds = branchIds.length > 0
    ? await validateBranchIdsForBrand(branchIds, brandId)
    : [];

  /* Create membership */
  const { data: membership, error: memErr } = await db
    .from("user_brand_memberships")
    .insert({ brand_id: brandId, profile_id: profileId, role, is_active: true })
    .select("id")
    .single();
  if (memErr) throw new Error(`Gagal membuat membership: ${memErr.message}`);

  /* Insert branch access */
  if (validBranchIds.length > 0) {
    const rows = validBranchIds.map((bid: string) => ({
      membership_id: membership.id,
      branch_id: bid,
      is_active: true,
      is_default: false,
    }));
    const { error: baErr } = await db.from("user_branch_access").insert(rows);
    if (baErr) throw new Error(`Gagal menyimpan akses cabang: ${baErr.message}`);
  }

  return { profileId };
}

export async function updateAccount(
  accountId: string,
  brandId: number,
  updates: {
    name?: string;
    phone?: string | null;
    role?: string;
    branchIds?: string[];
    isActive?: boolean;
  },
) {
  const db = adminDb();

  const { data: membership, error: memErr } = await db
    .from("user_brand_memberships")
    .select("id, profile_id, role")
    .eq("profile_id", accountId)
    .eq("brand_id", brandId)
    .maybeSingle();
  if (memErr || !membership) {
    throw new Error("Membership tidak ditemukan untuk akun ini di brand.");
  }

  if (updates.name !== undefined || updates.phone !== undefined) {
    const profileUpdate: Record<string, any> = {};
    if (updates.name !== undefined) profileUpdate.name = updates.name;
    if (updates.phone !== undefined) profileUpdate.phone = updates.phone;
    const { error: updErr } = await db
      .from("profiles")
      .update(profileUpdate)
      .eq("id", membership.profile_id);
    if (updErr) throw new Error(`Gagal mengupdate profil: ${updErr.message}`);
  }

  const membershipUpdate: Record<string, any> = {};
  if (updates.role !== undefined) membershipUpdate.role = updates.role;
  if (updates.isActive !== undefined) membershipUpdate.is_active = updates.isActive;
  if (Object.keys(membershipUpdate).length > 0) {
    const { error: mUpdErr } = await db
      .from("user_brand_memberships")
      .update(membershipUpdate)
      .eq("id", membership.id);
    if (mUpdErr) throw new Error(`Gagal mengupdate membership: ${mUpdErr.message}`);
  }

  if (updates.branchIds !== undefined) {
    await db
      .from("user_branch_access")
      .delete()
      .eq("membership_id", membership.id);

    const validBranchIds =
      updates.branchIds.length > 0
        ? await validateBranchIdsForBrand(updates.branchIds, brandId)
        : [];

    if (validBranchIds.length > 0) {
      const rows = validBranchIds.map((bid: string) => ({
        membership_id: membership.id,
        branch_id: bid,
        is_active: true,
        is_default: false,
      }));
      const { error: baErr } = await db.from("user_branch_access").insert(rows);
      if (baErr) throw new Error(`Gagal menyimpan akses cabang: ${baErr.message}`);
    }
  }
}

export async function setAccountActive(accountId: string, brandId: number, active: boolean) {
  const db = adminDb();
  const { error } = await db
    .from("user_brand_memberships")
    .update({ is_active: active })
    .eq("profile_id", accountId)
    .eq("brand_id", brandId);
  if (error) throw new Error(`Gagal mengubah status: ${error.message}`);
}

export async function countActiveMasterAdmins(brandId: number): Promise<number> {
  const db = adminDb();
  const { count, error } = await db
    .from("user_brand_memberships")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("role", "MASTER_ADMIN")
    .eq("is_active", true)
    .is("deleted_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function removeAccountFromBrand(
  membershipId: string,
): Promise<void> {
  const db = adminDb();

  /* Soft-delete the membership */
  const { error: memErr } = await db
    .from("user_brand_memberships")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", membershipId);
  if (memErr) throw new Error(`Gagal menghapus akses: ${memErr.message}`);

  /* Deactivate all branch access rows for this membership */
  const { error: baErr } = await db
    .from("user_branch_access")
    .update({ is_active: false })
    .eq("membership_id", membershipId);
  if (baErr) throw new Error(`Gagal menonaktifkan akses cabang: ${baErr.message}`);
}

/* ── Auth ── */

export async function linkAuthUserToProfile(
  profileId: string,
  authUserId: string,
): Promise<void> {
  const db = adminDb();
  const { error } = await db
    .from("profiles")
    .update({ auth_user_id: authUserId })
    .eq("id", profileId);
  if (error) throw new Error(`Gagal menghubungkan akun login: ${error.message}`);
}

export async function createAuthUserWithPassword(
  email: string,
  password: string,
  profileId: string,
  name: string,
  shouldChangePassword: boolean,
): Promise<{ authUserId: string; warning: string | null }> {
  const db = adminDb();
  const auth = (db as any).auth;

  const { data, error } = await auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, force_password_change: shouldChangePassword, auth_created_by_admin: true },
  });

  if (error) {
    if (error.message?.toLowerCase().includes("already")) {
      return {
        authUserId: "",
        warning:
          "Email sudah terdaftar di sistem auth. Gunakan 'Hubungkan Auth' atau reset password.",
      };
    }
    throw new Error(`Gagal membuat akun login: ${error.message}`);
  }

  const authUserId = data?.user?.id;
  if (!authUserId) throw new Error("Gagal membuat akun login: tidak ada ID pengguna.");

  await linkAuthUserToProfile(profileId, authUserId);
  return { authUserId, warning: null };
}

export async function resetAuthUserPassword(
  authUserId: string,
  newPassword: string,
): Promise<void> {
  const db = adminDb();
  const auth = (db as any).auth;

  const { error } = await auth.admin.updateUserById(authUserId, {
    password: newPassword,
  });

  if (error) throw new Error(`Gagal mereset password: ${error.message}`);
}

export async function linkExistingAuthUser(
  email: string,
  profileId: string,
): Promise<{ authUserId: string | null; warning: string | null }> {
  const db = adminDb();
  const auth = (db as any).auth;

  /* Try inviteUserByEmail — returns the user id for both new and existing */
  try {
    const { data, error } = await auth.admin.inviteUserByEmail(email);
    if (!error && data?.user?.id) {
      await linkAuthUserToProfile(profileId, data.user.id);
      console.log("[Account] linkExistingAuthUser success", { email, authUserId: data.user.id });
      return { authUserId: data.user.id, warning: null };
    }
    console.warn("[Account] linkExistingAuthUser invite failed", { email, error });
  } catch (err) {
    console.warn("[Account] linkExistingAuthUser invite threw", { email, err });
  }

  return {
    authUserId: null,
    warning:
      "Tidak dapat menghubungkan akun login. Pastikan SMTP telah dikonfigurasi " +
      "pada pengaturan Supabase, atau coba lagi nanti.",
  };
}
