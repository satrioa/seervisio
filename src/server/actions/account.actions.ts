// src/server/actions/account.actions.ts

"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, handleActionError, type ActionResult } from "./action-helper";
import {
  getAccounts,
  createAccount,
  updateAccount,
  setAccountActive,
  countActiveMasterAdmins,
  removeAccountFromBrand,
  createAuthUserWithPassword,
  resetAuthUserPassword,
  linkExistingAuthUser,
  type AccountRow,
} from "@/server/repositories/account.repository";
import { addAuditLog } from "@/repositories/service.repository";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getBrandSubscription } from "@/repositories/branch.repository";

export type { AccountRow };

export async function listAccountsAction(
  brandSlug: string,
): Promise<ActionResult<{ accounts: AccountRow[]; currentProfileId: string }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "user.manage");
    const accounts = await getAccounts(session.brandId);
    return successResult({ accounts, currentProfileId: session.profileId });
  } catch (err: any) {
    console.error("[Account] listAccountsAction:", err);
    return errorResult(err.message || "Gagal memuat daftar akun.");
  }
}

export async function createAccountAction(
  brandSlug: string,
  input: {
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    branchIds: string[];
    password?: string;
    shouldChangePassword?: boolean;
  },
): Promise<ActionResult<{ profileId: string; authUserId: string | null; authWarning: string | null }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "user.manage");

    const adminDb = createServiceRoleSupabaseClient();

    /* Check user limit */
    const sub = await getBrandSubscription(adminDb as any, session.brandId);
    const maxUsers = sub?.maxUsers ?? 5;

    const { count: currentUsers } = await (adminDb as any)
      .from("user_brand_memberships")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", session.brandId)
      .eq("is_active", true);

    if ((currentUsers ?? 0) >= maxUsers) {
      return errorResult(
        "Jumlah pengguna telah mencapai batas paket Anda. Upgrade paket untuk menambah pengguna baru."
      );
    }

    const result = await createAccount(
      session.brandId,
      input.name,
      input.email,
      input.phone ?? null,
      input.role,
      input.branchIds,
    );

    let authUserId: string | null = null;
    let authWarning: string | null = null;

    if (input.password) {
      if (input.password.length < 8) {
        return errorResult("Password minimal 8 karakter.");
      }
      const authResult = await createAuthUserWithPassword(
        input.email,
        input.password,
        result.profileId,
        input.name,
        input.shouldChangePassword ?? true,
      );
      authUserId = authResult.authUserId || null;
      authWarning = authResult.warning;

      console.log("[Account] createAccountAction auth", {
        email: input.email,
        createdProfileId: result.profileId,
        linkedAuthUserId: authUserId,
        passwordSet: true,
      });
    }

    await addAuditLog({
      brand_id: session.brandId,
      action: "account.create",
      target_type: "user",
      target_id: result.profileId,
      target_label: input.name,
      actor_id: session.profileId,
      description: `Membuat akun ${input.name} (${input.email}) dengan role ${input.role}${authUserId ? " (auth terhubung)" : ""}`,
    });

    return successResult({ profileId: result.profileId, authUserId, authWarning });
  } catch (err: any) {
    console.error("[Account] createAccountAction:", err);
    return handleActionError(err, "Gagal membuat akun.");
  }
}

export async function resetPasswordAction(
  brandSlug: string,
  profileId: string,
  newPassword: string,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "user.manage");

    if (newPassword.length < 8) {
      return errorResult("Password minimal 8 karakter.");
    }

    const db = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient() as any;
    const { data: profile, error: profErr } = await db
      .from("profiles")
      .select("auth_user_id")
      .eq("id", profileId)
      .maybeSingle();
    if (profErr || !profile?.auth_user_id) {
      return errorResult("Akun login tidak ditemukan untuk pengguna ini.");
    }

    await resetAuthUserPassword(profile.auth_user_id, newPassword);

    await addAuditLog({
      brand_id: session.brandId,
      action: "account.reset_password",
      target_type: "user",
      target_id: profileId,
      actor_id: session.profileId,
      description: `Merest password akun`,
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[Account] resetPasswordAction:", err);
    return handleActionError(err, "Gagal mereset password.");
  }
}

