"use client";

import * as React from "react";
import {
  Wallet,
  Receipt,
  Activity,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { RevenueBreakdownCard } from "@/components/dashboard/revenue-breakdown-card";
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
  XAxis,
  YAxis,
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

export function FinanceOverviewTab({ data }: FinanceOverviewTabProps) {
  const cashFlowData = React.useMemo(() => {
    const trend = data?.revenueTrend ?? [];
    return trend.map((p) => ({
      period: p.label,
      cashIn: p.totalRevenue,
      cashOut: p.cashOut ?? 0,
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

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <RevenueBreakdownCard
          totalRevenue={data?.totalRevenue ?? 0}
          serviceRevenue={data?.serviceRevenue ?? 0}
          posRevenue={data?.posRevenue ?? 0}
          otherIncome={data?.otherIncome ?? 0}
        />
        <SummaryCard
          label="Cash In"
          value={formatRp(data?.cashIn ?? 0)}
          helper="uang masuk dari semua metode pembayaran"
          icon={Wallet}
        />
        <SummaryCard
          label="Cash Out"
          value={formatRp(data?.cashOut ?? 0)}
          helper="pengeluaran operasional dan stok"
          icon={Receipt}
        />
        <SummaryCard
          label="Net Cashflow"
          value={formatRp(data?.netCashflow ?? 0)}
          helper="cash in dikurangi cash out"
          icon={Activity}
        />
      </div>

      {/* ── Cash In vs Cash Out ── */}
      <Card className="shadow-xs">
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
            {data && data.netCashflow >= 0 ? "Cashflow positif" : "Belum ada data cashflow"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Menampilkan arus kas berdasarkan periode terpilih
          </p>
        </CardFooter>
      </Card>

      {/* ── Bottom Radar Charts ── */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Metode Pembayaran */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Metode Pembayaran</CardTitle>
            <CardDescription className="text-xs">
              Distribusi penerimaan berdasarkan metode pembayaran
            </CardDescription>
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
          <CardFooter className="flex flex-col items-start gap-0.5 border-t px-6 py-3">
            <p className="text-[11px] font-medium text-foreground">
              {hasPaymentData ? "Data pembayaran berdasarkan transaksi riil" : "Belum ada data pembayaran"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Data per metode pembayaran berdasarkan periode terpilih
            </p>
          </CardFooter>
        </Card>

        {/* Cash Out per Category */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Cash Out per Category</CardTitle>
            <CardDescription className="text-xs">
              Distribusi pengeluaran berdasarkan kategori
            </CardDescription>
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
          <CardFooter className="flex flex-col items-start gap-0.5 border-t px-6 py-3">
            <p className="text-[11px] font-medium text-foreground">
              {hasExpenseData ? "Pengeluaran berdasarkan data riil" : "Belum ada data pengeluaran"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Data per kategori pengeluaran berdasarkan periode terpilih
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
