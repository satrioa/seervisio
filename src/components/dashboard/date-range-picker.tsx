"use client";

import * as React from "react";
import {
  addDays,
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateRangeMode, ChartGranularity } from "@/lib/dashboard/chart-granularity";
import { getChartGranularity } from "@/lib/dashboard/chart-granularity";
import { useMediaQuery } from "@/hooks/use-media-query";

/* ── Types ── */

interface DateRangeValue {
  dateRange: DateRange | undefined;
  mode: DateRangeMode;
  startYear: number | undefined;
  endYear: number | undefined;
  granularity: ChartGranularity;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

type QuickKey = "today" | "this-week" | "this-month" | "this-year" | "per-year";

const QUICK_OPTIONS: { key: QuickKey; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "this-week", label: "Minggu Ini" },
  { key: "this-month", label: "Bulan Ini" },
  { key: "this-year", label: "Tahun Ini" },
  { key: "per-year", label: "Per Tahun" },
];

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ── Helpers ── */

function resolveQuickRange(key: QuickKey) {
  const now = today();
  const thisYear = now.getFullYear();

  switch (key) {
    case "today":
      return {
        dateRange: { from: now, to: now } as DateRange,
        mode: "date" as DateRangeMode,
        startYear: undefined,
        endYear: undefined,
      };

    case "this-week": {
      const mon = startOfWeek(now, { weekStartsOn: 1 });
      const sun = endOfWeek(now, { weekStartsOn: 1 });
      return {
        dateRange: { from: mon, to: sun } as DateRange,
        mode: "date" as DateRangeMode,
        startYear: undefined,
        endYear: undefined,
      };
    }

    case "this-month": {
      const first = startOfMonth(now);
      const last = endOfMonth(now);
      return {
        dateRange: { from: first, to: last } as DateRange,
        mode: "date" as DateRangeMode,
        startYear: undefined,
        endYear: undefined,
      };
    }

    case "this-year": {
      const yStart = startOfYear(now);
      const yEnd = endOfYear(now);
      return {
        dateRange: { from: yStart, to: yEnd } as DateRange,
        mode: "date" as DateRangeMode,
        startYear: undefined,
        endYear: undefined,
      };
    }

    case "per-year":
      return {
        dateRange: undefined as DateRange | undefined,
        mode: "year" as DateRangeMode,
        startYear: thisYear,
        endYear: thisYear,
      };
  }
}

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const isSmallScreen = useMediaQuery("(max-width: 640px)");

  const years = React.useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i);
  }, []);

  const handleQuickSelect = React.useCallback(
    (key: QuickKey) => {
      const resolved = resolveQuickRange(key);
      const granularity = getChartGranularity({
        mode: resolved.mode,
        startDate: resolved.dateRange?.from,
        endDate: resolved.dateRange?.to,
        startYear: resolved.startYear,
        endYear: resolved.endYear,
        isSmallScreen,
      });
      onChange({
        ...resolved,
        granularity,
      });
    },
    [isSmallScreen, onChange]
  );

  const handleDateSelect = React.useCallback(
    (range: DateRange | undefined) => {
      const granularity = getChartGranularity({
        mode: "date",
        startDate: range?.from,
        endDate: range?.to,
        isSmallScreen,
      });
      onChange({
        dateRange: range,
        mode: "date",
        startYear: undefined,
        endYear: undefined,
        granularity,
      });
    },
    [isSmallScreen, onChange]
  );

  const handleStartYearChange = React.useCallback(
    (val: string) => {
      const sy = Number(val);
      const ey = value.endYear ?? sy;
      const granularity = getChartGranularity({
        mode: "year",
        startYear: sy,
        endYear: ey,
        isSmallScreen,
      });
      onChange({ ...value, startYear: sy, endYear: ey, granularity });
    },
    [isSmallScreen, onChange, value]
  );

  const handleEndYearChange = React.useCallback(
    (val: string) => {
      const ey = Number(val);
      const sy = value.startYear ?? ey;
      const granularity = getChartGranularity({
        mode: "year",
        startYear: sy,
        endYear: ey,
        isSmallScreen,
      });
      onChange({ ...value, startYear: sy, endYear: ey, granularity });
    },
    [isSmallScreen, onChange, value]
  );

  /* ── Trigger label ── */
  const triggerLabel = React.useMemo(() => {
    if (value.mode === "year") {
      if (value.startYear && value.endYear && value.startYear !== value.endYear) {
        return `${value.startYear} - ${value.endYear}`;
      }
      return `Tahun ${value.startYear ?? new Date().getFullYear()}`;
    }
    if (value.dateRange?.from) {
      if (value.dateRange.to) {
        return `${format(value.dateRange.from, "dd MMM yyyy")} - ${format(value.dateRange.to, "dd MMM yyyy")}`;
      }
      return format(value.dateRange.from, "dd MMM yyyy");
    }
    return "Pilih rentang";
  }, [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date-range-picker"
          variant="outline"
          className={cn(
            "justify-start gap-1.5 px-2.5 text-xs font-normal",
            "h-8 sm:h-9"
          )}
        >
          <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          {/* Quick Select */}
          <div className="grid grid-cols-2 gap-1 border-b p-3 sm:w-36 sm:grid-cols-1 sm:border-b-0 sm:border-r">
            {QUICK_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                variant="ghost"
                size="sm"
                className="h-8 justify-start px-2 text-xs font-normal"
                onClick={() => handleQuickSelect(opt.key)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Year mode selector */}
          {value.mode === "year" ? (
            <div className="w-[320px] space-y-3 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">
                Pilih Tahun
              </p>
              <div className="flex items-center gap-2">
                <div className="grid flex-1 gap-1">
                  <span className="text-[10px] text-muted-foreground">Dari</span>
                  <Select
                    value={String(value.startYear ?? new Date().getFullYear())}
                    onValueChange={handleStartYearChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)} className="text-xs">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="mt-5 text-xs text-muted-foreground">s/d</span>
                <div className="grid flex-1 gap-1">
                  <span className="text-[10px] text-muted-foreground">Sampai</span>
                  <Select
                    value={String(value.endYear ?? new Date().getFullYear())}
                    onValueChange={handleEndYearChange}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)} className="text-xs">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            /* Date range calendar */
            <Calendar
              mode="range"
              defaultMonth={value.dateRange?.from}
              selected={value.dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={isSmallScreen ? 1 : 2}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
