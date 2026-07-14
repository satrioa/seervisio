"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, handleActionError, type ActionResult } from "./action-helper";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import * as repo from "@/repositories/branch.repository";
import type { BranchDetail, BranchStats, BranchSubscription, BranchCreateInput, BranchUpdateInput } from "@/repositories/branch.repository";

export type { BranchDetail, BranchStats, BranchSubscription };

export async function getBranchesListAction(
  brandSlug: string,
): Promise<ActionResult<BranchDetail[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "branch.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const branches = await repo.getBranchDetailList(adminDb as any, session.brandId);

    return successResult(branches);
  } catch (err: any) {
    console.error("[getBranchesListAction]", err);
    return errorResult(err.message ?? "Gagal memuat daftar cabang.");
  }
}

export async function getBranchDetailAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<BranchDetail | null>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "branch.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const detail = await repo.getBranchDetail(adminDb as any, branchId);

    return successResult(detail);
  } catch (err: any) {
    console.error("[getBranchDetailAction]", err);
    return errorResult(err.message ?? "Gagal memuat detail cabang.");
  }
}

export async function getBranchStatsAction(
  brandSlug: string,
): Promise<ActionResult<BranchStats>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "branch.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const stats = await repo.getBranchStats(adminDb as any, session.brandId);

    return successResult(stats);
  } catch (err: any) {
    console.error("[getBranchStatsAction]", err);
    return errorResult(err.message ?? "Gagal memuat statistik cabang.");
  }
}

export async function getBranchSubscriptionAction(
  brandSlug: string,
): Promise<ActionResult<BranchSubscription | null>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "branch.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const sub = await repo.getBrandSubscription(adminDb as any, session.brandId);

    return successResult(sub);
  } catch (err: any) {
    console.error("[getBranchSubscriptionAction]", err);
    return errorResult(err.message ?? "Gagal memuat info paket.");
  }
}

export async function createBranchAction(
  brandSlug: string,
  input: BranchCreateInput,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "branch.manage");

    if (!input.name || input.name.trim().length === 0) {
      return errorResult("Nama cabang tidak boleh kosong.");
    }
    if (!input.code || input.code.trim().length === 0) {
      return errorResult("Kode cabang tidak boleh kosong.");
    }

    const adminDb = createServiceRoleSupabaseClient();

    /* Check subscription limit */
    const [count, sub] = await Promise.all([
      repo.getBranchCount(adminDb as any, session.brandId),
      repo.getBrandSubscription(adminDb as any, session.brandId),
    ]);

    const maxBranches = sub?.maxBranches ?? 1;
    if (count >= maxBranches) {
      return errorResult(
        "Jumlah cabang telah mencapai batas paket Anda. Upgrade paket untuk menambah cabang baru.",
      );
    }

    const branch = await repo.createBranch(adminDb as any, session.brandId, {
      ...input,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
    });

    /* Auto-create default cash account for this branch */
    try {
      await (adminDb as any).rpc("create_default_cash_account_for_branch", {
        p_brand_id: session.brandId,
        p_branch_id: branch.id,
        p_branch_name: branch.name,
      });
    } catch (rpcErr: any) {
      console.warn("[createBranchAction] create_default_cash_account_for_branch failed:", rpcErr.message);
    }

    await (adminDb as any).from("audit_logs").insert({
      brand_id: session.brandId,
      branch_id: branch.id,
      actor_id: session.profileId,
      action: "BRANCH_CREATED",
      target_type: "BRANCH",
      target_id: branch.id,
      target_label: branch.name,
      description: `Cabang "${branch.name}" dibuat.`,
      details: { code: branch.code },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[createBranchAction]", err);
    return handleActionError(err, "Gagal membuat cabang.");
  }
}

export async function updateBranchAction(
  brandSlug: string,
  branchId: string,
  input: BranchUpdateInput,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "branch.manage");

    if (input.name !== undefined && input.name.trim().length === 0) {
      return errorResult("Nama cabang tidak boleh kosong.");
    }

    const adminDb = createServiceRoleSupabaseClient();

    const existing = await repo.getBranchById(adminDb as any, branchId);
    if (!existing) {
      return errorResult("Cabang tidak ditemukan.");
    }

    await repo.updateBranch(adminDb as any, branchId, {
      ...input,
      name: input.name?.trim(),
      code: input.code?.trim()?.toUpperCase(),
    });

    await (adminDb as any).from("audit_logs").insert({
      brand_id: session.brandId,
      branch_id: branchId,
      actor_id: session.profileId,
      action: "BRANCH_UPDATED",
      target_type: "BRANCH",
      target_id: branchId,
      target_label: existing.name,
      description: `Cabang "${existing.name}" diperbarui.`,
      details: { changes: input },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[updateBranchAction]", err);
    return handleActionError(err, "Gagal mengupdate cabang.");
  }
}

export async function toggleBranchActiveAction(
  brandSlug: string,
  branchId: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "branch.manage");

    const adminDb = createServiceRoleSupabaseClient();

    const existing = await repo.getBranchById(adminDb as any, branchId);
    if (!existing) {
      return errorResult("Cabang tidak ditemukan.");
    }

    await repo.toggleBranchActive(adminDb as any, branchId, isActive);

    await (adminDb as any).from("audit_logs").insert({
      brand_id: session.brandId,
      branch_id: branchId,
      actor_id: session.profileId,
      action: isActive ? "BRANCH_ACTIVATED" : "BRANCH_DEACTIVATED",
      target_type: "BRANCH",
      target_id: branchId,
      target_label: existing.name,
      description: `Cabang "${existing.name}" ${isActive ? "diaktifkan" : "dinonaktifkan"}.`,
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[toggleBranchActiveAction]", err);
    return handleActionError(err, "Gagal mengubah status cabang.");
  }
}

export async function getBranchUsersAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<Array<{ name: string; role: string; isActive: boolean }>>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "branch.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const users = await repo.getBranchUsers(adminDb as any, branchId);

    return successResult(users);
  } catch (err: any) {
    console.error("[getBranchUsersAction]", err);
    return errorResult(err.message ?? "Gagal memuat user cabang.");
  }
}
