/**
 * Branch access helpers.
 * Determines whether a user can access a specific branch or all branches.
 *
 * Rules:
 * - MASTER_ADMIN + PLATFORM_OWNER: can access all branches inside their brand
 * - ADMIN: can access assigned branches (or all if configured)
 * - FRONTLINER: assigned branches only
 * - TECHNICIAN: assigned branches only
 */

import type { Role } from "@/lib/permissions/roles";
import { ROLES } from "@/lib/permissions/roles";

export interface BranchAccessContext {
  role: Role;
  accessibleBranchIds: string[];
}

/**
 * Whether the user's role inherently allows access to all branches.
 * MASTER_ADMIN and PLATFORM_OWNER can see all branches.
 * ADMIN/FRONTLINER/TECHNICIAN are branch-limited by user_branch_access.
 */
export function canUseAllBranchesScope(ctx: BranchAccessContext): boolean {
  return ctx.role === ROLES.MASTER_ADMIN || ctx.role === ROLES.PLATFORM_OWNER;
}

/**
 * Whether the user can access a specific branch.
 * For all-branch roles, any branch is accessible.
 * For limited roles, the branch must be in accessibleBranchIds.
 */
export function canAccessBranch(
  ctx: BranchAccessContext,
  branchId: string | null | undefined,
): boolean {
  if (!branchId) return false;
  if (canUseAllBranchesScope(ctx)) return true;
  return ctx.accessibleBranchIds.includes(branchId);
}

/**
 * Server-side guard — throws if user cannot access the branch.
 */
export function assertCanAccessBranch(
  ctx: BranchAccessContext,
  branchId: string | null | undefined,
  label?: string,
): void {
  if (!branchId) {
    throw new Error(label
      ? `Cabang tidak ditemukan untuk ${label}.`
      : "Cabang tidak ditemukan.");
  }
  if (!canAccessBranch(ctx, branchId)) {
    throw new Error("Anda tidak memiliki akses ke cabang ini.");
  }
}

/**
 * Returns the default branch scope for the user.
 * For all-branch roles, returns { type: "ALL_BRANCHES", branchId: null }.
 * For limited roles, returns { type: "BRANCH", branchId } using the first accessible branch.
 */
export function getDefaultBranchScope(
  ctx: BranchAccessContext,
): { type: "ALL_BRANCHES" | "BRANCH"; branchId: string | null } {
  if (canUseAllBranchesScope(ctx)) {
    return { type: "ALL_BRANCHES", branchId: null };
  }
  return {
    type: "BRANCH",
    branchId: ctx.accessibleBranchIds[0] ?? null,
  };
}
