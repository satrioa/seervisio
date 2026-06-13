import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROLES, type Role } from "@/lib/permissions/roles";
import { getProfileById, getMembershipForBrand, getBranchAccessForMembership, getDefaultBranchId } from "@/repositories/profile.repository";

const OPERATOR_COOKIE = "seervis_active_operator_id";

export interface ActiveOperatorInfo {
  profileId: string;
  name: string;
  email: string;
  role: Role;
  defaultBranchId: string | null;
  accessibleBranchIds: string[];
  canAccessAllBranches: boolean;
}

export async function getActiveOperatorId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(OPERATOR_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function setActiveOperatorCookie(profileId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OPERATOR_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearActiveOperatorCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(OPERATOR_COOKIE);
  } catch {
    // ignore if called outside request context
  }
}

export async function resolveActiveOperator(
  supabase: SupabaseClient<any, any, any>,
  brandId: number,
  authProfileId: string,
): Promise<ActiveOperatorInfo | null> {
  const operatorId = await getActiveOperatorId();
  if (!operatorId || operatorId === authProfileId) return null;

  const profile = await getProfileById(supabase, operatorId);
  if (!profile || !profile.is_active) {
    await clearActiveOperatorCookie();
    return null;
  }

  const membership = await getMembershipForBrand(supabase, operatorId, brandId);
  if (!membership || !membership.is_active) {
    await clearActiveOperatorCookie();
    return null;
  }

  const role = membership.role as Role;
  const canAccessAllBranches = role === ROLES.MASTER_ADMIN || role === ROLES.PLATFORM_OWNER;

  const accessibleBranchIds = canAccessAllBranches
    ? []
    : await getBranchAccessForMembership(supabase, membership.id);

  const defaultBranchId = canAccessAllBranches
    ? null
    : await getDefaultBranchId(supabase, membership.id);

  return {
    profileId: profile.id,
    name: profile.name,
    email: profile.email,
    role,
    defaultBranchId,
    accessibleBranchIds,
    canAccessAllBranches,
  };
}
