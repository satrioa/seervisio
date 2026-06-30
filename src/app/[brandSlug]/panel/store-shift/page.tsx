"use client";

import * as React from "react";
import { useCallback, useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { Clock, Store, ArrowUpRight, ArrowDownRight, CircleDollarSign, Wallet, History, X, AlertTriangle, Timer, User, CalendarDays, Download } from "lucide-react";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreShiftCloseModal } from "@/components/store-shift/StoreShiftCloseModal";
import {
  getStoreShiftOverviewAction,
  getStoreShiftReportAction,
  listStoreShiftsAction,
  type StoreShiftOverview,
  type PaymentBreakdownItem,
  type TransactionItem,
} from "@/server/actions/store-shift.actions";
import type { StoreShift } from "@/types/app";
import { buildShiftReportPdf, formatRupiah as formatCurrency, formatDateTime, formatDateShort as formatDate } from "@/lib/pdf/shift-report-pdf";

function getExpectedClosingCash(shift: StoreShift, activeExpectedCash?: number | null) {
  return shift.shiftStatus === "OPEN" ? activeExpectedCash ?? shift.expectedClosingCash : shift.expectedClosingCash;
}

async function downloadShiftSummaryPdf(
  brandSlug: string,
  shift: StoreShift,
  activeExpectedCash?: number | null,
) {
  const result = await getStoreShiftReportAction(brandSlug, shift.id);
  const report = result.success ? result.data : null;
  const expectedCash = report?.expectedCash ?? getExpectedClosingCash(shift, activeExpectedCash);
  const pdf = buildShiftReportPdf({
    shiftNumber: shift.shiftNumber,
    status: shift.shiftStatus,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt ?? null,
    openedByName: shift.openedByName ?? (shift.openedBy ?? null),
    closedByName: shift.closedByName ?? (shift.closedBy ?? null),
    openingCash: shift.openingCash,
    expectedClosingCash: expectedCash ?? null,
    countedClosingCash: shift.countedClosingCash ?? null,
    cashDifference: shift.cashDifference ?? null,
    report: report ?? null,
  });
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${shift.shiftNumber || "shift"}-ringkasan.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

interface StatusBadgeProps {
  status: "OPEN" | "CLOSED" | "CANCELLED";
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    OPEN: { label: "Aktif", variant: "default" },
    CLOSED: { label: "Ditutup", variant: "secondary" },
    CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  };
  const c = config[status] || { label: status, variant: "outline" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

/* ── Live Duration Sub-component ── */
function ShiftDuration({ openedAt }: { openedAt?: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!openedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [openedAt]);

  if (!openedAt) return <>0j 0m</>;
  const openedTime = new Date(openedAt).getTime();
  const diffMs = Math.max(0, now - openedTime);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return <>{hours}j {minutes}m</>;
}

/* ── Shift Status Card ── */
function ShiftStatusCard({
  activeShift,
  expectedCash,
  onOpenShift,
  onCloseShift,
  loading,
}: {
  activeShift: StoreShift | null;
  expectedCash: number | null;
  onOpenShift: () => void;
  onCloseShift: () => void;
  loading: boolean;
}) {
  if (loading) return <SkeletonCard />;

  if (!activeShift) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Clock className="size-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold">Belum ada shift aktif</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Buka shift untuk mulai mencatat transaksi hari ini.
            </p>
          </div>
          <Button onClick={onOpenShift} className="mt-2 gap-2">
            <Store className="size-4" />
            Buka Shift
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                Shift Aktif
              </Badge>
              <span className="text-xs text-muted-foreground">{activeShift.shiftNumber}</span>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 sm:gap-x-8">
              <div className="flex items-center gap-2">
                <User className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Dibuka oleh:</span>
                <span className="font-medium">{activeShift.openedByName || activeShift.openedBy || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Dibuka:</span>
                <span className="font-medium">{formatDateTime(activeShift.openedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Durasi:</span>
                <span className="font-medium"><ShiftDuration openedAt={activeShift.openedAt} /></span>
              </div>
              <div className="flex items-center gap-2">
                <CircleDollarSign className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Saldo awal:</span>
                <span className="font-medium">{formatCurrency(activeShift.openingCash)}</span>
              </div>
            </div>
          </div>
          <Button onClick={onCloseShift} variant="destructive" className="gap-2 shrink-0">
            <X className="size-4" />
            Akhiri Shift
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Shift Summary Grid ── */
function ShiftSummaryGrid({
  openingCash,
  totalIncome,
  totalExpense,
  expectedCash,
  cashSales,
  serviceCashPayments,
  cashInTotal,
  cashOutTotal,
  refunds,
}: {
  openingCash: number;
  totalIncome: number;
  totalExpense: number;
  expectedCash: number | null;
  cashSales: number;
  serviceCashPayments: number;
  cashInTotal: number;
  cashOutTotal: number;
  refunds: number;
}) {
  const summaryCards = [
    { label: "Saldo awal kas tunai", value: formatCurrency(openingCash), icon: CircleDollarSign },
    { label: "Penjualan POS (tunai)", value: formatCurrency(cashSales), icon: ArrowUpRight },
    { label: "Pembayaran Service (tunai)", value: formatCurrency(serviceCashPayments), icon: ArrowUpRight },
    { label: "Kas Masuk manual", value: formatCurrency(cashInTotal), icon: ArrowUpRight },
    { label: "Kas Keluar manual", value: formatCurrency(cashOutTotal), icon: ArrowDownRight },
    { label: "Refund", value: formatCurrency(refunds), icon: ArrowDownRight },
    { label: "Expected cash", value: formatCurrency(expectedCash), icon: Wallet, highlight: true },
    { label: "Total Pemasukan", value: formatCurrency(totalIncome), icon: ArrowUpRight },
    { label: "Total Pengeluaran", value: formatCurrency(totalExpense), icon: ArrowDownRight },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {summaryCards.map((item) => (
        <Card key={item.label} className={item.highlight ? "border-primary/30 bg-primary/5" : ""}>
          <CardContent className="flex flex-col gap-1.5 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <item.icon className="size-3.5" />
              {item.label}
            </div>
            <span className={`text-lg font-semibold ${item.highlight ? "text-primary" : ""}`}>
              {item.value}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Payment Breakdown ── */
function PaymentBreakdown({ items }: { items: PaymentBreakdownItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Rincian Metode Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Belum ada transaksi pembayaran pada shift ini.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Rincian Metode Pembayaran</CardTitle>
        <CardDescription className="text-xs">Total penerimaan per metode pembayaran</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">Jumlah Transaksi</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items
              .sort((a, b) => b.total - a.total)
              .map((item) => (
                <TableRow key={item.methodType}>
                  <TableCell className="font-medium">{item.methodName}</TableCell>
                  <TableCell className="text-right">{item.count}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── Transaction Activity ── */
function TransactionActivity({ transactions }: { transactions: TransactionItem[] }) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Aktivitas Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Belum ada aktivitas transaksi pada shift ini.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Aktivitas Transaksi</CardTitle>
        <CardDescription className="text-xs">Transaksi selama shift berlangsung</CardDescription>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs whitespace-nowrap">{formatDateTime(t.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {t.direction === "IN" ? (
                      <ArrowUpRight className="size-3.5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="size-3.5 text-red-600" />
                    )}
                    <span className="text-xs">{t.type}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {t.description}
                </TableCell>
                <TableCell className={`text-right text-xs font-medium ${t.direction === "IN" ? "text-green-600" : "text-red-600"}`}>
                  {t.direction === "IN" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── Shift History Table ── */
function ShiftHistoryTable({
  shifts,
  activeExpectedCash,
  brandSlug,
}: {
  shifts: StoreShift[];
  activeExpectedCash?: number | null;
  brandSlug: string;
}) {
  if (shifts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="size-4" />
            Riwayat Shift
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Belum ada riwayat shift.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="size-4" />
            Riwayat Shift
          </CardTitle>
          <CardDescription className="text-xs">20 shift terakhir</CardDescription>
        </div>
      </CardHeader>
      {/* Desktop table */}
      <CardContent className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Dibuka Oleh</TableHead>
              <TableHead>Dibuka</TableHead>
              <TableHead>Ditutup Oleh</TableHead>
              <TableHead>Ditutup</TableHead>
              <TableHead className="text-right">Saldo Awal</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Aktual</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell className="text-xs whitespace-nowrap">{formatDate(shift.openedAt)}</TableCell>
                <TableCell className="text-xs font-medium">{shift.shiftNumber}</TableCell>
                <TableCell className="text-xs">{shift.openedByName || shift.openedBy || "-"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{formatDateTime(shift.openedAt)}</TableCell>
                <TableCell className="text-xs">{shift.closedByName || shift.closedBy || "-"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{formatDateTime(shift.closedAt)}</TableCell>
                <TableCell className="text-xs text-right">{formatCurrency(shift.openingCash)}</TableCell>
                <TableCell className="text-xs text-right">
                  {formatCurrency(getExpectedClosingCash(shift, activeExpectedCash))}
                </TableCell>
                <TableCell className="text-xs text-right">{formatCurrency(shift.countedClosingCash)}</TableCell>
                <TableCell className={`text-xs text-right font-medium ${
                  (shift.cashDifference ?? 0) > 0 ? "text-green-600" : (shift.cashDifference ?? 0) < 0 ? "text-red-600" : ""
                }`}>
                  {(shift.cashDifference ?? 0) > 0 ? "+" : ""}{formatCurrency(shift.cashDifference)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={shift.shiftStatus} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => void downloadShiftSummaryPdf(brandSlug, shift, activeExpectedCash)}
                      title="Download rincian shift PDF"
                      aria-label={`Download rincian shift ${shift.shiftNumber}`}
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {/* Mobile card list */}
      <CardContent className="sm:hidden space-y-2">
        {shifts.map((shift) => (
          <div key={shift.id} className="rounded-lg border p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{shift.shiftNumber}</span>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={shift.shiftStatus} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => void downloadShiftSummaryPdf(brandSlug, shift, activeExpectedCash)}
                  title="Download rincian shift PDF"
                  aria-label={`Download rincian shift ${shift.shiftNumber}`}
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>Tanggal: {formatDate(shift.openedAt)}</span>
              <span>Dibuka: {formatDateTime(shift.openedAt)}</span>
              <span>Ditutup: {formatDateTime(shift.closedAt)}</span>
              <span>Oleh: {shift.openedByName || shift.openedBy || "-"}</span>
              <span>Saldo awal: {formatCurrency(shift.openingCash)}</span>
              <span>Expected: {formatCurrency(getExpectedClosingCash(shift, activeExpectedCash))}</span>
              <span>Aktual: {formatCurrency(shift.countedClosingCash)}</span>
              <span className={`font-medium ${(shift.cashDifference ?? 0) > 0 ? "text-green-600" : (shift.cashDifference ?? 0) < 0 ? "text-red-600" : ""}`}>
                Selisih: {(shift.cashDifference ?? 0) > 0 ? "+" : ""}{formatCurrency(shift.cashDifference)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ── Page Content ── */
function StoreShiftPageContent() {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId, branches, activeBranchName } = useActiveBranch();

  const [overview, setOverview] = useState<StoreShiftOverview | null>(null);
  const [shiftHistory, setShiftHistory] = useState<StoreShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES" ? activeBranchId : null;

  const branchName = resolvedBranchId
    ? branches.find((b) => b.id === resolvedBranchId)?.name
    : activeBranchName;

  const fetchOverview = useCallback(async () => {
    if (!resolvedBranchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getStoreShiftOverviewAction(brandSlug, resolvedBranchId);
    if (result.success) {
      setOverview(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug, resolvedBranchId]);

  const fetchHistory = useCallback(async () => {
    if (!resolvedBranchId) {
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    const result = await listStoreShiftsAction(brandSlug, resolvedBranchId, 20);
    if (result.success) {
      setShiftHistory(result.data);
    }
    setHistoryLoading(false);
  }, [brandSlug, resolvedBranchId]);

  useEffect(() => {
    fetchOverview();
    fetchHistory();
  }, [fetchOverview, fetchHistory]);

  useEffect(() => {
    const handler = () => {
      fetchOverview();
      fetchHistory();
    };
    window.addEventListener("seervis:shift-changed", handler);
    return () => window.removeEventListener("seervis:shift-changed", handler);
  }, [fetchOverview, fetchHistory]);

  const [showCloseForm, setShowCloseForm] = useState(false);

  const activeShift = overview?.activeShift ?? null;
  const expectedCash = overview?.expectedCash ?? null;

  const handleOpenShiftModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent("seervis:open-shift-modal"));
  }, []);

  const handleCloseSuccess = () => {
    setShowCloseForm(false);
    fetchOverview();
    fetchHistory();
    window.dispatchEvent(new CustomEvent("seervis:shift-changed"));
  };

  if (!resolvedBranchId) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Shift Toko" breadcrumbs={[
          { label: "Beranda", href: `/${brandSlug}/panel/dashboard` },
          { label: "Shift Toko" },
        ]} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Store className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Pilih cabang untuk melihat shift.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader title="Shift Toko" breadcrumbs={[
        { label: "Beranda", href: `/${brandSlug}/panel/dashboard` },
        { label: "Shift Toko" },
      ]} />

      {branchName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="size-4" />
          <span>{branchName}</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ShiftStatusCard
        activeShift={activeShift}
        expectedCash={expectedCash}
        onOpenShift={handleOpenShiftModal}
        onCloseShift={() => setShowCloseForm(true)}
        loading={loading}
      />

      {/* Active Shift Content */}
      {activeShift && overview && (
        <>
          <ShiftSummaryGrid
            openingCash={overview.openingCash}
            totalIncome={overview.totalIncome}
            totalExpense={overview.totalExpense}
            expectedCash={overview.expectedCash}
            cashSales={overview.cashSales}
            serviceCashPayments={overview.serviceCashPayments}
            cashInTotal={overview.cashInTotal}
            cashOutTotal={overview.cashOutTotal}
            refunds={overview.refunds}
          />

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
            <PaymentBreakdown items={overview.paymentBreakdown} />
            <TransactionActivity transactions={overview.transactions} />
          </div>

          <StoreShiftCloseModal
            open={showCloseForm}
            onOpenChange={setShowCloseForm}
            brandSlug={brandSlug}
            shiftId={activeShift.id}
            expectedCash={overview.expectedCash}
            onSuccess={handleCloseSuccess}
          />
        </>
      )}

      {/* Shift History */}
      {historyLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <SkeletonTable rows={5} />
          </CardContent>
        </Card>
      ) : (
        <ShiftHistoryTable shifts={shiftHistory} activeExpectedCash={expectedCash} brandSlug={brandSlug} />
      )}
    </div>
  );
}

/* ── Default export with Suspense ── */
export default function StoreShiftPage() {
  return (
    <Suspense fallback={null}>
      <StoreShiftPageContent />
    </Suspense>
  );
}
