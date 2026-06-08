/**
 * Branch repository.
 * Handles access to public.branches table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type DbBranch = Database["public"]["Tables"]["branches"]["Row"];

/**
 * Get all active branches for a brand.
 */
export async function getBranchesByBrandId(
  supabase: SupabaseClient<any, any, any>,
  brandId: number
): Promise<DbBranch[]> {
  const { data } = await supabase
    .from("branches")
    .select("*")
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .order("name");

  return data ?? [];
}

/**
 * Find a branch by its ID.
 */
export async function getBranchById(
  supabase: SupabaseClient<any, any, any>,
  id: string
): Promise<DbBranch | null> {
  const { data } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .single();

  return data ?? null;
}
