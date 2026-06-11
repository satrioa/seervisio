/**
 * Profile repository.
 * Handles access to public.profiles, user_brand_memberships, user_branch_access.
 * All functions accept a Supabase client as first parameter.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbMembership = Database["public"]["Tables"]["user_brand_memberships"]["Row"];
type DbBranchAccess = Database["public"]["Tables"]["user_branch_access"]["Row"];

/**
 * Find a profile linked to a Supabase Auth user.
 */
export async function getProfileByAuthUserId(
  supabase: SupabaseClient<any, any, any>,
  authUserId: string
): Promise<DbProfile | null> {
  console.log("[profile.repository] getProfileByAuthUserId called with authUserId:", authUserId);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    console.error("[profile.repository] Query error:", error.message, error.details, error.hint);
  }
  console.log("[profile.repository] Result:", data ? `found profile id=${data.id} name=${data.name}` : "null");
  return data ?? null;
}

/**
 * Get all brand memberships for a profile.
 * Each membership links a profile to a brand with a specific role.
 */
export async function getMembershipsForProfile(
  supabase: SupabaseClient<any, any, any>,
  profileId: string
): Promise<DbMembership[]> {
  const { data } = await supabase
    .from("user_brand_memberships")
    .select("*")
    .eq("profile_id", profileId);

  return data ?? [];
}

/**
 * Get active membership for a specific brand.
 */
export async function getMembershipForBrand(
  supabase: SupabaseClient<any, any, any>,
  profileId: string,
  brandId: number
): Promise<DbMembership | null> {
  const { data } = await supabase
    .from("user_brand_memberships")
    .select("*")
    .eq("profile_id", profileId)
    .eq("brand_id", brandId)
    .single();

  return data ?? null;
}

/**
 * Get all branch access records for a membership.
 * Returns the branch_ids the user has access to within a brand.
 */
export async function getBranchAccessForMembership(
  supabase: SupabaseClient<any, any, any>,
  membershipId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("user_branch_access")
    .select("branch_id")
    .eq("membership_id", membershipId)
    .eq("is_active", true);

  return data?.map((row) => row.branch_id) ?? [];
}

/**
 * Get the default branch for a profile within a brand.
 * Falls back to the first available branch if no default is set.
 */
export async function getDefaultBranchForProfile(
  supabase: SupabaseClient<any, any, any>,
  profileId: string,
  brandId: number
): Promise<string | null> {
  const { data } = await supabase
    .from("user_brand_memberships")
    .select("preferred_branch_id")
    .eq("profile_id", profileId)
    .eq("brand_id", brandId)
    .single();

  return data?.preferred_branch_id ?? null;
}

/**
 * Get full profile by profile ID.
 */
export async function getProfileById(
  supabase: SupabaseClient<any, any, any>,
  profileId: string
): Promise<DbProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  return data ?? null;
}

/**
 * Update the auth_user_id for a profile (linking step after Supabase Auth user creation).
 */
export async function linkProfileToAuthUser(
  supabase: SupabaseClient<any, any, any>,
  profileId: string,
  authUserId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ auth_user_id: authUserId })
    .eq("id", profileId);

  return !error;
}
