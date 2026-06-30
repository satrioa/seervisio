"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Zap,
  TrendingUp,
  Package,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Recommendation } from "./mock-data";

interface RecommendationsProps {
  recommendations: Recommendation[];
}

const impactConfig = {
  high: { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "High" },
  medium: { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "Medium" },
  low: { color: "text-muted-foreground bg-muted/50 border-border", label: "Low" },
};

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function Recommendations({ recommendations }: RecommendationsProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">AI Recommendations</CardTitle>
            <CardDescription className="text-xs">Recommended actions for today</CardDescription>
          </div>
          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-medium">
            {recommendations.length} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, i) => {
          const impact = impactConfig[rec.expectedImpact];

          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="group rounded-lg border p-3.5 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                  <Zap className="size-4 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-foreground">{rec.title}</h4>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 rounded-full px-2 text-[10px] font-medium",
                        impact.color,
                      )}
                    >
                      {impact.label}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {rec.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="size-3 text-emerald-500" />
                      <span className="text-[11px] text-muted-foreground">
                        Confidence <span className="font-medium text-foreground">{rec.confidence}%</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="size-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">
                        Est. revenue protected <span className="font-medium text-foreground">{formatRp(rec.estimatedRevenueProtected)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px] font-medium text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                      asChild
                    >
                      <a href={rec.actionHref}>
                        {rec.actionLabel}
                        <ArrowRight className="size-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
