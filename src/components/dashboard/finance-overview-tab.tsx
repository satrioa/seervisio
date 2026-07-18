"use client";

import * as React from "react";
import {
  Wallet,
  Receipt,
  Activity,
} from "lucide-react";
import { Area, ComposedChart, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SummaryCard } from "@/components/dashboard/summary-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  CartesianGrid,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  RadarChart,
} from "recharts";
import type { DashboardFinance } from "@/server/actions/dashboard.actions";

function formatRp(n: number) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

interface FinanceOverviewTabProps {
  data: DashboardFinance | null;
}

const defaultChartConfig = {
  cashIn: { label: "Cash In", color: "hsl(var(--chart-1))" },
  cashOut: { label: "Cash Out", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const BRANCH_COLORS = [
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-1))",
];

const RISK_ITEMS = [
  { key: "cashIn", label: "Cash In", getValue: (d: DashboardFinance) => d.cashIn, helper: "uang masuk dari semua metode pembayaran", icon: Wallet },
  { key: "cashOut", label: "Cash Out", getValue: (d: DashboardFinance) => d.cashOut, helper: "pengeluaran operasional dan stok", icon: Receipt },
  { key: "netCashflow", label: "Net Cashflow", getValue: (d: DashboardFinance) => d.netCashflow, helper: "cash in dikurangi cash out", icon: Activity },
] as const;

