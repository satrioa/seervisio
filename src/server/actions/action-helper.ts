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

  // Get brand by slug (may fail if slug was recently changed)
  let brand = await getBrandBySlug(supabase as any, brandSlug);

  // Brand slug may have changed — resolve from user's membership
  if (!brand) {
    const { data: membership } = await (supabase as any)
      .from("user_brand_memberships")
      .select("brand_id")
      .eq("profile_id", profile.id)
      .not("brand_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (membership?.brand_id) {
      const { data: brandById } = await (supabase as any)
        .from("brands")
        .select("id, name, slug")
        .eq("id", membership.brand_id)
        .maybeSingle();

      if (brandById) {
        brand = brandById;
      }
    }
  }

  if (!brand) {
    throw new Error("Brand not found");
  }

  // Get membership for this brand
  let membership = await getMembershipForBrand(supabase as any, profile.id, brand.id);

  // If no brand-specific membership, check for PLATFORM_OWNER (brand_id = NULL)
  if (!membership) {
    const { data: platformMembership } = await (supabase as any)
      .from("user_brand_memberships")
      .select("*")
      .eq("profile_id", profile.id)
      .is("brand_id", null)
      .eq("role", "PLATFORM_OWNER")
      .maybeSingle();
    membership = platformMembership;
  }

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

/**
 * Assert there is an active store shift (i.e. toko sedang buka).
 * Throws with a STORE_NOT_OPEN code if no active shift exists for the given branch.
 *
 * For brand-level actions (no specific branch), pass the user's defaultBranchId
 * or first accessible branch. If no branch is available, the check is skipped
 * (e.g. platform owner without branch assignment).
 */
export async function requireActiveStoreSession(
  supabase: any,
  brandId: number,
  branchId: string | null | undefined,
): Promise<void> {
  if (!branchId) return;

  const { data, error } = await supabase
    .from("store_shifts")
    .select("id")
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .eq("shift_status", "OPEN")
    .maybeSingle();

  if (error) {
    throw new Error("Gagal memverifikasi status toko.");
  }

  if (!data) {
    throw new OperationalGuardError("Toko belum dibuka. Buka toko terlebih dahulu untuk melakukan operasi ini.");
  }
}

export class OperationalGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationalGuardError";
  }
}

/**
 * Wraps error handling for action catch blocks.
 * If the error is an OperationalGuardError, returns STORE_NOT_OPEN code.
 * Otherwise returns a generic error message.
 */
export function handleActionError(err: unknown, fallbackMessage = "Terjadi kesalahan."): ActionResult<never> {
  if (err instanceof OperationalGuardError) {
    return errorResult(err.message, "STORE_NOT_OPEN");
  }
  const message = err instanceof Error ? err.message : fallbackMessage;
  return errorResult(message);
}
