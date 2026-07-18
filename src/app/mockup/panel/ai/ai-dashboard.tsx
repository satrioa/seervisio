"use client";

import * as React from "react";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  Settings,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { BusinessHealthCard } from "./components/business-health-card";
import { TodayBriefingCard } from "./components/today-briefing";
import { PriorityAlerts } from "./components/priority-alerts";
import { Recommendations } from "./components/recommendation-card";
import { OperationalScoreboard } from "./components/operational-scoreboard";
import { ForecastPanel } from "./components/forecast-panel";
import { InsightFeed } from "./components/insight-feed";
import { InsightDetailSheet } from "./components/insight-detail-sheet";
import { AiCommandPalette } from "./components/ai-command-palette";
import {
  getAiOperationalDataAction,
  isAiConfiguredAction,
} from "@/server/actions/ai-insight.actions";
import type { Insight, BusinessHealth, TodayBriefing, PriorityAlert, Recommendation, ScoreboardItem, Forecast } from "./components/mock-data";

interface AiDashboardProps {
  brandSlug: string;
}

export function AiDashboard({ brandSlug }: AiDashboardProps) {
  const [selectedInsight, setSelectedInsight] = React.useState<Insight | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [hasData, setHasData] = React.useState(false);
  const [healthData, setHealthData] = React.useState<BusinessHealth | null>(null);
  const [briefingData, setBriefingData] = React.useState<TodayBriefing | null>(null);
  const [alertsData, setAlertsData] = React.useState<PriorityAlert[]>([]);
  const [recsData, setRecsData] = React.useState<Recommendation[]>([]);
  const [scoreboardData, setScoreboardData] = React.useState<ScoreboardItem[]>([]);
  const [forecastData, setForecastData] = React.useState<Forecast | null>(null);
  const [insightsData, setInsightsData] = React.useState<Insight[]>([]);

  /* ── Load operational data ── */
  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAiOperationalDataAction(brandSlug);
      if (result.success && result.data) {
        const d = result.data;
        setHasData(d.hasData);
        setHealthData(d.health as BusinessHealth | null);
        setBriefingData(d.briefing as TodayBriefing | null);
        setAlertsData((d.alerts ?? []) as PriorityAlert[]);
        setRecsData((d.recommendations ?? []) as Recommendation[]);
        setScoreboardData((d.scoreboard ?? []) as ScoreboardItem[]);
        setForecastData(d.forecast as Forecast | null);
        setInsightsData((d.insights ?? []) as Insight[]);
      } else {
        setHasData(false);
      }
    } catch (err: any) {
      console.error("[AiDashboard] error:", err);
      setError(err.message ?? "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [brandSlug]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInsightClick = React.useCallback((insight: Insight) => {
    setSelectedInsight(insight);
    setSheetOpen(true);
  }, []);

  const handleRefresh = React.useCallback(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-5 pb-12">
        <PageHeader
          title="AI Command Center"
          breadcrumbs={[
            { label: "Panel", href: `/${brandSlug}/panel` },
            { label: "AI Command Center" },
          ]}
        />
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-5 pb-12">
        <PageHeader
          title="AI Command Center"
          breadcrumbs={[
            { label: "Panel", href: `/${brandSlug}/panel` },
            { label: "AI Command Center" },
          ]}
        />
        <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <Sparkles className="size-10 text-muted-foreground/40" />
            <h3 className="text-base font-semibold">Belum ada data operasional</h3>
            <p className="text-sm text-muted-foreground">
              Mulai buka shift, catat servis, dan kelola inventaris untuk melihat
              dashboard AI Command Center.
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="size-3.5 mr-1.5" />
              Muat Ulang
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="AI Command Center"
        breadcrumbs={[
          { label: "Panel", href: `/${brandSlug}/panel` },
          { label: "AI Command Center" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-full px-3 text-[11px] font-medium"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-500">
              <Sparkles className="size-3.5" />
              Live Data
            </div>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Business Health — Hero card */}
      {healthData && (
        <BusinessHealthCard
          data={healthData}
          onDetail={() => {}}
        />
      )}

      {/* Scoreboard */}
      <OperationalScoreboard items={scoreboardData} />

      {/* Two column: Left (alerts) | Right (briefing + forecast) */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <PriorityAlerts alerts={alertsData} />
        </div>
        <div className="space-y-5">
          {briefingData && <TodayBriefingCard data={briefingData} />}
          {forecastData && <ForecastPanel data={forecastData} />}
        </div>
      </div>

      {/* Recommendations + Insight Feed */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Recommendations recommendations={recsData} />
        <InsightFeed insights={insightsData} onInsightClick={handleInsightClick} />
      </div>

      {/* Insight Detail Sheet */}
      <InsightDetailSheet
        insight={selectedInsight}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Floating Command Palette */}
      <AiCommandPalette brandSlug={brandSlug} />
    </div>
  );
}
