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
import { getBrandBySlug } from "@/repositories/brand.repository";
import { getMembershipForBrand, getBranchAccessForMembership } from "@/repositories/profile.repository";
import { NotFoundError, AuthError } from "@/lib/utils/errors";

export interface BrandResolution {
  context: AppContext;
  /** All accessible branches (full records) */
}

/**
 * Resolve the full AppContext for a user accessing a specific brand.
 *
 * @param supabase - Supabase client (server or middleware)
 * @param session - Authenticated user session from getCurrentUser()
 * @param brandSlug - Brand slug from the URL
 * @returns Resolved AppContext
 * @throws NotFoundError if brand not found
 * @throws AuthError if user doesn't have access to this brand
 */
export async function resolveBrandContext(
  supabase: SupabaseClient<any, any, any>,
  session: UserSession,
  brandSlug: string
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

  // Step 3: Get accessible branch IDs
  const accessibleBranchIds = await getBranchAccessForMembership(supabase, membership.id);

  // Step 4: If user has a preferred branch, use it; otherwise null
  const preferredBranchId = (membership as any).preferred_branch_id ?? null;

  // Step 5: Build and return the AppContext
  return {
    profileId: session.profileId,
    authUserId: session.authUserId,
    name: session.name,
    email: session.email,
    role: membership.role as Role,
    brandId: brand.id,
    brandSlug: brand.slug,
    brandName: brand.name,
    branchId: accessibleBranchIds.includes(preferredBranchId ?? "")
      ? preferredBranchId
      : (accessibleBranchIds[0] ?? null),
    branchName: null, // Resolved later by resolveBranchContext
    accessibleBranchIds,
    membershipId: membership.id,
  };
}
