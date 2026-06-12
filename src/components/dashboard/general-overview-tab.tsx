"use client";

import * as React from "react";
import { isWithinInterval, startOfDay } from "date-fns";
import {
  DollarSign,
  Activity,
  TrendingUp,
  Wrench,
  ShoppingCart,
  Package,
  Wallet,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PackageMinus,
  ShoppingCart as ShoppingCartIcon,
  Store,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { OperationalHourHeatmap } from "@/components/dashboard/operational-hour-heatmap";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
} from "recharts";
import type { ChartGranularity } from "@/lib/dashboard/chart-granularity";
import { calculateOperationalHealth, getMockOperationalHealthInput } from "@/lib/dashboard/operational-health-score";

/* ── Mock data generators ── */

interface RevenuePoint {
  label: string;
  revenue: number;
}

interface BranchPoint {
  label: string;
  pusat: number;
  salatiga: number;
  sragen: number;
}

function revenueDataForGranularity(g: ChartGranularity): RevenuePoint[] {
  switch (g) {
    case "hour":
      return [
        { label: "08:00", revenue: 350000 },
        { label: "09:00", revenue: 620000 },
        { label: "10:00", revenue: 780000 },
        { label: "11:00", revenue: 1150000 },
        { label: "12:00", revenue: 900000 },
        { label: "13:00", revenue: 1250000 },
        { label: "14:00", revenue: 1600000 },
        { label: "15:00", revenue: 1300000 },
      ];
    case "two-hour":
      return [
        { label: "08:00", revenue: 970000 },
        { label: "10:00", revenue: 1930000 },
        { label: "12:00", revenue: 2150000 },
        { label: "14:00", revenue: 2900000 },
      ];
    case "day":
      return [
        { label: "1 Jun", revenue: 4250000 },
        { label: "3 Jun", revenue: 3800000 },
        { label: "5 Jun", revenue: 5100000 },
        { label: "7 Jun", revenue: 4650000 },
        { label: "9 Jun", revenue: 3900000 },
        { label: "11 Jun", revenue: 5400000 },
        { label: "13 Jun", revenue: 4800000 },
        { label: "15 Jun", revenue: 6200000 },
        { label: "17 Jun", revenue: 5700000 },
        { label: "19 Jun", revenue: 4300000 },
        { label: "21 Jun", revenue: 5900000 },
        { label: "23 Jun", revenue: 5100000 },
        { label: "25 Jun", revenue: 6700000 },
        { label: "27 Jun", revenue: 5800000 },
        { label: "29 Jun", revenue: 6400000 },
      ];
    case "month":
      return [
        { label: "Jan", revenue: 85000000 },
        { label: "Feb", revenue: 72000000 },
        { label: "Mar", revenue: 96000000 },
        { label: "Apr", revenue: 88000000 },
        { label: "Mei", revenue: 102000000 },
        { label: "Jun", revenue: 115000000 },
        { label: "Jul", revenue: 98000000 },
        { label: "Agu", revenue: 125000000 },
        { label: "Sep", revenue: 110000000 },
        { label: "Okt", revenue: 135000000 },
        { label: "Nov", revenue: 120000000 },
        { label: "Des", revenue: 145000000 },
      ];
    case "year":
      return [
        { label: "2022", revenue: 720000000 },
        { label: "2023", revenue: 850000000 },
        { label: "2024", revenue: 980000000 },
        { label: "2025", revenue: 1150000000 },
        { label: "2026", revenue: 1250000000 },
      ];
  }
}

