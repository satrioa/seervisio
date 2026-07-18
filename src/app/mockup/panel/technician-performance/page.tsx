"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  AlertTriangle, RefreshCw, Wrench, CheckCircle2, Clock,
  DollarSign, Users, Star, AlertCircle, User, Plus,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card, CardContent,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import {
  getTechnicianPerformanceAction,
  type TechPerfData, type TechnicianStat, type TrendDay,
  type TechPerfFilters, type PeriodFilter,
} from "@/server/actions/technician-performance.actions";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const PAGE_SIZE = 6;
const CARD_WIDTH = 340;

/* ── Helpers ── */

function formatCurrency(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

function compactCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000) return `Rp${(amount / 1_000).toFixed(0)}rb`;
  return `Rp${amount}`;
}

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.floor(hours)}j ${Math.round((hours % 1) * 60)}m`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "short" }).slice(0, 2);
}

function dayFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "TODAY", label: "Hari Ini" },
  { value: "7_DAYS", label: "7 Hari" },
  { value: "THIS_MONTH", label: "Bulan Ini" },
];

/* ── Mini sparkline (bars) ── */
function MiniSparkline({ data, height = 40 }: { data: TrendDay[]; height?: number }) {
  if (!data || data.length === 0) return <div className="h-10 flex items-center justify-center text-xs text-muted-foreground/60">—</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="completed" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Leaderboard row ── */
function LeaderboardRow({
  rank, name, completedCount, revenue,
}: {
  rank: number; name: string; completedCount: number; revenue: number;
}) {
  const colors = ["bg-amber-400", "bg-gray-400", "bg-amber-700", "bg-gray-300"];
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-amber-100 last:border-0">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${colors[rank - 1] ?? "bg-gray-300"}`}>
        {rank}
      </span>
      <span className="flex-1 text-sm font-medium truncate">{name}</span>
      <span className="text-sm font-semibold tabular-nums">{completedCount}</span>
      <span className="text-xs text-muted-foreground ml-1 tabular-nums">{compactCurrency(revenue)}</span>
    </div>
  );
}

/* ── Detail Modal ── */
function TechnicianDetailModal({
  tech, open, onOpenChange,
}: {
  tech: TechnicianStat | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!tech) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto border-amber-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
              {getInitials(tech.name)}
            </div>
            <div>
              <DialogTitle>{tech.name}</DialogTitle>
              <DialogDescription>
                {tech.branches.length > 0 ? tech.branches.join(", ") : "Semua cabang"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-xl font-bold text-orange-700">{formatCurrency(tech.revenue)}</p>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-100 p-3">
            <p className="text-xs text-muted-foreground">Selesai</p>
            <p className="text-xl font-bold text-green-700">{tech.completedCount}</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
            <p className="text-xs text-muted-foreground">Aktif</p>
            <p className="text-xl font-bold text-blue-700">{tech.activeCount}</p>
          </div>
          <div className="rounded-lg bg-purple-50 border border-purple-100 p-3">
            <p className="text-xs text-muted-foreground">Rata-rata Durasi</p>
            <p className="text-xl font-bold text-purple-700">{formatHours(tech.avgDurationHours)}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium mb-2 text-amber-800">Tren 7 Hari Terakhir</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={tech.weeklyTrend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={dayLabel} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #fde68a" }}
                formatter={(value: any) => [`${value} servis`, "Selesai"]}
                labelFormatter={dayFull}
              />
              <Bar dataKey="completed" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Technician Card Wrapper ── */
import { TechnicianCard } from "@/components/services/technician-card";

function TechnicianCardWrapper({
  tech, index,
}: {
  tech: TechnicianStat;
  index: number;
}) {
  return (
    <TechnicianCard
      rank={index + 1}
      name={tech.name}
      branchName={tech.branches.length > 0 ? tech.branches.join(", ") : "Semua cabang"}
      avatarUrl={tech.avatarUrl}
      revenue={tech.revenue}
      completedCount={tech.completedCount}
      activeCount={tech.activeCount}
      avgDurationHours={tech.avgDurationHours}
    />
  );
}

