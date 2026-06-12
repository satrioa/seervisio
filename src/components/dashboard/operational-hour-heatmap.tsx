/**
 * operational-hour-heatmap.tsx
 * Day × hour heatmap showing service intake density by operating hour.
 *
 * Axes:
 *   X — operating hours (configurable, default 08:00–20:00)
 *   Y — day of week (Senin–Minggu)
 *
 * Mock data used — real DB query to be wired later.
 */

"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DateRange } from "react-day-picker";

/* ─── Constants ─── */

const DAYS = [
  { key: "senin", label: "Senin" },
  { key: "selasa", label: "Selasa" },
  { key: "rabu", label: "Rabu" },
  { key: "kamis", label: "Kamis" },
  { key: "jumat", label: "Jumat" },
  { key: "sabtu", label: "Sabtu" },
  { key: "minggu", label: "Minggu" },
] as const;

const DEFAULT_HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00",
] as const;

function nextHour(hour: string): string {
  const h = parseInt(hour, 10);
  return `${String(h + 1).padStart(2, "0")}:00`;
}

/* ─── Types ─── */

interface HourSlot {
  dayKey: string;
  dayLabel: string;
  hour: string;
  hourLabel: string;
  value: number;
}

interface Insights {
  peakHourLabel: string;
  peakDayLabel: string;
  peakSlotLabel: string;
}

/* ─── Mock Data Generator ─── */

function generateMockData(hours: readonly string[]): HourSlot[] {
  const slots: HourSlot[] = [];
  const numHours = hours.length;

  for (const [dayIdx, day] of DAYS.entries()) {
    for (const [hourIdx, hour] of hours.entries()) {
      let base: number;
      if (dayIdx === 6) base = 2;        // Minggu
      else if (dayIdx === 5) base = 9;   // Sabtu
      else if (dayIdx === 4) base = 8;   // Jumat
      else base = 4 + dayIdx;            // Senin–Kamis: 4–7

      // Peak hours: ~30–50% and ~60–80% through the operating hours list
      const mid = numHours / 2;
      const morningPeak =
        hourIdx >= Math.floor(mid * 0.4) && hourIdx <= Math.floor(mid * 0.6);
      const afternoonPeak =
        hourIdx >= Math.floor(mid * 0.7) && hourIdx <= Math.floor(mid * 0.9);
      const peakBonus = (morningPeak || afternoonPeak) ? 5 : 0;

      // Edge hours (first 2 and last 2 slots) get penalty
      const edgePenalty = hourIdx <= 1 || hourIdx >= numHours - 2 ? -2 : 0;

      const value = Math.max(0, base + peakBonus + edgePenalty);

      slots.push({
        dayKey: day.key,
        dayLabel: day.label,
        hour,
        hourLabel: `${hour} – ${nextHour(hour)}`,
        value,
      });
    }
  }

  return slots;
}

/* ─── Insights Computation ─── */

function computeInsights(data: HourSlot[]): Insights {
  const hourTotals = new Map<string, number>();
  for (const slot of data) {
    hourTotals.set(slot.hour, (hourTotals.get(slot.hour) ?? 0) + slot.value);
  }
  const bestHour = [...hourTotals.entries()].sort((a, b) => b[1] - a[1])[0];

  const dayTotals = new Map<string, { label: string; total: number }>();
  for (const slot of data) {
    const prev = dayTotals.get(slot.dayKey);
    dayTotals.set(slot.dayKey, {
      label: slot.dayLabel,
      total: (prev?.total ?? 0) + slot.value,
    });
  }
  const bestDay = [...dayTotals.entries()].sort(
    (a, b) => b[1].total - a[1].total,
  )[0];

  const bestSlot = [...data].sort((a, b) => b.value - a.value)[0];

  return {
    peakHourLabel: bestHour
      ? `${bestHour[0]} – ${nextHour(bestHour[0])}`
      : "–",
    peakDayLabel: bestDay?.[1].label ?? "–",
    peakSlotLabel: bestSlot
      ? `${bestSlot.dayLabel}, ${bestSlot.hourLabel}`
      : "–",
  };
}

