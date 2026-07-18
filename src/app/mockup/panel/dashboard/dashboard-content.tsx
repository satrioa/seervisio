"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Store, Wrench, DollarSign, Package } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { ServiceOverviewTab } from "@/components/dashboard/service-overview-tab";
import { FinanceOverviewTab } from "@/components/dashboard/finance-overview-tab";
import { InventoryOverviewTab } from "@/components/dashboard/inventory-overview-tab";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import type { DateRange } from "react-day-picker";
import type { DateRangeMode, ChartGranularity } from "@/lib/dashboard/chart-granularity";
import { getChartGranularity } from "@/lib/dashboard/chart-granularity";
import { mockDashboardData } from "./mock-data";
import type { DashboardData } from "@/server/actions/dashboard.actions";

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

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ══════════════════════════════════════════════
   DASHBOARD CONTENT (MOCKUP)
   ══════════════════════════════════════════════ */

export function DashboardContent({ brandSlug }: DashboardContentProps) {
  const { activeBranchId } = useActiveBranch();
  const [dateRange, setDateRange] = React.useState<DateRange|undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  });
  const [mode, setMode] = React.useState<DateRangeMode>("date");
  const [startYear, setStartYear] = React.useState<number|undefined>(undefined);
  const [endYear, setEndYear] = React.useState<number|undefined>(undefined);
  const [granularity, setGranularity] = React.useState<ChartGranularity>("day");

  const [dashboardData] = React.useState<DashboardData>(mockDashboardData);
  const loading = false;
  const error = null;

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
    <div className="space-y-3" data-tour="dashboard-overview">
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
            brandSlug={brandSlug}
            dateRange={dateRange}
            granularity={granularity}
            data={dashboardData.general}
            loading={false}
            error={null}
          />
        </TabsContent>

        {/* TAB 2 — SERVIS */}
        <TabsContent value="servis" className="mt-3">
          <ServiceOverviewTab data={dashboardData.service} />
        </TabsContent>

        {/* TAB 3 — FINANCE */}
        <TabsContent value="finance" className="mt-3">
          <FinanceOverviewTab data={dashboardData.finance} />
        </TabsContent>

        {/* TAB 4 — INVENTORY */}
        <TabsContent value="inventory" className="mt-3">
          <InventoryOverviewTab data={dashboardData.inventory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
