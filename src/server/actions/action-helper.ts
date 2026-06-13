/**
 * Shared utilities for server actions.
 */
import { createServerSupabase } from "@/lib/supabase/server";
import {
  getProfileByAuthUserId,
  getMembershipForBrand,
  getBranchAccessForMembership,
  getDefaultBranchId,
} from "@/repositories/profile.repository";
import { getBrandBySlug } from "@/repositories/brand.repository";
import type { Role } from "@/lib/permissions/roles";
import { ROLES } from "@/lib/permissions/roles";
import type { Permission } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { canUseAllBranchesScope, canAccessBranch } from "@/domain/access/branch-access";
import { resolveActiveOperator } from "@/lib/auth/active-operator";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export function successResult<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function errorResult(error: string, code?: string): ActionResult<never> {
  return { success: false, error, code };
}

export interface SessionData {
  profileId: string;
  brandId: number;
  brandName: string;
  brandSlug: string;
  role: Role;
  defaultBranchId: string | null;
  accessibleBranchIds: string[];
  canAccessAllBranches: boolean;
}

/**
 * Get the current authenticated user's profile and session data for a brand slug.
 * Respects active operator override (staff quick-switch).
 */
export async function getSessionData(brandSlug: string): Promise<SessionData> {
  const supabase = await createServerSupabase();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileByAuthUserId(supabase as any, user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Get brand by slug
  const brand = await getBrandBySlug(supabase as any, brandSlug);
  if (!brand) {
    throw new Error("Brand not found");
  }

  // Get membership for this brand
  const membership = await getMembershipForBrand(supabase as any, profile.id, brand.id);
  if (!membership) {
    throw new Error("Brand access denied");
  }

  const role = membership.role as Role;
  const canAccessAllBranches = role === ROLES.MASTER_ADMIN || role === ROLES.PLATFORM_OWNER;

  const accessibleBranchIds = canAccessAllBranches
    ? []
    : await getBranchAccessForMembership(supabase as any, membership.id);

  const defaultBranchId = canAccessAllBranches
    ? null
    : await getDefaultBranchId(supabase as any, membership.id);

  // Check active operator override
  const activeOperator = await resolveActiveOperator(supabase as any, brand.id, profile.id);
  if (activeOperator) {
    return {
      // TODO: Add sessionUserId for dual tracking when active operator differs from auth user
      profileId: activeOperator.profileId,
      brandId: brand.id,
      brandName: brand.name,
      brandSlug: brand.slug,
      role: activeOperator.role,
      defaultBranchId: activeOperator.defaultBranchId,
      accessibleBranchIds: activeOperator.accessibleBranchIds,
      canAccessAllBranches: activeOperator.canAccessAllBranches,
    };
  }

  return {
    profileId: profile.id,
    brandId: brand.id,
    brandName: brand.name,
    brandSlug: brand.slug,
    role,
    defaultBranchId,
    accessibleBranchIds,
    canAccessAllBranches,
  };
}

/**
 * Assert the user has a specific permission. Throws on failure.
 */
export function requireActionPermission(role: Role | null | undefined, permission: Permission): void {
  requirePermission(role, permission);
}

/**
 * Assert the user can access the given branch. Throws on failure.
 * Uses session data from getSessionData.
 */
export function requireBranchAccess(
  session: { role: Role; accessibleBranchIds: string[] },
  branchId: string | null | undefined,
  label?: string,
): void {
  if (!branchId) {
    throw new Error(label
      ? `Cabang tidak ditemukan untuk ${label}.`
      : "Cabang tidak ditemukan.");
  }

  const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
  if (!canAccessBranch(ctx, branchId)) {
    throw new Error("Anda tidak memiliki akses ke cabang ini.");
  }
}

/**
 * Assert the user can use all-branches scope. Throws if not allowed.
 */
export function requireAllBranchesScope(session: { role: Role; accessibleBranchIds: string[] }): void {
  if (!canUseAllBranchesScope({ role: session.role, accessibleBranchIds: session.accessibleBranchIds })) {
    throw new Error("Scope semua cabang tidak tersedia untuk role Anda.");
  }
}
