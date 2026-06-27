/**
 * Brand repository.
 * Handles access to public.brands table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type DbBrand = Database["public"]["Tables"]["brands"]["Row"];

/**
 * Find a brand by its slug.
 * Used in middleware and layout to resolve brand from URL.
 */
export async function getBrandBySlug(
  supabase: SupabaseClient<any, any, any>,
  slug: string
): Promise<DbBrand | null> {
  const { data } = await supabase
    .from("brands")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  return (data ?? null) as DbBrand | null;
}

/**
 * Find a brand by its ID.
 */
export async function getBrandById(
  supabase: SupabaseClient<any, any, any>,
  id: number
): Promise<DbBrand | null> {
  const { data } = await supabase
    .from("brands")
    .select("id, name, slug")
    .eq("id", id)
    .single();

  return (data ?? null) as DbBrand | null;
}

/**
 * List all brands.
 */
export async function getAllBrands(
  supabase: SupabaseClient<Database>
): Promise<DbBrand[]> {
  const { data } = await supabase
    .from("brands")
    .select("id, name, slug")
    .order("name");

  return (data ?? []) as DbBrand[];
}
