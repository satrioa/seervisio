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
import { getDashboardOverviewAction, type DashboardData } from "@/server/actions/dashboard.actions";
import { consumeDashboardPrefetch, type DashboardPrefetchResult } from "@/lib/dashboard/dashboard-prefetch";

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
   DASHBOARD CONTENT
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

  const prefetched = React.useRef<Promise<DashboardPrefetchResult> | null>(consumeDashboardPrefetch(brandSlug));
  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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

  /* ── Fetch real data ── */
  React.useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setError(null);
      try {
        /* Check prefetched data (only for initial load w/ default params) */
        if (prefetched.current) {
          const cached = await prefetched.current;
          prefetched.current = null;
          if (cancelled) return;
          if (cached.success && cached.data) {
            setDashboardData(cached.data);
            setLoading(false);
            return;
          }
        }

        setLoading(true);
        const dateFrom = dateRange?.from
          ? dateRange.from.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        const dateTo = dateRange?.to
          ? dateRange.to.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        const result = await getDashboardOverviewAction(brandSlug, {
          dateFrom,
          dateTo,
          branchId: activeBranchId ?? undefined,
        });
        if (cancelled) return;
        if (result.success && result.data) {
          setDashboardData(result.data);
        } else {
          setError("error" in result ? (result as any).error || "Gagal memuat data dashboard." : "Gagal memuat data dashboard.");
          setDashboardData(null);
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("[DashboardContent] fetch error:", err);
        setError(err.message || "Gagal memuat dashboard.");
        setDashboardData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [brandSlug, activeBranchId, dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  return (
    <div className="flex flex-col gap-4" data-tour="dashboard-overview">
      {/* ── Page Header ── */}
      <PageHeader title="Dashboard" />

      {/* ── Tabs ── */}
      <Tabs defaultValue="general" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="gap-1">
            <TabsTrigger value="general">
              <Store /> General
            </TabsTrigger>
            <TabsTrigger value="servis">
              <Wrench /> Servis
            </TabsTrigger>
            <TabsTrigger value="finance">
              <DollarSign /> Finance
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <Package /> Inventory
            </TabsTrigger>
          </TabsList>
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
        </div>

        {/* TAB 1 — GENERAL */}
        <TabsContent value="general" className="flex flex-col gap-4">
          <GeneralOverviewTab
            brandSlug={brandSlug}
            dateRange={dateRange}
            granularity={granularity}
            data={dashboardData?.general ?? null}
            loading={loading}
            error={error}
          />
        </TabsContent>

        {/* TAB 2 — SERVIS */}
        <TabsContent value="servis" className="flex flex-col gap-4">
          <ServiceOverviewTab data={dashboardData?.service ?? null} />
        </TabsContent>

        {/* TAB 3 — FINANCE */}
        <TabsContent value="finance" className="flex flex-col gap-4">
          <FinanceOverviewTab data={dashboardData?.finance ?? null} />
        </TabsContent>

        {/* TAB 4 — INVENTORY */}
        <TabsContent value="inventory" className="flex flex-col gap-4">
          <InventoryOverviewTab data={dashboardData?.inventory ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
