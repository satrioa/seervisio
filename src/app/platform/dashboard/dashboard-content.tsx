"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Building2,
  MapPin,
  Users,
  CreditCard,
  AlertTriangle,
  FlaskConical,
  TrendingUp,
  DollarSign,
  Terminal,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPlatformDashboardAction,
  getRevenueTrendAction,
  getSubscriptionGrowthAction,
  type PlatformDashboardData,
} from "@/server/actions/platform.actions";
import type { RevenueTrendPoint, SubscriptionGrowthPoint } from "@/server/repositories/platform.repository";
import { getRecentSystemLogsAction } from "@/server/actions/platform-monitoring.actions";
import Link from "next/link";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  description?: string;
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
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CurrencyDisplay({ amount }: { amount: number }) {
  return (
    <span>
      {new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)}
    </span>
  );
}

function ChartSkeleton({ label }: { label: string }) {
  return (
    <Card className="col-span-full border-border/60 shadow-sm lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <CardDescription>Data akan tersedia setelah integrasi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/40 bg-muted/20">
          <p className="text-sm text-muted-foreground">Chart placeholder</p>
        </div>
      </CardContent>
    </Card>
  );
}

const ACTION_LABELS: Record<string, string> = {
  PLATFORM_LOGIN: "Platform Login",
  PLATFORM_IMPERSONATE: "Impersonation",
  PLATFORM_OWNER_CREATED: "Owner Created",
  FACTORY_RESET: "Factory Reset",
  EXPORT_FULL_BACKUP: "Full Backup Export",
  BRAND_CREATED: "Brand Created",
  SUBSCRIPTION_CHANGED: "Subscription Changed",
  SETTING_UPDATED: "Setting Updated",
};

export function DashboardContent() {
  const [data, setData] = useState<PlatformDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [subscriptionGrowth, setSubscriptionGrowth] = useState<SubscriptionGrowthPoint[]>([]);

  const load = useCallback(async () => {
    const [dashRes, logsRes, revRes, subRes] = await Promise.all([
      getPlatformDashboardAction(),
      getRecentSystemLogsAction(8),
      getRevenueTrendAction(),
      getSubscriptionGrowthAction(),
    ]);
    if (dashRes.success) setData(dashRes.data);
    if (logsRes.success) setRecentLogs(logsRes.data);
    if (revRes.success) setRevenueTrend(revRes.data ?? []);
    if (subRes.success) setSubscriptionGrowth(subRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Platform Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Ringkasan seluruh ekosistem Seervisio
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Brands"
          value={data?.totalBrands ?? 0}
          icon={Building2}
        />
        <StatCard
          title="Total Branches"
          value={data?.totalBranches ?? 0}
          icon={MapPin}
        />
        <StatCard
          title="Total Users"
          value={data?.totalUsers ?? 0}
          icon={Users}
        />
        <StatCard
          title="Active Subscriptions"
          value={data?.activeSubscriptions ?? 0}
          icon={CreditCard}
        />
        <StatCard
          title="Expired Subscriptions"
          value={data?.expiredSubscriptions ?? 0}
          icon={AlertTriangle}
        />
        <StatCard
          title="Trial Accounts"
          value={data?.trialAccounts ?? 0}
          icon={FlaskConical}
        />
        <StatCard
          title="Monthly Revenue"
          value={data ? <CurrencyDisplay amount={data.monthlyRevenue} /> : 0}
          icon={TrendingUp}
        />
        <StatCard
          title="Annual Revenue"
          value={data ? <CurrencyDisplay amount={data.annualRevenue} /> : 0}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Revenue Overview</CardTitle>
                <CardDescription>Monthly revenue trend (6 months)</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueTrend.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
                    No revenue data yet
                  </div>
                ) : (
                  <div className="h-48">
                    <ChartContainer
                      config={
                        {
                          revenue: {
                            label: "Revenue",
                            color: "hsl(var(--chart-1))",
                          },
                        } satisfies ChartConfig
                      }
                      className="h-full w-full"
                    >
                      <AreaChart data={revenueTrend}>
                        <defs>
                          <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
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
                              formatter={(value) =>
                                new Intl.NumberFormat("id-ID", {
                                  style: "currency",
                                  currency: "IDR",
                                  minimumFractionDigits: 0,
                                }).format(Number(value))
                              }
                              indicator="dot"
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          fill="url(#dashRevGrad)"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Subscription Growth</CardTitle>
                <CardDescription>New subscriptions per month</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptionGrowth.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
                    No subscription data yet
                  </div>
                ) : (
                  <div className="h-48">
                    <ChartContainer
                      config={
                        {
                          total: {
                            label: "Total",
                            color: "hsl(var(--chart-1))",
                          },
                          active: {
                            label: "Active",
                            color: "hsl(var(--chart-2))",
                          },
                        } satisfies ChartConfig
                      }
                      className="h-full w-full"
                    >
                      <BarChart data={subscriptionGrowth}>
                        <CartesianGrid
                          vertical={false}
                          stroke="hsl(var(--border))"
                        />
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
                        <Bar
                          dataKey="total"
                          fill="hsl(var(--chart-1))"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="active"
                          fill="hsl(var(--chart-2))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <CardDescription className="mt-0.5 text-[10px]">
                Platform-level actions
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="size-7" asChild>
              <Link href="/platform/system-logs">
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Terminal className="mb-2 size-6 text-muted-foreground/40" />
                <p className="text-[10px] text-muted-foreground/60">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 rounded-lg border border-border/30 p-2"
                  >
                    <Terminal className="mt-0.5 size-3 shrink-0 text-muted-foreground/50" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-foreground truncate">
                        {ACTION_LABELS[log.action] ??
                          log.action.replace(/_/g, " ").toLowerCase()}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 truncate">
                        {log.actorName ?? "System"}
                      </p>
                      <p className="text-[9px] text-muted-foreground/40">
                        {new Date(log.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
