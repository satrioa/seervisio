"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Smartphone,
  Wrench,
  CheckCircle2,
  ClipboardList,
  Plus,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  getServiceOverviewV2Action,
  getServiceDetailAction,
} from "@/server/actions/service.actions";

const trendChartConfig = {
  masuk: {
    label: "Masuk",
    color: "var(--muted-foreground)",
  },
  selesai: {
    label: "Selesai",
    color: "var(--foreground)",
  },
};

import type {
  OverviewV2Data,
  OverviewActionRequiredItem,
  OverviewPickupQueueItem,
} from "@/server/actions/service.actions";
import { ActionRequiredCard } from "./service-overview-action-card";
import { PickupQueueCard } from "./service-overview-pickup-card";

export function ServiceSidebarOverview() {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId } = useActiveBranch();
  const { showDetail, openCreateService } = useRightSidebar();
  const [data, setData] = React.useState<OverviewV2Data | null>(null);
  const [loading, setLoading] = React.useState(true);

  const chartData = React.useMemo(() => {
    const real = data?.trend14Days;
    if (real && real.length > 0) {
      return real.map((d) => ({
        date: d.date,
        masuk: d.masuk,
        selesai: d.selesai,
      }));
    }
    return [];
  }, [data]);

  const trendPct = React.useMemo(() => {
    const last7 = chartData.slice(-7).reduce((s, x) => s + x.masuk, 0);
    const prev7 = chartData.slice(-14, -7).reduce((s, x) => s + x.masuk, 0);
    return prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;
  }, [chartData]);

  React.useEffect(() => {
    setLoading(true);
    getServiceOverviewV2Action(brandSlug, activeBranchId).then((result) => {
      if (result.success) setData(result.data);
      setLoading(false);
    });
  }, [brandSlug, activeBranchId]);

  const handleOpenService = React.useCallback(
    async (serviceId: string) => {
      const result = await getServiceDetailAction(brandSlug, serviceId);
      if (result.success) showDetail(result.data);
    },
    [brandSlug, showDetail],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
          <h3 className="truncate text-sm font-semibold">Overview Servis</h3>
        </div>
        <Button
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
          onClick={openCreateService}
          data-tour="new-service"
        >
          <Plus className="size-3.5" />
          Buat Servis Baru
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center py-12">
            <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="flex h-full items-center justify-center py-12 text-sm text-muted-foreground">
            Gagal memuat data
          </div>
        ) : (
          <div className="flex min-h-full flex-col gap-4 p-4">
            {/* ── KPI Stat Cards ── */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Smartphone className="size-3" />
                  Total Masuk
                </span>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {data.totalMasuk}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Wrench className="size-3" />
                  Dalam Perbaikan
                </span>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {data.dalamPerbaikan}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <ClipboardList className="size-3" />
                  QC
                </span>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {data.qc}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <CheckCircle2 className="size-3" />
                  Selesai Hari Ini
                </span>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {data.selesaiHariIni}
                </span>
              </div>
            </div>

            {/* ── Action Required ── */}
            {data.actionRequired.length > 0 && (
              <HorizSection
                title="Action Required"
                count={data.actionRequired.length}
                items={data.actionRequired}
                renderItem={(item) => (
                  <ActionRequiredCard item={item} onOpen={handleOpenService} />
                )}
              />
            )}

            {/* ── Pickup Queue ── */}
            {data.pickupQueue.length > 0 && (
              <HorizSection
                title="Pickup Queue"
                count={data.pickupQueue.length}
                items={data.pickupQueue}
                renderItem={(item) => (
                  <PickupQueueCard item={item} onOpen={handleOpenService} />
                )}
              />
            )}

            {/* When both are empty */}
            {data.actionRequired.length === 0 && data.pickupQueue.length === 0 && (
              <div className="rounded-lg bg-muted/50 px-4 py-8 text-center text-xs text-muted-foreground">
                Tidak ada item yang memerlukan perhatian saat ini.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trend Chart — only when data is loaded & trend data exists */}
      {!loading && data && chartData.length > 0 && (
        <div className="relative shrink-0 border-t bg-card">
        {/* Header: title + trend indicator */}
        <div className="flex items-start justify-between px-3 pt-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-foreground">Trend Servis</span>
            <span className="text-[10px] text-muted-foreground">dalam 14 hari</span>
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

        <div className="h-[120px]">
          <ChartContainer
            config={trendChartConfig}
            className="block h-full w-full aspect-auto"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis dataKey="date" hide />
                <defs>
                  <linearGradient id="fillMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-masuk)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-masuk)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-selesai)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-selesai)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* Area axis: full scale so areas are tall */}
                <YAxis yAxisId="area" hide />
                {/* Bar axis: inflated so bars stay short (on top) */}
                <YAxis
                  yAxisId="bars"
                  hide
                  domain={[0, (dataMax: number) => Math.max(dataMax * 3, 10)]}
                />

                <ChartTooltip
                  content={({ active, payload, label }) => {
                    const filtered = (payload ?? []).filter(
                      (p, i, arr) =>
                        (p.dataKey === "masuk" || p.dataKey === "selesai") &&
                        arr.findIndex((x) => x.dataKey === p.dataKey) === i,
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

                {/* Two area series (Masuk & Selesai) with downward gradient — behind */}
                <Area
                  yAxisId="area"
                  type="monotone"
                  dataKey="masuk"
                  stroke="var(--color-masuk)"
                  strokeWidth={1.5}
                  fill="url(#fillMasuk)"
                  dot={{ r: 2, strokeWidth: 0 }}
                  activeDot={{ r: 3 }}
                  isAnimationActive={false}
                />
                <Area
                  yAxisId="area"
                  type="monotone"
                  dataKey="selesai"
                  stroke="var(--color-selesai)"
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                  fill="url(#fillSelesai)"
                  dot={{ r: 2, strokeWidth: 0 }}
                  activeDot={{ r: 3 }}
                  isAnimationActive={false}
                />

                {/* Short, greyed-out stacked bars — on top (z-index) */}
                <Bar
                  yAxisId="bars"
                  dataKey="masuk"
                  stackId="a"
                  fill="var(--color-masuk)"
                  fillOpacity={0.3}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Bar
                  yAxisId="bars"
                  dataKey="selesai"
                  stackId="a"
                  fill="var(--color-selesai)"
                  fillOpacity={0.3}
                  stroke="none"
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>
    )}
    </div>
  );
}

/* ─── Horizontal scrollable section ─── */

function HorizSection<T extends OverviewActionRequiredItem | OverviewPickupQueueItem>({
  title,
  count,
  items,
  renderItem,
}: {
  title: string;
  count: number;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground/50">{count}</span>
        <div className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground/50">
          <span>Swipe</span>
          <ChevronRight className="size-3" />
        </div>
      </div>
      <div className="hide-scrollbar flex gap-2.5 overflow-x-auto pb-1">
        {items.map((item) => (
          <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>
        ))}
      </div>
    </div>
  );
}
