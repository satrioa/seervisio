"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  type ActionResult,
} from "@/server/actions/action-helper";
import {
  getBrandSettings,
} from "@/repositories/brand-settings.repository";
import {
  getAiCache,
  getAllAiCache,
  upsertAiCache,
  invalidateAiCache,
  type CacheKey,
  type AiCacheEntry,
} from "@/repositories/ai-cache.repository";
import * as aiRepo from "@/repositories/ai.repository";
import {
  createLlmProvider,
  type AiProvider,
  type LlmResponse,
} from "@/lib/ai/llm-provider";

/* ── Public Types ── */

export interface AiSettingsData {
  provider: AiProvider | null;
  hasApiKey: boolean;
}

export interface AiDashboardCache {
  health: any | null;
  briefing: any | null;
  alerts: any | null;
  recommendations: any | null;
  scoreboard: any | null;
  forecast: any | null;
  insights: any | null;
}

/* ── Helpers ── */

/** Unwrap an LLM response stored via `json_object` format.
 *  When the prompt asks for an array, `json_object` wraps it in `{"key": [...]}`.
 *  This helper extracts the array, falling back to `null` if shape mismatches. */
function unwrapLlmJson<T = any>(raw: string, expected: "array" | "object"): T | null {
  try {
    const parsed = JSON.parse(raw);
    if (expected === "array") {
      if (Array.isArray(parsed)) return parsed as T;
      if (parsed && typeof parsed === "object") {
        for (const val of Object.values(parsed)) {
          if (Array.isArray(val)) return val as T;
        }
      }
      return null;
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as T;
    return null;
  } catch {
    return null;
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••" + key.slice(-4);
  return "••••••••" + key.slice(-4);
}

function getLlmConfig(settings: any): { provider: AiProvider; apiKey: string } | null {
  const metadata = settings?.metadata ?? {};
  const provider: AiProvider | null = settings?.aiProvider ?? metadata?.ai_provider ?? null;
  const apiKey: string | null = settings?.aiApiKeyEncrypted ?? metadata?.ai_api_key ?? null;
  if (!provider || !apiKey) return null;
  return { provider, apiKey };
}

/* ── BYOK: Save AI Provider Settings ── */

export async function saveAiProviderSettingsAction(
  brandSlug: string,
  data: { provider: AiProvider; apiKey: string },
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    // Validate the API key first
    const provider = createLlmProvider(data.provider, data.apiKey);
    const valid = await provider.validateApiKey(data.apiKey);
    if (!valid) {
      return errorResult("API key tidak valid. Periksa kembali key Anda.");
    }

    // Save to brand_settings
    const adminDb = createServiceRoleSupabaseClient();
    const existing = await getBrandSettings(adminDb as any, session.brandId);

    const metadata = {
      ...(existing?.metadata ?? {}),
      ai_provider: data.provider,
      ai_api_key: data.apiKey,
    };

    if (existing) {
      await (adminDb as any)
        .from("brand_settings")
        .update({
          ai_provider: data.provider,
          ai_api_key_encrypted: data.apiKey,
          metadata,
        })
        .eq("brand_id", session.brandId);
    } else {
      await (adminDb as any)
        .from("brand_settings")
        .insert({
          brand_id: session.brandId,
          store_name: "Store",
          ai_provider: data.provider,
          ai_api_key_encrypted: data.apiKey,
          metadata,
        });
    }

    return successResult(undefined);
  } catch (err: any) {
    console.error("[saveAiProviderSettingsAction]", err);
    return errorResult(err.message ?? "Gagal menyimpan pengaturan AI.");
  }
}

/* ── BYOK: Get AI Provider Settings ── */

export async function getAiProviderSettingsAction(
  brandSlug: string,
): Promise<ActionResult<AiSettingsData>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const settings = await getBrandSettings(adminDb as any, session.brandId);

    if (!settings) {
      return successResult({ provider: null, hasApiKey: false });
    }

    const metadata = settings.metadata ?? {};
    const provider: AiProvider | null = settings.aiProvider ?? metadata?.ai_provider ?? null;
    const apiKey: string | null = settings.aiApiKeyEncrypted ?? metadata?.ai_api_key ?? null;

    return successResult({
      provider,
      hasApiKey: !!apiKey,
    });
  } catch (err: any) {
    console.error("[getAiProviderSettingsAction]", err);
    return errorResult(err.message ?? "Gagal memuat pengaturan AI.");
  }
}

/* ── BYOK: Test API Key ── */

