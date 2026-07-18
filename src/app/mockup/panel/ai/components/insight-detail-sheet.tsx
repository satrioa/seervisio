"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Target,
  BarChart3,
  Lightbulb,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Insight, AlertSeverity } from "./mock-data";

interface InsightDetailSheetProps {
  insight: Insight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const severityConfig: Record<AlertSeverity, { icon: React.ElementType; color: string; label: string }> = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-500 bg-red-500/10",
    label: "Critical",
  },
  warning: {
    icon: AlertCircle,
    color: "text-amber-500 bg-amber-500/10",
    label: "Warning",
  },
  info: {
    icon: Info,
    color: "text-blue-500 bg-blue-500/10",
    label: "Info",
  },
};

function formatConfidence(n: number) {
  if (n >= 90) return { label: "High", color: "text-emerald-500" };
  if (n >= 70) return { label: "Medium", color: "text-amber-500" };
  return { label: "Low", color: "text-red-500" };
}

export function InsightDetailSheet({ insight, open, onOpenChange }: InsightDetailSheetProps) {
  if (!insight) return null;

  const sev = severityConfig[insight.severity];
  const SevIcon = sev.icon;
  const conf = formatConfidence(insight.confidence);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l sm:max-w-md"
      >
        <SheetHeader className="relative pb-2">
          <SheetClose className="absolute right-0 top-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </SheetClose>
          <div className="flex items-center gap-2">
            <div className={cn("flex size-8 items-center justify-center rounded-full", sev.color)}>
              <SevIcon className="size-4" />
            </div>
            <Badge
              variant="outline"
              className={cn("h-5 rounded-full px-2 text-[10px] font-medium", sev.color)}
            >
              {sev.label}
            </Badge>
            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-medium">
              {insight.category}
            </Badge>
          </div>
          <SheetTitle className="mt-3 text-left text-base">{insight.title}</SheetTitle>
          <p className="text-xs text-muted-foreground">{insight.time}</p>
        </SheetHeader>

        <div className="mt-4 space-y-5 overflow-y-auto pb-8">
          {/* Summary */}
          <div>
            <h4 className="text-xs font-semibold text-foreground">Summary</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {insight.summary}
            </p>
          </div>

          <Separator />

          {/* Root Cause */}
          <div>
            <div className="flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" />
              <h4 className="text-xs font-semibold text-foreground">Root Cause</h4>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {insight.rootCause}
            </p>
          </div>

          <Separator />

          {/* Supporting Metrics */}
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h4 className="text-xs font-semibold text-foreground">Supporting Metrics</h4>
            </div>
            <ul className="mt-1.5 space-y-1.5">
              {insight.supportingMetrics.map((metric, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {metric}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Recommendation */}
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-500" />
              <h4 className="text-xs font-semibold text-foreground">Recommendation</h4>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {insight.recommendation}
            </p>
          </div>

          <Separator />

          {/* Confidence & Impact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">Confidence</p>
              <p className={cn("mt-0.5 text-lg font-bold tabular-nums", conf.color)}>
                {insight.confidence}%
              </p>
              <p className="text-[10px] text-muted-foreground">{conf.label}</p>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">Expected Impact</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-500">
                {insight.expectedImpact}
              </p>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Actions</h4>
            <div className="flex flex-wrap gap-2">
              {insight.actions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium"
                  asChild
                >
                  <a href={action.href}>
                    <ExternalLink className="size-3.5" />
                    {action.label}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
