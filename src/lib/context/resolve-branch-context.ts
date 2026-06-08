/**
 * Resolve branch details within a brand context.
 * Used to:
 * - Fetch branch name for the AppContext
 * - Validate user has access to the branch
 * - Set the active branch for the current session
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppContext } from "./app-context";
import { getBranchById } from "@/repositories/branch.repository";
import { NotFoundError, PermissionError } from "@/lib/utils/errors";

export interface BranchResolution {
  branchId: string;
  branchName: string;
}

/**
 * Resolve a specific branch within a brand context.
 * Validates the user has access to this branch.
 *
 * @param supabase - Supabase client
 * @param context - Resolved AppContext (must have brandId and accessibleBranchIds)
 * @param branchId - Branch ID to resolve
 * @returns Resolved branch info
 * @throws NotFoundError if branch not found
 * @throws PermissionError if user doesn't have access to this branch
 */
export async function resolveBranchContext(
  supabase: SupabaseClient<any, any, any>,
  context: AppContext,
  branchId: string
): Promise<BranchResolution> {
  // Step 1: Check user has access to this branch
  if (!context.accessibleBranchIds.includes(branchId)) {
    throw new PermissionError("Anda tidak memiliki akses ke cabang ini");
  }

  // Step 2: Look up the branch
  const branch = await getBranchById(supabase, branchId);

  if (!branch) {
    throw new NotFoundError(`Cabang dengan ID "${branchId}" tidak ditemukan`);
  }

  // Step 3: Verify branch belongs to the same brand
  if (branch.brand_id !== context.brandId) {
    throw new NotFoundError(`Cabang tidak ditemukan di brand "${context.brandName}"`);
  }

  return {
    branchId: branch.id,
    branchName: branch.name,
  };
}

/**
 * Update the AppContext with a resolved branch.
 * Returns a new AppContext with branch info filled in.
 */
export function applyBranchToContext(
  context: AppContext,
  branchId: string,
  branchName: string
): AppContext {
  return {
    ...context,
    branchId,
    branchName,
  };
}
