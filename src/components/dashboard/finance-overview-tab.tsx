"use client";

import * as React from "react";
import {
  TrendingUp,
  Wallet,
  Receipt,
  Activity,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  XAxis,
  YAxis,
  RadarChart,
  Radar,
  PolarAngleAxis,
  PolarGrid,
} from "recharts";

/* ── Mock data ── */

const CASH_FLOW_DATA = [
  { period: "1 Jun", cashIn: 1200000, cashOut: 350000 },
  { period: "2 Jun", cashIn: 1450000, cashOut: 420000 },
  { period: "3 Jun", cashIn: 980000, cashOut: 260000 },
  { period: "4 Jun", cashIn: 1750000, cashOut: 510000 },
  { period: "5 Jun", cashIn: 1320000, cashOut: 300000 },
  { period: "6 Jun", cashIn: 2100000, cashOut: 620000 },
  { period: "7 Jun", cashIn: 1850000, cashOut: 480000 },
];

const PAYMENT_METHOD_DATA = [
  { method: "Cash", pusat: 600000, salatiga: 350000, sragen: 250000 },
  { method: "QRIS", pusat: 950000, salatiga: 500000, sragen: 350000 },
  { method: "Transfer", pusat: 500000, salatiga: 300000, sragen: 150000 },
  { method: "Debit", pusat: 250000, salatiga: 100000, sragen: 70000 },
];

const CASH_OUT_CATEGORY_DATA = [
  { category: "Stok", pusat: 600000, salatiga: 350000, sragen: 250000 },
  { category: "Operasional", pusat: 400000, salatiga: 280000, sragen: 170000 },
  { category: "Maintenance", pusat: 250000, salatiga: 120000, sragen: 80000 },
  { category: "Gaji", pusat: 1200000, salatiga: 750000, sragen: 450000 },
  { category: "Fee Bank", pusat: 80000, salatiga: 40000, sragen: 30000 },
];

/* ── Chart configs ── */

const cashFlowChartConfig = {
  cashIn: {
    label: "Cash In",
    color: "hsl(var(--chart-1))",
  },
  cashOut: {
    label: "Cash Out",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const paymentMethodChartConfig = {
  pusat: {
    label: "Semarang Pusat",
    color: "hsl(var(--chart-4))",
  },
  salatiga: {
    label: "Salatiga",
    color: "hsl(var(--chart-5))",
  },
  sragen: {
    label: "Sragen",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const cashOutCategoryChartConfig = {
  pusat: {
    label: "Semarang Pusat",
    color: "hsl(var(--chart-6))",
  },
  salatiga: {
    label: "Salatiga",
    color: "hsl(var(--chart-7))",
  },
  sragen: {
    label: "Sragen",
    color: "hsl(var(--chart-8))",
  },
} satisfies ChartConfig;

/* ── Helpers ── */

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export function FinanceOverviewTab() {
  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Pendapatan"
          value="Rp 4.250.000"
          helper="total revenue dari servis, POS, dan income lain"
          icon={TrendingUp}
        />
        <SummaryCard
          label="Cash In"
          value="Rp 5.100.000"
          helper="uang masuk dari semua metode pembayaran"
          icon={Wallet}
        />
        <SummaryCard
          label="Cash Out"
          value="Rp 850.000"
          helper="pengeluaran operasional dan stok"
          icon={Receipt}
        />
        <SummaryCard
          label="Net Cashflow"
          value="Rp 4.250.000"
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
        <CardContent>
          <ChartContainer config={cashFlowChartConfig} className="h-64 w-full">
            <BarChart data={CASH_FLOW_DATA} barGap={4}>
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
                content={
                  <ChartTooltipContent
                    formatter={(value: unknown) => formatRp(Number(value))}
                    indicator="dot"
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="cashIn"
                fill="var(--color-cashIn)"
                radius={[3, 3, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="cashOut"
                fill="var(--color-cashOut)"
                radius={[3, 3, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-0.5 border-t px-6 py-3">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Cashflow positif minggu ini
          </p>
          <p className="text-[10px] text-muted-foreground">
            Menampilkan arus kas berdasarkan periode terpilih
          </p>
        </CardFooter>
      </Card>

      {/* ── Bottom Radar Charts ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Metode Pembayaran */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Metode Pembayaran</CardTitle>
            <CardDescription className="text-xs">
              Distribusi penerimaan berdasarkan metode pembayaran
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={paymentMethodChartConfig}
              className="mx-auto h-60 w-full max-w-[320px]"
            >
              <RadarChart data={PAYMENT_METHOD_DATA}>
                <PolarGrid radialLines={false} stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="method"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: unknown) => formatRp(Number(value))}
                      indicator="line"
                    />
                  }
                />
                <Radar
                  dataKey="pusat"
                  fill="var(--color-pusat)"
                  fillOpacity={0.15}
                  stroke="var(--color-pusat)"
                  strokeWidth={1.5}
                />
                <Radar
                  dataKey="salatiga"
                  fill="var(--color-salatiga)"
                  fillOpacity={0.15}
                  stroke="var(--color-salatiga)"
                  strokeWidth={1.5}
                />
                <Radar
                  dataKey="sragen"
                  fill="var(--color-sragen)"
                  fillOpacity={0.15}
                  stroke="var(--color-sragen)"
                  strokeWidth={1.5}
                />
                <ChartLegend
                  content={<ChartLegendContent />}
                  className="flex-wrap justify-center gap-3"
                />
              </RadarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-0.5 border-t px-6 py-3">
            <p className="text-[11px] font-medium text-foreground">
              QRIS mendominasi di semua cabang
            </p>
            <p className="text-[10px] text-muted-foreground">
              Data mock per cabang berdasarkan metode pembayaran
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
            <ChartContainer
              config={cashOutCategoryChartConfig}
              className="mx-auto h-60 w-full max-w-[320px]"
            >
              <RadarChart data={CASH_OUT_CATEGORY_DATA}>
                <PolarGrid radialLines={false} stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: unknown) => formatRp(Number(value))}
                      indicator="line"
                    />
                  }
                />
                <Radar
                  dataKey="pusat"
                  fill="var(--color-pusat)"
                  fillOpacity={0.15}
                  stroke="var(--color-pusat)"
                  strokeWidth={1.5}
                />
                <Radar
                  dataKey="salatiga"
                  fill="var(--color-salatiga)"
                  fillOpacity={0.15}
                  stroke="var(--color-salatiga)"
                  strokeWidth={1.5}
                />
                <Radar
                  dataKey="sragen"
                  fill="var(--color-sragen)"
                  fillOpacity={0.15}
                  stroke="var(--color-sragen)"
                  strokeWidth={1.5}
                />
                <ChartLegend
                  content={<ChartLegendContent />}
                  className="flex-wrap justify-center gap-3"
                />
              </RadarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-0.5 border-t px-6 py-3">
            <p className="text-[11px] font-medium text-foreground">
              Gaji dan stok menjadi pengeluaran utama di semua cabang
            </p>
            <p className="text-[10px] text-muted-foreground">
              Data mock per cabang berdasarkan kategori cash out
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
