import type { ChartLayout, GraphDataPoint, GraphSeries } from "./pdfx-graph.types";

export const GRAPH_SAFE_WIDTHS = {
  default: 420,
  full: 500,
};

type PdfxTheme = ReturnType<typeof import("../../../lib/pdfx-theme-context").usePdfxTheme>;

export function getGraphWidth(
  theme: PdfxTheme,
  opts?: { containerPadding?: number; wrapperPadding?: number; pageWidth?: number },
): number {
  const cp = opts?.containerPadding ?? 12;
  const wp = opts?.wrapperPadding ?? 12;
  const pw = opts?.pageWidth ?? 595;
  return pw - cp * 2 - wp * 2;
}

export function getDefaultPalette(theme: PdfxTheme): string[] {
  return [
    theme.colors.primary,
    theme.colors.accent,
    theme.colors.success,
    theme.colors.warning,
    theme.colors.destructive,
    theme.colors.info,
    theme.colors.mutedForeground,
  ];
}

export function normalizeData(data: GraphDataPoint[] | GraphSeries[]): GraphSeries[] {
  if (data.length === 0) return [];

  if ("name" in data[0]) return data as GraphSeries[];

  return [
    {
      name: "Series",
      data: data as GraphDataPoint[],
    },
  ];
}

export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  innerR?: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  if (innerR && innerR > 0) {
    const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
    return [
      `M ${start.x} ${start.y}`,
      `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");
  }

  return [
    `M ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    `L ${cx} ${cy}`,
    "Z",
  ].join(" ");
}

export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";

  const parts: string[] = [];
  parts.push(`M ${points[0].x} ${points[0].y}`);

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpx = curr.x + (next.x - curr.x) / 2;
    parts.push(`Q ${cpx} ${curr.y} ${cpx} ${next.y}`);
    parts.push(`Q ${cpx} ${next.y} ${next.x} ${next.y}`);
  }

  return parts.join(" ");
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

export function fmtNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function buildLayout(
  series: GraphSeries[],
  width: number,
  height: number,
  isPieOrDonut: boolean,
  yTickCount: number,
): ChartLayout {
  if (isPieOrDonut) {
    return {
      svgW: width,
      svgH: height,
      chartX: 0,
      chartY: 0,
      chartW: width,
      chartH: height,
      yMin: 0,
      yMax: 100,
      yTicks: [],
      xLabels: [],
    };
  }

  const margin = { top: 10, right: 10, bottom: 24, left: 36 };
  const chartX = margin.left;
  const chartY = margin.top;
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  let yMin = Infinity;
  let yMax = -Infinity;
  const xLabels: string[] = [];

  for (const s of series) {
    for (const d of s.data) {
      if (d.value < yMin) yMin = d.value;
      if (d.value > yMax) yMax = d.value;
    }
    if (s.data.length > xLabels.length) {
      xLabels.length = 0;
      for (const d of s.data) xLabels.push(d.label);
    }
  }

  if (yMin > 0) yMin = 0;
  if (yMin === yMax) {
    yMin = 0;
    yMax = yMax || 100;
  }

  const range = yMax - yMin;
  const step = range / yTickCount;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(yMin + step * i);
  }

  return { svgW: width, svgH: height, chartX, chartY, chartW, chartH, yMin, yMax, yTicks, xLabels };
}
