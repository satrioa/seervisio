"use client";

import * as React from "react";
import {
  DollarSign,
  Activity,
  TrendingUp,
  Wrench,
  ShoppingCart,
  Package,
  Wallet,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PackageMinus,
  ShoppingCart as ShoppingCartIcon,
  Store,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { OperationalHourHeatmap } from "@/components/dashboard/operational-hour-heatmap";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
} from "recharts";
import type { ChartGranularity } from "@/lib/dashboard/chart-granularity";
import { calculateOperationalHealth, type OperationalHealthInput } from "@/lib/dashboard/operational-health-score";
import type {
  DashboardGeneral,
  RevenueTrendPoint,
  BranchRevenueTrendPoint,
  ActivityLogItem,
} from "@/server/actions/dashboard.actions";
import { Skeleton } from "@/components/ui/skeleton";
import { formatActivityEvent } from "@/components/dashboard/activity-formatter";

/* ── Helpers ── */

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function sevBadge(s: "high" | "medium" | "low") {
  switch (s) {
    case "high":
      return { variant: "destructive" as const, label: "High" };
    case "medium":
      return { variant: "default" as const, label: "Medium" };
    case "low":
      return { variant: "secondary" as const, label: "Low" };
  }
}

function statusBadge(s: string) {
  switch (s) {
    case "Sedang Berjalan":
      return { variant: "default" as const, dot: "bg-emerald-500" };
    case "Tutup toko":
      return { variant: "secondary" as const, dot: "bg-gray-400" };
    default:
      return { variant: "outline" as const, dot: "bg-amber-400" };
  }
}

/* ══════════════════════════════════════════════
   HELPER TYPES
   ══════════════════════════════════════════════ */

