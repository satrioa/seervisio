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
import { getBrandSettings } from "@/repositories/brand-settings.repository";
import {
  getBranchAccessForMembership,
  getDefaultBranchId,
} from "@/repositories/profile.repository";
import { NotFoundError, AuthError } from "@/lib/utils/errors";
import { toDirectImageUrl } from "@/lib/utils/url";

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
  // First check if user has a platform-wide membership (PLATFORM_OWNER with brand_id = NULL)
  const platformMembership = session.memberships.find(
    (m) => m.role === ROLES.PLATFORM_OWNER && m.brandId === null,
  );

  let membership;
  if (platformMembership) {
    membership = {
      id: platformMembership.id,
      profile_id: session.profileId,
      brand_id: null,
      role: ROLES.PLATFORM_OWNER,
      is_active: true,
    };
  } else {
    // Use pre-loaded memberships from the session (avoids RLS issues
    // and redundant DB queries). If not found in session, fall back
    // to a direct DB query.
    const sessionMembership = session.memberships.find(
      (m) => m.brandId === brand.id,
    );
    if (sessionMembership) {
      membership = {
        id: sessionMembership.id,
        profile_id: session.profileId,
        brand_id: brand.id,
        role: sessionMembership.role,
        is_active: true,
      };
    }
  }

  if (!membership) {
    // Self-heal: a brand may exist (created during signup / welcome wizard)
    // without a linked membership if that step failed. If the current user
    // owns an active license for this brand (or a profile-scoped license
    // that was back-filled to it), repair the membership instead of
    // hard-denying access.
    try {
      const { createServiceRoleSupabaseClient } = await import("@/lib/supabase/admin");
      const { getActiveLicenseForProfile } = await import("@/server/repositories/license.repository");
      const adminDb = createServiceRoleSupabaseClient();

      const license = await getActiveLicenseForProfile(session.profileId);
      const ownsBrand =
        (license && (license as any).brand_id === brand.id) ||
        (license && !(license as any).brand_id);

      if (ownsBrand) {
        const { data: existing } = await (adminDb as any)
          .from("user_brand_memberships")
          .select("id, is_active")
          .eq("brand_id", brand.id)
          .eq("profile_id", session.profileId)
          .maybeSingle();

        if (existing) {
          if (!existing.is_active) {
            await (adminDb as any)
              .from("user_brand_memberships")
              .update({ is_active: true })
              .eq("id", existing.id);
          }
          membership = {
            id: existing.id,
            profile_id: session.profileId,
            brand_id: brand.id,
            role: "MASTER_ADMIN" as any,
            is_active: true,
          };
        } else {
          const { data: created, error: createErr } = await (adminDb as any)
            .from("user_brand_memberships")
            .insert({
              profile_id: session.profileId,
              brand_id: brand.id,
              role: "MASTER_ADMIN",
              is_active: true,
            })
            .select("id")
            .single();

          if (!createErr && created) {
            membership = {
              id: created.id,
              profile_id: session.profileId,
              brand_id: brand.id,
              role: "MASTER_ADMIN" as any,
              is_active: true,
            };
          }
        }

        // Back-fill the license brand if it was still profile-scoped.
        if (license && !(license as any).brand_id) {
          await (adminDb as any)
            .from("licenses")
            .update({ brand_id: brand.id })
            .eq("id", (license as any).id);
        }
      }
    } catch {
      // fall through to the AuthError below
    }
  }

  if (!membership) {
    console.error("[resolveBrandContext] No membership found", {
      profileId: session.profileId,
      brandId: brand.id,
      brandSlug,
      sessionMembershipCount: session.memberships.length,
      sessionMembershipBrandIds: session.memberships.map((m) => m.brandId),
    });
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

  // Step 8: Get brand settings (includes logo_url)
  const brandSettings = await getBrandSettings(supabase, brand.id);

  // Step 9: Build and return the AppContext
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
    brandLogoUrl: toDirectImageUrl(brandSettings?.logoUrl ?? null),
    branchId: effectiveDefaultBranchId,
    branchName: null,
    accessibleBranchIds: effectiveAccessibleBranchIds,
    canAccessAllBranches: effectiveCanAccessAllBranches,
    membershipId: membership.id,
    activeOperatorId,
    activeOperatorName,
  };
}
