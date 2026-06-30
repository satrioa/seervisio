"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ChevronDown,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Insight, AlertSeverity } from "./mock-data";

interface InsightFeedProps {
  insights: Insight[];
  onInsightClick: (insight: Insight) => void;
}

const severityConfig: Record<AlertSeverity, { icon: React.ElementType; color: string; bg: string }> = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-500 bg-red-500/10",
    bg: "border-l-red-500",
  },
  warning: {
    icon: AlertCircle,
    color: "text-amber-500 bg-amber-500/10",
    bg: "border-l-amber-500",
  },
  info: {
    icon: Info,
    color: "text-blue-500 bg-blue-500/10",
    bg: "border-l-blue-500",
  },
};

const groupLabels: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  lastWeek: "Last Week",
};

export function InsightFeed({ insights, onInsightClick }: InsightFeedProps) {
  const groups = React.useMemo(() => {
    const g: Record<string, Insight[]> = {};
    for (const insight of insights) {
      if (!g[insight.group]) g[insight.group] = [];
      g[insight.group].push(insight);
    }
    return g;
  }, [insights]);

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    today: true,
    yesterday: true,
    lastWeek: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Insight Timeline</CardTitle>
        <CardDescription className="text-xs">AI-generated business insights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groups).map(([groupKey, groupInsights]) => {
          const isOpen = openGroups[groupKey] ?? false;
          const unreadCount = groupInsights.filter((i) => !i.read).length;

          return (
            <div key={groupKey}>
              <button
                type="button"
                onClick={() => toggleGroup(groupKey)}
                className="flex w-full items-center gap-2 rounded-lg px-0 py-1.5 text-left"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupLabels[groupKey]}
                </span>
                {unreadCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-[18px] rounded-full px-1.5 text-[9px] font-medium"
                  >
                    {unreadCount}
                  </Badge>
                )}
                <ChevronDown
                  className={cn(
                    "ml-auto size-3.5 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && (
                <div className="mt-1 space-y-1.5">
                  {groupInsights.map((insight, i) => {
                    const sev = severityConfig[insight.severity];
                    const SevIcon = sev.icon;

                    return (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.2 }}
                        className={cn(
                          "group cursor-pointer rounded-lg border-l-[3px] p-3 transition-all duration-200 hover:bg-muted/40",
                          sev.bg,
                          "border border-l-[3px] border-border",
                          !insight.read && "bg-muted/20",
                        )}
                        onClick={() => onInsightClick(insight)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full",
                              sev.color,
                            )}
                          >
                            <SevIcon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {insight.title}
                              </span>
                              {!insight.read && (
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                              {insight.summary}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "h-5 rounded-full px-2 text-[10px] font-medium",
                                  sev.color,
                                )}
                              >
                                {insight.severity}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {insight.time}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-6 px-2 text-[10px] font-medium text-emerald-500 opacity-0 transition-opacity hover:bg-emerald-500/10 hover:text-emerald-400 group-hover:opacity-100"
                              >
                                Explain
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
