"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Wallet,
  ClipboardList,
  CheckCircle2,
  Package,
  Clock,
} from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { ActionRequiredCard } from "@/components/services/service-overview-action-card";
import { PickupQueueCard } from "@/components/services/service-overview-pickup-card";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import type { DashboardService } from "@/server/actions/dashboard.actions";
import {
  getServiceOverviewV2Action,
  type OverviewV2Data,
} from "@/server/actions/service.actions";

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

type RecentServis = {
  id: string;
  serviceNumber: string;
  customer: string;
  device: string;
  status: string;
  tech: string;
  time: string;
  variant: "default" | "secondary" | "outline" | "destructive";
};

interface ServiceOverviewTabProps {
  data: DashboardService | null;
}

export function ServiceOverviewTab({ data }: ServiceOverviewTabProps) {
  const pathname = usePathname();
  const router = useRouter();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId } = useActiveBranch();

  const pipelineData = data?.pipelineData ?? [];
  const recentServices = (data?.recentServices ?? []).slice(0, 5);
  const techPerformances = data?.techPerformances ?? [];

  const [overviewData, setOverviewData] = React.useState<OverviewV2Data | null>(null);

  React.useEffect(() => {
    getServiceOverviewV2Action(brandSlug, activeBranchId).then((result) => {
      if (result.success) setOverviewData(result.data);
    });
  }, [brandSlug, activeBranchId]);

  const handleOpenService = React.useCallback(
    (serviceId: string) => {
      router.push(`/${brandSlug}/panel/services?service=${serviceId}`);
    },
    [brandSlug, router],
  );

  const pipelineChartData = React.useMemo(() => {
    const colorMap = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--color-success)", "var(--chart-5)"];
    return pipelineData.map((p, i) => ({
      status: p.label,
      count: p.count,
      fill: colorMap[i % colorMap.length],
    }));
  }, [pipelineData]);

  const pipelineChartConfig = {
    count: { label: "Servis", color: "var(--chart-1)" },
    Masuk: { label: "Masuk", color: "var(--chart-1)" },
    Diagnosa: { label: "Diagnosa", color: "var(--chart-2)" },
    Menunggu: { label: "Menunggu", color: "var(--chart-3)" },
    Perbaikan: { label: "Perbaikan", color: "var(--chart-4)" },
    QC: { label: "QC", color: "var(--chart-5)" },
    Selesai: { label: "Selesai", color: "var(--color-success)" },
    Batal: { label: "Batal", color: "var(--chart-5)" },
  } satisfies ChartConfig;

  const totalPipeline = React.useMemo(
    () => pipelineData.reduce((s, p) => s + p.count, 0),
    [pipelineData],
  );

  const columns: ColumnDef<RecentServis>[] = [
    {
      id: "serviceNumber",
      header: "ID Servis",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">{row.original.serviceNumber}</span>
      ),
    },
    {
      id: "customer-device",
      header: "Pelanggan",
      cell: ({ row }) => {
        const srv = row.original;
        return (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{srv.customer}</p>
            <p className="truncate text-[10px] text-muted-foreground">{srv.device}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const srv = row.original;
        return (
          <Badge variant={srv.variant} className="h-5 rounded-full px-2 text-[10px] font-normal">
            {srv.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "tech",
      header: "Teknisi",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.getValue("tech")}</span>
      ),
    },
    {
      accessorKey: "time",
      header: "Waktu",
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="size-3" />
          {row.getValue("time")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleOpenService(row.original.id)}>
          Detail
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: recentServices.map((rs) => ({
      id: rs.id,
      serviceNumber: rs.serviceNumber,
      customer: rs.customer,
      device: rs.device,
      status: rs.status,
      tech: rs.tech,
      time: rs.time,
      variant: rs.variant,
    })),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
      {/* ══ LEFT COLUMN ══ */}
      <div className="space-y-3">
        {/* ── KPI (2x2) + Pipeline Chart row ── */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr]">
          {/* 2x2 KPI Cards — no gap */}
          <div className="grid grid-cols-2 gap-0 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs">
            <SummaryCard label="Penghasilan Servis" value={formatRp(data?.totalServiceRevenue ?? 0)} helper="dari pembayaran servis" icon={Wallet} />
            <SummaryCard label="Servis Diterima" value={String(data?.serviceInCount ?? 0)} helper="servis masuk" icon={ClipboardList} />
            <SummaryCard label="Servis Selesai" value={String(data?.serviceDoneCount ?? 0)} helper="selesai" icon={CheckCircle2} />
            <SummaryCard label="Unit Belum Diambil" value={String(data?.serviceUncollectedCount ?? 0)} helper="belum diserahkan" icon={Package} />
          </div>

          {/* Pipeline Donut Chart */}
          <Card>
            <CardHeader className="items-center pb-0">
              <CardTitle>Pipeline Servis</CardTitle>
              <CardDescription>Distribusi status servis</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              {pipelineData.length > 0 ? (
                <ChartContainer
                  config={pipelineChartConfig}
                  className="mx-auto aspect-square max-h-[260px]"
                >
                  <PieChart accessibilityLayer>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="min-w-36 gap-2"
                          formatter={(value, name) => {
                            const cfg = pipelineChartConfig[name as keyof typeof pipelineChartConfig];
                            const dotColor = cfg?.color || "var(--chart-1)";
                            return (
                              <div className="flex w-full items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                                    style={{ backgroundColor: dotColor }}
                                  />
                                  <span className="text-muted-foreground">
                                    {cfg?.label || name}
                                  </span>
                                </div>
                                <span className="text-foreground font-semibold tabular-nums">
                                  {Number(value).toLocaleString()}
                                </span>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <ChartLegend
                      content={<ChartLegendContent nameKey="status" />}
                      className="-translate-y-2 flex-wrap gap-2"
                    />
                    <Pie
                      data={pipelineChartData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={55}
                      cornerRadius={4}
                      paddingAngle={2}
                      stroke="var(--background)"
                      strokeWidth={2}
                    >
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className="fill-foreground text-2xl font-bold tabular-nums"
                                >
                                  {totalPipeline}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 20}
                                  className="fill-muted-foreground text-xs"
                                >
                                  Total Servis
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                  Belum ada data servis pada periode ini.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Recent Servis ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Servis</CardTitle>
            <CardDescription className="text-xs">Aktivitas servis terbaru dari cabang terpilih</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {recentServices.length > 0 ? (
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="h-9 px-3 text-[10px] font-medium text-muted-foreground">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-3 py-2.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-20 items-center justify-center text-xs text-muted-foreground px-4">
                Belum ada servis terbaru.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ RIGHT COLUMN ══ */}
      <div className="space-y-3">
        {/* ── Action Required ── */}
        {overviewData && overviewData.actionRequired.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Action Required
              </span>
              <span className="text-[10px] text-muted-foreground/50">{overviewData.actionRequired.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {overviewData.actionRequired.map((item) => (
                <ActionRequiredCard key={item.id} item={item} onOpen={handleOpenService} className="w-full" />
              ))}
            </div>
          </div>
        )}

        {/* ── Pickup Queue ── */}
        {overviewData && overviewData.pickupQueue.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pickup Queue
              </span>
              <span className="text-[10px] text-muted-foreground/50">{overviewData.pickupQueue.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {overviewData.pickupQueue.map((item) => (
                <PickupQueueCard key={item.id} item={item} onOpen={handleOpenService} className="w-full" />
              ))}
            </div>
          </div>
        )}

        {/* Empty state when nothing needs attention */}
        {overviewData && overviewData.actionRequired.length === 0 && overviewData.pickupQueue.length === 0 && (
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Butuh Perhatian</CardTitle>
              <CardDescription className="text-xs">Servis yang membutuhkan tindakan segera</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Tidak ada item yang memerlukan perhatian saat ini.</p>
            </CardContent>
          </Card>
        )}

        {/* ── Performa Teknisi ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Performa Teknisi</CardTitle>
            <CardDescription className="text-xs">Ringkasan produktivitas teknisi hari ini</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {techPerformances.length > 0 ? (
              techPerformances.map((t) => (
                <div key={t.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground">{t.name[0]}</div>
                      <span className="text-xs font-medium text-foreground">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{t.selesai} selesai</span><span>·</span><span>{t.proses} proses</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${t.rating}%` }} />
                    </div>
                    <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">{t.rating}%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Belum ada data teknisi.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