function branchDataForGranularity(g: ChartGranularity): BranchPoint[] {
  switch (g) {
    case "hour":
      return [
        { label: "08:00", pusat: 200000, salatiga: 100000, sragen: 50000 },
        { label: "09:00", pusat: 350000, salatiga: 180000, sragen: 90000 },
        { label: "10:00", pusat: 420000, salatiga: 240000, sragen: 120000 },
        { label: "11:00", pusat: 650000, salatiga: 320000, sragen: 180000 },
        { label: "12:00", pusat: 500000, salatiga: 280000, sragen: 120000 },
        { label: "13:00", pusat: 700000, salatiga: 380000, sragen: 170000 },
        { label: "14:00", pusat: 900000, salatiga: 450000, sragen: 250000 },
        { label: "15:00", pusat: 750000, salatiga: 380000, sragen: 170000 },
      ];
    case "two-hour":
      return [
        { label: "08:00", pusat: 550000, salatiga: 280000, sragen: 140000 },
        { label: "10:00", pusat: 1070000, salatiga: 560000, sragen: 300000 },
        { label: "12:00", pusat: 1200000, salatiga: 660000, sragen: 290000 },
        { label: "14:00", pusat: 1650000, salatiga: 830000, sragen: 420000 },
      ];
    case "day":
      return [
        { label: "1 Jun", pusat: 2400000, salatiga: 1200000, sragen: 650000 },
        { label: "3 Jun", pusat: 2100000, salatiga: 1100000, sragen: 600000 },
        { label: "5 Jun", pusat: 2900000, salatiga: 1450000, sragen: 750000 },
        { label: "7 Jun", pusat: 2600000, salatiga: 1300000, sragen: 750000 },
        { label: "9 Jun", pusat: 2200000, salatiga: 1100000, sragen: 600000 },
        { label: "11 Jun", pusat: 3100000, salatiga: 1500000, sragen: 800000 },
        { label: "13 Jun", pusat: 2700000, salatiga: 1400000, sragen: 700000 },
        { label: "15 Jun", pusat: 3500000, salatiga: 1800000, sragen: 900000 },
        { label: "17 Jun", pusat: 3200000, salatiga: 1700000, sragen: 800000 },
        { label: "19 Jun", pusat: 2400000, salatiga: 1300000, sragen: 600000 },
        { label: "21 Jun", pusat: 3400000, salatiga: 1700000, sragen: 800000 },
        { label: "23 Jun", pusat: 2900000, salatiga: 1500000, sragen: 700000 },
        { label: "25 Jun", pusat: 3800000, salatiga: 2000000, sragen: 900000 },
        { label: "27 Jun", pusat: 3300000, salatiga: 1700000, sragen: 800000 },
        { label: "29 Jun", pusat: 3600000, salatiga: 1900000, sragen: 900000 },
      ];
    case "month":
      return [
        { label: "Jan", pusat: 45000000, salatiga: 25000000, sragen: 15000000 },
        { label: "Feb", pusat: 38000000, salatiga: 22000000, sragen: 12000000 },
        { label: "Mar", pusat: 52000000, salatiga: 28000000, sragen: 16000000 },
        { label: "Apr", pusat: 48000000, salatiga: 26000000, sragen: 14000000 },
        { label: "Mei", pusat: 56000000, salatiga: 30000000, sragen: 16000000 },
        { label: "Jun", pusat: 62000000, salatiga: 34000000, sragen: 19000000 },
        { label: "Jul", pusat: 53000000, salatiga: 29000000, sragen: 16000000 },
        { label: "Agu", pusat: 68000000, salatiga: 37000000, sragen: 20000000 },
        { label: "Sep", pusat: 60000000, salatiga: 33000000, sragen: 17000000 },
        { label: "Okt", pusat: 72000000, salatiga: 40000000, sragen: 23000000 },
        { label: "Nov", pusat: 65000000, salatiga: 36000000, sragen: 19000000 },
        { label: "Des", pusat: 78000000, salatiga: 43000000, sragen: 24000000 },
      ];
    case "year":
      return [
        { label: "2022", pusat: 420000000, salatiga: 200000000, sragen: 100000000 },
        { label: "2023", pusat: 480000000, salatiga: 240000000, sragen: 130000000 },
        { label: "2024", pusat: 550000000, salatiga: 280000000, sragen: 150000000 },
        { label: "2025", pusat: 640000000, salatiga: 330000000, sragen: 180000000 },
        { label: "2026", pusat: 700000000, salatiga: 360000000, sragen: 190000000 },
      ];
  }
}

/* ── Static insight data (unchanged by granularity) ── */

