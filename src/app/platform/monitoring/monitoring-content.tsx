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
  Activity,
  Database,
  HardDrive,
  Mail,
  Cog,
  Radio,
  Globe,
  RefreshCw,
  Building2,
  MapPin,
  Scissors,
  Receipt,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPlatformHealthAction,
  getMonitoringMetricsAction,
} from "@/server/actions/platform-monitoring.actions";
import type { HealthCheckResult, MonitoringMetrics } from "@/server/repositories/platform-monitoring.repository";

const HEALTH_ICONS: Record<string, React.ElementType> = {
  Database,
  Storage: HardDrive,
  Email: Mail,
  "Background Jobs": Cog,
  Realtime: Radio,
  API: Globe,
};

function HealthCard({ check }: { check: HealthCheckResult }) {
  const Icon = HEALTH_ICONS[check.name] ?? Activity;
  const statusColor =
    check.status === "healthy"
      ? "text-emerald-500"
      : check.status === "degraded"
        ? "text-amber-500"
        : "text-red-500";

  const statusBg =
    check.status === "healthy"
      ? "bg-emerald-500/10 border-emerald-500/20"
      : check.status === "degraded"
        ? "bg-amber-500/10 border-amber-500/20"
        : "bg-red-500/10 border-red-500/20";

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground/70" />
          <CardTitle className="text-sm font-medium">{check.name}</CardTitle>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", statusBg, statusColor)}>
          <span className={cn("size-1.5 rounded-full", statusColor.replace("text-", "bg-"))} />
          {check.status}
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {check.message}
        </p>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Clock className="size-3" />
          <span>{check.latencyMs}ms</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MonitoringContent() {
  const [health, setHealth] = useState<HealthCheckResult[]>([]);
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [healthRes, metricsRes] = await Promise.all([
      getPlatformHealthAction(),
      getMonitoringMetricsAction(),
    ]);
    if (healthRes.success) setHealth(healthRes.data);
    if (metricsRes.success) setMetrics(metricsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const overallStatus =
    health.length === 0
      ? "unknown"
      : health.every((h) => h.status === "healthy")
        ? "healthy"
        : health.some((h) => h.status === "down")
          ? "down"
          : "degraded";

  const statusColor =
    overallStatus === "healthy"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : overallStatus === "degraded"
        ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
        : "text-red-500 bg-red-500/10 border-red-500/20";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Platform Health
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor kesehatan seluruh komponen platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize", statusColor)}>
            <span className={cn("size-2 rounded-full", overallStatus === "healthy" ? "bg-emerald-500" : overallStatus === "degraded" ? "bg-amber-500" : "bg-red-500")} />
            {overallStatus}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {health.map((check) => (
          <HealthCard key={check.name} check={check} />
        ))}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Monitoring Metrics
        </h3>
        <p className="text-sm text-muted-foreground">
          Ringkasan metrik operasional hari ini
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Brands
            </CardTitle>
            <Building2 className="size-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeBrands ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online Branches
            </CardTitle>
            <MapPin className="size-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.onlineBranches ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today Services
            </CardTitle>
            <Scissors className="size-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.todayServices ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today Transactions
            </CardTitle>
            <Receipt className="size-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.todayTransactions ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today Revenue
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(metrics?.todayRevenue ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uptime
            </CardTitle>
            <Activity className="size-4 text-muted-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.uptimePercent ?? 0}%</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
