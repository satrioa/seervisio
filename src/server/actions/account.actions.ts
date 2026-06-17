// src/server/actions/account.actions.ts

"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, type ActionResult } from "./action-helper";
import { getAccounts, createAccount, updateAccount, setAccountActive, deleteAccount } from "@/server/repositories/account.repository";
import { addAuditLog } from "@/repositories/service.repository";

/**
 * List accounts visible to the current user.
 * Returns the same shape as the client expects.
 */
export async function listAccountsAction(
  brandSlug: string
): Promise<ActionResult<AccountRow[]>> {
  try {
    const session = await getSessionData(brandSlug);
    // Only users with account management permission can view this list.
    requireActionPermission(session.role, "payment.account.manage");
    const accounts = await getAccounts(
      session.brandId,
      session.canAccessAllBranches ? null : session.defaultBranchId
    );
    return successResult(accounts);
  } catch (err: any) {
    console.error("[Account] listAccountsAction:", err);
    return errorResult(err.message || "Gagal memuat akun.");
  }
}

/**
 * Create a new user account.
 */
export async function createAccountAction(
  brandSlug: string,
  input: { name: string; email: string; role: string; branchIds: string[] }
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment.account.manage");

    const newId = await createAccount(
      session.brandId,
      input.name,
      input.email,
      input.role,
      input.branchIds
    );

    await addAuditLog({
      brand_id: session.brandId,
      action: "account.create",
      target_type: "user",
      target_id: newId,
      actor_id: session.profileId,
      description: `Membuat akun ${input.name}`,
    });

    return successResult({ id: newId });
  } catch (err: any) {
    console.error("[Account] createAccountAction:", err);
    return errorResult(err.message || "Gagal membuat akun.");
  }
}

/**
 * Update an existing account.
 */
export async function updateAccountAction(
  brandSlug: string,
  accountId: string,
  updates: { name?: string; email?: string; role?: string; branchIds?: string[] }
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment.account.manage");

    await updateAccount(accountId, updates, session.brandId);

    await addAuditLog({
      brand_id: session.brandId,
      action: "account.update",
      target_type: "user",
      target_id: accountId,
      actor_id: session.profileId,
      description: `Update akun ${accountId}`,
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[Account] updateAccountAction:", err);
    return errorResult(err.message || "Gagal mengubah akun.");
  }
}

/**
 * Activate / deactivate an account.
 */
export async function toggleAccountActiveAction(
  brandSlug: string,
  accountId: string,
  active: boolean
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment.account.manage");

    await setAccountActive(accountId, active);

    await addAuditLog({
      brand_id: session.brandId,
      action: active ? "account.activate" : "account.deactivate",
      target_type: "user",
      target_id: accountId,
      actor_id: session.profileId,
      description: `${active ? "Aktifkan" : "Nonaktifkan"} akun ${accountId}`,
    });
    return successResult(undefined);
  } catch (err: any) {
    console.error("[Account] toggleAccountActiveAction:", err);
    return errorResult(err.message || "Gagal mengubah status akun.");
  }
}

/**
 * Soft‑delete an account (just deactivate).
 */
export async function deleteAccountAction(
  brandSlug: string,
  accountId: string
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "payment.account.manage");

    await deleteAccount(accountId);

    await addAuditLog({
      brand_id: session.brandId,
      action: "account.delete",
      target_type: "user",
      target_id: accountId,
      actor_id: session.profileId,
      description: `Hapus akun ${accountId}`,
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[Account] deleteAccountAction:", err);
    return errorResult(err.message || "Gagal menghapus akun.");
  }
}

/**
 * Shape of account row returned to the client.
 */
export interface AccountRow {
  id: string;
  name: string;
  email: string;
  role: string;
  branchIds: string[];
  isActive: boolean;
  authUserId?: string | null;
}