type ActivityType =
  | "service_created"
  | "status_changed"
  | "payment_received"
  | "stock_used"
  | "purchase_created"
  | "shift_opened"
  | "shift_closed"
  | "note_added"
  | "alert";

interface ActivityLogItem {
  type: ActivityType;
  user: string;
  text: string;
  tag: string;
  time: string;
}

const ACTIVITY_LOG_GROUPS: { label: string; items: ActivityLogItem[] }[] = [
  {
    label: "Today",
    items: [
      {
        type: "service_created",
        user: "Master Admin",
        text: "membuat servis baru untuk iPhone 11 atas nama Budi Santoso.",
        tag: "Servis Baru",
        time: "09:12",
      },
      {
        type: "status_changed",
        user: "Frontliner Semarang",
        text: "memindahkan status SRV-1024 ke Perbaikan.",
        tag: "Update Status",
        time: "09:46",
      },
      {
        type: "payment_received",
        user: "Admin Cabang",
        text: "menerima pembayaran QRIS sebesar Rp 350.000 untuk SRV-1023.",
        tag: "Pembayaran",
        time: "10:18",
      },
      {
        type: "stock_used",
        user: "Teknisi Andi",
        text: "menggunakan Battery iPhone 11 sebanyak 1 pcs untuk SRV-1024.",
        tag: "Sparepart",
        time: "10:42",
      },
    ],
  },
  {
    label: "Yesterday",
    items: [
      {
        type: "shift_opened",
        user: "Master Admin",
        text: "membuka shift toko cabang Semarang Pusat.",
        tag: "Shift",
        time: "08:01",
      },
      {
        type: "purchase_created",
        user: "Admin Cabang",
        text: "mencatat pembelian stok dari Toko Sparepart Semarang senilai Rp 1.200.000.",
        tag: "Belanja",
        time: "13:25",
      },
      {
        type: "shift_closed",
        user: "Master Admin",
        text: "menutup shift dengan selisih kas Rp 5.000.",
        tag: "Tutup Shift",
        time: "20:14",
      },
    ],
  },
  {
    label: "Earlier This Week",
    items: [
      {
        type: "note_added",
        user: "Frontliner Semarang",
        text: "menambahkan catatan customer untuk SRV-1018.",
        tag: "Catatan",
        time: "Senin, 14:21",
      },
      {
        type: "status_changed",
        user: "Teknisi Dimas",
        text: "memindahkan SRV-1017 ke QC.",
        tag: "QC",
        time: "Selasa, 16:08",
      },
    ],
  },
  {
    label: "Last Week",
    items: [
      {
        type: "alert",
        user: "System",
        text: "mendeteksi stok LCD iPhone XR habis di cabang Semarang Pusat.",
        tag: "Alert",
        time: "02 Jun 2026",
      },
    ],
  },
];

const ACTIVITY_TYPE_STYLES: Record<
  ActivityType,
  { icon: React.ElementType; marker: string; badge: string }