export async function deleteAccountFromBrandAction(
  brandSlug: string,
  profileId: string,
  membershipId: string,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "user.manage");

    const db = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient() as any;

    /* Verify membership belongs to this brand */
    const { data: membership, error: memCheckErr } = await db
      .from("user_brand_memberships")
      .select("id, profile_id, role, is_active")
      .eq("id", membershipId)
      .eq("brand_id", session.brandId)
      .is("deleted_at", null)
      .maybeSingle();
    if (memCheckErr || !membership) {
      return errorResult("Akses tidak ditemukan untuk brand ini.");
    }

    /* Prevent deleting own active access */
    if (membership.profile_id === session.profileId) {
      return errorResult("Tidak dapat menghapus akses Anda sendiri.");
    }

    /* Prevent removing last active MASTER_ADMIN */
    if (membership.role === "MASTER_ADMIN" && membership.is_active) {
      const activeMasterCount = await countActiveMasterAdmins(session.brandId);
      if (activeMasterCount <= 1) {
        return errorResult("Tidak dapat menghapus Master Admin terakhir.");
      }
    }

    await removeAccountFromBrand(membershipId);

    await addAuditLog({
      brand_id: session.brandId,
      action: "account.delete_from_brand",
      target_type: "user",
      target_id: profileId,
      target_label: "",
      actor_id: session.profileId,
      description: "Hapus akses akun dari brand",
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[Account] deleteAccountFromBrandAction:", err);
    return handleActionError(err, "Gagal menghapus akses.");
  }
}

export async function linkAccountAction(
  brandSlug: string,
  profileId: string,
  email: string,
): Promise<ActionResult<{ authUserId: string | null; warning: string | null }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "user.manage");

    const db = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient() as any;

    const result = await linkExistingAuthUser(email, profileId);

    if (result.authUserId) {
      await addAuditLog({
        brand_id: session.brandId,
        action: "account.link_auth",
        target_type: "user",
        target_id: profileId,
        actor_id: session.profileId,
        description: `Menghubungkan akun login untuk ${email}`,
      });
    }

    return successResult(result);
  } catch (err: any) {
    console.error("[Account] linkAccountAction:", err);
    return handleActionError(err, "Gagal menghubungkan akun login.");
  }
}

export async function updateAccountAction(
  brandSlug: string,
  profileId: string,
  updates: {
    name?: string;
    phone?: string | null;
    role?: string;
    branchIds?: string[];
    isActive?: boolean;
  },
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "user.manage");

    const db = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient() as any;

    if (updates.role !== undefined || updates.isActive === false) {
      const activeMasterCount = await countActiveMasterAdmins(session.brandId);
      const accounts = await getAccounts(session.brandId);
      const target = accounts.find((a) => a.profileId === profileId);
      if (target && target.role === "MASTER_ADMIN" && activeMasterCount <= 1) {
        if (updates.role !== undefined && updates.role !== "MASTER_ADMIN") {
          return errorResult("Tidak dapat menurunkan role Master Admin terakhir.");
        }
        if (updates.isActive === false) {
          return errorResult("Tidak dapat menonaktifkan Master Admin terakhir.");
        }
      }
    }

    await updateAccount(profileId, session.brandId, updates);

    await addAuditLog({
      brand_id: session.brandId,
      action: "account.update",
      target_type: "user",
      target_id: profileId,
      actor_id: session.profileId,
      description: `Mengubah akun ${profileId}`,
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[Account] updateAccountAction:", err);
    return handleActionError(err, "Gagal mengubah akun.");
  }
}

export async function toggleAccountActiveAction(
  brandSlug: string,
  profileId: string,
  active: boolean,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "user.manage");

    const db = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient() as any;

    if (!active) {
      const activeMasterCount = await countActiveMasterAdmins(session.brandId);
      const accounts = await getAccounts(session.brandId);
      const target = accounts.find((a) => a.profileId === profileId);
      if (target && target.role === "MASTER_ADMIN" && activeMasterCount <= 1) {
        return errorResult("Tidak dapat menonaktifkan Master Admin terakhir.");
      }
    }

    await setAccountActive(profileId, session.brandId, active);

    await addAuditLog({
      brand_id: session.brandId,
      action: active ? "account.activate" : "account.deactivate",
      target_type: "user",
      target_id: profileId,
      actor_id: session.profileId,
      description: `${active ? "Mengaktifkan" : "Menonaktifkan"} akun ${profileId}`,
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[Account] toggleAccountActiveAction:", err);
    return handleActionError(err, "Gagal mengubah status akun.");
  }
}

export async function updateAccountAvatarAction(
  brandSlug: string,
  profileId: string,
  avatarUrl: string | null,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "user.manage");

    const db = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient() as any;

    const { error } = await db
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", profileId);

    if (error) throw new Error(`Gagal memperbarui avatar: ${error.message}`);

    return successResult(undefined);
  } catch (err: any) {
    console.error("[Account] updateAccountAvatarAction:", err);
    return handleActionError(err, "Gagal memperbarui foto profil.");
  }
}
