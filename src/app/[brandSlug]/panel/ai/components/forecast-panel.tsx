"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, CartesianGrid } from "recharts";
import { ChartTooltip, ChartTooltipContent, ChartContainer } from "@/components/ui/chart";
import { TrendingUp, TrendingDown, Lightbulb, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Forecast } from "./mock-data";

interface ForecastPanelProps {
  data: Forecast;
}

function formatRp(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`;
  return `Rp ${n}`;
}

export function ForecastPanel({ data }: ForecastPanelProps) {
  const chartConfig = {
    forecast: { label: "Forecast", color: "var(--chart-2)" },
  };

  const maxValue = Math.max(...data.next7Days.map((d) => d.value));
  const todayAvg = data.next7Days.reduce((s, d) => s + d.value, 0) / data.next7Days.length;

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">AI Forecast</CardTitle>
            <CardDescription className="text-xs">Next 7 days projection</CardDescription>
          </div>
          <Badge
            variant="secondary"
            className="h-5 rounded-full px-2 text-[10px] font-medium"
          >
            <TrendingUp className="mr-1 size-3 text-emerald-500" />
            {data.tomorrow.confidence}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tomorrow */}
        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Tomorrow&apos;s forecast</p>
            <p className="text-xl font-bold tabular-nums text-foreground">
              {formatRp(data.tomorrow.value)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-[11px] text-muted-foreground">Confidence</span>
              <span className="text-sm font-semibold text-emerald-500">
                {data.tomorrow.confidence}%
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-32">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart data={data.next7Days}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                stroke="var(--muted-foreground)"
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatRp(Number(value))}
                    indicator="dot"
                  />
                }
              />
              <Bar
                dataKey="value"
                fill="var(--chart-2)"
                radius={[3, 3, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Recommendations */}
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Lightbulb className="size-3.5 text-amber-500" />
            Recommendations
          </div>
          <ul className="space-y-1.5">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