> = {
  service_created: {
    icon: Wrench,
    marker: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  status_changed: {
    icon: RefreshCw,
    marker: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  payment_received: {
    icon: Wallet,
    marker: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  stock_used: {
    icon: PackageMinus,
    marker: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  purchase_created: {
    icon: ShoppingCartIcon,
    marker: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  shift_opened: {
    icon: Store,
    marker: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  shift_closed: {
    icon: CheckCircle2,
    marker: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
  note_added: {
    icon: MessageSquare,
    marker: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  alert: {
    icon: AlertTriangle,
    marker: "bg-red-500/10 text-red-600 dark:text-red-400",
    badge: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

const TODAY_ACTIVITIES = [
  { label: "Servis Masuk", count: 24, icon: Wrench },
  { label: "Transaksi POS", count: 18, icon: ShoppingCart },
  { label: "Sparepart Digunakan", count: 14, icon: Package },
  { label: "Cash Movement", count: 5, icon: Wallet },
];

const NEED_ACTION = [
  { label: "Servis menunggu QC", count: 3, severity: "high" as const },
  { label: "Stok menipis", count: 2, severity: "medium" as const },
  { label: "Invoice belum lunas", count: 1, severity: "medium" as const },
  { label: "Shift belum tutup", count: 1, severity: "low" as const },
];

const SHIFT_STATUSES = [
  { branch: "Semarang Pusat", status: "Sedang Berjalan" },
  { branch: "Salatiga", status: "Tutup toko" },
  { branch: "Sragen", status: "Belum Buka" },
];

/* ── Chart config ── */

const branchChartConfig = {
  pusat: {
    label: "Semarang Pusat",
    color: "hsl(var(--chart-1))",
  },
  salatiga: {
    label: "Salatiga",
    color: "hsl(var(--chart-2))",
  },
  sragen: {
    label: "Sragen",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

/* ── Helpers ── */

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function sevBadge(s: "high" | "medium" | "low") {
  switch (s) {
    case "high":
      return { variant: "destructive" as const, label: "High" };
    case "medium":
      return { variant: "default" as const, label: "Medium" };
    case "low":
      return { variant: "secondary" as const, label: "Low" };
  }
}

function statusBadge(s: string) {
  switch (s) {
    case "Sedang Berjalan":
      return { variant: "default" as const, dot: "bg-emerald-500" };
    case "Tutup toko":
      return { variant: "secondary" as const, dot: "bg-gray-400" };
    default:
      return { variant: "outline" as const, dot: "bg-amber-400" };
  }
}

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

interface GeneralOverviewTabProps {
  dateRange?: DateRange;
  granularity: ChartGranularity;
}

export function GeneralOverviewTab({ dateRange, granularity }: GeneralOverviewTabProps) {
  const revenueData = React.useMemo(() => revenueDataForGranularity(granularity), [granularity]);
  const branchData = React.useMemo(() => {
    const raw = branchDataForGranularity(granularity);
    // If dateRange is set and data has Date-like label filtering, do it here
    // For mock data, just return the raw data
    return raw;
  }, [granularity]);

  const dataKey = React.useMemo(() => {
    switch (granularity) {
      case "hour":
      case "two-hour":
        return "label";
      case "day":
        return "label";
      case "month":
        return "label";
      case "year":
        return "label";
    }
  }, [granularity]);

  const descriptionText = React.useMemo(() => {
    switch (granularity) {
      case "hour":
        return "Revenue per jam hari ini";
      case "two-hour":
        return "Revenue per 2 jam hari ini";
      case "day":
        return "Revenue per hari";
      case "month":
        return "Revenue per bulan";
      case "year":
        return "Revenue per tahun";
    }
  }, [granularity]);
  const [openActivityGroups, setOpenActivityGroups] = React.useState<Record<string, boolean>>(() =>
    ACTIVITY_LOG_GROUPS.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.label] = true;
      return acc;
    }, {}),
  );

  const toggleActivityGroup = React.useCallback((label: string) => {
    setOpenActivityGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  }, []);

  const healthResult = React.useMemo(
    () => calculateOperationalHealth(getMockOperationalHealthInput()),
    [],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      {/* ══ LEFT COLUMN ══ */}
      <div className="space-y-6">
        {/* ── Top Summary Cards ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Revenue"
            value="Rp 4.250.000"
            helper="+12% periode sebelumnya"
            trend={12}
            icon={DollarSign}
          />
          <SummaryCard
            label="Total Aktivitas"
            value="57"
            helper="servis, POS, inventory, dan kas"
            trend={8}
            icon={Activity}
          />
          <SummaryCard
            label="Laba Bersih"
            value="Rp 2.850.000"
            helper="Margin 67%"
            trend={15}
            icon={TrendingUp}
          />
        </div>

        {/* ── Chart 1: Statistik Revenue ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Statistik Revenue
            </CardTitle>
            <CardDescription className="text-xs">{descriptionText}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ChartContainer
                config={{
                  revenue: {
                    label: "Revenue",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-full w-full"
              >
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey={dataKey}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval={granularity === "day" ? 1 : 0}
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
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    fill="url(#revGrad)"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── Chart 2: Statistik Revenue Tiap Cabang ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Statistik Revenue Tiap Cabang
            </CardTitle>
            <CardDescription className="text-xs">
              Per cabang ({descriptionText.toLowerCase()})
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            <div className="h-[220px]">
              <ChartContainer
                config={branchChartConfig}
                className="h-full w-full"
              >
                <AreaChart data={branchData}>
                  <defs>
                    <linearGradient id="fillPusat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillSalatiga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillSragen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey={dataKey}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval={granularity === "day" ? 1 : 0}
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
                  <Area
                    dataKey="sragen"
                    type="natural"
                    fill="url(#fillSragen)"
                    stroke="hsl(var(--chart-3))"
                    stackId="a"
                    strokeWidth={1.5}
                  />
                  <Area
                    dataKey="salatiga"
                    type="natural"
                    fill="url(#fillSalatiga)"
                    stroke="hsl(var(--chart-2))"
                    stackId="a"
                    strokeWidth={1.5}
                  />
                  <Area
                    dataKey="pusat"
                    type="natural"
                    fill="url(#fillPusat)"
                    stroke="hsl(var(--chart-1))"
                    stackId="a"
                    strokeWidth={1.5}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── Operational Health Score + Revenue vs Target ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Operational Health Score */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Operational Health Score
              </CardTitle>
              <CardDescription className="text-xs">
                Ringkasan kesehatan operasional berdasarkan servis, shift, stok, dan finance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Score + Badge */}
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold tabular-nums">
                  {healthResult.score}
                </span>
                <span className="text-lg leading-none text-muted-foreground">/ 100</span>
                <Badge
                  variant={
                    healthResult.label === "Kritis"
                      ? "destructive"
                      : healthResult.label === "Perlu Perhatian"
                        ? "secondary"
                        : "default"
                  }
                  className="ml-auto"
                >
                  {healthResult.label}
                </Badge>
              </div>

              {/* Progress bar — color adapts to score */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${healthResult.score}%`,
                    backgroundColor:
                      healthResult.score >= 85
                        ? "hsl(var(--chart-2))"
                        : healthResult.score >= 70
                          ? "hsl(var(--chart-1))"
                          : healthResult.score >= 50
                            ? "hsl(35, 92%, 50%)"
                            : "hsl(0, 84%, 60%)",
                  }}
                />
              </div>

              {/* Factors */}
              <div className="space-y-2 pt-1">
                {healthResult.factors.map((factor) => {
                  const Icon =
                    factor.status === "good"
                      ? CheckCircle2
                      : factor.status === "warning"
                        ? AlertTriangle
                        : XCircle;

                  const iconColor =
                    factor.status === "good"
                      ? "text-emerald-500"
                      : factor.status === "warning"
                        ? "text-amber-500"
                        : "text-red-500";

                  return (
                    <div
                      key={factor.label}
                      className="flex items-center gap-2 text-xs text-foreground"
                    >
                      <Icon className={`size-3.5 shrink-0 ${iconColor}`} />
                      <span className="flex-1">{factor.message}</span>
                      <span
                        className={`shrink-0 text-[10px] font-medium tabular-nums ${
                          factor.score >= 70
                            ? "text-emerald-600 dark:text-emerald-400"
                            : factor.score >= 40
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {factor.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Revenue vs Target */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Revenue vs Target
              </CardTitle>
              <CardDescription className="text-xs">
                Progress pencapaian target revenue pada periode terpilih.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Value */}
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold tabular-nums">
                  Rp 42.500.000
                </span>
                <span className="text-xs text-muted-foreground">
                  dari target Rp 70.000.000
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium tabular-nums">61%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[61%] rounded-full bg-primary transition-all" />
                </div>
              </div>

              {/* Remaining target */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sisa target</span>
                <span className="font-medium tabular-nums">Rp 27.500.000</span>
              </div>

              {/* Daily insight */}
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <TrendingUp className="size-3.5 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground">
                  Estimasi perlu{" "}
                  <span className="font-medium text-foreground">
                    Rp 1.300.000
                  </span>{" "}
                  per hari untuk mencapai target
                </span>
              </div>

              {/* Trend */}
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-3" />
                +12% dibanding periode sebelumnya
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Service Activity & More ── */}
        <div className="flex flex-wrap gap-6">
          <div className="min-w-[280px] flex-1">
            <OperationalHourHeatmap dateRange={dateRange} />
          </div>
          <div className="min-w-[220px] flex-1">
            <Card className="shadow-xs h-full">
              <CardHeader className="pb-3">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="mt-1.5 h-3 w-40 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  <div className="h-16 animate-pulse rounded-lg bg-muted" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* ══ RIGHT INSIGHT COLUMN ══ */}
      <div className="flex flex-col gap-6">
        {/* ── Activity Log ── */}
        <Card className="overflow-hidden shadow-xs">
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                Activity Log
              </CardTitle>
              <CardDescription className="text-xs">
                Riwayat aktivitas terbaru dari operasional toko.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-[10px]"
            >
              Lihat semua
            </Button>
          </CardHeader>
          <CardContent className="relative p-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-card to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-gradient-to-t from-card to-transparent" />
            <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto px-5 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ACTIVITY_LOG_GROUPS.map((group) => {
                const isOpen = openActivityGroups[group.label] ?? true;

                return (
                  <div key={group.label} className="space-y-2">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggleActivityGroup(group.label)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg bg-muted/45 px-2 py-1.5 text-left transition-colors hover:bg-muted"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        {group.label}
                      </span>
                      <span className="ml-auto rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {group.items.length}
                      </span>
                      <ChevronDown
                        className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="space-y-1">
                        {group.items.map((item, index) => {
                          const style = ACTIVITY_TYPE_STYLES[item.type];
                          const Icon = style.icon;
                          const isLast = index === group.items.length - 1;

                          return (
                            <div
                              key={`${group.label}-${item.time}-${item.tag}`}
                              className="group relative flex gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-muted/40"
                            >
                              <div className="relative flex shrink-0 justify-center">
                                {!isLast && (
                                  <span className="absolute left-1/2 top-7 h-[calc(100%-1rem)] w-px -translate-x-1/2 bg-border" />
                                )}
                                <span
                                  className={`relative z-10 flex size-7 items-center justify-center rounded-full ${style.marker}`}
                                >
                                  <Icon className="size-3.5" />
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="min-w-0 text-xs leading-relaxed text-foreground">
                                    <span className="font-semibold text-foreground">
                                      {item.user}
                                    </span>{" "}
                                    <span className="text-muted-foreground">
                                      {item.text}
                                    </span>
                                  </p>
                                  <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
                                    {item.time}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className={`h-5 rounded-full border-0 px-2 text-[10px] font-medium ${style.badge}`}
                                  >
                                    {item.tag}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground sm:hidden">
                                    {item.time}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Aktivitas Hari Ini ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Aktivitas Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TODAY_ACTIVITIES.map((act) => (
              <div
                key={act.label}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                    <act.icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-foreground">{act.label}</span>
                </div>
                <Badge
                  variant="secondary"
                  className="h-5 min-w-[28px] justify-center rounded-full px-2 text-[10px] font-medium"
                >
                  {act.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Butuh Tindakan ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Butuh Tindakan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {NEED_ACTION.map((item) => {
              const b = sevBadge(item.severity);
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-xs text-foreground">{item.label}</span>
                  <Badge
                    variant={b.variant}
                    className="h-5 shrink-0 rounded-full px-2 text-[10px] font-normal"
                  >
                    {item.count} {b.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Shift Status ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Status Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SHIFT_STATUSES.map((s) => {
              const b = statusBadge(s.status);
              return (
                <div
                  key={s.branch}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`size-2 rounded-full ${b.dot}`}
                    />
                    <span className="text-xs text-foreground">{s.branch}</span>
                  </div>
                  <Badge
                    variant={b.variant}
                    className="h-5 rounded-full px-2 text-[10px] font-normal"
                  >
                    {s.status}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
