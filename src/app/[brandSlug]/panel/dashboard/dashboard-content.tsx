"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Clock, Activity, AlertTriangle, Store, Wrench,
  CheckCircle2, Users, DollarSign, TrendingUp,
  TrendingDown, ArrowRight, CreditCard, Package,
  Play, Wallet, ShoppingCart, AlertCircle, BarChart3,
  Landmark, Boxes, ClipboardList, LogOut,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { ServicePipeline } from "@/components/dashboard/service-pipeline";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ServiceOverviewTab } from "@/components/dashboard/service-overview-tab";
import { FinanceOverviewTab } from "@/components/dashboard/finance-overview-tab";
import { InventoryOverviewTab } from "@/components/dashboard/inventory-overview-tab";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { DateRange } from "react-day-picker";
import type { DateRangeMode, ChartGranularity } from "@/lib/dashboard/chart-granularity";
import { getChartGranularity } from "@/lib/dashboard/chart-granularity";

const GeneralOverviewTab = dynamic(
  () =>
    import("@/components/dashboard/general-overview-tab").then(
      (mod) => mod.GeneralOverviewTab,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Memuat dashboard...
      </div>
    ),
  },
);

interface DashboardContentProps {
  brandSlug: string;
}

/* ══════════════════════════════════════════════
   MOCK DATA
   ══════════════════════════════════════════════ */

const GENERAL_ACTIVITY = [
  { time: "08:02", text: "Shift dibuka oleh Master Admin", icon: Clock },
  { time: "08:15", text: "Service baru dibuat: iPhone 11", icon: Play },
  { time: "13:50", text: "Pembayaran QRIS diterima Rp 250.000", icon: CreditCard },
  { time: "13:22", text: "Sparepart Battery iPhone 11 digunakan", icon: Package },
  { time: "14:05", text: "POS transaksi selesai Rp 120.000", icon: ShoppingCart },
];

const PIPELINE = [
  { status: "Masuk", count: 4, color: "bg-blue-500" },
  { status: "Diagnosa", count: 3, color: "bg-amber-500" },
  { status: "Perbaikan", count: 7, color: "bg-orange-500" },
  { status: "QC", count: 5, color: "bg-purple-500" },
  { status: "Selesai", count: 16, color: "bg-emerald-500" },
  { status: "Batal", count: 1, color: "bg-gray-400" },
];

const SERVICE_ATTENTION = [
  { label: "iPhone 11", reason: "Menunggu QC lebih dari 2 jam", severity: "destructive" as const },
  { label: "iPhone XR", reason: "Sparepart battery kosong", severity: "default" as const },
  { label: "iPhone 13", reason: "Pembayaran belum lunas", severity: "default" as const },
];

const PAYMENT_METHODS = [
  { method: "Cash", pct: 35, color: "bg-emerald-500" },
  { method: "QRIS", pct: 40, color: "bg-blue-500" },
  { method: "Transfer", pct: 20, color: "bg-amber-500" },
  { method: "Debit", pct: 5, color: "bg-purple-500" },
];

const FINANCE_ALERTS = [
  "Kas perlu dicek sebelum tutup shift",
  "QRIS settlement belum masuk",
  "2 invoice servis belum lunas",
];

const LOW_STOCK = [
  { item: "Battery iPhone 11", sisa: 2 },
  { item: "LCD iPhone XR", sisa: 0, habis: true },
  { item: "Flexible Charger iPhone 12", sisa: 1 },
];

const INV_MOVEMENTS = [
  { item: "Battery iPhone 11", qty: 4, type: "keluar" },
  { item: "LCD iPhone XR", qty: 2, type: "masuk" },
  { item: "Flexible Charger iPhone 12", qty: 1, type: "keluar" },
];

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ══════════════════════════════════════════════
   DASHBOARD CONTENT
   ══════════════════════════════════════════════ */

export function DashboardContent({ brandSlug }: DashboardContentProps) {
  const [dateRange, setDateRange] = React.useState<DateRange|undefined>({
    from: new Date(2026, 7, 3),
    to: new Date(2026, 8, 21),
  });
  const [mode, setMode] = React.useState<DateRangeMode>("date");
  const [startYear, setStartYear] = React.useState<number|undefined>(undefined);
  const [endYear, setEndYear] = React.useState<number|undefined>(undefined);
  const [granularity, setGranularity] = React.useState<ChartGranularity>("day");

  const handleDateRangeChange = React.useCallback(
    (val: {
      dateRange: DateRange|undefined;
      mode: DateRangeMode;
      startYear: number|undefined;
      endYear: number|undefined;
      granularity: ChartGranularity;
    }) => {
      setDateRange(val.dateRange);
      setMode(val.mode);
      setStartYear(val.startYear);
      setEndYear(val.endYear);
      setGranularity(val.granularity);
    },
    []
  );

  return (
    <div className="space-y-3">
      {/* ── Page Header ── */}
      <PageHeader
        title="Dashboard"
        breadcrumbs={[
          { label: "Panel", href: `/${brandSlug}/panel` },
          { label: "Dashboard" },
        ]}
        actions={
          <DateRangePicker
            value={{
              dateRange,
              mode,
              startYear,
              endYear,
              granularity,
            }}
            onChange={handleDateRangeChange}
          />
        }
      />

      {/* ── Tabs ── */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto border-b bg-transparent p-0">
          <TabsTrigger
            value="general"
            className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground"
          >
            <Store className="mr-1.5 size-3.5" /> General
          </TabsTrigger>
          <TabsTrigger
            value="servis"
            className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground"
          >
            <Wrench className="mr-1.5 size-3.5" /> Servis
          </TabsTrigger>
          <TabsTrigger
            value="finance"
            className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground"
          >
            <DollarSign className="mr-1.5 size-3.5" /> Finance
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="relative rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-foreground data-[state=active]:text-foreground"
          >
            <Package className="mr-1.5 size-3.5" /> Inventory
          </TabsTrigger>
        </TabsList>

        {/* TAB 1 — GENERAL */}
        <TabsContent value="general" className="mt-3">
          <GeneralOverviewTab
            dateRange={dateRange}
            granularity={granularity}
          />
        </TabsContent>

        {/* TAB 2 — SERVIS */}
        <TabsContent value="servis" className="mt-3">
          <ServiceOverviewTab />
        </TabsContent>

        {/* TAB 3 — FINANCE */}
        <TabsContent value="finance" className="mt-3">
          <FinanceOverviewTab />
        </TabsContent>

        {/* TAB 4 — INVENTORY */}
        <TabsContent value="inventory" className="mt-3">
          <InventoryOverviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
