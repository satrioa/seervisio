"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getBrandBySlug } from "@/repositories/brand.repository";
import {
  getBrandTheme,
  saveBrandTheme,
  type BrandThemeInput,
} from "@/repositories/brand-theme.repository";
import type { Result } from "@/lib/utils/result";
import { ok, fail } from "@/lib/utils/result";

export type BrandThemeResult = {
  primaryColor: string;
  accentColor: string;
  mode: "light" | "dark";
  tokens: Record<string, string> | null;
};

/**
 * Fetch the brand theme for a given brand slug.
 */
export async function getBrandThemeAction(
  brandSlug: string
): Promise<Result<BrandThemeResult>> {
  try {
    const supabase = await createServerSupabase();

    // Resolve brand slug to brand ID
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) {
      return fail("Brand tidak ditemukan");
    }

    const theme = await getBrandTheme(supabase as any, brand.id);
    if (!theme) {
      return ok({
        primaryColor: "#F59E0B",
        accentColor: "#D4A017",
        mode: "light",
        tokens: null,
      });
    }

    return ok(theme);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Gagal memuat tema brand"
    );
  }
}

/**
 * Save the brand theme for a given brand slug.
 */
export async function saveBrandThemeAction(
  brandSlug: string,
  input: BrandThemeInput
): Promise<Result<void>> {
  try {
    const supabase = await createServerSupabase();

    // Resolve brand slug to brand ID
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) {
      return fail("Brand tidak ditemukan");
    }

    await saveBrandTheme(supabase as any, brand.id, input);
    return ok(undefined);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Gagal menyimpan tema brand"
    );
  }
}
