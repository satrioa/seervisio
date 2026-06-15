"use client";

import * as React from "react";
import { useCallback, useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle, Loader2, Calendar, Download, ArrowUpRight, ArrowDownRight,
  ArrowRightLeft, Banknote, CreditCard, Store, ShoppingCart, Wifi,
  Landmark, Wallet, BarChart3, TrendingUp, TrendingDown, Users, Building2,
  FileText, History, ChevronRight, PiggyBank, Settings2, LucideIcon,
} from "lucide-react";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getFinanceReportAction,
  exportFinanceReportCSVAction,
  type FinanceReportData,
} from "@/server/actions/finance-report.actions";

import { useBrandTheme } from "@/components/theme/brand-theme-provider";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";

/* ── Formatting ── */

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return value; }
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return value; }
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function monthStartISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/* ── Types ── */

type DatePreset = "today" | "7days" | "month" | "custom";

interface KpiCardDef {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sub?: string;
}

function KpiCard({ label, value, icon: Icon, color, sub, loading }: KpiCardDef & { loading: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`size-4 shrink-0 ${color}`} />
        </div>
        <span className={`text-xl font-semibold ${color}`}>
          {loading ? <Skeleton className="h-7 w-28" /> : value}
        </span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isOpen = status === "OPEN";
  return (
    <Badge variant={isOpen ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
      {isOpen ? "Aktif" : status === "CLOSED" ? "Tutup" : status}
    </Badge>
  );
}

/* ── Main Page ── */

export default function FinanceReportPage() {
  const pathname = usePathname();
  const router = useRouter();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId, userRole } = useActiveBranch();

  const [report, setReport] = useState<FinanceReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(monthStartISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const canExport = can((userRole as any) ?? null, PERMISSIONS.FINANCE_REPORT_EXPORT);

  const handleDatePreset = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    switch (preset) {
      case "today": setDateFrom(todayISO()); setDateTo(todayISO()); break;
      case "7days": setDateFrom(daysAgoISO(7)); setDateTo(todayISO()); break;
      case "month": setDateFrom(monthStartISO()); setDateTo(todayISO()); break;
    }
  }, []);

  const resolvedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES" ? activeBranchId : null;

  /* Fetch report */
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getFinanceReportAction(brandSlug, {
      branchId: resolvedBranchId,
      accountId: null,
      dateFrom,
      dateTo,
    });
    if (result.success) {
      setReport(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug, resolvedBranchId, dateFrom, dateTo]);

  useEffect(() => { void fetchReport(); }, [fetchReport]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportFinanceReportCSVAction(brandSlug, {
        branchId: resolvedBranchId,
        accountId: null,
        dateFrom,
        dateTo,
      });
      if (result.success) {
        const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert(result.error);
      }
    } catch (e: any) {
      alert(e.message || "Gagal mengexport.");
    } finally {
      setExporting(false);
    }
  }, [brandSlug, resolvedBranchId, dateFrom, dateTo]);

  const s = report?.summary;
  const revenueBreakdown = report?.revenueBreakdown ?? [];
  const pmtBreakdown = report?.paymentMethodBreakdown ?? [];
  const accountBalances = report?.accountBalances ?? [];
  const branchPerformance = report?.branchPerformance ?? [];
  const shiftSummary = report?.shiftSummary ?? [];
  const recentMovements = report?.recentMovements ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Laporan Keuangan"
        breadcrumbs={[
          { label: "Beranda", href: `/${brandSlug}/panel/dashboard` },
          { label: "Finance", href: `/${brandSlug}/panel/finance` },
          { label: "Laporan Keuangan" },
        ]}
      />
      <p className="text-sm text-muted-foreground -mt-4">
        Ringkasan performa keuangan berdasarkan transaksi servis, POS, dan mutasi akun.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Filter Panel ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Periode:</span>
            {(["today", "7days", "month", "custom"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  datePreset === preset
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleDatePreset(preset)}
              >
                {preset === "today" ? "Hari ini" : preset === "7days" ? "7 Hari" : preset === "month" ? "Bulan ini" : "Custom"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {datePreset === "custom" && (
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
                <span className="text-xs text-muted-foreground">—</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 ml-auto"
              onClick={handleExport}
              disabled={exporting || loading || !canExport}
            >
              {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && !report && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !report && !error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <BarChart3 className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Belum ada data keuangan pada periode ini.</p>
          </CardContent>
        </Card>
      )}

      {report && s && (
        <>
          {/* ── KPI Cards ── */}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard label="Total Pendapatan" value={fmtCurrency(s.totalRevenue)} icon={TrendingUp} color="text-emerald-600" loading={false} />
                <KpiCard label="Pendapatan Servis" value={fmtCurrency(s.serviceRevenue)} icon={WrenchIcon} color="text-blue-600" sub={`${s.serviceRevenueCount} transaksi`} loading={false} />
                <KpiCard label="Pendapatan POS" value={fmtCurrency(s.posRevenue)} icon={ShoppingCart} color="text-violet-600" sub={`${s.posRevenueCount} transaksi`} loading={false} />
                <KpiCard label="Pendapatan Lain" value={fmtCurrency(s.otherIncome)} icon={Wallet} color="text-cyan-600" loading={false} />
                <KpiCard label="Total Pengeluaran" value={fmtCurrency(s.totalExpense)} icon={TrendingDown} color="text-red-600" loading={false} />
                <KpiCard label="Potongan MDR" value={fmtCurrency(s.totalMdr)} icon={Settings2} color="text-orange-600" loading={false} />
                <KpiCard label="Net Cashflow" value={fmtCurrency(s.netCashflow)} icon={ArrowRightLeft} color={s.netCashflow >= 0 ? "text-emerald-600" : "text-red-600"} loading={false} />
                <KpiCard label="Laba Bersih (Estimasi)" value={fmtCurrency(s.estimatedNetProfit)} icon={PiggyBank} color={s.estimatedNetProfit >= 0 ? "text-emerald-600" : "text-red-600"} sub="Estimasi" loading={false} />
                <KpiCard label="Servis Belum Lunas" value={String(s.unpaidServiceCount)} icon={AlertTriangle} color="text-amber-600" loading={false} />
                <KpiCard label="Piutang Servis" value={fmtCurrency(s.totalReceivable)} icon={FileText} color="text-rose-600" loading={false} />
              </div>

              {/* ── Two-column layout ── */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Revenue Breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Pendapatan berdasarkan sumber</CardTitle>
                    <CardDescription className="text-xs">Servis, POS, dan pendapatan lain</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {revenueBreakdown.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">Belum ada pendapatan.</p>
                    ) : (
                      revenueBreakdown.map((rb) => {
                        const pct = rb.percentage;
                        return (
                          <div key={rb.source} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{rb.source}</span>
                              <span className="text-muted-foreground">{fmtCurrency(rb.amount)} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                    {revenueBreakdown.length > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t text-xs font-medium">
                        <span>Total</span>
                        <span>{fmtCurrency(s.totalRevenue)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Method Breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Pendapatan per Metode Pembayaran</CardTitle>
                    <CardDescription className="text-xs">Bruto, MDR, dan netto yang diterima</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pmtBreakdown.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">Belum ada transaksi.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Metode</TableHead>
                              <TableHead className="text-xs text-right">Bruto</TableHead>
                              <TableHead className="text-xs text-right">MDR</TableHead>
                              <TableHead className="text-xs text-right">Netto</TableHead>
                              <TableHead className="text-xs text-right">Transaksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pmtBreakdown.map((pm) => (
                              <TableRow key={pm.methodType}>
                                <TableCell className="text-xs font-medium">{pm.methodName}</TableCell>
                                <TableCell className="text-xs text-right">{fmtCurrency(pm.grossAmount)}</TableCell>
                                <TableCell className="text-xs text-right text-red-600">{fmtCurrency(pm.mdrAmount)}</TableCell>
                                <TableCell className="text-xs text-right text-emerald-600">{fmtCurrency(pm.netAmount)}</TableCell>
                                <TableCell className="text-xs text-right">{pm.transactionCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ── Account Balances ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Saldo Akun Pembayaran</CardTitle>
                  <CardDescription className="text-xs">Saldo terkini dari mutasi periode ini</CardDescription>
                </CardHeader>
                <CardContent>
                  {accountBalances.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Belum ada akun aktif.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {accountBalances.map((acct) => (
                        <div key={acct.accountId} className="flex flex-col gap-1.5 rounded-lg border bg-card p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">{acct.accountName}</span>
                            <Badge variant={acct.isActive ? "default" : "secondary"} className="text-[10px]">
                              {acct.accountType}
                            </Badge>
                          </div>
                          <span className="text-lg font-semibold tabular-nums">{fmtCurrency(acct.balance)}</span>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="text-emerald-600">Masuk: {fmtCurrency(acct.totalIn)}</span>
                            <span>·</span>
                            <span className="text-red-600">Keluar: {fmtCurrency(acct.totalOut)}</span>
                          </div>
                          {acct.linkedMethods.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {acct.linkedMethods.map((m) => (
                                <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Branch Performance ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Performa Cabang</CardTitle>
                  <CardDescription className="text-xs">Ringkasan pendapatan dan pengeluaran per cabang</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {branchPerformance.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Belum ada data cabang.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Cabang</TableHead>
                            <TableHead className="text-xs text-right">Servis</TableHead>
                            <TableHead className="text-xs text-right">POS</TableHead>
                            <TableHead className="text-xs text-right">Lain</TableHead>
                            <TableHead className="text-xs text-right">Biaya</TableHead>
                            <TableHead className="text-xs text-right">Net</TableHead>
                            <TableHead className="text-xs text-right">Piutang</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {branchPerformance.map((bp) => (
                            <TableRow key={bp.branchId}>
                              <TableCell className="text-xs font-medium">{bp.branchName}</TableCell>
                              <TableCell className="text-xs text-right">{fmtCurrency(bp.serviceRevenue)}</TableCell>
                              <TableCell className="text-xs text-right">{fmtCurrency(bp.posRevenue)}</TableCell>
                              <TableCell className="text-xs text-right">{fmtCurrency(bp.otherIncome)}</TableCell>
                              <TableCell className="text-xs text-right text-red-600">{fmtCurrency(bp.expense)}</TableCell>
                              <TableCell className={`text-xs text-right font-medium ${bp.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtCurrency(bp.net)}</TableCell>
                              <TableCell className="text-xs text-right">{bp.unpaidServiceCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Cashflow Summary ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Ringkasan Mutasi</CardTitle>
                  <CardDescription className="text-xs">Total arus kas masuk, keluar, dan mutasi terbaru</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowUpRight className="size-3 text-emerald-600" /> Total Masuk
                      </p>
                      <p className="text-lg font-semibold text-emerald-600 tabular-nums">{fmtCurrency(s.netCashflow + s.totalExpense + s.totalMdr)}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowDownRight className="size-3 text-red-600" /> Total Keluar
                      </p>
                      <p className="text-lg font-semibold text-red-600 tabular-nums">{fmtCurrency(s.totalExpense + s.totalMdr)}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Net Cashflow</p>
                      <p className={`text-lg font-semibold tabular-nums ${s.netCashflow >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtCurrency(s.netCashflow)}</p>
                    </div>
                  </div>

                  {/* Recent movements */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Mutasi Terbaru</p>
                    {recentMovements.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Belum ada mutasi.</p>
                    ) : (
                      <div className="space-y-1">
                        {recentMovements.slice(0, 10).map((m) => (
                          <div key={m.id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`shrink-0 font-medium ${m.direction === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                                {m.direction === "IN" ? "+" : "-"}
                              </span>
                              <span className="truncate text-muted-foreground">{m.accountName}</span>
                              <span className="text-muted-foreground/60">·</span>
                              <span className="truncate">{m.movementType}</span>
                            </div>
                            <span className={`shrink-0 font-medium tabular-nums ${m.direction === "IN" ? "text-emerald-600" : "text-red-600"}`}>
                              {fmtCurrency(m.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── Shift Summary ── */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Laporan Shift</CardTitle>
                      <CardDescription className="text-xs">Shift yang sudah ditutup pada periode ini</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => router.push(`/${brandSlug}/panel/store-shift`)}
                    >
                      <Store className="size-3" />
                      Lihat Store Shift
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {shiftSummary.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Belum ada shift ditutup pada periode ini.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Shift</TableHead>
                            <TableHead className="text-xs">Cabang</TableHead>
                            <TableHead className="text-xs">Buka</TableHead>
                            <TableHead className="text-xs">Tutup</TableHead>
                            <TableHead className="text-xs">Dibuka</TableHead>
                            <TableHead className="text-xs text-right">Kas Awal</TableHead>
                            <TableHead className="text-xs text-right">Kas Akhir (Harapan)</TableHead>
                            <TableHead className="text-xs text-right">Kas Akhir (Riil)</TableHead>
                            <TableHead className="text-xs text-right">Selisih</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shiftSummary.map((sh) => (
                            <TableRow key={sh.shiftId}>
                              <TableCell className="text-xs font-mono">{sh.shiftNumber}</TableCell>
                              <TableCell className="text-xs">{sh.branchName}</TableCell>
                              <TableCell className="text-xs">{fmtDateTime(sh.openedAt)}</TableCell>
                              <TableCell className="text-xs">{sh.closedAt ? fmtDateTime(sh.closedAt) : "-"}</TableCell>
                              <TableCell className="text-xs">{sh.openedByName || "-"}</TableCell>
                              <TableCell className="text-xs text-right">{fmtCurrency(sh.openingCash)}</TableCell>
                              <TableCell className="text-xs text-right">{sh.expectedClosingCash != null ? fmtCurrency(sh.expectedClosingCash) : "-"}</TableCell>
                              <TableCell className="text-xs text-right">{sh.countedClosingCash != null ? fmtCurrency(sh.countedClosingCash) : "-"}</TableCell>
                              <TableCell className={`text-xs text-right font-medium ${
                                sh.cashDifference != null
                                  ? sh.cashDifference >= 0 ? "text-emerald-600" : "text-red-600"
                                  : ""
                              }`}>
                                {sh.cashDifference != null ? fmtCurrency(sh.cashDifference) : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* Local wrench icon since lucide doesn't export it by default */
function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