/* ── Left Summary Panel ── */
function TeamSummaryPanel({ data }: { data: TechPerfData }) {
  const s = data.teamSummary;
  const total = s.totalCompleted + s.totalActive;
  const pct = Math.round(s.completionRate * 100);

  return (
    <Card className="flex h-full border-border/70 bg-card shadow-sm">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Teknisi
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.technicians.length} teknisi aktif
          </p>
        </div>

        {/* Main metrics row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue periode ini</p>
            <p className="text-3xl font-bold text-primary leading-tight tabular-nums">
              {formatCurrency(s.totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Servis selesai</p>
            <p className="text-3xl font-bold text-emerald-600 leading-tight tabular-nums dark:text-emerald-400">
              {s.totalCompleted}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {s.totalActive} aktif · {s.totalUnassigned} belum ditugaskan
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium">Tingkat penyelesaian</span>
            <span className="font-bold text-primary tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {s.totalCompleted} dari {total} servis terselesaikan
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Leaderboard — fills remaining space */}
        <div className="flex flex-1 flex-col min-h-0">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2 shrink-0">
            <Star className="h-4 w-4 text-primary" />
            Leaderboard Periode Ini
          </h3>
          {s.leaderboard.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada data</p>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {s.leaderboard.map((t, i) => (
                <LeaderboardRow key={t.profileId} rank={i + 1} name={t.name} completedCount={t.completedCount} revenue={t.revenue} />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Weekly trend — pinned to bottom */}
        <div className="shrink-0 rounded-md border border-border/60 bg-muted/20 p-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            Trend Mingguan
          </h3>
          <ResponsiveContainer width="100%" height={132}>
            <BarChart data={data.trendOverall} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={dayLabel} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={20} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(value: any) => [`${value} servis`, "Selesai"]}
                labelFormatter={dayFull}
              />
              <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Skeleton ── */
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-60" />
      </div>
      <div className="grid min-h-[calc(100svh-220px)] grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,2fr)]">
        <Card className="h-full min-h-[520px] border-border/70 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <div className="-m-3 flex h-full min-h-[520px] gap-4 overflow-visible p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-full shrink-0 border-border/70 shadow-sm" style={{ width: CARD_WIDTH, minWidth: CARD_WIDTH }}>
              <CardContent className="p-5 space-y-4">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Circular Load More button ── */
function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-center pl-1" style={{ minWidth: 100 }}>
      <Button
        variant="outline"
        size="icon"
        className="h-16 w-16 rounded-full border-2 border-border text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
        onClick={onClick}
        disabled={loading}
        aria-label="Muat teknisi lainnya"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

/* ── Main Page ── */
export default function TechnicianPerformancePage() {
  const params = useParams();
  const brandSlug = params?.brandSlug as string;
  const { userRole, branches } = useActiveBranch();
  const canView = can(userRole as any, PERMISSIONS.CUSTOMER_VIEW);

  const [data, setData] = useState<TechPerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<PeriodFilter>("THIS_MONTH");
  const [branchFilter, setBranchFilter] = useState<string>("**ALL_BRANCHES**");
  const [technicianFilter, setTechnicianFilter] = useState<string>("**ALL_TECHNICIANS**");
  const [detailTech, setDetailTech] = useState<TechnicianStat | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchData = React.useCallback(async () => {
    if (!brandSlug) return;
    setLoading(true);
    setError(null);
    setVisibleCount(PAGE_SIZE);
    try {
      const filters: TechPerfFilters = {
        period,
        branchId: branchFilter !== "**ALL_BRANCHES**" ? branchFilter : null,
        technicianProfileId: technicianFilter !== "**ALL_TECHNICIANS**" ? technicianFilter : null,
      };
      const result = await getTechnicianPerformanceAction(brandSlug, filters);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message ?? "Gagal memuat data.");
    }
    setLoading(false);
  }, [brandSlug, period, branchFilter, technicianFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const displayedTechnicians = useMemo(() => {
    if (!data) return [];
    let list = data.technicians;
    if (technicianFilter !== "**ALL_TECHNICIANS**") {
      list = list.filter((t) => t.profileId === technicianFilter);
    }
    return list.sort((a, b) => b.completedCount - a.completedCount);
  }, [data, technicianFilter]);

  const visibleTechnicians = useMemo(
    () => displayedTechnicians.slice(0, visibleCount),
    [displayedTechnicians, visibleCount],
  );

  const hasMore = visibleCount < displayedTechnicians.length;

  const handleLoadMore = React.useCallback(() => {
    setLoadingMore(true);
    setVisibleCount((prev) => prev + PAGE_SIZE);
    setTimeout(() => setLoadingMore(false), 300);
  }, []);

  const techOptions = useMemo(() => {
    if (!data) return [];
    return data.technicians.map((t) => ({ value: t.profileId, label: t.name }));
  }, [data]);

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
      <div className="flex min-h-full flex-1 flex-col gap-5">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performa Teknisi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pantau kinerja dan produktivitas teknisi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="**ALL_BRANCHES**">Semua Cabang</SelectItem>
              {(branches ?? []).map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data && data.technicians.length > 0 && (
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger className="w-[170px] h-9 text-sm">
                <SelectValue placeholder="Semua Teknisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="**ALL_TECHNICIANS**">Semua Teknisi</SelectItem>
                {techOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* ═══ Loading ═══ */}
      {loading && !data && <PageSkeleton />}

      {/* ═══ Error ═══ */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ═══ Empty Data ═══ */}
      {!loading && data && data.technicians.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wrench className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Belum ada data teknisi</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Tidak ada teknisi aktif ditemukan untuk periode ini.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Muat Ulang
          </Button>
        </div>
      )}

      {/* ═══ Board ═══ */}
      {data && !loading && (
        <div className="grid h-[calc(100svh-140px)] grid-cols-1 items-stretch gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          {/* Left summary column */}
          <TeamSummaryPanel data={data} />

          {/* Right: horizontal technician cards */}
          <div className="h-full min-w-0 overflow-visible">
            {displayedTechnicians.length === 0 ? (
              <div className="flex h-full min-h-[520px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                Tidak ada teknisi yang cocok dengan filter.
              </div>
            ) : (
              <div className="-m-3 flex h-full min-h-[520px] items-stretch gap-4 overflow-x-auto overflow-y-visible hide-scrollbar scroll-smooth p-3">
                {visibleTechnicians.map((tech, idx) => (
                  <TechnicianCardWrapper
                    key={tech.profileId}
                    tech={tech}
                    index={idx}
                  />
                ))}
                {hasMore && (
                  <LoadMoreButton onClick={handleLoadMore} loading={loadingMore} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Detail Modal ═══ */}
      <TechnicianDetailModal
        tech={detailTech}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
