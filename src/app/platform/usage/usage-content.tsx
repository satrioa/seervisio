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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Building2,
  Store,
  Users,
  Receipt,
  DollarSign,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getUsageSummaryAction,
  getPerTenantUsageAction,
  getMonthlyTransactionTrendAction,
} from "@/server/actions/platform-usage.actions";
import type { UsageSummary, PerTenantUsage, MonthlyTransactionTrend } from "@/server/repositories/platform-usage.repository";

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground/70" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function planBadgeVariant(
  plan: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (plan) {
    case "starter": return "secondary";
    case "pro": return "default";
    case "enterprise": return "outline";
    default: return "secondary";
  }
}

function UsageTableRow({ tenant }: { tenant: PerTenantUsage }) {
  const branchPct = tenant.branchLimit > 0
    ? Math.round((tenant.branchCount / tenant.branchLimit) * 100)
    : null;
  const userPct = tenant.userLimit > 0
    ? Math.round((tenant.userCount / tenant.userLimit) * 100)
    : null;

  return (
    <TableRow>
      <TableCell className="font-medium">{tenant.brandName}</TableCell>
      <TableCell>
        <Badge variant={planBadgeVariant(tenant.plan)} className="capitalize">
          {tenant.plan}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {tenant.branchCount}
          {branchPct !== null && (
            <span
              className={cn(
                "ml-1 text-xs",
                branchPct >= 80 ? "text-amber-500" : "text-muted-foreground",
              )}
            >
              /{tenant.branchLimit} ({branchPct}%)
            </span>
          )}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {tenant.userCount}
          {userPct !== null && (
            <span
              className={cn(
                "ml-1 text-xs",
                userPct >= 80 ? "text-amber-500" : "text-muted-foreground",
              )}
            >
              /{tenant.userLimit} ({userPct}%)
            </span>
          )}
        </span>
      </TableCell>
      <TableCell className="text-right">{tenant.transactionsMonth.toLocaleString()}</TableCell>
      <TableCell className="text-right">
        {new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(tenant.revenueMonth)}
      </TableCell>
    </TableRow>
  );
}

export function UsageContent() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [tenants, setTenants] = useState<PerTenantUsage[]>([]);
  const [trend, setTrend] = useState<MonthlyTransactionTrend[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [summaryResult, tenantsResult, trendResult] = await Promise.all([
      getUsageSummaryAction(),
      getPerTenantUsageAction(),
      getMonthlyTransactionTrendAction(),
    ]);
    if (summaryResult.success) setSummary(summaryResult.data);
    if (tenantsResult.success) setTenants(tenantsResult.data ?? []);
    if (trendResult.success) setTrend(trendResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
          <p className="text-sm text-muted-foreground">Platform-wide resource usage across all tenants</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-4 w-20" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="py-12"><Skeleton className="mx-auto h-48 w-full max-w-2xl" /></CardContent></Card>
      </div>
    );
  }

  const chartConfig: ChartConfig = {
    transactions: { label: "Transactions", color: "var(--chart-1)" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
        <p className="text-sm text-muted-foreground">Platform-wide resource usage across all tenants</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          title="Total Brands"
          value={(summary?.totalBrands ?? 0).toLocaleString()}
          icon={Building2}
        />
        <MetricCard
          title="Active Branches"
          value={(summary?.totalBranches ?? 0).toLocaleString()}
          icon={Store}
        />
        <MetricCard
          title="Total Users"
          value={(summary?.totalUsers ?? 0).toLocaleString()}
          icon={Users}
        />
        <MetricCard
          title="Transactions (MTD)"
          value={(summary?.totalTransactionsMonth ?? 0).toLocaleString()}
          icon={Receipt}
        />
        <MetricCard
          title="Revenue (MTD)"
          value={new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
          }).format(summary?.totalRevenueMonth ?? 0)}
          icon={DollarSign}
        />
        <MetricCard
          title="Services (MTD)"
          value={(summary?.totalServicesMonth ?? 0).toLocaleString()}
          icon={Wrench}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction Trend (12 Months)</CardTitle>
          <CardDescription>Monthly POS transaction count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="transactions"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Tenant Usage</CardTitle>
          <CardDescription>Resource consumption broken down by tenant</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead>Users</TableHead>
                <TableHead className="text-right">Transactions (MTD)</TableHead>
                <TableHead className="text-right">Revenue (MTD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No tenants found
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((t) => <UsageTableRow key={t.brandId} tenant={t} />)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
