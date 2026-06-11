export type DateRangeMode = "date" | "year";
export type ChartGranularity = "hour" | "two-hour" | "day" | "month" | "year";

export interface ChartGranularityInput {
  mode: DateRangeMode;
  startDate?: Date;
  endDate?: Date;
  startYear?: number;
  endYear?: number;
  isSmallScreen: boolean;
}

export function getChartGranularity(input: ChartGranularityInput): ChartGranularity {
  if (input.mode === "year") {
    if (input.startYear && input.endYear && input.startYear !== input.endYear) {
      return "year";
    }
    return "month";
  }

  if (!input.startDate || !input.endDate) {
    return "day";
  }

  const diffInDays =
    Math.ceil(
      (input.endDate.getTime() - input.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  if (diffInDays <= 1) {
    return input.isSmallScreen ? "two-hour" : "hour";
  }

  if (diffInDays <= 31) {
    return "day";
  }

  if (diffInDays <= 366) {
    return "month";
  }

  return "year";
}
