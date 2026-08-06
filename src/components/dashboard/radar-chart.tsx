"use client";

import * as React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

interface RadarChartProps<T> {
  title: string;
  description?: string;
  emptyLabel?: string;
  data: T[];
  dataKey: keyof T;
  nameKey: keyof T;
  fallbackData?: T[];
}

export function SimpleRadarChart<T extends Record<string, any>>({
  title,
  description,
  emptyLabel,
  data,
  dataKey,
  nameKey,
  fallbackData,
}: RadarChartProps<T>) {
  const chartData = data.length > 0 ? data : (fallbackData ?? []);

  // Check if all values for dataKey are 0
  const allZero = chartData.length > 0 && chartData.every((d) => Number(d[dataKey]) === 0);
  const hasData = chartData.length > 0;

  // Compute a safe max value for the radius axis (avoid NaN when all zero)
  const maxVal = React.useMemo(() => {
    if (!hasData) return 1;
    const m = Math.max(...chartData.map((d) => Number(d[dataKey])), 0);
    return m === 0 ? 1 : m;
  }, [chartData, dataKey, hasData]);

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
            {emptyLabel || "Tidak ada data."}
          </div>
        ) : (
          <>
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius={Math.min(80, 80)}
              width={300}
              height={260}
              data={chartData}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey={nameKey as string} tick={{ fontSize: 10 }} />
              <PolarRadiusAxis
                angle={30}
                domain={[0, maxVal]}
                tickCount={5}
                tick={{ fontSize: 10 }}
              />
              <Radar
                name={title}
                dataKey={dataKey as string}
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={allZero ? 0.08 : 0.6}
              />
            </RadarChart>
            {allZero && (
              <p className="mt-1 text-center text-[10px] text-muted-foreground">
                {emptyLabel || "Belum ada data pada periode ini."}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
