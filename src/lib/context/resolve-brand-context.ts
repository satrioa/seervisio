/**
 * Resolve brand context from a brand slug and a user session.
 * Called in the panel layout to determine:
 * - Which brand is being accessed
 * - User's role in that brand
 * - Which branches the user has access to
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserSession } from "@/lib/auth/get-current-user";
import type { AppContext } from "./app-context";
import type { Role } from "@/lib/permissions/roles";
import { ROLES } from "@/lib/permissions/roles";
import { getBrandBySlug } from "@/repositories/brand.repository";
import {
  getMembershipForBrand,
  getBranchAccessForMembership,
  getDefaultBranchId,
} from "@/repositories/profile.repository";
import { NotFoundError, AuthError } from "@/lib/utils/errors";

/**
 * Resolve the full AppContext for a user accessing a specific brand.
 *
 * @param supabase - Supabase client (server or middleware)
 * @param session - Authenticated user session from getCurrentUser()
 * @param brandSlug - Brand slug from the URL
 * @param activeOperator - Optional active operator override (for staff quick-switch)
 * @returns Resolved AppContext
 * @throws NotFoundError if brand not found
 * @throws AuthError if user doesn't have access to this brand
 */
export async function resolveBrandContext(
  supabase: SupabaseClient<any, any, any>,
  session: UserSession,
  brandSlug: string,
  activeOperator?: import("@/lib/auth/active-operator").ActiveOperatorInfo | null,
): Promise<AppContext> {
  // Step 1: Look up the brand
  const brand = await getBrandBySlug(supabase, brandSlug);

  if (!brand) {
    throw new NotFoundError(`Brand "${brandSlug}" tidak ditemukan`);
  }

  // Step 2: Find user's membership for this brand
  const membership = await getMembershipForBrand(supabase, session.profileId, brand.id);

  if (!membership) {
    throw new AuthError(`Anda tidak memiliki akses ke brand "${brand.name}"`);
  }

  if (!membership.is_active) {
    throw new AuthError(`Akses Anda ke brand "${brand.name}" telah dinonaktifkan`);
  }

  // Step 3: Determine if user has all-branches scope
  const role = membership.role as Role;
  const canAccessAllBranches = role === ROLES.MASTER_ADMIN || role === ROLES.PLATFORM_OWNER;

  // Step 4: Get accessible branch IDs
  // MASTER_ADMIN and PLATFORM_OWNER don't need explicit branch_access rows
  const accessibleBranchIds = canAccessAllBranches
    ? [] // Empty array means "all branches" for all-branch roles
    : await getBranchAccessForMembership(supabase, membership.id);

  // Step 5: Resolve default branch
  const defaultBranchId = canAccessAllBranches
    ? null // All-branch scope
    : await getDefaultBranchId(supabase, membership.id);

  // Step 6: Apply active operator override if present
  const effectiveRole = activeOperator ? activeOperator.role : role;
  const effectiveCanAccessAllBranches = activeOperator
    ? activeOperator.canAccessAllBranches
    : canAccessAllBranches;
  const effectiveAccessibleBranchIds = activeOperator
    ? activeOperator.accessibleBranchIds
    : accessibleBranchIds;
  const effectiveDefaultBranchId = activeOperator
    ? activeOperator.defaultBranchId
    : defaultBranchId;
  const activeOperatorId = activeOperator ? activeOperator.profileId : null;
  const activeOperatorName = activeOperator ? activeOperator.name : null;

  // Step 7: Get avatar URL
  const { data: profileRow } = await (supabase as any)
    .from("profiles")
    .select("avatar_url")
    .eq("id", session.profileId)
    .maybeSingle();
  const avatarUrl = profileRow?.avatar_url ?? null;

  // Step 8: Build and return the AppContext
  return {
    profileId: session.profileId,
    authUserId: session.authUserId,
    name: session.name,
    email: session.email,
    avatarUrl,
    role: effectiveRole,
    brandId: brand.id,
    brandSlug: brand.slug,
    brandName: brand.name,
    branchId: effectiveDefaultBranchId,
    branchName: null,
    accessibleBranchIds: effectiveAccessibleBranchIds,
    canAccessAllBranches: effectiveCanAccessAllBranches,
    membershipId: membership.id,
    activeOperatorId,
    activeOperatorName,
  };
}
