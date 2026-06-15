"use client";

import * as React from "react";
import {
  Clock,
  Wrench,
  Wallet,
  Package,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildStoreHealthSummary,
  getMockStoreHealthInput,
  type StoreHealthInsight,
  type StoreHealthStatus,
} from "@/lib/dashboard/store-health-summary";

/* ── Icon map ── */

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  shift: Clock,
  service: Wrench,
  finance: Wallet,
  inventory: Package,
  activity: Activity,
};

/* ── Status helpers ── */

function statusColor(status: StoreHealthStatus): string {
  switch (status) {
    case "good": return "text-emerald-600 dark:text-emerald-400";
    case "warning": return "text-amber-600 dark:text-amber-400";
    case "critical": return "text-red-600 dark:text-red-400";
  }
}

function statusBg(status: StoreHealthStatus): string {
  switch (status) {
    case "good": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "warning": return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "critical": return "bg-red-500/10 text-red-700 dark:text-red-300";
  }
}

function scoreBadgeClass(status: StoreHealthStatus): string {
  switch (status) {
    case "good": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "warning": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "critical": return "bg-red-500/10 text-red-600 dark:text-red-400";
  }
}

/* ── Component ── */

export function StoreHealthScoreCard() {
  const summary = React.useMemo(() => {
    const input = getMockStoreHealthInput();
    return buildStoreHealthSummary(input);
  }, []);

  const overallScoreColor = statusColor(summary.status);

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-semibold">Store Health Score</CardTitle>
          <Badge variant="outline" className={`h-5 rounded-full border-0 px-2 text-[10px] font-medium ${statusBg(summary.status)}`}>
            {summary.statusLabel}
          </Badge>
        </div>
        {/* Overall score */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-baseline gap-0.5">
            <span className={`text-4xl font-bold tracking-tight ${overallScoreColor}`}>
              {summary.score}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{summary.headline}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <TooltipProvider delayDuration={300}>
          {summary.items.map((item) => (
            <InsightRow key={item.key} item={item} />
          ))}
        </TooltipProvider>
      </CardContent>
      <div className="border-t border-border/40 px-5 py-2">
        <p className="text-[10px] text-muted-foreground/70">{summary.insight}</p>
      </div>
    </Card>
  );
}

/* ── Insight Row ── */

function InsightRow({ item }: { item: StoreHealthInsight }) {
  const Icon = INSIGHT_ICONS[item.key] || Activity;
  const iconColor = statusColor(item.status);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="group flex cursor-default items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
          {/* Icon */}
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors group-hover:bg-background ${iconColor}`}>
            <Icon className="size-3.5" />
          </span>
          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-medium text-foreground">{item.title}</span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${scoreBadgeClass(item.status)}`}>
                {item.score}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.description}</p>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[220px] text-xs leading-relaxed">
        <p className="font-medium">{item.label}</p>
        <p className="text-muted-foreground">{item.meta || item.description}</p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          Skor: {item.score}/100 · {item.status === "good" ? "baik" : item.status === "warning" ? "perlu dipantau" : "kritis"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