/* ─── Sub-components ─── */

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Cell({
  value,
  maxValue,
  size,
  tooltipContent,
}: {
  value: number;
  maxValue: number;
  size: number;
  tooltipContent: React.ReactNode;
}) {
  const ratio = maxValue > 0 ? Math.sqrt(value / maxValue) : 0;
  const hasValue = value > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="rounded-md cursor-help select-none transition-colors hover:ring-1 hover:ring-primary/40"
          style={{
            width: size,
            height: size,
            background: hasValue
              ? `hsla(var(--primary) / ${0.08 + ratio * 0.72})`
              : "hsl(var(--muted))",
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs leading-relaxed">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

/* ─── Layout Constants ─── */

const GAP = 4;
const LABEL_W = 56;
const MIN_CELL = 20;
const MAX_CELL = 38;

/* ─── Main Component ─── */

interface OperationalHourHeatmapProps {
  dateRange?: DateRange;
  /** Operating hours displayed on the X-axis, e.g. ["08:00","09:00",…].
   *  Will be fetched from store settings in the future.
   *  Defaults to 08:00–20:00 (13 slots). */
  operatingHours?: string[];
}

export function OperationalHourHeatmap({
  dateRange,
  operatingHours,
}: OperationalHourHeatmapProps) {
  const hours = React.useMemo(
    () => operatingHours ?? [...DEFAULT_HOURS],
    [operatingHours],
  );

  const data = React.useMemo(() => generateMockData(hours), [hours]);
  const maxValue = React.useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );
  const insights = React.useMemo(() => computeInsights(data), [data]);

  const dataMap = React.useMemo(() => {
    const map = new Map<string, HourSlot>();
    for (const slot of data) {
      map.set(`${slot.dayKey}:${slot.hour}`, slot);
    }
    return map;
  }, [data]);

  /* ── Responsive cell sizing — fills container with no empty space ── */

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = React.useState<number>(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      setMeasuredWidth(el.getBoundingClientRect().width);
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cellSize = React.useMemo(() => {
    if (measuredWidth === 0) return 36; // fallback during SSR / first paint

    const numGaps = hours.length; // gaps between grid tracks
    const available = measuredWidth - LABEL_W - numGaps * GAP;
    const calculated = Math.floor(available / hours.length);
    return Math.max(MIN_CELL, Math.min(calculated, MAX_CELL));
  }, [measuredWidth, hours]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Jam Ramai Servis
        </CardTitle>
        <CardDescription>
          Pola jumlah servis masuk berdasarkan hari dan jam operasional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* ── Summary Insights ── */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InsightCard
            label="Jam Tersibuk"
            value={insights.peakHourLabel}
          />
          <InsightCard
            label="Hari Tersibuk"
            value={insights.peakDayLabel}
          />
          <InsightCard
            label="Slot Tersibuk"
            value={insights.peakSlotLabel}
          />
        </div>

        {/* ── Heatmap Matrix ── */}
        <TooltipProvider>
          <div ref={containerRef} className="overflow-x-auto pb-2">
            <div className="min-w-max">
              <div
                className="grid"
                style={{
                gridTemplateColumns: `${LABEL_W}px repeat(${hours.length}, ${cellSize}px)`,
                gridTemplateRows: `auto repeat(${DAYS.length}, ${cellSize}px)`,
                gap: GAP,
              }}
            >
              {/* Corner cell (empty) */}
              <div />

              {/* Hour column headers */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex items-center justify-center text-[11px] font-medium text-muted-foreground"
                >
                  {hour}
                </div>
              ))}

              {/* Day rows */}
              {DAYS.map((day) => (
                <React.Fragment key={day.key}>
                  {/* Day label */}
                  <div className="flex items-center justify-end pr-2 text-[11px] font-medium text-muted-foreground">
                    {day.label}
                  </div>

                  {/* Hour cells */}
                  {hours.map((hour) => {
                    const slot = dataMap.get(`${day.key}:${hour}`);
                    const val = slot?.value ?? 0;
                    return (
                      <Cell
                        key={`${day.key}:${hour}`}
                        value={val}
                        maxValue={maxValue}
                        size={cellSize}
                        tooltipContent={
                          <>
                            <div className="font-medium">
                              {day.label}, {slot?.hourLabel ?? hour}
                            </div>
                            <div className="mt-0.5">
                              {val} servis masuk
                            </div>
                          </>
                        }
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            </div>
          </div>
        </TooltipProvider>

        {/* ── Color Legend ── */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span>Sepi</span>
          <div
            className="h-1.5 w-28 rounded-full"
            style={{
              background:
                "linear-gradient(to right, hsl(var(--muted)), hsl(var(--primary)))",
            }}
          />
          <span>Ramai</span>
        </div>

        {/* TODO(real-data): Replace mock with real query
          Data source: service intake time (services.created_at or intake_at).
          Aggregate: COUNT(*) grouped by weekday + hour.
          Single-day range: show actual per-hour values for that day only.
          Multi-day range: show average per slot across all days.
          Branch filter: if "Semua Cabang" → all branches in brand; else specific branch.
          Operating hours: pass via operatingHours prop (from store settings).
        */}
      </CardContent>
    </Card>
  );
}
