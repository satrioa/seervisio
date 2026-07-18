"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  DollarSign,
  Package,
  Clock,
  Users,
  Smile,
  Percent,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScoreboardItem, TrendDirection } from "./mock-data";

interface OperationalScoreboardProps {
  items: ScoreboardItem[];
}

const iconMap: Record<string, React.ElementType> = {
  Revenue: DollarSign,
  Margin: Percent,
  Inventory: Package,
  Technicians: Users,
  SLA: Clock,
  "Customer Sat.": Smile,
};

function Sparkline({ data, trend }: { data: number[]; trend: TrendDirection }) {
  const width = 60;
  const height = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const strokeColor =
    trend === "up"
      ? "hsl(var(--chart-2))"
      : trend === "down"
        ? "hsl(var(--destructive))"
        : "hsl(var(--muted-foreground))";

  return (
    <svg width={width} height={height} className="shrink-0" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OperationalScoreboard({ items }: OperationalScoreboardProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Operational Scoreboard</CardTitle>
        <CardDescription className="text-xs">Key metrics at a glance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((item, i) => {
            const Icon = iconMap[item.label] || TrendingUp;
            const TrendIcon =
              item.trend === "up"
                ? TrendingUp
                : item.trend === "down"
                  ? TrendingDown
                  : Minus;
            const trendColor =
              item.trend === "up"
                ? "text-emerald-500"
                : item.trend === "down"
                  ? "text-red-500"
                  : "text-muted-foreground";

            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className="group cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-7 items-center justify-center rounded-full bg-muted/50">
                    <Icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <Sparkline data={item.sparklineData} trend={item.trend} />
                </div>
                <div className="mt-2.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-semibold tabular-nums text-foreground">
                      {item.value}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.detailLabel}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <TrendIcon className={cn("size-3", trendColor)} />
                    <span className={cn("text-[11px] font-medium", trendColor)}>
                      {item.trendValue}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-tight text-muted-foreground/70">
                    {item.insight}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