export async function testAiApiKeyAction(
  brandSlug: string,
): Promise<ActionResult<{ valid: boolean; model?: string }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const settings = await getBrandSettings(adminDb as any, session.brandId);
    const config = getLlmConfig(settings);
    if (!config) {
      return errorResult("Belum ada konfigurasi AI. Simpan provider dan API key terlebih dahulu.");
    }

    const provider = createLlmProvider(config.provider, config.apiKey);
    const valid = await provider.validateApiKey(config.apiKey);

    if (valid) {
      return successResult({ valid: true, model: provider.defaultModel });
    }
    return successResult({ valid: false });
  } catch (err: any) {
    console.error("[testAiApiKeyAction]", err);
    return errorResult(err.message ?? "Gagal menguji koneksi AI.");
  }
}

/* ── BYOK: Remove API Key ── */

export async function removeAiApiKeyAction(
  brandSlug: string,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "settings.manage");

    const adminDb = createServiceRoleSupabaseClient();
    const existing = await getBrandSettings(adminDb as any, session.brandId);

    if (existing) {
      const metadata = { ...(existing.metadata ?? {}) };
      delete metadata.ai_provider;
      delete metadata.ai_api_key;

      await (adminDb as any)
        .from("brand_settings")
        .update({
          ai_provider: null,
          ai_api_key_encrypted: null,
          metadata,
        })
        .eq("brand_id", session.brandId);
    }

    // Also clear all cached insights
    await invalidateAiCache(session.brandId);

    return successResult(undefined);
  } catch (err: any) {
    console.error("[removeAiApiKeyAction]", err);
    return errorResult(err.message ?? "Gagal menghapus konfigurasi AI.");
  }
}

/* ── Insight Engine: Generate all insights ── */

async function callLlm(
  brandId: number,
  systemPrompt: string,
  userPrompt: string,
  responseFormat: "text" | "json_object" = "json_object",
): Promise<LlmResponse | null> {
  const adminDb = createServiceRoleSupabaseClient();
  const settings = await getBrandSettings(adminDb as any, brandId);
  const config = getLlmConfig(settings);
  if (!config) return null;

  const provider = createLlmProvider(config.provider, config.apiKey);
  return provider.complete({
    model: provider.defaultModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    responseFormat,
    maxTokens: 4096,
  });
}

/* ── Fetch business context for LLM ── */

async function fetchBusinessContext(
  supabase: any,
  brandId: number,
  accessibleBranchIds: string[],
) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const branchFilter = accessibleBranchIds;

  const [services, payments, inventory, shifts, customers, finance] = await Promise.all([
    supabase.from("services").select("id, branch_id, current_status, final_cost, created_at, intake_at, done_at, device_type, device_brand, device_model, assigned_technician_id").eq("brand_id", brandId).in("branch_id", branchFilter).is("deleted_at", null).gte("created_at", thirtyDaysAgo),
    supabase.from("service_payments").select("id, branch_id, gross_amount, mdr_amount, net_amount, payment_status, paid_at, created_at").eq("brand_id", brandId).in("branch_id", branchFilter).gte("paid_at", thirtyDaysAgo),
    supabase.from("branch_inventory_stocks").select("item_id, branch_id, current_stock").eq("brand_id", brandId).in("branch_id", branchFilter),
    supabase.from("store_shifts").select("id, branch_id, shift_status, opened_at").eq("brand_id", brandId).in("branch_id", branchFilter),
    supabase.from("customers").select("id, name").eq("brand_id", brandId),
    supabase.from("finance_ledger").select("entry_type, direction, amount, branch_id, ledger_date").eq("brand_id", brandId).in("branch_id", branchFilter).gte("ledger_date", thirtyDaysAgo),
  ]);

  return {
    services: services.data ?? [],
    payments: payments.data ?? [],
    inventory: inventory.data ?? [],
    shifts: shifts.data ?? [],
    customers: customers.data ?? [],
    finance: finance.data ?? [],
    period: {
      from: thirtyDaysAgo,
      to: now.toISOString(),
    },
  };
}

/* ── Generate all insights ── */

