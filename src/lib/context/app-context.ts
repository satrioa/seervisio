/**
 * AppContext — the fully resolved user context for a specific brand/branch.
 *
 * Flow:
 * 1. User authenticates → getCurrentUser() returns UserSession
 * 2. User visits /[brandSlug]/panel/* → resolveBrandContext() creates AppContext
 * 3. AppContext is passed to all server actions and page components
 */

import type { Role } from "@/lib/permissions/roles";
import { can } from "@/lib/permissions/can";
import type { Permission } from "@/lib/permissions/permissions";
import { canUseAllBranchesScope, canAccessBranch } from "@/domain/access/branch-access";

export interface AppContext {
  /** Profile UUID from public.profiles */
  profileId: string;
  /** Auth user UUID from auth.users */
  authUserId: string;
  /** User's display name */
  name: string;
  /** User's email */
  email: string;
  /** User's avatar URL */
  avatarUrl: string | null;
  /** User's role within the current brand */
  role: Role;
  /** Current brand ID */
  brandId: number;
  /** Current brand slug */
  brandSlug: string;
  /** Current brand name */
  brandName: string;
  /** Current brand logo URL (from brand_settings) */
  brandLogoUrl: string | null;
  /** Currently selected branch ID (null for brand-wide scope) */
  branchId: string | null;
  /** Currently selected branch name (null for brand-wide scope) */
  branchName: string | null;
  /** All branch IDs the user has access to within this brand */
  accessibleBranchIds: string[];
  /** Whether the user can access all branches (MASTER_ADMIN / PLATFORM_OWNER) */
  canAccessAllBranches: boolean;
  /** The membership ID for this brand */
  membershipId: string;
  /** Active operator profile ID (null if same as auth user) */
  activeOperatorId: string | null;
  /** Active operator display name (null if not switched) */
  activeOperatorName: string | null;
}

/**
 * Check permission against the app context.
 */
export function canInContext(context: AppContext, permission: Permission): boolean {
  return can(context.role, permission);
}

/**
 * Check branch access against the app context.
 */
export function canAccessBranchInContext(
  context: AppContext,
  branchId: string | null | undefined,
): boolean {
  return canAccessBranch(
    { role: context.role, accessibleBranchIds: context.accessibleBranchIds },
    branchId,
  );
}

/**
 * Whether the user's role allows all-branch scope in this context.
 */
export function canUseAllBranchesInContext(context: AppContext): boolean {
  return canUseAllBranchesScope({
    role: context.role,
    accessibleBranchIds: context.accessibleBranchIds,
  });
}
