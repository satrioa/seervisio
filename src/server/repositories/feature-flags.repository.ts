import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

/**
 * Reads platform feature flags from the shared `feature_flags` table
 * (the same table managed by the Studio Admin console). The Seervisio
 * customer portal renders some UI (e.g. the AI menu) based on these flags,
 * so this lets a flag toggled in the admin console actually take effect.
 */

const FLAG_CACHE = new Map<string, { value: boolean; at: number }>();
const TTL_MS = 60_000;

export async function isFeatureFlagEnabled(name: string): Promise<boolean> {
  const cached = FLAG_CACHE.get(name);
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await (supabase as any)
      .from("feature_flags")
      .select("enabled")
      .eq("name", name)
      .maybeSingle();

    if (error || !data) {
      // On any failure, fail closed (feature off) to avoid surprises.
      return false;
    }
    const value = Boolean(data.enabled);
    FLAG_CACHE.set(name, { value, at: now });
    return value;
  } catch {
    return false;
  }
}
