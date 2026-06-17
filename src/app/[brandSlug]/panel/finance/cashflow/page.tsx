"use client";

import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Search, AlertTriangle, Loader2, ArrowUpRight, ArrowDownRight,
  Wallet, Banknote, Calendar, Download, Filter, X,
  History, ArrowRightLeft, ChevronLeft, ChevronRight,
} from "lucide-react";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  listCashflowMovementsAction,
  type CashflowMovementRow,
  type CashflowSummary,
} from "@/server/actions/cashflow.actions";

import { listPaymentAccountsAction } from "@/server/actions/payment-account.actions";

import { MOVEMENT_TYPE_LABELS } from "@/lib/finance/movement-labels";

/* ── Formatting ── */

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try { return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return value; }
}

function formatDateShort(value: string | null | undefined): string {
  if (!value) return "-";
  try { return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return value; }
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
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

/* ── Page ── */

export default function CashflowPage() {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId, branches } = useActiveBranch();

  const [movements, setMovements] = useState<CashflowMovementRow[]>([]);
  const [summary, setSummary] = useState<CashflowSummary>({ totalIn: 0, totalOut: 0, netCashflow: 0, totalMdr: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  /* Filters */
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(monthStartISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [branchFilter, setBranchFilter] = useState("ALL_BRANCHES");
  const [accountFilter, setAccountFilter] = useState("ALL_ACCOUNTS");
  const [typeFilter, setTypeFilter] = useState("ALL_TYPES");
  const [directionFilter, setDirectionFilter] = useState<"IN" | "OUT" | "ALL_DIRECTIONS">("ALL_DIRECTIONS");
  const [search, setSearch] = useState("");

  /* Detail drawer */
  const [detailMovement, setDetailMovement] = useState<CashflowMovementRow | null>(null);

  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* Fetch accounts for filter dropdown */
  useEffect(() => {
    if (!brandSlug) return;
    setAccountsLoading(true);
    listPaymentAccountsAction(brandSlug, null, null, "ALL").then((r) => {
      if (r.success) {
        setAccounts(r.data.map((a) => ({ id: a.id, name: a.accountName })));
      }
      setAccountsLoading(false);
    });
  }, [brandSlug]);

  /* Date preset handler */
  const handleDatePreset = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    switch (preset) {
      case "today":
        setDateFrom(todayISO());
        setDateTo(todayISO());
        break;
      case "7days":
        setDateFrom(daysAgoISO(7));
        setDateTo(todayISO());
        break;
      case "month":
        setDateFrom(monthStartISO());
        setDateTo(todayISO());
        break;
    }
  }, []);

  const resolvedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES" ? activeBranchId : null;

  /* Fetch movements */
  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listCashflowMovementsAction(brandSlug, {
      branchId: branchFilter === "ALL_BRANCHES" ? resolvedBranchId ?? null : branchFilter,
      accountId: accountFilter === "ALL_ACCOUNTS" ? null : accountFilter,
      movementType: typeFilter === "ALL_TYPES" ? null : typeFilter,
      direction: directionFilter === "ALL_DIRECTIONS" ? null : directionFilter,
      search: search || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    });
    if (result.success) {
      setMovements(result.data.movements);
      setSummary(result.data.summary);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug, branchFilter, resolvedBranchId, accountFilter, typeFilter, directionFilter, search, dateFrom, dateTo]);

  useEffect(() => { void fetchMovements(); }, [fetchMovements]);

  /* Reset page when filters change */
  useEffect(() => { setPage(1); }, [branchFilter, accountFilter, typeFilter, directionFilter, search, dateFrom, dateTo, datePreset]);

  const movementTypeOptions = Object.entries(MOVEMENT_TYPE_LABELS);

  /* Pagination */
  const totalItems = movements.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedMovements = movements.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalItems);

  /* Close drawer if selected movement leaves current page */
  useEffect(() => {
    if (detailMovement && !paginatedMovements.some((m) => m.id === detailMovement.id)) {
      setDetailMovement(null);
    }
  }, [safePage, pageSize, movements]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader title="Mutasi Kas & Bank"
        breadcrumbs={[{ label: "Beranda", href: `/${brandSlug}/panel/dashboard` }, { label: "Finance", href: `/${brandSlug}/panel/finance` }, { label: "Mutasi Kas & Bank" }]} />
      <p className="text-sm text-muted-foreground -mt-4">Pantau seluruh pergerakan uang dari kas, bank, dan metode pembayaran.</p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Date presets */}
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

          {/* Date inputs and filter selects */}
          <div className="flex flex-wrap items-center gap-3">
            {datePreset === "custom" && (
              <>
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
                  <span className="text-xs text-muted-foreground">—</span>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
                </div>
              </>
            )}

            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_BRANCHES">Semua Cabang</SelectItem>
                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={accountFilter} onValueChange={setAccountFilter} disabled={accountsLoading}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Akun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_ACCOUNTS">Semua Akun</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_TYPES">Semua Tipe</SelectItem>
                {movementTypeOptions.map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as typeof directionFilter)}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Arah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_DIRECTIONS">Semua</SelectItem>
                <SelectItem value="IN">Masuk</SelectItem>
                <SelectItem value="OUT">Keluar</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>

            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 ml-auto" disabled>
              <Download className="size-3.5" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="size-3 text-green-600" /> Total Masuk
            </span>
            <span className="text-xl font-semibold text-green-600">
              {loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.totalIn)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowDownRight className="size-3 text-red-600" /> Total Keluar
            </span>
            <span className="text-xl font-semibold text-red-600">
              {loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.totalOut)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowRightLeft className="size-3" /> Net Cashflow
            </span>
            <span className={`text-xl font-semibold ${summary.netCashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.netCashflow)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Total Potongan MDR</span>
            <span className="text-xl font-semibold text-red-600">
              {loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.totalMdr)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: pageSize }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <History className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Belum ada mutasi kas/bank.</p>
              <p className="text-xs text-muted-foreground/60">Mutasi akan muncul setelah ada pembayaran, pengeluaran, atau penyesuaian saldo.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Akun</TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="max-w-[200px]">Deskripsi</TableHead>
                      <TableHead>Referensi</TableHead>
                      <TableHead className="text-right">Masuk</TableHead>
                      <TableHead className="text-right">Keluar</TableHead>
                      <TableHead>Dibuat Oleh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMovements.map((m) => (
                      <TableRow
                        key={m.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setDetailMovement(m)}
                      >
                        <TableCell className="text-xs whitespace-nowrap">{formatDateShort(m.createdAt)}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{m.accountName}</TableCell>
                        <TableCell className="text-xs">{m.branchName || (m.isCashAccount ? m.accountName : "-")}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            m.direction === "IN" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {MOVEMENT_TYPE_LABELS[m.movementType] || m.movementType}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">
                          {m.description || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {m.referenceLabel !== "-" ? m.referenceLabel : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-green-600">
                          {m.direction === "IN" ? formatCurrency(m.amount) : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-red-600">
                          {m.direction === "OUT" ? formatCurrency(m.amount) : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.createdByName || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {loading
                    ? "Memuat data..."
                    : `Menampilkan ${rangeStart} - ${rangeEnd} dari ${totalItems} mutasi`}
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                  >
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-[2rem] text-center text-xs tabular-nums text-muted-foreground">
                      {safePage}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(safePage + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={!!detailMovement} onOpenChange={(o) => { if (!o) setDetailMovement(null); }}>
        <SheetContent className="flex h-full w-[calc(100vw-1rem)] max-w-md flex-col overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-5 pr-12 text-left">
            <SheetTitle>Detail Mutasi</SheetTitle>
            <SheetDescription>Informasi lengkap pergerakan kas/bank.</SheetDescription>
          </SheetHeader>

          {detailMovement && (
            <div className="flex flex-1 flex-col gap-5 p-5">
              <section className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      detailMovement.direction === "IN"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {detailMovement.direction === "IN" ? "MASUK" : "KELUAR"} · {MOVEMENT_TYPE_LABELS[detailMovement.movementType] || detailMovement.movementType}
                    </span>
                  </div>
                  <span className={`text-lg font-bold tabular-nums ${
                    detailMovement.direction === "IN" ? "text-green-600" : "text-red-600"
                  }`}>
                    {detailMovement.direction === "IN" ? "+" : "-"}{formatCurrency(detailMovement.amount)}
                  </span>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Akun</p>
                  <p className="mt-1 text-sm font-medium">{detailMovement.accountName}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Cabang</p>
                  <p className="mt-1 text-sm font-medium">{detailMovement.branchName || "Tidak terkait cabang"}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Saldo Sebelum</p>
                  <p className="mt-1 text-sm font-medium tabular-nums">{formatCurrency(detailMovement.beforeBalance)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Saldo Setelah</p>
                  <p className="mt-1 text-sm font-medium tabular-nums">{formatCurrency(detailMovement.afterBalance)}</p>
                </div>
              </section>

              <section className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Deskripsi</p>
                  <p className="mt-1 text-sm">{detailMovement.description || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Referensi</p>
                    <p className="mt-1 text-sm font-medium">
                      {detailMovement.referenceLabel !== "-" ? detailMovement.referenceLabel : "-"}
                    </p>
                    {detailMovement.referenceRaw && (
                      <p className="mt-0.5 text-[10px] font-mono text-muted-foreground/60 truncate" title={detailMovement.referenceRaw}>
                        ID: {detailMovement.referenceRaw}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Dibuat Oleh</p>
                    <p className="mt-1 text-sm">{detailMovement.createdByName || "-"}</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Waktu</p>
                  <p className="mt-1 text-sm">{formatDate(detailMovement.createdAt)}</p>
                </div>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
