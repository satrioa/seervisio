import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export type CacheKey =
  | "health"
  | "briefing"
  | "alerts"
  | "recommendations"
  | "scoreboard"
  | "forecast"
  | "insights";

export interface AiCacheEntry {
  id: string;
  brandId: number;
  cacheKey: CacheKey;
  cacheData: any;
  generatedAt: string;
  expiresAt: string;
  modelUsed: string | null;
  promptTokens: number;
  completionTokens: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function mapRow(row: any): AiCacheEntry {
  return {
    id: row.id,
    brandId: row.brand_id,
    cacheKey: row.cache_key,
    cacheData: row.cache_data,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
    modelUsed: row.model_used,
    promptTokens: row.prompt_tokens ?? 0,
    completionTokens: row.completion_tokens ?? 0,
  };
}

export async function getAiCache(
  brandId: number,
  cacheKey: CacheKey,
): Promise<AiCacheEntry | null> {
  const adminDb = createServiceRoleSupabaseClient();
  const { data } = await (adminDb as any)
    .from("ai_insight_cache")
    .select("*")
    .eq("brand_id", brandId)
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (!data) return null;

  // Check if expired
  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() > expiresAt) {
    // Delete expired entry
    await (adminDb as any)
      .from("ai_insight_cache")
      .delete()
      .eq("id", data.id);
    return null;
  }

  return mapRow(data);
}

export async function getAllAiCache(
  brandId: number,
): Promise<Record<CacheKey, AiCacheEntry | null>> {
  const adminDb = createServiceRoleSupabaseClient();
  const { data } = await (adminDb as any)
    .from("ai_insight_cache")
    .select("*")
    .eq("brand_id", brandId);

  const result: Record<string, AiCacheEntry | null> = {};
  const keys: CacheKey[] = ["health", "briefing", "alerts", "recommendations", "scoreboard", "forecast", "insights"];
  for (const key of keys) result[key] = null;

  if (!data) return result;

  const now = Date.now();
  for (const row of data) {
    const expiresAt = new Date(row.expires_at).getTime();
    if (now > expiresAt) {
      await (adminDb as any)
        .from("ai_insight_cache")
        .delete()
        .eq("id", row.id);
      continue;
    }
    result[row.cache_key] = mapRow(row);
  }

  return result;
}

export async function upsertAiCache(
  brandId: number,
  cacheKey: CacheKey,
  cacheData: any,
  modelUsed?: string,
  promptTokens?: number,
  completionTokens?: number,
): Promise<void> {
  const adminDb = createServiceRoleSupabaseClient();
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  const { error } = await (adminDb as any)
    .rpc("upsert_ai_insight_cache", {
      p_brand_id: brandId,
      p_cache_key: cacheKey,
      p_cache_data: cacheData,
      p_expires_at: expiresAt,
      p_model_used: modelUsed ?? null,
      p_prompt_tokens: promptTokens ?? 0,
      p_completion_tokens: completionTokens ?? 0,
    });

  if (error) {
    // Fallback: manual upsert
    const { data: existing } = await (adminDb as any)
      .from("ai_insight_cache")
      .select("id")
      .eq("brand_id", brandId)
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (existing) {
      await (adminDb as any)
        .from("ai_insight_cache")
        .update({
          cache_data: cacheData,
          expires_at: expiresAt,
          model_used: modelUsed ?? null,
          prompt_tokens: promptTokens ?? 0,
          completion_tokens: completionTokens ?? 0,
          generated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await (adminDb as any)
        .from("ai_insight_cache")
        .insert({
          brand_id: brandId,
          cache_key: cacheKey,
          cache_data: cacheData,
          expires_at: expiresAt,
          model_used: modelUsed ?? null,
          prompt_tokens: promptTokens ?? 0,
          completion_tokens: completionTokens ?? 0,
        });
    }
  }
}

export async function invalidateAiCache(
  brandId: number,
  cacheKey?: CacheKey,
): Promise<void> {
  const adminDb = createServiceRoleSupabaseClient();
  const query = (adminDb as any)
    .from("ai_insight_cache")
    .delete()
    .eq("brand_id", brandId);

  if (cacheKey) {
    query.eq("cache_key", cacheKey);
  }

  await query;
}
