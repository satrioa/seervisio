"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Package,
  Clock,
  DollarSign,
  Users,
  Smile,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BusinessHealth } from "./mock-data";

interface BusinessHealthCardProps {
  data: BusinessHealth;
  onDetail: () => void;
}

const contributorIcons: Record<string, React.ElementType> = {
  revenue: DollarSign,
  inventory: Package,
  sla: Clock,
  finance: DollarSign,
  customer: Smile,
  technician: Users,
};

const contributorLabels: Record<string, string> = {
  revenue: "Revenue",
  inventory: "Inventory",
  sla: "SLA",
  finance: "Finance",
  customer: "Customer",
  technician: "Technician",
};

function AnimatedScore({ score }: { score: number }) {
  const [displayed, setDisplayed] = React.useState(0);

  React.useEffect(() => {
    let frame = 0;
    const totalFrames = 60;
    const increment = score / totalFrames;
    const timer = setInterval(() => {
      frame++;
      setDisplayed(Math.min(Math.round(increment * frame), score));
      if (frame >= totalFrames) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  return <>{displayed}</>;
}

export function BusinessHealthCard({ data, onDetail }: BusinessHealthCardProps) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (data.score / 100) * circumference;

  const scoreColor =
    data.score >= 85
      ? "stroke-emerald-500"
      : data.score >= 70
        ? "stroke-amber-500"
        : "stroke-red-500";

  const scoreBgColor =
    data.score >= 85
      ? "text-emerald-500"
      : data.score >= 70
        ? "text-amber-500"
        : "text-red-500";

  const TrendIcon =
    data.trend === "up" ? TrendingUp : data.trend === "down" ? TrendingDown : Minus;
  const trendColor =
    data.trend === "up"
      ? "text-emerald-500"
      : data.trend === "down"
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <Card
      className="group relative overflow-hidden border-0 bg-gradient-to-br from-zinc-900/90 to-zinc-950 shadow-xl ring-1 ring-white/10 dark:from-zinc-900/90 dark:to-zinc-950"
      onClick={onDetail}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 size-40 rounded-full bg-emerald-500/5 blur-3xl" />
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          {/* Ring */}
          <div className="relative mx-auto flex size-28 shrink-0 sm:mx-0">
            <svg className="size-28 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="var(--muted)"
                strokeWidth="6"
                opacity={0.3}
              />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                className={scoreColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-2xl font-bold tabular-nums", scoreBgColor)}>
                <AnimatedScore score={data.score} />
              </span>
              <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Business Health</h3>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                  {data.score >= 85 ? "Excellent" : data.score >= 70 ? "Good" : "Needs Attention"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <TrendIcon className={cn("size-4", trendColor)} />
                <span className="text-xs text-muted-foreground">{data.trendValue}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {Object.entries(data.contributors).map(([key, value]) => {
                const Icon = contributorIcons[key] || Activity;
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center gap-1 rounded-lg bg-white/[0.03] px-2 py-2 transition-colors hover:bg-white/[0.06]"
                  >
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-white">{value}</span>
                    <span className="text-[9px] text-muted-foreground">{contributorLabels[key]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