export function FinanceOverviewTab({ data }: FinanceOverviewTabProps) {
  const cashFlowData = React.useMemo(() => {
    const trend = data?.revenueTrend ?? [];
    return trend.map((p) => ({
      period: p.label,
      cashIn: p.totalRevenue,
      cashOut: p.cashOut ?? 0,
    }));
  }, [data?.revenueTrend]);

  const revenueSeries = React.useMemo(() => {
    const trend = data?.revenueTrend ?? [];
    return trend.map((p) => ({
      day: p.label,
      revenue: p.totalRevenue,
    }));
  }, [data?.revenueTrend]);

  const paymentMethodRadar = data?.paymentMethodRadar ?? [];
  const expenseCategoryRadar = data?.expenseCategoryRadar ?? [];

  const paymentChartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    const branchIds = data?.revenueTrend ? Array.from(new Set(data.revenueTrend.map(p => p.date))) : [];
    branchIds.forEach((_, idx) => {
      config[`br_${idx}`] = { label: "Revenue", color: BRANCH_COLORS[idx % BRANCH_COLORS.length] };
    });
    return config;
  }, [data?.revenueTrend]);

  const hasPaymentData = paymentMethodRadar.some(p => p.transactionCount > 0);
  const hasExpenseData = expenseCategoryRadar.some(e => e.amount > 0);

  const totalRevenue = data?.totalRevenue ?? 0;
  const serviceRevenue = data?.serviceRevenue ?? 0;
  const posRevenue = data?.posRevenue ?? 0;
  const otherIncome = data?.otherIncome ?? 0;

  const revenueSources = [
    { label: "Servis", value: serviceRevenue },
    { label: "Penjualan", value: posRevenue },
    { label: "Lainnya", value: otherIncome },
  ];

  const revValues = revenueSeries.map((p) => p.revenue);
  const minRev = Math.min(...revValues);
  const maxRev = Math.max(...revValues);
  const revMidpoint = (minRev + maxRev) / 2;
  const revHalfRange = Math.max((maxRev - minRev) * 1.6, 4500);

  const revenueChartConfig = {
    revenue: { label: "Pendapatan", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const prevRevenue = revenueSeries.length > 1 ? revenueSeries[0].revenue : 0;
  const growthPct = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const growthAmount = totalRevenue - prevRevenue;

  return (
    <div className="flex flex-col gap-4 **:data-[slot=card]:shadow-xs">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 space-y-2">
          <div>
            <div className="font-medium text-muted-foreground text-sm">Revenue</div>
            <div className="font-semibold text-3xl tabular-nums tracking-tight sm:text-4xl">
              {formatRp(totalRevenue)}
            </div>
          </div>
          {revenueSeries.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="tabular-nums">
                {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}%
              </Badge>
              <Badge variant="secondary" className="tabular-nums">
                {growthAmount >= 0 ? "+" : ""}{formatRp(growthAmount)}
              </Badge>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
            <span>Previous {formatRp(prevRevenue)}</span>
          </div>
          {revenueSeries.length > 0 && (
            <div>
              <ChartContainer config={revenueChartConfig} className="h-10 w-full rounded-md border">
                <ComposedChart data={revenueSeries} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={[revMidpoint - revHalfRange, revMidpoint + revHalfRange]} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Area
                    dataKey="revenue"
                    type="natural"
                    fill="var(--color-revenue)"
                    fillOpacity={0.14}
                    stroke="var(--color-revenue)"
                  />
                </ComposedChart>
              </ChartContainer>
              <span className="text-muted-foreground text-xs">Periode terpilih</span>
            </div>
          )}
        </div>
        <Card className="min-w-0 py-4 shadow-xs xl:col-span-2">
        <CardHeader className="px-4">
          <CardTitle>Risk summary</CardTitle>
          <CardDescription>Core risk signals vs previous period</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 xl:grid-cols-4">
          {RISK_ITEMS.map((item) => (
            <div key={item.key} className="min-w-0">
              <SummaryCard
                label={item.label}
                value={formatRp(data ? item.getValue(data) : 0)}
                helper={item.helper}
                icon={item.icon}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        {/* ── Left Column ── */}
        <div className="flex flex-col gap-4">
          {/* Cash In vs Cash Out — restored to previous style */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Cash In vs Cash Out</CardTitle>
              <CardDescription className="text-xs">
                Perbandingan arus kas masuk dan keluar berdasarkan periode terpilih
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="h-64 min-w-[450px] sm:min-w-0">
                {cashFlowData.length > 0 ? (
                  <ChartContainer config={defaultChartConfig} className="h-full w-full">
                    <BarChart data={cashFlowData} barGap={4}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                        content={<ChartTooltipContent formatter={(value: unknown) => formatRp(Number(value))} indicator="dot" />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="cashIn" fill="var(--color-cashIn)" radius={[3, 3, 0, 0]} barSize={20} />
                      <Bar dataKey="cashOut" fill="var(--color-cashOut)" radius={[3, 3, 0, 0]} barSize={20} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Belum ada data arus kas pada periode ini.
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-0.5 border-t px-6 py-3">
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {(data?.netCashflow ?? 0) >= 0 ? "Cashflow positif" : "Belum ada data cashflow"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Menampilkan arus kas berdasarkan periode terpilih
              </p>
            </CardFooter>
          </Card>

          {/* Radar Charts — 2-column grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Metode Pembayaran */}
            <Card>
              <CardHeader>
                <CardTitle>Metode Pembayaran</CardTitle>
                <CardDescription>Distribusi penerimaan berdasarkan metode pembayaran</CardDescription>
              </CardHeader>
              <CardContent>
                {hasPaymentData ? (
                  <ChartContainer config={paymentChartConfig} className="mx-auto h-60 w-full max-w-[320px]">
                    <RadarChart data={paymentMethodRadar}>
                      <PolarGrid radialLines={false} stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="method"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value: unknown) => formatRp(Number(value))} indicator="line" />}
                      />
                      <Radar
                        dataKey="netAmount"
                        fill={BRANCH_COLORS[0]}
                        fillOpacity={0.15}
                        stroke={BRANCH_COLORS[0]}
                        strokeWidth={1.5}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </RadarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-60 items-center justify-center text-xs text-muted-foreground">
                    Belum ada transaksi pada periode ini.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cash Out per Category */}
            <Card>
              <CardHeader>
                <CardTitle>Cash Out per Category</CardTitle>
                <CardDescription>Distribusi pengeluaran berdasarkan kategori</CardDescription>
              </CardHeader>
              <CardContent>
                {hasExpenseData ? (
                  <ChartContainer config={paymentChartConfig} className="mx-auto h-60 w-full max-w-[320px]">
                    <RadarChart data={expenseCategoryRadar}>
                      <PolarGrid radialLines={false} stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value: unknown) => formatRp(Number(value))} indicator="line" />}
                      />
                      <Radar
                        dataKey="amount"
                        fill={BRANCH_COLORS[1]}
                        fillOpacity={0.15}
                        stroke={BRANCH_COLORS[1]}
                        strokeWidth={1.5}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </RadarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-60 items-center justify-center text-xs text-muted-foreground">
                    Belum ada pengeluaran pada periode ini.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Right Column: Pendapatan — SummaryRow (template Analytics Overview) ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pendapatan</CardTitle>
            <CardDescription className="text-xs">Ringkasan pendapatan dengan breakdown per sumber</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Revenue — large number + badges + sparkline */}
            <div className="min-w-0 space-y-2">
              <div>
                <div className="font-medium text-muted-foreground text-sm">Revenue</div>
                <div className="font-semibold text-3xl tabular-nums tracking-tight sm:text-4xl">
                  {formatRp(totalRevenue)}
                </div>
              </div>

              {revenueSeries.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="tabular-nums">
                    {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}%
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {growthAmount >= 0 ? "+" : ""}{formatRp(growthAmount)}
                  </Badge>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                <span>Previous {formatRp(prevRevenue)}</span>
              </div>

              {revenueSeries.length > 0 && (
                <div>
                  <ChartContainer config={revenueChartConfig} className="h-10 w-full rounded-md border">
                    <ComposedChart data={revenueSeries} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                      <XAxis dataKey="day" hide />
                      <YAxis hide domain={[revMidpoint - revHalfRange, revMidpoint + revHalfRange]} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Area
                        dataKey="revenue"
                        type="natural"
                        fill="var(--color-revenue)"
                        fillOpacity={0.14}
                        stroke="var(--color-revenue)"
                      />
                    </ComposedChart>
                  </ChartContainer>
                  <span className="text-muted-foreground text-xs">Periode terpilih</span>
                </div>
              )}
            </div>

            {/* Revenue source breakdown — styled like Risk Summary metrics */}
            <div className="mt-4 space-y-3">
              <Separator />
              <p className="text-muted-foreground text-xs uppercase">Sumber Pendapatan</p>
              <div className="space-y-3">
                {revenueSources.map((src, i) => {
                  const pct = totalRevenue > 0 ? Math.round((src.value / totalRevenue) * 100) : 0;
                  const hue = 150 - i * 45;
                  return (
                    <div key={src.label} className="min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2.5 rounded-sm shrink-0" style={{ background: `oklch(55% 0.15 ${hue})` }} />
                          <span className="text-muted-foreground text-sm">{src.label}</span>
                        </div>
                        <span className="font-semibold text-lg tabular-nums leading-tight">{pct}%</span>
                      </div>
                      <p className="text-muted-foreground text-xs">{formatRp(src.value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
