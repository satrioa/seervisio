"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Package,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TodayBriefing } from "./mock-data";

interface TodayBriefingProps {
  data: TodayBriefing;
}

const iconMap: Record<string, React.ElementType> = {
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  clock: Clock,
  package: Package,
  "check-circle": CheckCircle,
};

export function TodayBriefingCard({ data }: TodayBriefingProps) {
  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-sm ring-1 ring-emerald-500/20 dark:from-emerald-500/[0.08] dark:via-emerald-500/[0.03] dark:ring-emerald-500/[0.15]">
      <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-emerald-500/10 blur-3xl" />
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
            <Sparkles className="size-4.5 text-emerald-400" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Good Morning, {data.userName}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Here&apos;s your daily briefing</p>
            </div>

            <ul className="space-y-2">
              {data.summary.map((item, i) => {
                const Icon = iconMap[item.icon] || CheckCircle;
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
                    className="flex items-center gap-2.5"
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        item.positive ? "text-emerald-500" : "text-amber-500",
                      )}
                    />
                    <span className="text-sm text-foreground/90">{item.text}</span>
                  </motion.li>
                );
              })}
            </ul>

            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-full border-emerald-500/30 text-xs font-medium text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                asChild
              >
                <a href="#">
                  View Operational Report
                  <ArrowRight className="size-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