export async function generateAiInsightsAction(
  brandSlug: string,
): Promise<ActionResult<{ success: boolean; cache?: AiDashboardCache }>> {
  try {
    const session = await getSessionData(brandSlug);
    const adminDb = createServiceRoleSupabaseClient();

    // Fetch business data
    const supabase = await createServerSupabase();
    const context = await fetchBusinessContext(supabase as any, session.brandId, session.accessibleBranchIds);

    const systemPrompt = `You are the AI COO for a手机维修店 (mobile phone repair shop). Analyze the provided business data and return insights in STRICT JSON format. Always use Indonesian language for labels and descriptions. Return ONLY valid JSON, no markdown.`;

    // 1. Business Health
    const healthPrompt = `Analyze this repair shop data and return a business health score (0-100) with contributors. Data: ${JSON.stringify({
      services: context.services.length,
      completedLast30d: context.services.filter((s: any) => s.current_status === "DONE" || s.current_status === "COMPLETED").length,
      pendingServices: context.services.filter((s: any) => s.current_status !== "DONE" && s.current_status !== "CANCELLED").length,
      totalRevenue: context.payments.filter((p: any) => p.payment_status === "COMPLETED" || p.payment_status === "PAID").reduce((s: number, p: any) => s + Number(p.gross_amount || 0), 0),
      totalPayments: context.payments.length,
      activeShifts: context.shifts.filter((s: any) => s.shift_status === "Sedang Berjalan" || s.shift_status === "open").length,
      totalShifts: context.shifts.length,
      inventoryItems: context.inventory.length,
      financeEntries: context.finance.length,
    }, null, 2)}

    Return JSON with schema: { "score": number, "trend": "up"|"down"|"stable", "trendValue": string, "contributors": { "revenue": number, "inventory": number, "sla": number, "finance": number, "customer": number, "technician": number } }`;

    const healthResult = await callLlm(session.brandId, systemPrompt, healthPrompt);
    if (healthResult) {
      const parsed = unwrapLlmJson(healthResult.content, "object");
      if (parsed) {
        await upsertAiCache(session.brandId, "health", parsed, healthResult.model, healthResult.usage.promptTokens, healthResult.usage.completionTokens);
      }
    }

    // 2. Today's Briefing
    const todayServices = context.services.filter((s: any) => s.created_at >= new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
    const briefingPrompt = `Return a morning briefing JSON. Data: ${JSON.stringify({
      totalServicesToday: todayServices.length,
      overdueServices: context.services.filter((s: any) => s.current_status !== "DONE" && s.current_status !== "CANCELLED" && new Date(s.created_at).getTime() < Date.now() - 3*86400000).length,
      revenueLast30d: context.payments.filter((p: any) => p.payment_status === "COMPLETED" || p.payment_status === "PAID").reduce((s: number, p: any) => s + Number(p.gross_amount || 0), 0),
      paymentCount: context.payments.length,
    }, null, 2)}

    Return JSON: { "userName": string, "summary": [{ "icon": "trending-up"|"clock"|"package"|"check-circle", "text": string, "positive": boolean }], "revenueChange": number, "overdueServices": number, "stockAlert": string, "marginNote": string, "cashBalanced": boolean }`;

    const briefingResult = await callLlm(session.brandId, systemPrompt, briefingPrompt);
    if (briefingResult) {
      const parsed = unwrapLlmJson(briefingResult.content, "object");
      if (parsed) {
        await upsertAiCache(session.brandId, "briefing", parsed, briefingResult.model, briefingResult.usage.promptTokens, briefingResult.usage.completionTokens);
      }
    }

    // 3. Alerts
    const lowStock = context.inventory.filter((s: any) => s.current_stock <= 3);
    const alertsPrompt = `Generate priority alerts. Data: ${JSON.stringify({
      lowStockItems: lowStock.length,
      pendingServices: context.services.filter((s: any) => s.current_status !== "DONE" && s.current_status !== "CANCELLED").length,
      servicesByBranch: Object.entries(context.services.reduce((acc: any, s: any) => { acc[s.branch_id] = (acc[s.branch_id] || 0) + 1; return acc; }, {})).length,
    })}

    Return JSON: [{ "id": string, "type": "inventory"|"technician"|"finance"|"service"|"customer", "severity": "critical"|"warning"|"info", "title": string, "description": string, "detail": string, "actionLabel": string, "actionHref": string }] (up to 5 alerts)`;

    const alertsResult = await callLlm(session.brandId, systemPrompt, alertsPrompt);
    if (alertsResult) {
      const parsed = unwrapLlmJson(alertsResult.content, "array");
      if (parsed) {
        await upsertAiCache(session.brandId, "alerts", parsed, alertsResult.model, alertsResult.usage.promptTokens, alertsResult.usage.completionTokens);
      }
    }

    // 4. Scoreboard
    const scorePrompt = `Return operational scoreboard from this data: ${JSON.stringify({
      totalRevenue: context.payments.filter((p: any) => p.payment_status === "COMPLETED" || p.payment_status === "PAID").reduce((s: number, p: any) => s + Number(p.gross_amount || 0), 0),
      activeServices: context.services.filter((s: any) => s.current_status !== "DONE" && s.current_status !== "CANCELLED").length,
      completedServices: context.services.filter((s: any) => s.current_status === "DONE").length,
      totalBranches: new Set(context.services.map((s: any) => s.branch_id)).size,
    })}

    Return JSON: [{ "label": string, "value": string, "trend": "up"|"down"|"stable", "trendValue": string, "sparklineData": number[], "insight": string, "detailLabel": string }] (6 items)`;

    const scoreResult = await callLlm(session.brandId, systemPrompt, scorePrompt);
    if (scoreResult) {
      const parsed = unwrapLlmJson(scoreResult.content, "array");
      if (parsed) {
        await upsertAiCache(session.brandId, "scoreboard", parsed, scoreResult.model, scoreResult.usage.promptTokens, scoreResult.usage.completionTokens);
      }
    }

    // 5. Forecast
    const forecastPrompt = `Return a 7-day revenue forecast. Current data: ${JSON.stringify({
      last30dRevenue: context.payments.filter((p: any) => p.payment_status === "COMPLETED" || p.payment_status === "PAID").reduce((s: number, p: any) => s + Number(p.gross_amount || 0), 0),
      serviceCount: context.services.length,
    })}

    Return JSON: { "tomorrow": { "value": number, "confidence": number }, "next7Days": [{ "date": string, "value": number, "label": string }], "recommendations": string[] }`;

    const forecastResult = await callLlm(session.brandId, systemPrompt, forecastPrompt);
    if (forecastResult) {
      const parsed = unwrapLlmJson(forecastResult.content, "object");
      if (parsed) {
        await upsertAiCache(session.brandId, "forecast", parsed, forecastResult.model, forecastResult.usage.promptTokens, forecastResult.usage.completionTokens);
      }
    }

    // 6. Recommendations
    const recsPrompt = `Return actionable recommendations for today. Data: ${JSON.stringify({
      pendingCount: context.services.filter((s: any) => s.current_status !== "DONE" && s.current_status !== "CANCELLED").length,
      revenue: context.payments.filter((p: any) => p.payment_status === "COMPLETED" || p.payment_status === "PAID").reduce((s: number, p: any) => s + Number(p.gross_amount || 0), 0),
    })}

    Return JSON: [{ "id": string, "title": string, "description": string, "expectedImpact": "high"|"medium"|"low", "confidence": number, "estimatedRevenueProtected": number, "actionLabel": string, "actionHref": string }] (up to 4)`;

    const recsResult = await callLlm(session.brandId, systemPrompt, recsPrompt);
    if (recsResult) {
      const parsed = unwrapLlmJson(recsResult.content, "array");
      if (parsed) {
        await upsertAiCache(session.brandId, "recommendations", parsed, recsResult.model, recsResult.usage.promptTokens, recsResult.usage.completionTokens);
      }
    }

    // 7. Insights
    const insightsPrompt = `Generate business insights as JSON array. Context: ${JSON.stringify({
      serviceCount: context.services.length,
      pendingServices: context.services.filter((s: any) => s.current_status !== "DONE" && s.current_status !== "CANCELLED").length,
      revenue: context.payments.filter((p: any) => p.payment_status === "COMPLETED" || p.payment_status === "PAID").reduce((s: number, p: any) => s + Number(p.gross_amount || 0), 0),
      paymentCount: context.payments.length,
    })}

    Return JSON: [{ "id": string, "title": string, "summary": string, "severity": "critical"|"warning"|"info", "category": string, "time": string, "group": "today"|"yesterday"|"lastWeek", "read": boolean, "rootCause": string, "supportingMetrics": string[], "recommendation": string, "confidence": number, "expectedImpact": string, "actions": [{ "label": string, "href": string }] }] (up to 6 insights)`;

    const insightsResult = await callLlm(session.brandId, systemPrompt, insightsPrompt);
    if (insightsResult) {
      const parsed = unwrapLlmJson(insightsResult.content, "array");
      if (parsed) {
        await upsertAiCache(session.brandId, "insights", parsed, insightsResult.model, insightsResult.usage.promptTokens, insightsResult.usage.completionTokens);
      }
    }

    // Read back the cache
    const cache = await getAllAiCache(session.brandId);

    return successResult({
      success: true,
      cache: {
        health: cache.health?.cacheData ?? null,
        briefing: cache.briefing?.cacheData ?? null,
        alerts: cache.alerts?.cacheData ?? null,
        recommendations: cache.recommendations?.cacheData ?? null,
        scoreboard: cache.scoreboard?.cacheData ?? null,
        forecast: cache.forecast?.cacheData ?? null,
        insights: cache.insights?.cacheData ?? null,
      },
    });
  } catch (err: any) {
    console.error("[generateAiInsightsAction]", err);
    return errorResult(err.message ?? "Gagal menghasilkan insight AI.");
  }
}

/* ── Get real operational data (replaces LLM-generated data) ── */

export async function getAiOperationalDataAction(
  brandSlug: string,
): Promise<
  ActionResult<{
    hasData: boolean;
    health: AiDashboardCache["health"];
    briefing: AiDashboardCache["briefing"];
    alerts: AiDashboardCache["alerts"];
    recommendations: AiDashboardCache["recommendations"];
    scoreboard: AiDashboardCache["scoreboard"];
    forecast: AiDashboardCache["forecast"];
    insights: AiDashboardCache["insights"];
  }>
> {
  try {
    const session = await getSessionData(brandSlug);
    const branchIds = session.accessibleBranchIds;

    // Fetch all metrics in parallel
    const [revenue, margin, inventory, service, tech, cash, customers, branches, health] =
      await Promise.all([
        aiRepo.getRevenueMetrics(session.brandId, branchIds),
        aiRepo.getMarginMetrics(session.brandId, branchIds),
        aiRepo.getInventoryMetrics(session.brandId, branchIds),
        aiRepo.getServiceMetrics(session.brandId, branchIds),
        aiRepo.getTechnicianMetrics(session.brandId, branchIds),
        aiRepo.getCashMetrics(session.brandId, branchIds),
        aiRepo.getCustomerMetrics(session.brandId, branchIds),
        aiRepo.getBranchMetrics(session.brandId, branchIds),
        aiRepo.getBusinessHealth(session.brandId, branchIds),
      ]);

    const hasData = revenue.last30Days > 0 || service.totalActive > 0 || inventory.totalItems > 0;

    // Business Health
    const healthData = {
      score: health.score,
      trend: health.trend,
      trendValue:
        health.trend === "up"
          ? `+${revenue.trend}% this week`
          : health.trend === "down"
            ? `${revenue.trend}% this week`
            : "Stable",
      contributors: health.contributors,
    };

    // Briefing
    const briefingData = {
      userName: "User",
      summary: [
        {
          icon: "trending-up",
          text: revenue.today > 0
            ? `Revenue today Rp ${(revenue.today / 1000).toFixed(0)}K`
            : "No revenue today yet",
          positive: revenue.trend >= 0,
        },
        {
          icon: "clock",
          text: `${service.overdueSla} service${service.overdueSla !== 1 ? "s" : ""} overdue`,
          positive: service.overdueSla === 0,
        },
        {
          icon: "package",
          text:
            inventory.belowMinCount > 0
              ? `${inventory.belowMinCount} item${inventory.belowMinCount !== 1 ? "s" : ""} below min stock`
              : "All stock levels healthy",
          positive: inventory.belowMinCount === 0,
        },
        {
          icon: "trending-down",
          text: margin.marginPercent > 0
              ? `Margin ${margin.marginPercent}%`
              : "Margin data pending",
          positive: margin.marginPercent > 20,
        },
        {
          icon: "check-circle",
          text: cash.hasOpenShift
              ? "Cash drawer active"
              : "Store closed — no active shift",
          positive: cash.hasOpenShift,
        },
      ],
      revenueChange: revenue.trend,
      overdueServices: service.overdueSla,
      stockAlert:
        inventory.belowMinCount > 0
          ? `${inventory.belowMinCount} item${inventory.belowMinCount !== 1 ? "s" : ""} below minimum stock`
          : "All stock levels adequate",
      marginNote: `Margin ${margin.marginPercent}% (${margin.revenue > 0 ? "based on last 30 days" : "no data"})`,
      cashBalanced: cash.hasOpenShift && cash.cashDifference === 0,
    };

    // Scoreboard (6 items)
    const scoreboardData = [
      {
        label: "Revenue",
        value: `Rp ${(revenue.last30Days / 1000).toFixed(0)}K`,
        trend: revenue.trend > 5 ? "up" as const : revenue.trend < -5 ? "down" as const : "stable" as const,
        trendValue: `${revenue.trend >= 0 ? "+" : ""}${revenue.trend}%`,
        sparklineData: [revenue.last7Days, revenue.last30Days],
        insight: margin.revenue > 0 ? `Margin ${margin.marginPercent}%` : "No data",
        detailLabel: "vs last period",
      },
      {
        label: "Margin",
        value: `${margin.marginPercent}%`,
        trend: margin.marginPercent > 30 ? "up" as const : margin.marginPercent > 15 ? "stable" as const : "down" as const,
        trendValue: `${margin.marginPercent}%`,
        sparklineData: [],
        insight: inventory.totalItems > 0 ? `${inventory.totalItems} items tracked` : "No items",
        detailLabel: "profit margin",
      },
      {
        label: "Inventory",
        value: `${inventory.healthPercent}%`,
        trend: inventory.healthPercent >= 80 ? "up" as const : inventory.healthPercent >= 50 ? "stable" as const : "down" as const,
        trendValue: `${inventory.belowMinCount} below min`,
        sparklineData: [],
        insight: inventory.belowMinCount > 0 ? `${inventory.belowMinCount} items below min stock` : "All healthy",
        detailLabel: "health score",
      },
      {
        label: "Technicians",
        value: `${tech.totalTechnicians > 0 ? Math.round((1 - tech.pendingWorkload / (tech.totalTechnicians * 10)) * 100) : 0}%`,
        trend: tech.pendingWorkload > 0 ? "stable" as const : "up" as const,
        trendValue: `${tech.pendingWorkload} pending`,
        sparklineData: [],
        insight: tech.leaderboard[0] ? `${tech.leaderboard[0].name}: ${tech.leaderboard[0].completedCount} done` : "No data",
        detailLabel: "utilization",
      },
      {
        label: "SLA",
        value: service.overdueSla > 0
          ? `${Math.max(0, 100 - service.overdueSla * 5)}%`
          : "100%",
        trend: service.overdueSla > 0 ? "down" as const : "up" as const,
        trendValue: service.overdueSla > 0 ? `-${service.overdueSla} overdue` : "0 overdue",
        sparklineData: [],
        insight: `${service.pending + service.inProgress} active services`,
        detailLabel: "on-time rate",
      },
      {
        label: "Customer Sat.",
        value: customers.totalCustomers > 0
          ? `${((customers.returningCount / customers.totalCustomers) * 100).toFixed(0)}%`
          : "—",
        trend: customers.returningCount > customers.newCount ? "up" as const : "stable" as const,
        trendValue: `${customers.returningCount} returning`,
        sparklineData: [],
        insight: `${customers.inactive90d} inactive >90d`,
        detailLabel: "return rate",
      },
    ];

    // Alerts (triggered by real conditions)
    const alertsData: any[] = [];
    if (inventory.belowMinCount > 0) {
      alertsData.push({
        id: "alert-inv-1",
        type: "inventory",
        severity: inventory.belowMinCount > 5 ? "critical" : "warning",
        title: `${inventory.belowMinCount} item${inventory.belowMinCount !== 1 ? "s" : ""} below minimum stock`,
        description: `${inventory.outOfStockCount} item${inventory.outOfStockCount !== 1 ? "s are" : " is"} out of stock.`,
        detail: inventory.alerts.slice(0, 3).map((a) => `${a.itemName}: ${a.currentStock} left (min ${a.minStock})`).join("; "),
        actionLabel: "View Inventory",
        actionHref: "/panel/inventory-v4",
      });
    }
    if (service.overdueSla > 0) {
      alertsData.push({
        id: "alert-svc-1",
        type: "service",
        severity: service.overdueSla > 3 ? "warning" : "info",
        title: `${service.overdueSla} service${service.overdueSla !== 1 ? "s" : ""} overdue SLA`,
        description: `${service.pending} pending, ${service.inProgress} in progress.`,
        detail: `${service.readyPickup} service${service.readyPickup !== 1 ? "s are" : " is"} ready for pickup.`,
        actionLabel: "Open Services",
        actionHref: "/panel/services",
      });
    }
    if (tech.leaderboard.length > 0 && tech.pendingWorkload > tech.totalTechnicians * 3) {
      alertsData.push({
        id: "alert-tech-1",
        type: "technician",
        severity: "warning",
        title: `Technician workload: ${tech.pendingWorkload} pending`,
        description: `Avg ${(tech.pendingWorkload / tech.totalTechnicians).toFixed(1)} per technician.`,
        detail: tech.leaderboard.slice(0, 2).map((t) => `${t.name}: ${t.pendingCount} pending`).join("; "),
        actionLabel: "View Schedule",
        actionHref: "/panel/technician-performance",
      });
    }
    if (branches.branchCount > 1 && branches.topBranch && branches.worstBranch) {
      alertsData.push({
        id: "alert-branch-1",
        type: "finance",
        severity: "info",
        title: `Branch: ${branches.topBranch.name} leads, ${branches.worstBranch.name} lowest`,
        description: `Revenue range: Rp ${(branches.worstBranch.revenue / 1000).toFixed(0)}K – Rp ${(branches.topBranch.revenue / 1000).toFixed(0)}K`,
        detail: `${branches.branchCount} active branches.`,
        actionLabel: "View Branches",
        actionHref: "/panel/branches",
      });
    }

    // Recommendations (triggered by real conditions)
    const recsData: any[] = [];
    if (inventory.belowMinCount > 0) {
      recsData.push({
        id: "rec-inv-1",
        title: `Restock ${inventory.belowMinCount} low item${inventory.belowMinCount !== 1 ? "s" : ""}`,
        description: `${inventory.belowMinCount} item${inventory.belowMinCount !== 1 ? "s are" : " is"} below minimum stock level.`,
        expectedImpact: "high",
        confidence: 95,
        estimatedRevenueProtected: revenue.last30Days > 0 ? Math.round(revenue.last30Days * 0.1) : 0,
        actionLabel: "View Inventory",
        actionHref: "/panel/inventory-v4",
      });
    }
    if (tech.leaderboard.length > 0) {
      const maxPending = Math.max(...tech.leaderboard.map((t) => t.pendingCount));
      if (maxPending > 3) {
        const overloaded = tech.leaderboard.find((t) => t.pendingCount === maxPending);
        recsData.push({
          id: "rec-tech-1",
          title: overloaded ? `Redistribute ${overloaded.name}'s workload` : "Redistribute workload",
          description: `${overloaded?.name ?? "A technician"} has ${maxPending} pending services. Move some to available technicians.`,
          expectedImpact: "medium",
          confidence: 88,
          estimatedRevenueProtected: Math.round(revenue.last30Days * 0.05),
          actionLabel: "View Schedule",
          actionHref: "/panel/technician-performance",
        });
      }
    }
    if (margin.marginPercent < 20 && margin.marginPercent > 0) {
      recsData.push({
        id: "rec-fin-1",
        title: "Review costs — margin below 20%",
        description: `Current margin ${margin.marginPercent}%. COGS: Rp ${(margin.cogs / 1000).toFixed(0)}K, Expenses: Rp ${(margin.expenses / 1000).toFixed(0)}K.`,
        expectedImpact: "medium",
        confidence: 82,
        estimatedRevenueProtected: Math.round(margin.revenue * 0.05),
        actionLabel: "Open Finance",
        actionHref: "/panel/finance",
      });
    }

    // Forecast (simple based on last 7 day average)
    const dailyAvg = revenue.last7Days > 0 ? Math.round(revenue.last7Days / 7) : 0;
    const forecastData = {
      tomorrow: {
        value: dailyAvg > 0 ? dailyAvg : Math.round(revenue.last30Days / 30),
        confidence: dailyAvg > 0 ? 85 : 50,
      },
      next7Days: [] as any[],
      recommendations: [] as string[],
    };
    if (dailyAvg > 0) {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        forecastData.next7Days.push({
          date: d.toISOString().split("T")[0],
          value: Math.round(dailyAvg * (0.8 + Math.random() * 0.4)),
          label: dayNames[d.getDay()],
        });
      }
      forecastData.recommendations = [
        `Projected daily revenue: Rp ${(dailyAvg / 1000).toFixed(0)}K`,
        inventory.belowMinCount > 0 ? "Reorder low stock items before weekend" : "Stock levels adequate",
        "Monitor technician workload for efficient scheduling",
      ];
    }

    // Insights (real data with structured info)
    const insightsData: any[] = [];
    if (revenue.last30Days > 0) {
      insightsData.push({
        id: "insight-rev-1",
        title: `Revenue Rp ${(revenue.last30Days / 1000).toFixed(0)}K last 30 days`,
        summary: `Service revenue: Rp ${(revenue.serviceRevenue / 1000).toFixed(0)}K · POS revenue: Rp ${(revenue.posRevenue / 1000).toFixed(0)}K`,
        severity: "info",
        category: "Revenue",
        time: "Today",
        group: "today",
        read: false,
        rootCause: revenue.serviceRevenue > revenue.posRevenue ? "Service repairs are the primary revenue driver" : "POS sales contribute significantly to revenue",
        supportingMetrics: [
          `Today: Rp ${(revenue.today / 1000).toFixed(0)}K`,
          `Yesterday: Rp ${(revenue.yesterday / 1000).toFixed(0)}K`,
          `Last 7 days: Rp ${(revenue.last7Days / 1000).toFixed(0)}K`,
          `Last 30 days: Rp ${(revenue.last30Days / 1000).toFixed(0)}K`,
        ],
        recommendation: "Monitor daily revenue trends and adjust staffing accordingly.",
        confidence: 90,
        expectedImpact: "Regular monitoring",
        actions: [{ label: "Open Finance", href: "/panel/finance" }],
      });
    }
    if (inventory.belowMinCount > 0) {
      insightsData.push({
        id: "insight-inv-1",
        title: `${inventory.belowMinCount} item${inventory.belowMinCount !== 1 ? "s" : ""} below minimum stock`,
        summary: `${inventory.outOfStockCount} item${inventory.outOfStockCount !== 1 ? "s are" : " is"} out of stock.`,
        severity: inventory.belowMinCount > 3 ? "critical" : "warning",
        category: "Inventory",
        time: "Today",
        group: "today",
        read: false,
        rootCause: "Stock levels need attention",
        supportingMetrics: [
          `Below minimum: ${inventory.belowMinCount}`,
          `Out of stock: ${inventory.outOfStockCount}`,
          `Health score: ${inventory.healthPercent}%`,
        ],
        recommendation: "Review and reorder low stock items.",
        confidence: 92,
        expectedImpact: "Prevent stockouts",
        actions: [{ label: "Open Inventory", href: "/panel/inventory-v4" }],
      });
    }
    if (tech.leaderboard.length > 0) {
      const top = tech.leaderboard[0];
      insightsData.push({
        id: "insight-tech-1",
        title: `Technician leaderboard: ${top.name} leads with ${top.completedCount} completed`,
        summary: `${tech.totalTechnicians} technicians · Avg repair ${tech.avgRepairTimeHours}h · ${tech.pendingWorkload} pending total`,
        severity: "info",
        category: "Technician",
        time: "Today",
        group: "today",
        read: false,
        rootCause: "Technician performance varies",
        supportingMetrics: [
          `Top: ${tech.leaderboard[0]?.name} (${tech.leaderboard[0]?.completedCount})`,
          tech.leaderboard[1] ? `${tech.leaderboard[1]?.name} (${tech.leaderboard[1]?.completedCount})` : "",
          `Avg repair: ${tech.avgRepairTimeHours}h`,
          `Total pending: ${tech.pendingWorkload}`,
        ].filter(Boolean),
        recommendation: "Balance workload across available technicians.",
        confidence: 85,
        expectedImpact: "Improve throughput",
        actions: [{ label: "View Schedule", href: "/panel/technician-performance" }],
      });
    }
    if (branches.branchCount > 1) {
      insightsData.push({
        id: "insight-branch-1",
        title: `${branches.branchCount} active branches`,
        summary: branches.topBranch
          ? `Top: ${branches.topBranch.name} (Rp ${(branches.topBranch.revenue / 1000).toFixed(0)}K)`
          : "Branch data available",
        severity: "info",
        category: "Finance",
        time: "Today",
        group: "today",
        read: true,
        rootCause: "Branch performance varies by location and demand",
        supportingMetrics: branches.branches.slice(0, 3).map(
          (b) => `${b.name}: Rp ${(b.revenue / 1000).toFixed(0)}K`,
        ),
        recommendation: "Review top and bottom branch performance weekly.",
        confidence: 88,
        expectedImpact: "Branch optimization",
        actions: [{ label: "Open Branches", href: "/panel/branches" }],
      });
    }

    return successResult({
      hasData,
      health: hasData ? healthData : null,
      briefing: hasData ? briefingData : null,
      alerts: alertsData.length > 0 ? alertsData : null,
      recommendations: recsData.length > 0 ? recsData : null,
      scoreboard: hasData ? scoreboardData : null,
      forecast: hasData ? forecastData : null,
      insights: insightsData.length > 0 ? insightsData : null,
    });
  } catch (err: any) {
    console.error("[getAiOperationalDataAction]", err);
    return successResult({
      hasData: false,
      health: null,
      briefing: null,
      alerts: null,
      recommendations: null,
      scoreboard: null,
      forecast: null,
      insights: null,
    });
  }
}

