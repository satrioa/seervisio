/**
 * service-heatmap-card.tsx
 * Shows daily service intake activity as a calendar heatmap.
 * Follows brand theme colors, dashboard date range, and responsive width.
 * Uses mock data — replace with real query when dashboard data action exists.
 */

"use client";

import * as React from "react";
import Heatmap from "@/components/8starlabs-ui/heatmap";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBrandTheme } from "@/components/theme/brand-theme-provider";
import type { DateRange } from "react-day-picker";

/* ─── Types ─── */

interface HeatmapValue {
  date: string;
  value: number;
}

interface ServiceHeatmapCardProps {
  dateRange?: DateRange;
}

/* ─── Utilities ─── */

function hslStringToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#78716c";

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace("%", "")) / 100;
  const l = parseFloat(parts[2].replace("%", "")) / 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function generateMockData(from: Date, to: Date): HeatmapValue[] {
  const data: HeatmapValue[] = [];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  let dayIndex = 0;
  const current = new Date(start);
  while (current <= end) {
    const isSunday = current.getDay() === 0;
    const value = isSunday ? dayIndex % 3 : ((dayIndex * 7 + 5) % 11) + 1;
    data.push({ date: formatDateKey(current), value });
    current.setDate(current.getDate() + 1);
    dayIndex++;
  }

  return data;
}

/* ─── Component ─── */

export function ServiceHeatmapCard({ dateRange }: ServiceHeatmapCardProps) {
  const { brandTokens } = useBrandTheme();

  const endDate = React.useMemo(() => {
    if (dateRange?.to) {
      const d = new Date(dateRange.to);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, [dateRange?.to]);

  const startDate = React.useMemo(() => {
    if (dateRange?.from) {
      const d = new Date(dateRange.from);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const d = new Date();
    d.setDate(d.getDate() - 89);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dateRange?.from]);

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = React.useMemo(
    () => Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    [diffMs]
  );
  const numWeeks = React.useMemo(
    () => Math.ceil(diffDays / 7) + 2,
    [diffDays]
  );

  const heatmapData = React.useMemo(
    () => generateMockData(startDate, endDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startDate.getTime(), endDate.getTime()]
  );

  /* ── Responsive width ── */

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = React.useState<number>(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      setMeasuredWidth(el.clientWidth);
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const gap = 3;
  const dayLabelWidth = 35;

  const cellSize = React.useMemo(() => {
    if (measuredWidth === 0) return 14;

    const availableForCells =
      measuredWidth - dayLabelWidth - numWeeks * gap;
    const calculated = Math.floor(availableForCells / numWeeks);

    if (calculated < 10) return 14;

    return Math.max(8, Math.min(calculated, 20));
  }, [measuredWidth, numWeeks]);

  /* ── Brand theme colors ── */

  const primaryHex = React.useMemo(
    () =>
      brandTokens?.primary
        ? hslStringToHex(brandTokens.primary)
        : "#F59E0B",
    [brandTokens?.primary]
  );

  const mutedHex = React.useMemo(
    () =>
      brandTokens?.muted ? hslStringToHex(brandTokens.muted) : "#f5f5f5",
    [brandTokens?.muted]
  );

  /* ── Render ── */

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Aktivitas Servis Harian
            </CardTitle>
            <CardDescription>
              Jumlah servis masuk per hari dalam periode terpilih.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="overflow-x-auto pb-2">
          <div className="min-w-max">
            <Heatmap
              data={heatmapData}
              startDate={startDate}
              endDate={endDate}
              cellSize={cellSize}
              gap={gap}
              daysOfTheWeek="MWF"
              displayStyle="squares"
              colorMode="interpolate"
              maxColor={primaryHex}
              minColor={mutedHex}
              interpolation="sqrt"
              dateDisplayFunction={(date: Date) =>
                date.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              }
              valueDisplayFunction={(value: number) => `${value} servis masuk`}
            />
          </div>
        </div>

        {/* Color Legend: Sepi → Ramai */}
        <div
          className="mt-3 flex items-center gap-3 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span>Sepi</span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{
              background: `linear-gradient(to right, ${mutedHex}, ${primaryHex})`,
            }}
          />
          <span>Ramai</span>
        </div>
      </CardContent>
    </Card>
  );
}
