/**
 * Shared utilities for server actions.
 */
import { createServerSupabase } from "@/lib/supabase/server";
import {
  getProfileByAuthUserId,
  getMembershipForBrand,
  getDefaultBranchForProfile,
} from "@/repositories/profile.repository";
import { getBrandBySlug } from "@/repositories/brand.repository";

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
  roles: string[];
  defaultBranchId: string | null;
}

/**
 * Get the current authenticated user's profile and session data for a brand slug.
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

  // Get default branch
  const defaultBranchId = await getDefaultBranchForProfile(supabase as any, profile.id, brand.id);

  return {
    profileId: profile.id,
    brandId: brand.id,
    brandName: brand.name,
    brandSlug: brand.slug,
    roles: [membership.role] as string[],
    defaultBranchId,
  };
}