const ACTIVITY_TYPE_STYLES: Record<string, { icon: React.ElementType; marker: string; badge: string }> = {
  service_created: { icon: Wrench, marker: "bg-blue-500/10 text-blue-600 dark:text-blue-400", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  status_changed: { icon: RefreshCw, marker: "bg-violet-500/10 text-violet-600 dark:text-violet-400", badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  payment_received: { icon: Wallet, marker: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  stock_used: { icon: PackageMinus, marker: "bg-amber-500/10 text-amber-600 dark:text-amber-400", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  purchase_created: { icon: ShoppingCartIcon, marker: "bg-orange-500/10 text-orange-600 dark:text-orange-400", badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  shift_opened: { icon: Store, marker: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  shift_closed: { icon: CheckCircle2, marker: "bg-slate-500/10 text-slate-600 dark:text-slate-300", badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  note_added: { icon: MessageSquare, marker: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  service_cancelled: { icon: XCircle, marker: "bg-red-500/10 text-red-600 dark:text-red-400", badge: "bg-red-500/10 text-red-700 dark:text-red-300" },
  alert: { icon: AlertTriangle, marker: "bg-red-500/10 text-red-600 dark:text-red-400", badge: "bg-red-500/10 text-red-700 dark:text-red-300" },
};

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

interface GeneralOverviewTabProps {
  brandSlug: string;
  dateRange?: DateRange;
  granularity: ChartGranularity;
  data: DashboardGeneral | null;
  loading: boolean;
  error: string | null;
}

export function GeneralOverviewTab({ brandSlug, dateRange, granularity, data, loading, error }: GeneralOverviewTabProps) {
  /* ── Derive chart data from real props ── */
  const revenueData = React.useMemo(() => {
    if (!data?.revenueTrend) return [];
    return data.revenueTrend.map((p: RevenueTrendPoint) => ({
      label: p.label,
      revenue: p.totalRevenue,
    }));
  }, [data?.revenueTrend]);

  const branchData = React.useMemo(() => {
    if (!data?.branchRevenueTrend) return [];
    const dates = Array.from(new Set(data.branchRevenueTrend.map((p: BranchRevenueTrendPoint) => p.date))).sort();
    const branchIds = Array.from(new Map(data.branchRevenueTrend.map((p: BranchRevenueTrendPoint) => [p.branchId, p.branchName])).keys());
    return dates.map((d) => {
      const point: any = { label: new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) };
      for (const bid of branchIds) {
        const match = data.branchRevenueTrend.find((p: BranchRevenueTrendPoint) => p.date === d && p.branchId === bid);
        point[bid] = match?.totalRevenue ?? 0;
      }
      return point;
    });
  }, [data?.branchRevenueTrend]);

  const branchConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    const branchIds = Array.from(new Map(data?.branchRevenueTrend?.map((p: BranchRevenueTrendPoint) => [p.branchId, p.branchName]) ?? []).entries());
    branchIds.forEach(([bid, name], idx) => {
      config[bid] = { label: name, color: `hsl(var(--chart-${(idx % 8) + 1}))` };
    });
    return config;
  }, [data?.branchRevenueTrend]);

  const branchNames = React.useMemo(() => {
    const m = new Map(data?.branchRevenueTrend?.map((p: BranchRevenueTrendPoint) => [p.branchId, p.branchName]) ?? []);
    return m;
  }, [data?.branchRevenueTrend]);

  const dataKey = React.useMemo(() => "label", []);

  const descriptionText = React.useMemo(() => {
    switch (granularity) {
      case "hour": return "Revenue per jam hari ini";
      case "two-hour": return "Revenue per 2 jam hari ini";
      case "day": return "Revenue per hari";
      case "month": return "Revenue per bulan";
      case "year": return "Revenue per tahun";
    }
  }, [granularity]);

  /* ── Group activity log by day ── */
  const activityGroups = React.useMemo(() => {
    const groups: { label: string; items: ActivityLogItem[] }[] = [];
    const items = data?.recentActivity ?? [];
    if (items.length === 0) return groups;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const todayItems = items.filter((a) => {
      const itemDate = a.time ? new Date().toISOString().split("T")[0] : "";
      return itemDate === today || a.groupKey === "today";
    });
    const yesterdayItems = items.filter(() => false);

    if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems.slice(0, 20) });
    if (yesterdayItems.length > 0) groups.push({ label: "Yesterday", items: yesterdayItems.slice(0, 20) });
    if (groups.length === 0 && items.length > 0) {
      groups.push({ label: "Terbaru", items: items.slice(0, 20) });
    }
    return groups;
  }, [data?.recentActivity]);

  const [openActivityGroups, setOpenActivityGroups] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    setOpenActivityGroups((prev) => {
      const next = { ...prev };
      for (const g of activityGroups) {
        if (!(g.label in next)) next[g.label] = true;
      }
      return next;
    });
  }, [activityGroups]);

  const toggleActivityGroup = React.useCallback((label: string) => {
    setOpenActivityGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  }, []);

  /* ── Build Operational Health Score from real data ── */
  const activeShiftCount = data?.shiftStatuses?.filter((s) => s.status === "Sedang Berjalan").length ?? 0;
  const totalBranchCount = data?.shiftStatuses?.length ?? 0;
  const needActionsCount = data?.needActions?.length ?? 0;
  const qcCount = data?.needActions?.find((a) => a.label.includes("QC"))?.count ?? 0;
  const todayActivityTotal = data?.todayActivityCounts?.reduce((s, a) => s + a.count, 0) ?? 0;

  const calculatedTarget = React.useMemo(() => {
    if (data && data.revenueTarget > 0) return data.revenueTarget;
    if (!data) return 0;
    return data.netProfit > 0 ? data.revenue * 1.3 : data.revenue * 2;
  }, [data]);

  const healthInput = React.useMemo<OperationalHealthInput>(() => ({
    shift: {
      totalBranches: totalBranchCount || 1,
      openBranches: activeShiftCount,
      unclosedShifts: data?.unclosedShiftsCount ?? 0,
    },
    service: {
      totalActive: (data?.todayActivityCounts?.find((a) => a.label.includes("Servis"))?.count ?? 0),
      completedToday: data?.serviceCompletedToday ?? 0,
      needAttention: needActionsCount,
      overdueQc: qcCount,
      unpickedUnits: data?.unpickedUnitsCount ?? 0,
    },
    finance: {
      revenue: data?.revenue ?? 0,
      target: calculatedTarget,
      cashIn: data?.revenue ?? 0,
      cashOut: (data?.revenue ?? 0) - (data?.netProfit ?? 0),
      unpaidInvoices: data?.unpaidInvoicesCount ?? 0,
      cashDifference: 0,
    },
    inventory: {
      lowStockItems: data?.lowStockItemsCount ?? 0,
      outOfStockItems: data?.outOfStockItemsCount ?? 0,
      criticalFastMovingItems: 0,
    },
    branchActivity: {
      activeBranches: activeShiftCount,
      totalBranches: totalBranchCount || 1,
      totalActivities: todayActivityTotal,
    },
  }), [
    totalBranchCount,
    activeShiftCount,
    data?.unclosedShiftsCount,
    data?.todayActivityCounts,
    data?.serviceCompletedToday,
    needActionsCount,
    qcCount,
    data?.unpickedUnitsCount,
    data?.revenue,
    calculatedTarget,
    data?.netProfit,
    data?.unpaidInvoicesCount,
    data?.lowStockItemsCount,
    data?.outOfStockItemsCount,
    todayActivityTotal,
  ]);

  const healthResult = React.useMemo(
    () => calculateOperationalHealth(healthInput),
    [healthInput],
  );

  const netProfitMargin = (data?.revenue ?? 0) > 0
    ? (((data?.netProfit ?? 0) / (data?.revenue ?? 1)) * 100).toFixed(1)
    : "0.0";

  const todayActivityCounts = data?.todayActivityCounts ?? [];
  const needActions = data?.needActions ?? [];
  const shiftStatuses = data?.shiftStatuses ?? [];

  const renderLoading = () => (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      <AlertCircle className="size-5 shrink-0" />
      <div>
        <p className="font-medium">Gagal memuat data dashboard</p>
        <p className="text-xs opacity-80">{error || "Terjadi kesalahan saat mengambil data."}</p>
      </div>
    </div>
  );

  if (loading) return renderLoading();

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
      {/* ══ LEFT COLUMN ══ */}
      <div className="space-y-6">
        {error && renderError()}

        {/* ── Top Summary Cards ── */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <SummaryCard
            label="Revenue"
            value={formatRp(data?.revenue ?? 0)}
            helper={data && data.revenue > 0 ? `Laba bersih: ${formatRp(data.netProfit)}` : "Belum ada pemasukan"}
            icon={DollarSign}
          />
          <SummaryCard
            label="Total Aktivitas"
            value={String(data?.totalActivity ?? 0)}
            helper="servis, POS, dan mutasi"
            icon={Activity}
          />
          <SummaryCard
            label="Laba Bersih"
            value={formatRp(data?.netProfit ?? 0)}
            helper={`Margin ${netProfitMargin}%`}
            icon={TrendingUp}
          />
        </div>

        {/* ── Chart 1: Statistik Revenue ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Statistik Revenue</CardTitle>
            <CardDescription className="text-xs">{descriptionText}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="h-52 min-w-[450px] sm:min-w-0">
              {revenueData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Belum ada pemasukan pada periode ini.
                </div>
              ) : (
                <ChartContainer
                  config={{ revenue: { label: "Revenue", color: "hsl(var(--chart-1))" } }}
                  className="h-full w-full"
                >
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey={dataKey}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      interval={granularity === "day" ? 1 : 0}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent formatter={(value) => formatRp(Number(value))} indicator="dot" />}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      fill="url(#revGrad)"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Chart 2: Statistik Revenue Tiap Cabang ── */}
        {branchData.length > 0 && branchNames.size > 0 && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Statistik Revenue Tiap Cabang</CardTitle>
            <CardDescription className="text-xs">Per cabang ({descriptionText.toLowerCase()})</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-2 sm:px-4">
            <div className="h-[220px] min-w-[500px] sm:min-w-0">
              <ChartContainer config={branchConfig} className="h-full w-full">
                <AreaChart data={branchData}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey={dataKey}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval={granularity === "day" ? 1 : 0}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={(value) => formatRp(Number(value))} indicator="dot" />}
                  />
                  {Array.from(branchNames.keys()).map((bid, index) => (
                    <Area
                      key={bid}
                      dataKey={bid}
                      type="natural"
                      fill={`hsl(var(--chart-${(index % 8) + 1}))`}
                      fillOpacity={0.02}
                      stroke={`hsl(var(--chart-${(index % 8) + 1}))`}
                      stackId="a"
                      strokeWidth={1.5}
                    />
                  ))}
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
        )}

        {/* ── Operational Health Score + Revenue vs Target ── */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {/* Operational Health Score */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Operational Health Score</CardTitle>
              <CardDescription className="text-xs">
                Ringkasan kesehatan operasional berdasarkan data terkini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Score + Badge */}
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold tabular-nums">{healthResult.score}</span>
                <span className="text-lg leading-none text-muted-foreground">/ 100</span>
                <Badge
                  variant={
                    healthResult.label === "Kritis"
                      ? "destructive"
                      : healthResult.label === "Perlu Perhatian"
                        ? "secondary"
                        : "default"
                  }
                  className="ml-auto"
                >
                  {healthResult.label}
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${healthResult.score}%`,
                    backgroundColor:
                      healthResult.score >= 85
                        ? "hsl(var(--chart-2))"
                        : healthResult.score >= 70
                          ? "hsl(var(--chart-1))"
                          : healthResult.score >= 50
                            ? "hsl(35, 92%, 50%)"
                            : "hsl(0, 84%, 60%)",
                  }}
                />
              </div>

              {/* Factors */}
              <div className="space-y-2 pt-1">
                {healthResult.factors.map((factor) => {
                  const Icon = factor.status === "good" ? CheckCircle2 : factor.status === "warning" ? AlertTriangle : XCircle;
                  const iconColor = factor.status === "good" ? "text-emerald-500" : factor.status === "warning" ? "text-amber-500" : "text-red-500";
                  return (
                    <div key={factor.label} className="flex items-center gap-2 text-xs text-foreground">
                      <Icon className={`size-3.5 shrink-0 ${iconColor}`} />
                      <span className="flex-1">{factor.message}</span>
                      <span className={`shrink-0 text-[10px] font-medium tabular-nums ${
                        factor.score >= 70 ? "text-emerald-600 dark:text-emerald-400"
                        : factor.score >= 40 ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                      }`}>
                        {factor.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Revenue vs Target */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Revenue vs Target</CardTitle>
              <CardDescription className="text-xs">
                Progress pencapaian target revenue pada periode terpilih.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data && data.revenue > 0 ? (() => {
                const target = calculatedTarget;
                const pct = target > 0 ? Math.min(Math.round((data.revenue / target) * 100), 100) : 0;
                const remaining = Math.max(target - data.revenue, 0);
                const daysInPeriod = dateRange?.from && dateRange?.to
                  ? Math.max(Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000), 1)
                  : 1;
                const dailyNeed = remaining > 0 ? Math.ceil(remaining / daysInPeriod) : 0;
                return (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-bold tabular-nums">{formatRp(data.revenue)}</span>
                      <span className="text-xs text-muted-foreground">dari target {formatRp(target)}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Sisa target</span>
                      <span className="font-medium tabular-nums">{formatRp(remaining)}</span>
                    </div>
                    {dailyNeed > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                        <TrendingUp className="size-3.5 shrink-0 text-emerald-500" />
                        <span className="text-muted-foreground">
                          Estimasi perlu <span className="font-medium text-foreground">{formatRp(dailyNeed)}</span> per hari
                        </span>
                      </div>
                    )}
                    {data.netProfit > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="size-3" />
                        Margin laba {netProfitMargin}%
                      </div>
                    )}
                  </>
                );
              })() : (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                  Belum ada pemasukan pada periode ini.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Operational Hour Heatmap ── */}
        <div className="flex flex-wrap gap-6">
          <div className="min-w-[280px] flex-1">
            <OperationalHourHeatmap dateRange={dateRange} hourlyData={data?.operationalHeatmap} />
          </div>
          <div className="min-w-[220px] flex-1">
            <Card className="shadow-xs h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Insight Lainnya</CardTitle>
                <CardDescription className="text-xs">Ringkasan tambahan akan tampil di sini.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                  Dalam pengembangan
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ══ RIGHT INSIGHT COLUMN ══ */}
      <div className="flex flex-col gap-6">
        {/* ── Activity Log ── */}
        <Card className="overflow-hidden shadow-xs">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Activity Log</CardTitle>
              <CardDescription className="text-xs">Riwayat aktivitas terbaru dari operasional toko.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="relative p-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-card to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-gradient-to-t from-card to-transparent" />
            <div className="max-h-[calc(100dvh-18rem)] space-y-3 overflow-y-auto px-5 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {activityGroups.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">Belum ada aktivitas pada periode ini.</p>
              ) : (
                activityGroups.map((group) => {
                  const isOpen = openActivityGroups[group.label] ?? true;
                  return (
                    <div key={group.label} className="space-y-2">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleActivityGroup(group.label)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg bg-muted/45 px-2 py-1.5 text-left transition-colors hover:bg-muted"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{group.label}</span>
                        <span className="ml-auto rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{group.items.length}</span>
                        <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="space-y-1">
                          {group.items.map((item, index) => {
                            const style = ACTIVITY_TYPE_STYLES[item.type] || ACTIVITY_TYPE_STYLES.alert;
                            const Icon = style.icon;
                            const isLast = index === group.items.length - 1;
                            const formatted = formatActivityEvent(item.type, item.details, item.targetLabel);
                            return (
                              <div key={item.id} className="group relative flex gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-muted/40">
                                <div className="relative flex shrink-0 justify-center">
                                  {!isLast && (
                                    <span className="absolute left-1/2 top-7 h-[calc(100%-1rem)] w-px -translate-x-1/2 bg-border" />
                                  )}
                                  <span className={`relative z-10 flex size-7 items-center justify-center rounded-full ${style.marker}`}>
                                    <Icon className="size-3.5" />
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 text-xs leading-relaxed text-foreground">
                                      <span className="font-semibold text-foreground">{item.user}</span>{" "}
                                      <span className="text-muted-foreground">{formatted.primaryText}</span>
                                    </p>
                                    <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">{item.time}</span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className={`h-5 rounded-full border-0 px-2 text-[10px] font-medium ${style.badge}`}>
                                      {item.tag}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground sm:hidden">{item.time}</span>
                                  </div>
                                  {formatted.secondaryText && formatted.secondaryText.length > 0 && (
                                    <div className="mt-1.5 space-y-0.5">
                                      {formatted.secondaryText.map((line, i) => (
                                        <p key={i} className="text-[10px] leading-relaxed text-muted-foreground/80 italic">{line}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Aktivitas Hari Ini ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Aktivitas Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayActivityCounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada aktivitas hari ini.</p>
            ) : (
              todayActivityCounts.map((act) => (
                <div key={act.label} className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{act.label}</span>
                  <Badge variant="secondary" className="h-5 min-w-[28px] justify-center rounded-full px-2 text-[10px] font-medium">
                    {act.count}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ── Butuh Tindakan ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Butuh Tindakan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {needActions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Semua dalam kondisi baik.</p>
            ) : (
              needActions.map((item) => {
                const b = sevBadge(item.severity);
                return (
                  <div key={item.label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground">{item.label}</span>
                    <Badge variant={b.variant} className="h-5 shrink-0 rounded-full px-2 text-[10px] font-normal">
                      {item.count} {b.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Shift Status ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Status Shift</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shiftStatuses.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada data shift.</p>
            ) : (
              shiftStatuses.map((s) => {
                const b = statusBadge(s.status);
                return (
                  <div key={s.branch} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`size-2 rounded-full ${b.dot}`} />
                      <span className="text-xs text-foreground">{s.branch}</span>
                    </div>
                    <Badge variant={b.variant} className="h-5 rounded-full px-2 text-[10px] font-normal">
                      {s.status}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
