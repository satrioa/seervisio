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
 * Fetch brand theme settings from the brands table.
 * Columns are asserted because migration 015 adds them to the DB schema
 * but generated types haven't been refreshed yet.
 */
export async function getBrandTheme(
  supabase: SupabaseClient<Database>,
  brandId: number
): Promise<BrandThemeData | null> {
  const { data, error } = await supabase
    .from("brands")
    .select(
      "theme_primary_color, theme_accent_color, theme_mode, theme_tokens"
    )
    .eq("id", brandId)
    .single() as any;

  if (error || !data) return null;

  return {
    primaryColor: data.theme_primary_color ?? "#F59E0B",
    accentColor: data.theme_accent_color ?? "#D4A017",
    mode: (data.theme_mode as "light" | "dark") ?? "light",
    tokens: data.theme_tokens as Record<string, string> | null,
  };
}

/**
 * Save brand theme settings to the brands table.
 */
export async function saveBrandTheme(
  supabase: SupabaseClient<Database>,
  brandId: number,
  input: BrandThemeInput
): Promise<void> {
  const { error } = await supabase
    .from("brands")
    .update({
      theme_primary_color: input.primaryColor,
      theme_accent_color: input.accentColor,
      theme_mode: input.mode,
      theme_tokens: input.tokens,
    } as any)
    .eq("id", brandId);

  if (error) {
    throw new Error(`Failed to save brand theme: ${error.message}`);
  }
}
