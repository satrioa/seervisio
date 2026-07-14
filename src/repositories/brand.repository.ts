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
 * Create a new brand.
 */
export async function createBrand(
  supabase: SupabaseClient<any, any, any>,
  input: { name: string; slug: string; status: string; owner_name: string; owner_email: string }
): Promise<DbBrand> {
  const { data, error } = await supabase
    .from("brands")
    .insert({
      name: input.name,
      slug: input.slug,
      status: input.status,
      owner_name: input.owner_name,
      owner_email: input.owner_email,
    })
    .select("id, name, slug")
    .single();

  if (error || !data) throw new Error(error?.message || "Gagal membuat brand.");
  return data as unknown as DbBrand;
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
