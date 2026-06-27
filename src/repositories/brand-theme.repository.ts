/**
 * brand-theme.repository.ts
 *
 * Data access for brand theme customization.
 * Uses type assertions for theme columns that will be added
 * by migration 015 (pending).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/* ─── Types ─── */

export interface BrandThemeData {
  primaryColor: string;
  accentColor: string;
  mode: "light" | "dark";
  tokens: Record<string, string> | null;
}

export interface BrandThemeInput {
  primaryColor: string;
  accentColor: string;
  mode: "light" | "dark";
  tokens: Record<string, string>;
}

/* ─── Repository ─── */

/**
 * Fetch brand theme settings from the brand_settings table.
 */
export async function getBrandTheme(
  supabase: SupabaseClient<Database>,
  brandId: number
): Promise<BrandThemeData | null> {
  const { data, error } = await supabase
    .from("brand_settings")
    .select(
      "theme_primary_color, theme_accent_color, theme_mode, theme_tokens"
    )
    .eq("brand_id", brandId)
    .maybeSingle() as any;

  if (error || !data) return null;

  return {
    primaryColor: data.theme_primary_color ?? "#F59E0B",
    accentColor: data.theme_accent_color ?? "#D4A017",
    mode: (data.theme_mode as "light" | "dark") ?? "light",
    tokens: data.theme_tokens as Record<string, string> | null,
  };
}

/**
 * Save brand theme settings to the brand_settings table.
 * Uses upsert (update if exists, insert if not).
 */
export async function saveBrandTheme(
  supabase: SupabaseClient<Database>,
  brandId: number,
  input: BrandThemeInput
): Promise<void> {
  const { data: existing } = await supabase
    .from("brand_settings")
    .select("id")
    .eq("brand_id", brandId)
    .maybeSingle() as any;

  if (existing) {
    const { error } = await supabase
      .from("brand_settings")
      .update({
        theme_primary_color: input.primaryColor,
        theme_accent_color: input.accentColor,
        theme_mode: input.mode,
        theme_tokens: input.tokens,
      } as any)
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Failed to save brand theme: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from("brand_settings")
      .insert({
        brand_id: brandId,
        theme_primary_color: input.primaryColor,
        theme_accent_color: input.accentColor,
        theme_mode: input.mode,
        theme_tokens: input.tokens,
      } as any);

    if (error) {
      throw new Error(`Failed to save brand theme: ${error.message}`);
    }
  }
}
