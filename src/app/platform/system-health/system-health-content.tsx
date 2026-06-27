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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Activity, Database, HardDrive, Mail, Cpu, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSystemHealthAction,
} from "@/server/actions/system-health.actions";
import type { SystemHealthItem, HealthStatus } from "@/server/repositories/platform.repository";

function statusColor(status: HealthStatus) {
  switch (status) {
    case "healthy": return "bg-emerald-500";
    case "warning": return "bg-amber-500";
    case "critical": return "bg-red-500";
  }
}

function statusLabel(status: HealthStatus) {
  switch (status) {
    case "healthy": return "Healthy";
    case "warning": return "Warning";
    case "critical": return "Critical";
  }
}

function statusVariant(status: HealthStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "healthy": return "default";
    case "warning": return "secondary";
    case "critical": return "destructive";
  }
}

function componentIcon(component: string): React.ElementType {
  switch (component) {
    case "Database": return Database;
    case "Storage": return HardDrive;
    case "Email": return Mail;
    case "Background Jobs": return Cpu;
    case "API": return Globe;
    default: return Activity;
  }
}

function HealthCard({ item }: { item: SystemHealthItem }) {
  const Icon = componentIcon(item.component);

  return (
    <Card className={cn(
      "border-border/60 shadow-sm transition-all",
      item.status === "critical" && "border-red-500/30",
      item.status === "warning" && "border-amber-500/30",
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex size-10 items-center justify-center rounded-lg",
              item.status === "healthy" && "bg-emerald-500/10 text-emerald-500",
              item.status === "warning" && "bg-amber-500/10 text-amber-500",
              item.status === "critical" && "bg-red-500/10 text-red-500",
            )}>
              <Icon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{item.component}</CardTitle>
              <CardDescription className="text-xs">{item.message}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("size-2.5 rounded-full animate-pulse", statusColor(item.status))} />
            <Badge variant={statusVariant(item.status)} className="text-[10px]">
              {statusLabel(item.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Activity className="size-3" />
          <span>
            Latency: <span className="font-medium tabular-nums text-foreground">{item.latencyMs}ms</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SystemHealthContent() {
  const [items, setItems] = useState<SystemHealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getSystemHealthAction();
    if (res.success) {
      setItems(res.data);
      setLastChecked(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const allHealthy = items.every((i) => i.status === "healthy");
  const anyCritical = items.some((i) => i.status === "critical");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              System Health
            </h2>
            {items.length > 0 && (
              <div className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                allHealthy && "bg-emerald-500/10 text-emerald-500",
                anyCritical && "bg-red-500/10 text-red-500",
                !allHealthy && !anyCritical && "bg-amber-500/10 text-amber-500",
              )}>
                <div className={cn("size-1.5 rounded-full", statusColor(allHealthy ? "healthy" : anyCritical ? "critical" : "warning"))} />
                {allHealthy ? "All Systems Operational" : anyCritical ? "System Issues Detected" : "Some Warnings"}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor status komponen platform Seervisio
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Status Summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-center">
            <p className="text-lg font-bold text-emerald-500 tabular-nums">
              {items.filter((i) => i.status === "healthy").length}
            </p>
            <p className="text-[11px] text-muted-foreground">Healthy</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center">
            <p className="text-lg font-bold text-amber-500 tabular-nums">
              {items.filter((i) => i.status === "warning").length}
            </p>
            <p className="text-[11px] text-muted-foreground">Warning</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center">
            <p className="text-lg font-bold text-red-500 tabular-nums">
              {items.filter((i) => i.status === "critical").length}
            </p>
            <p className="text-[11px] text-muted-foreground">Critical</p>
          </div>
        </div>
      )}

      {/* Health Cards */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <HealthCard key={item.component} item={item} />
          ))}
        </div>
      )}

      {/* Last checked */}
      {lastChecked && (
        <p className="text-[11px] text-muted-foreground text-right">
          Last checked: {lastChecked.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
