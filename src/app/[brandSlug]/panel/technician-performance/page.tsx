"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  BarChart, ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  AlertTriangle, RefreshCw, Wrench, CheckCircle2, Clock,
  DollarSign, Users, Star, AlertCircle, User, Plus, Crown,
  TrendingUp, TrendingDown, Activity, ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card, CardContent,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ProcessTimelineEngine } from "@/components/matos-ui/process-timeline-engine";
import { ProgressOrbit } from "@/components/matos-ui/progress-orbit";
import {
  DetailPanel,
  DetailPanelHeader,
  DetailPanelContent,
  DetailPanelHighlight,
  DetailPanelRows,
  DetailPanelRow,
} from "@/components/matos-ui/detail-panel";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import {
  getTechnicianPerformanceAction,
  type TechPerfData, type TechnicianStat, type TrendDay,
  type TechPerfFilters, type PeriodFilter,
  type PerformanceScoreData, type TeamCapacityData,
  type ServiceDistributionData,
} from "@/server/actions/technician-performance.actions";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const PAGE_SIZE = 6;
const CARD_WIDTH = 340;

/* ── Helpers ── */

function formatCurrency(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

function compactCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000) return `Rp${(amount / 1_000).toFixed(0)}rb`;
  return `Rp${amount}`;
}

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.floor(hours)}j ${Math.round((hours % 1) * 60)}m`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "short" }).slice(0, 2);
}

function dayFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "TODAY", label: "Hari Ini" },
  { value: "7_DAYS", label: "7 Hari" },
  { value: "THIS_MONTH", label: "Bulan Ini" },
];

/* ── Mini sparkline (bars) ── */
function MiniSparkline({ data, height = 40 }: { data: TrendDay[]; height?: number }) {
  if (!data || data.length === 0) return <div className="h-10 flex items-center justify-center text-xs text-muted-foreground/60">—</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="completed" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}



/* ── Detail Modal ── */
function TechnicianDetailModal({
  tech, open, onOpenChange,
}: {
  tech: TechnicianStat | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!tech) return null;

  const pct = tech.totalAssigned > 0 ? Math.round((tech.completedCount / tech.totalAssigned) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto border-border p-0 gap-0 bg-transparent shadow-none">
        <DetailPanel className="w-full max-w-full border-0 shadow-none">
          <DetailPanelHeader>
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarImage src={tech.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">{getInitials(tech.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{tech.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {tech.branches.length > 0 ? tech.branches.join(", ") : "Semua cabang"}
                </p>
              </div>
            </div>
          </DetailPanelHeader>

          <DetailPanelContent className="space-y-4">
            {/* Highlights row */}
            <div className="grid grid-cols-2 gap-3">
              <DetailPanelHighlight
                label="Revenue"
                primary={formatCurrency(tech.revenue)}
              />
              <DetailPanelHighlight
                label="Selesai"
                primary={String(tech.completedCount)}
              />
              <DetailPanelHighlight
                label="Aktif"
                primary={String(tech.activeCount)}
              />
              <DetailPanelHighlight
                label="Rata-rata Durasi"
                primary={formatHours(tech.avgDurationHours)}
              />
            </div>

            {/* Detail rows */}
            <DetailPanelRows>
              <DetailPanelRow
                icon={<CheckCircle2 className="size-3.5" />}
                label="Servis Ditugaskan"
                value={String(tech.totalAssigned)}
              />
              <DetailPanelRow
                icon={<CheckCircle2 className="size-3.5" />}
                label="Servis Selesai"
                value={String(tech.completedCount)}
              />
              <DetailPanelRow
                icon={<Clock className="size-3.5" />}
                label="Servis Aktif"
                value={String(tech.activeCount)}
              />
              <DetailPanelRow
                icon={<DollarSign className="size-3.5" />}
                label="Total Revenue"
                value={formatCurrency(tech.revenue)}
              />
              <DetailPanelRow
                icon={<Clock className="size-3.5" />}
                label="Rata-rata Durasi"
                value={formatHours(tech.avgDurationHours)}
              />
            </DetailPanelRows>

            {/* Progress Timeline */}
            <ProcessTimelineEngine
              items={[
                {
                  id: "assigned",
                  title: "Total Ditugaskan",
                  description: `${tech.totalAssigned} servis`,
                  status: "complete",
                  badge: "Ditugaskan",
                  progress: pct,
                },
              ]}
              title={`${tech.completedCount}/${tech.totalAssigned} selesai`}
              size="sm"
              className="max-w-full"
            />
          </DetailPanelContent>

          {/* 7-day trend */}
          <div className="px-5 py-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
              Tren 7 Hari Terakhir
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={tech.weeklyTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={dayLabel} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)", background: "var(--popover)" }}
                  formatter={(value: any) => [`${value} servis`, "Selesai"]}
                  labelFormatter={dayFull}
                />
                <Bar dataKey="completed" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DetailPanel>
      </DialogContent>
    </Dialog>
  );
}

/* ── Technician Card Wrapper ── */
function MiniProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const SEGMENTS = 24;
  const filled = Math.round((pct / 100) * SEGMENTS);
  return (
    <div className="flex items-center gap-2">
      <div className="grid flex-1 grid-cols-[repeat(24,minmax(2px,1fr))] items-center gap-px rounded-md px-1 ring-1 ring-inset ring-border bg-muted/30">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={`h-4 rounded-[2px] transition-all ${
              i < filled
                ? "bg-primary"
                : "bg-zinc-200 dark:bg-[#2f2f2f]"
            }`}
          />
        ))}
      </div>
      <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
        {value}/{max}
      </span>
    </div>
  );
}

const trendChartConfig = {
  completed: {
    label: "Selesai",
    color: "var(--primary)",
  },
};

/* ── Left Summary Panel ── */
function TeamSummaryPanel({ data }: { data: TechPerfData }) {
  const s = data.teamSummary;
  const total = s.totalCompleted + s.totalActive;
  const pct = Math.round(s.completionRate * 100);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollFade, setScrollFade] = React.useState({ top: false, bottom: true });

  const updateScrollFade = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atTop = el.scrollTop <= 4;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setScrollFade({ top: !atTop, bottom: !atBottom });
  }, []);

  React.useEffect(() => {
    updateScrollFade();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollFade);
    observer.observe(el);
    return () => observer.disconnect();
  }, [data, updateScrollFade]);

  return (
    <Card className="flex h-full border-border/70 bg-card shadow-sm">
      <div className="relative flex flex-1 flex-col min-h-0">
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-card/95 to-transparent transition-opacity duration-200 ${
            scrollFade.top ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          ref={scrollRef}
          onScroll={updateScrollFade}
          className="no-scrollbar flex-1 overflow-y-auto"
        >
          <CardContent className="flex flex-col gap-5 p-5">
            {/* ═══ 1. Team Summary ═══ */}
            <div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Teknisi
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.technicians.length} teknisi aktif
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue periode ini</p>
                <p className="text-3xl font-bold text-primary leading-tight tabular-nums">
                  {formatCurrency(s.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Servis selesai</p>
                <p className="text-3xl font-bold text-emerald-600 leading-tight tabular-nums dark:text-emerald-400">
                  {s.totalCompleted}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.totalActive} aktif · {s.totalUnassigned} belum ditugaskan
                </p>
              </div>
            </div>

            <ProcessTimelineEngine
              items={[
                {
                  id: "intake",
                  title: "Total Servis",
                  description: `${total} servis`,
                  status: "complete",
                  badge: "Masuk",
                  progress: pct,
                },
              ]}
              title="Tingkat Penyelesaian"
              subtitle={`${s.totalCompleted} dari ${total} servis`}
              size="sm"
            />

            <div className="border-t border-border" />

            {/* ═══ 2. Team Performance Score ═══ */}
            <TeamScoreSection score={data.performanceScore} />

            <div className="border-t border-border" />

            {/* ═══ 3. Team Capacity ═══ */}
            <TeamCapacitySection capacity={data.teamCapacity} />

            <div className="border-t border-border" />

            {/* ═══ 4. Service Distribution ═══ */}
            <ServiceDistributionSection distribution={data.serviceDistribution} />

            {/* ═══ 5. Weekly Trend ═══ */}
            <div className="-mx-5 border-t border-border/60 bg-muted/20 px-3 pb-1">
              <TrendSection data={data} />
            </div>
          </CardContent>
        </div>
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-gradient-to-t from-card/95 to-transparent transition-opacity duration-200 ${
            scrollFade.bottom ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </Card>
  );
}

/* ── Helper: score label ── */
function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Baik";
  if (score >= 60) return "Cukup";
  if (score >= 40) return "Kurang";
  return "Rendah";
}

/* ── 2. Team Performance Score ── */
function TeamScoreSection({ score }: { score: PerformanceScoreData }) {
  const diff = score.previousScore !== null ? score.score - score.previousScore : null;
  const tone = score.score >= 75 ? "primary" : score.score >= 50 ? "neutral" : "destructive";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Performance Score
      </h3>
      <ProgressOrbit
        value={score.score}
        label={scoreLabel(score.score)}
        description="Performa tim teknisi"
        tone={tone}
        icon={<Star className="size-3.5" />}
        size="sm"
        className="max-w-full"
        footer={
          diff !== null ? (
            <span className={diff >= 0 ? "text-emerald-500" : "text-rose-500"}>
              {diff >= 0 ? "↑" : "↓"} {Math.abs(diff)} poin dibanding periode sebelumnya
            </span>
          ) : undefined
        }
      />
      <div className="grid grid-cols-3 gap-2">
        <MetricChip label="Quality" value={score.quality} />
        <MetricChip label="SLA" value={score.sla} />
        <MetricChip label="Utilization" value={score.utilization} />
      </div>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums mt-0.5">{value}%</p>
    </div>
  );
}

/* ── 3. Team Capacity ── */
function TeamCapacitySection({ capacity }: { capacity: TeamCapacityData }) {
  const pct = capacity.capacityPercentage;
  const barColor =
    pct <= 60 ? "bg-emerald-500" :
    pct <= 80 ? "bg-amber-500" :
    pct <= 95 ? "bg-orange-500" :
    "bg-red-500";

  const insight =
    pct <= 60 ? "Capacity is healthy." :
    pct <= 80 ? "Kapasitas mulai terpakai." :
    pct <= 95 ? "Team mendekati kapasitas maksimum." :
    "Team berada di kapasitas maksimum.";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Activity className="h-4 w-4 text-primary" />
        Team Capacity
      </h3>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold tabular-nums">{pct}%</span>
        <span className="text-xs text-muted-foreground">
          {capacity.activeService} / {capacity.maxCapacity} job
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sibuk</p>
          <p className="text-lg font-semibold tabular-nums">{capacity.busyTechnicians}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Available</p>
          <p className="text-lg font-semibold tabular-nums">{capacity.availableTechnicians}</p>
        </div>
      </div>

      <p className="text-[11px] leading-4 text-muted-foreground">{insight}</p>
    </div>
  );
}

/* ── 4. Service Distribution ── */
const DISTRIBUTION_STATUSES: { key: keyof ServiceDistributionData; label: string; color: string }[] = [
  { key: "masuk", label: "Masuk", color: "bg-sky-500" },
  { key: "diagnosa", label: "Diagnosa", color: "bg-violet-500" },
  { key: "repair", label: "Repair", color: "bg-amber-500" },
  { key: "qc", label: "QC", color: "bg-emerald-500" },
  { key: "pickup", label: "Pickup", color: "bg-blue-500" },
];

function ServiceDistributionSection({ distribution }: { distribution: ServiceDistributionData }) {
  const total = distribution.total;

  const largest = total > 0
    ? DISTRIBUTION_STATUSES.reduce((max, s) =>
        distribution[s.key] > distribution[max.key] ? s : max,
      )
    : null;

  const bottleneck = total > 0 && largest && distribution[largest.key] > 0
    ? { status: largest, pct: Math.round((distribution[largest.key] / total) * 100) }
    : null;

  if (total === 0) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Service Distribution
          </h3>
          <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada servis aktif.</p>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Service Distribution
        </h3>

        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {DISTRIBUTION_STATUSES.map((status) => {
            const count = distribution[status.key];
            const pct = total > 0 ? (count / total) * 100 : 0;
            if (count === 0) return null;
            return (
              <UITooltip key={status.key}>
                <TooltipTrigger asChild>
                  <div
                    className={`${status.color} cursor-pointer transition-opacity hover:opacity-80 first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${pct}%` }}
                    aria-label={`${status.label}: ${count} servis`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" align="center" className="text-xs">
                  <p className="font-medium">{status.label}</p>
                  <p className="text-muted-foreground">{count} servis</p>
                </TooltipContent>
              </UITooltip>
            );
          })}
        </div>

        <div className="space-y-1.5">
          {DISTRIBUTION_STATUSES.map((status) => {
            const count = distribution[status.key];
            return (
              <div
                key={status.key}
                className="flex items-center gap-2.5 text-sm group cursor-pointer rounded-md px-2 py-1 transition-colors hover:bg-muted/50"
                role="button"
                tabIndex={0}
                aria-label={`Filter by ${status.label}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${status.color}`} />
                <span className="flex-1 text-muted-foreground">{status.label}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2.5 text-sm border-t border-border/60 pt-1.5 mt-1.5">
            <span className="flex-1 text-xs font-medium text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums">{total}</span>
          </div>
        </div>

        {bottleneck && bottleneck.pct > 30 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            <div>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Bottleneck &mdash; {bottleneck.status.label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {distribution[bottleneck.status.key]} servis ({bottleneck.pct}% dari beban aktif).
              </p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/* ── Trending Section ── */
function TrendSection({ data }: { data: TechPerfData }) {
  const trendPct = React.useMemo(() => {
    const d = data.trendOverall;
    if (!d || d.length < 4) return 0;
    const mid = Math.floor(d.length / 2);
    const first = d.slice(0, mid).reduce((sum, x) => sum + x.completed, 0);
    const last = d.slice(mid).reduce((sum, x) => sum + x.completed, 0);
    return first ? Math.round(((last - first) / first) * 100) : 0;
  }, [data]);

  return (
    <div className="relative w-full">
      <div className="flex items-start justify-between px-2 pt-2.5">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-primary" />
            Trend Mingguan
          </span>
          <span className="text-[10px] text-muted-foreground">dalam 7 hari</span>
        </div>
        <Badge
          variant="outline"
          className={`gap-1 px-1.5 py-0 text-[10px] font-medium ${
            trendPct >= 0
              ? "text-emerald-500 border-emerald-500/30"
              : "text-rose-500 border-rose-500/30"
          }`}
        >
          {trendPct >= 0 ? (
            <TrendingUp className="size-3" />
          ) : (
            <TrendingDown className="size-3" />
          )}
          {trendPct >= 0 ? "+" : ""}
          {trendPct}%
        </Badge>
      </div>
      <div className="h-[100px]">
        <ChartContainer
          config={trendChartConfig}
          className="block h-full w-full aspect-auto"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data.trendOverall}
              margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis dataKey="date" hide />
              <YAxis yAxisId="area" hide />
              <YAxis
                yAxisId="bars"
                hide
                domain={[0, (dataMax: number) => Math.max(dataMax * 3, 10)]}
              />

              <ChartTooltip
                content={({ active, payload, label }) => {
                  const filtered = (payload ?? []).filter(
                    (p, i, arr) =>
                      p.dataKey === "completed" &&
                      arr.findIndex((x) => x.dataKey === "completed") === i,
                  );
                  return (
                    <ChartTooltipContent
                      active={active}
                      payload={filtered as never}
                      label={label}
                      labelFormatter={(value) =>
                        new Date(String(value)).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })
                      }
                    />
                  );
                }}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              />

              <Area
                yAxisId="area"
                type="monotone"
                dataKey="completed"
                stroke="var(--primary)"
                strokeWidth={1.5}
                fill="url(#fillCompleted)"
                dot={{ r: 2, strokeWidth: 0 }}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
              <Bar
                yAxisId="bars"
                dataKey="completed"
                fill="var(--primary)"
                fillOpacity={0.3}
                stroke="none"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-60" />
      </div>
      <div className="grid min-h-[calc(100svh-220px)] grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,2fr)]">
        <Card className="h-full min-h-[520px] border-border/70 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <div className="-m-3 flex h-full min-h-[520px] gap-4 overflow-visible p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-full shrink-0 border-border/70 shadow-sm" style={{ width: CARD_WIDTH, minWidth: CARD_WIDTH }}>
              <CardContent className="p-5 space-y-4">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Circular Load More button ── */
function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-center pl-1" style={{ minWidth: 100 }}>
      <Button
        variant="outline"
        size="icon"
        className="h-16 w-16 rounded-full border-2 border-border text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
        onClick={onClick}
        disabled={loading}
        aria-label="Muat teknisi lainnya"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

/* ── Main Page ── */
export default function TechnicianPerformancePage() {
  const params = useParams();
  const brandSlug = params?.brandSlug as string;
  const { userRole, branches } = useActiveBranch();
  const canView = can(userRole as any, PERMISSIONS.CUSTOMER_VIEW);

  const [data, setData] = useState<TechPerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<PeriodFilter>("THIS_MONTH");
  const [branchFilter, setBranchFilter] = useState<string>("**ALL_BRANCHES**");
  const [technicianFilter, setTechnicianFilter] = useState<string>("**ALL_TECHNICIANS**");
  const [detailTech, setDetailTech] = useState<TechnicianStat | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchData = React.useCallback(async () => {
    if (!brandSlug) return;
    setLoading(true);
    setError(null);
    setVisibleCount(PAGE_SIZE);
    try {
      const filters: TechPerfFilters = {
        period,
        branchId: branchFilter !== "**ALL_BRANCHES**" ? branchFilter : null,
        technicianProfileId: technicianFilter !== "**ALL_TECHNICIANS**" ? technicianFilter : null,
      };
      const result = await getTechnicianPerformanceAction(brandSlug, filters);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message ?? "Gagal memuat data.");
    }
    setLoading(false);
  }, [brandSlug, period, branchFilter, technicianFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const displayedTechnicians = useMemo(() => {
    if (!data) return [];
    let list = data.technicians;
    if (technicianFilter !== "**ALL_TECHNICIANS**") {
      list = list.filter((t) => t.profileId === technicianFilter);
    }
    return list.sort((a, b) => b.completedCount - a.completedCount);
  }, [data, technicianFilter]);

  const visibleTechnicians = useMemo(
    () => displayedTechnicians.slice(0, visibleCount),
    [displayedTechnicians, visibleCount],
  );

  const hasMore = visibleCount < displayedTechnicians.length;

  const handleLoadMore = React.useCallback(() => {
    setLoadingMore(true);
    setVisibleCount((prev) => prev + PAGE_SIZE);
    setTimeout(() => setLoadingMore(false), 300);
  }, []);

  const handleOpenDetail = React.useCallback((tech: TechnicianStat) => {
    setDetailTech(tech);
    setDetailOpen(true);
  }, []);

  const techOptions = useMemo(() => {
    if (!data) return [];
    return data.technicians.map((t) => ({ value: t.profileId, label: t.name }));
  }, [data]);

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
      <div className="flex min-h-full flex-1 flex-col gap-5">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performa Teknisi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pantau kinerja dan produktivitas teknisi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="**ALL_BRANCHES**">Semua Cabang</SelectItem>
              {(branches ?? []).map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data && data.technicians.length > 0 && (
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger className="w-[170px] h-9 text-sm">
                <SelectValue placeholder="Semua Teknisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="**ALL_TECHNICIANS**">Semua Teknisi</SelectItem>
                {techOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* ═══ Loading ═══ */}
      {loading && !data && <PageSkeleton />}

      {/* ═══ Error ═══ */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      

      {/* ═══ Board ═══ */}
      {data && !loading && (
        <div className="grid h-[calc(100svh-140px)] grid-cols-1 items-stretch gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          {/* Left summary column */}
          <TeamSummaryPanel data={data} />

          {/* Right: technician table */}
          
            {displayedTechnicians.length === 0 ? (
              <div className="flex min-h-[520px] flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
               {/* ═══ Empty Data ═══ */}
                {!loading && data && data.technicians.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Belum ada data teknisi</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      Tidak ada teknisi aktif ditemukan untuk periode ini.
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Muat Ulang
                    </Button>
                  </div>
                )}
                
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="w-10 text-xs">#</TableHead>
                      <TableHead className="text-xs">Teknisi</TableHead>
                      <TableHead className="text-xs">Cabang</TableHead>
                      <TableHead className="text-xs text-right">Selesai</TableHead>
                      <TableHead className="text-xs text-right">Aktif</TableHead>
                      <TableHead className="text-xs text-right">Durasi</TableHead>
                      <TableHead className="text-xs">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTechnicians.map((tech, idx) => {
                      const CROWN_COLORS = [
                        "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]",
                        "text-zinc-400 drop-shadow-[0_0_6px_rgba(161,161,170,0.5)]",
                        "text-amber-700 drop-shadow-[0_0_6px_rgba(180,83,9,0.5)]",
                      ];
                      return (
                        <TableRow
                          key={tech.profileId}
                          className="cursor-pointer"
                          onClick={() => handleOpenDetail(tech)}
                        >
                          <TableCell className="text-xs font-medium text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <Avatar className="size-8">
                                  <AvatarImage src={tech.avatarUrl ?? undefined} />
                                  <AvatarFallback className="text-xs">{getInitials(tech.name)}</AvatarFallback>
                                </Avatar>
                                {idx < 3 && (
                                  <Crown className={`absolute -right-1 -top-1 size-4 ${CROWN_COLORS[idx]}`} />
                                )}
                              </div>
                              <span className="text-sm font-medium">{tech.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {tech.branches.length > 0 ? tech.branches.join(", ") : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                            {tech.completedCount}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums">
                            {tech.activeCount}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {formatHours(tech.avgDurationHours)}
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <MiniProgressBar value={tech.completedCount} max={tech.totalAssigned} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {hasMore && (
                  <div className="flex justify-center border-t py-3">
                    <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
                      {loadingMore ? "Memuat..." : "Muat lebih banyak"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
      
      )}

      {/* ═══ Detail Modal ═══ */}
      <TechnicianDetailModal
        tech={detailTech}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
