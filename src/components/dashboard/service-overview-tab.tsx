"use client";

import * as React from "react";
import {
  Wallet,
  ClipboardList,
  CheckCircle2,
  Package,
  Clock,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SummaryCard } from "@/components/dashboard/summary-card";
import PartitionBar, {
  PartitionBarSegment,
  PartitionBarSegmentTitle,
  PartitionBarSegmentValue,
} from "@/components/8starlabs-ui/partition-bar";
import type { DashboardService } from "@/server/actions/dashboard.actions";

/* ── Helpers ── */

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function sevBadge(s: "high" | "medium" | "low") {
  switch (s) {
    case "high": return { variant: "destructive" as const, label: "High" };
    case "medium": return { variant: "default" as const, label: "Medium" };
    case "low": return { variant: "secondary" as const, label: "Low" };
  }
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
  const pipelineData = data?.pipelineData ?? [];
  const recentServices = (data?.recentServices ?? []).slice(0, 5);
  const needAttention = data?.needAttention ?? [];
  const techPerformances = data?.techPerformances ?? [];

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
      cell: () => (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
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
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ══ LEFT COLUMN ══ */}
      <div className="space-y-3">
        {/* ── KPI Cards ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Penghasilan Servis" value={formatRp(data?.totalServiceRevenue ?? 0)} helper="dari pembayaran servis" icon={Wallet} />
          <SummaryCard label="Servis Diterima" value={String(data?.serviceInCount ?? 0)} helper="servis masuk" icon={ClipboardList} />
          <SummaryCard label="Servis Selesai" value={String(data?.serviceDoneCount ?? 0)} helper="selesai" icon={CheckCircle2} />
          <SummaryCard label="Unit Belum Diambil" value={String(data?.serviceUncollectedCount ?? 0)} helper="belum diserahkan" icon={Package} />
        </div>

        {/* ── Pipeline Servis ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pipeline Servis</CardTitle>
            <CardDescription className="text-xs">Distribusi status servis aktif hari ini</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pipelineData.length > 0 ? (
              <PartitionBar size="lg" gap={1} className="w-full">
                {pipelineData.map((p) => (
                  <PartitionBarSegment key={p.label} num={p.count} variant={p.variant} alignment="center">
                    <PartitionBarSegmentTitle>{p.label}</PartitionBarSegmentTitle>
                    <PartitionBarSegmentValue>{p.count}</PartitionBarSegmentValue>
                  </PartitionBarSegment>
                ))}
              </PartitionBar>
            ) : (
              <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
                Belum ada data servis pada periode ini.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Recent Servis ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Servis</CardTitle>
            <CardDescription className="text-xs">Aktivitas servis terbaru dari cabang terpilih</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
        {/* ── Butuh Perhatian ── */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Butuh Perhatian</CardTitle>
            <CardDescription className="text-xs">Servis yang membutuhkan tindakan segera</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {needAttention.length > 0 ? (
              needAttention.map((item) => {
                const b = sevBadge(item.severity);
                return (
                  <div key={item.device} className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{item.device}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{item.reason}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant={b.variant} className="h-5 rounded-full px-2 text-[10px] font-normal">{b.label}</Badge>
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]">Lihat</Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">Semua dalam kondisi baik.</p>
            )}
          </CardContent>
        </Card>

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