/* ── Read cached insights ── */

export async function getAiDashboardCacheAction(
  brandSlug: string,
): Promise<ActionResult<AiDashboardCache>> {
  try {
    const session = await getSessionData(brandSlug);
    const cache = await getAllAiCache(session.brandId);

    return successResult({
      health: cache.health?.cacheData ?? null,
      briefing: cache.briefing?.cacheData ?? null,
      alerts: cache.alerts?.cacheData ?? null,
      recommendations: cache.recommendations?.cacheData ?? null,
      scoreboard: cache.scoreboard?.cacheData ?? null,
      forecast: cache.forecast?.cacheData ?? null,
      insights: cache.insights?.cacheData ?? null,
    });
  } catch (err: any) {
    console.error("[getAiDashboardCacheAction]", err);
    // Return empty cache on error — dashboard will use fallback
    return successResult({
      health: null,
      briefing: null,
      alerts: null,
      recommendations: null,
      scoreboard: null,
      forecast: null,
      insights: null,
    });
  }
}

/* ── Check if AI is configured ── */

export async function isAiConfiguredAction(
  brandSlug: string,
): Promise<ActionResult<boolean>> {
  try {
    const session = await getSessionData(brandSlug);
    const adminDb = createServiceRoleSupabaseClient();
    const settings = await getBrandSettings(adminDb as any, session.brandId);
    const config = getLlmConfig(settings);
    return successResult(!!config);
  } catch {
    return successResult(false);
  }
}
