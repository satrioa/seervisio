"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Smartphone, Wrench, CheckCircle2, ClipboardList, Plus } from "lucide-react";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getServiceOverviewAction } from "@/server/actions/service.actions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  inProgress: {
    label: "Dalam Proses",
    color: "hsl(var(--chart-1))",
  },
  completed: {
    label: "Selesai",
    color: "hsl(var(--chart-2))",
  },
};

export function ServiceSidebarOverview() {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId } = useActiveBranch();
  const { openCreateService } = useRightSidebar();
  const [stats, setStats] = React.useState({
    totalMasuk: 0,
    dalamPerbaikan: 0,
    qc: 0,
    selesaiHariIni: 0,
    trend14Days: [] as Array<{ date: string; masuk: number; selesai: number }>,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    const normalizedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES"
      ? activeBranchId
      : null;
    console.log("[services:overview] source", {
      activeBranchId,
      normalizedBranchId,
    });
    getServiceOverviewAction(brandSlug, activeBranchId).then((result) => {
      if (result.success) {
        console.log("[services:overview] counts", result.data);
        setStats(result.data);
      }
      setLoading(false);
    });
  }, [brandSlug, activeBranchId]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
          <h3 className="truncate text-sm font-semibold">Overview Servis</h3>
        </div>
        <Button size="sm" className="h-8 shrink-0 gap-1.5 px-2.5 text-xs" onClick={openCreateService}>
          <Plus className="size-3.5" />
          Buat Servis Baru
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Smartphone className="size-3" />
                  Total Masuk
                </span>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {stats.totalMasuk}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Wrench className="size-3" />
                  Dalam Perbaikan
                </span>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {stats.dalamPerbaikan}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <ClipboardList className="size-3" />
                  QC
                </span>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {stats.qc}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <CheckCircle2 className="size-3" />
                  Selesai Hari Ini
                </span>
                <span className="text-xl font-bold tabular-nums text-foreground">
                  {stats.selesaiHariIni}
                </span>
              </div>
            </div>

            {stats.trend14Days.length > 0 && (
              <>
                <Separator />

                {/* Line Chart */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Trend Servis (14 Hari)
                  </h4>
                  <div className="rounded-lg border bg-card p-3">
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.trend14Days} margin={{ top: 5, right: 8, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val: string) => val.slice(3)}
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="masuk"
                            stroke="hsl(var(--chart-1))"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            name="inProgress"
                          />
                          <Line
                            type="monotone"
                            dataKey="selesai"
                            stroke="hsl(var(--chart-2))"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            name="completed"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>
              </>
            )}

            {/* Tip */}
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Klik salah satu servis di daftar untuk melihat detail lengkapnya.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

