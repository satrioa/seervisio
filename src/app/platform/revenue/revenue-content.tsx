"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRevenueDashboardAction,
  type RevenueDashboardData,
} from "@/server/actions/revenue.actions";

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/60 shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground/70" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const areaConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  total: { label: "Total", color: "hsl(var(--chart-1))" },
  active: { label: "Active", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function RevenueContent() {
  const [data, setData] = useState<RevenueDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getRevenueDashboardAction();
    if (res.success) setData(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const metrics = data?.metrics;
  const barConfig: ChartConfig = {};
  if (data?.revenueByPackage) {
    for (const pkg of data.revenueByPackage) {
      barConfig[pkg.package] = {
        label: pkg.package.charAt(0).toUpperCase() + pkg.package.slice(1),
        color: COLORS[data.revenueByPackage.indexOf(pkg) % COLORS.length],
      };
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Revenue Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Ringkasan pendapatan dan pertumbuhan platform
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="MRR"
          value={formatCurrency(metrics?.mrr ?? 0)}
          subtitle="Monthly Recurring Revenue"
          icon={DollarSign}
        />
        <MetricCard
          title="ARR"
          value={formatCurrency(metrics?.arr ?? 0)}
          subtitle="Annual Recurring Revenue"
          icon={TrendingUp}
        />
        <MetricCard
          title="ARPU"
          value={formatCurrency(metrics?.arpu ?? 0)}
          subtitle={`Average Revenue Per User (${metrics?.totalActiveUsers ?? 0} users)`}
          icon={Users}
        />
        <MetricCard
          title="Churn"
          value={`${metrics?.churn ?? 0}%`}
          subtitle={`Dari ${metrics?.totalBrands ?? 0} total brands`}
          icon={LogOut}
        />
      </div>

      {/* Revenue Growth Chart */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Revenue Growth</CardTitle>
          <CardDescription className="text-xs">
            Pendapatan bulanan dari seluruh brand (6 bulan terakhir)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!data?.revenueTrend || data.revenueTrend.length === 0) ? (
            <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
              Belum ada data revenue.
            </div>
          ) : (
            <div className="h-52">
              <ChartContainer config={areaConfig} className="h-full w-full">
                <AreaChart data={data.revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
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
                    tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}jt`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(Number(value))}
                        indicator="dot"
                      />
                    }
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue By Package + Subscription Growth */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue By Package */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Revenue By Package</CardTitle>
            <CardDescription className="text-xs">
              Pendapatan MRR berdasarkan paket langganan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!data?.revenueByPackage || data.revenueByPackage.length === 0) ? (
              <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
                Belum ada data paket.
              </div>
            ) : (
              <div className="h-52">
                <ChartContainer config={barConfig} className="h-full w-full">
                  <BarChart data={data.revenueByPackage} barGap={4}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="package"
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
                      tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}jt`}
                    />
                    <ChartTooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => [
                            formatCurrency(Number(value)),
                            typeof name === "string"
                              ? name.charAt(0).toUpperCase() + name.slice(1)
                              : "Revenue",
                          ]}
                          indicator="dot"
                        />
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--chart-1))"
                      radius={[3, 3, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Growth */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Subscription Growth</CardTitle>
            <CardDescription className="text-xs">
              Pertumbuhan jumlah subscription (6 bulan terakhir)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!data?.subscriptionGrowth || data.subscriptionGrowth.length === 0) ? (
              <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
                Belum ada data subscription.
              </div>
            ) : (
              <div className="h-52">
                <ChartContainer config={areaConfig} className="h-full w-full">
                  <AreaChart data={data.subscriptionGrowth}>
                    <defs>
                      <linearGradient id="subTotalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="subActiveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
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
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      fill="url(#subTotalGrad)"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      name="total"
                    />
                    <Area
                      type="monotone"
                      dataKey="active"
                      fill="url(#subActiveGrad)"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      name="active"
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
