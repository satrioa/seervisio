"use client";

import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Search, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Calendar, Plus, ChevronLeft, ChevronRight, ChevronDown,
  Ban, Loader2, ScrollText, List,
} from "lucide-react";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  listFinanceTransactionsAction,
  createOtherIncomeAction,
  createOperatingExpenseAction,
  voidFinanceTransactionAction,
  type FinanceTransactionRow,
  type FinanceTransactionSummary,
  type SourceFilter,
} from "@/server/actions/finance-transaction.actions";

import { listPaymentAccountsAction } from "@/server/actions/payment-account.actions";

/* ── Categories ── */

const INCOME_CATEGORIES = [
  "Pendapatan Lain",
  "Refund Supplier",
  "Penjualan Non-POS",
  "Bonus / Cashback",
  "Lainnya",
];

const EXPENSE_CATEGORIES = [
  "Operasional",
  "Transport",
  "Listrik / Internet",
  "Gaji / Kasbon",
  "Biaya Bank",
  "Konsumsi",
  "Maintenance",
  "Lainnya",
];

/* ── Source filter tabs ── */

const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "MANUAL", label: "Manual" },
  { value: "POS", label: "POS" },
  { value: "SERVICE", label: "Servis" },
  { value: "EXPENSE", label: "Biaya" },
];

/* ── Formatting ── */

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDateShort(value: string | null | undefined): string {
  if (!value) return "-";
  try { return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return value; }
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function monthStartISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/* ── Source badge color ── */

function sourceBadgeVariant(source: string): "default" | "secondary" | "outline" | "destructive" {
  switch (source) {
    case "POS": return "default";
    case "Servis": return "secondary";
    case "MDR": return "destructive";
    default: return "outline";
  }
}

/* ── Types ── */

type DatePreset = "today" | "7days" | "month" | "custom";

/* ── Page ── */

export default function FinanceTransactionsPage() {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId, branches } = useActiveBranch();

  const [transactions, setTransactions] = useState<FinanceTransactionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<FinanceTransactionSummary>({ totalIncome: 0, totalExpense: 0, netManual: 0, totalTransactions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  /* Filters */
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(monthStartISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [branchFilter, setBranchFilter] = useState("ALL_BRANCHES");
  const [directionFilter, setDirectionFilter] = useState<"IN" | "OUT" | "ALL_DIRECTIONS">("ALL_DIRECTIONS");
  const [search, setSearch] = useState("");

  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* Modals */
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidTarget, setVoidTarget] = useState<FinanceTransactionRow | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Income form */
  const [incBranch, setIncBranch] = useState("");
  const [incAccount, setIncAccount] = useState("");
  const [incCategory, setIncCategory] = useState(INCOME_CATEGORIES[0]);
  const [incAmount, setIncAmount] = useState("");
  const [incDescription, setIncDescription] = useState("");
  const [incDate, setIncDate] = useState(todayISO());

  /* Expense form */
  const [expBranch, setExpBranch] = useState("");
  const [expAccount, setExpAccount] = useState("");
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [expDate, setExpDate] = useState(todayISO());

  /* Fetch accounts */
  useEffect(() => {
    if (!brandSlug) return;
    setAccountsLoading(true);
    listPaymentAccountsAction(brandSlug, activeBranchId, null, "ALL").then((r) => {
      if (r.success) {
        setAccounts(r.data.map((a) => ({ id: a.id, name: a.accountName })));
      }
      setAccountsLoading(false);
    });
  }, [brandSlug, activeBranchId]);

  /* Date preset */
  const handleDatePreset = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    switch (preset) {
      case "today":
        setDateFrom(todayISO());
        setDateTo(todayISO());
        break;
      case "7days":
        const d = new Date(); d.setDate(d.getDate() - 7);
        setDateFrom(d.toISOString().split("T")[0]);
        setDateTo(todayISO());
        break;
      case "month":
        setDateFrom(monthStartISO());
        setDateTo(todayISO());
        break;
    }
  }, []);

  const resolvedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES" ? activeBranchId : null;

  /* Fetch transactions */
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listFinanceTransactionsAction({
      brandSlug,
      branchId: branchFilter === "ALL_BRANCHES" ? resolvedBranchId ?? null : branchFilter,
      direction: directionFilter === "ALL_DIRECTIONS" ? null : directionFilter,
      search: search || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      page,
      pageSize,
      sourceFilter,
    });
    if (result.success) {
      setTransactions(result.data.transactions);
      setTotalCount(result.data.totalCount);
      setSummary(result.data.summary);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug, branchFilter, resolvedBranchId, directionFilter, search, dateFrom, dateTo, page, pageSize, sourceFilter]);

  useEffect(() => { void fetchTransactions(); }, [fetchTransactions]);

  useEffect(() => { setPage(1); }, [branchFilter, directionFilter, search, dateFrom, dateTo, datePreset, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalCount);

  const summaryLabel = sourceFilter === "ALL" ? "Total Pendapatan" : sourceFilter === "MANUAL" ? "Total Pendapatan Manual" : "Total Pendapatan";

  /* ── Income modal handlers ── */

  const openIncomeModal = () => {
    setIncBranch(resolvedBranchId || "");
    setIncAccount("");
    setIncCategory(INCOME_CATEGORIES[0]);
    setIncAmount("");
    setIncDescription("");
    setIncDate(todayISO());
    setShowIncomeModal(true);
  };

  const handleCreateIncome = async () => {
    if (!incBranch || !incAccount || !incAmount || !incDescription) return;
    const amount = parseInt(incAmount.replace(/[^0-9]/g, ""), 10);
    if (amount <= 0) return;
    setSubmitting(true);
    const result = await createOtherIncomeAction({
      brandSlug,
      branchId: incBranch,
      paymentAccountId: incAccount,
      category: incCategory,
      amount,
      description: incDescription.trim(),
      date: incDate,
    });
    setSubmitting(false);
    if (result.success) {
      setShowIncomeModal(false);
      void fetchTransactions();
      window.dispatchEvent(new CustomEvent("seervis:cash-transaction"));
    } else {
      setError(result.error);
    }
  };

  /* ── Expense modal handlers ── */

  const openExpenseModal = () => {
    setExpBranch(resolvedBranchId || "");
    setExpAccount("");
    setExpCategory(EXPENSE_CATEGORIES[0]);
    setExpAmount("");
    setExpDescription("");
    setExpDate(todayISO());
    setShowExpenseModal(true);
  };

  const handleCreateExpense = async () => {
    if (!expBranch || !expAccount || !expAmount || !expDescription) return;
    const amount = parseInt(expAmount.replace(/[^0-9]/g, ""), 10);
    if (amount <= 0) return;
    setSubmitting(true);
    const result = await createOperatingExpenseAction({
      brandSlug,
      branchId: expBranch,
      paymentAccountId: expAccount,
      category: expCategory,
      amount,
      description: expDescription.trim(),
      date: expDate,
    });
    setSubmitting(false);
    if (result.success) {
      setShowExpenseModal(false);
      void fetchTransactions();
      window.dispatchEvent(new CustomEvent("seervis:cash-transaction"));
    } else {
      setError(result.error);
    }
  };

  /* ── Void handler ── */

  const handleVoidOpen = (tx: FinanceTransactionRow) => {
    setVoidTarget(tx);
    setVoidReason("");
    setShowVoidModal(true);
  };

  const handleVoidConfirm = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    setSubmitting(true);
    const result = await voidFinanceTransactionAction({
      brandSlug,
      movementId: voidTarget.id,
      reason: voidReason.trim(),
    });
    setSubmitting(false);
    if (result.success) {
      setShowVoidModal(false);
      setVoidTarget(null);
      void fetchTransactions();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader title="Pendapatan & Pengeluaran"
        breadcrumbs={[{ label: "Beranda", href: `/${brandSlug}/panel/dashboard` }, { label: "Finance", href: `/${brandSlug}/panel/finance` }, { label: "Pendapatan & Pengeluaran" }]} />
      <p className="text-sm text-muted-foreground -mt-4">
        Gunakan filter sumber untuk melihat transaksi manual, POS, servis, dan biaya.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Terjadi kesalahan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Source chips */}
        <div className="flex items-center gap-1">
          {SOURCE_FILTERS.map((sf) => (
            <button
              key={sf.value}
              type="button"
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                sourceFilter === sf.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              onClick={() => setSourceFilter(sf.value)}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {/* Period popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 font-normal"
            >
              <Calendar className="size-3.5 text-muted-foreground" />
              {datePreset === "today" ? "Hari ini" : datePreset === "7days" ? "7 Hari" : datePreset === "month" ? "Bulan ini" : `${dateFrom} — ${dateTo}`}
              <ChevronDown className="size-3 text-muted-foreground/60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1.5">
            <div className="flex flex-col gap-0.5">
              {(["today", "7days", "month", "custom"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-left ${
                    datePreset === preset
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => handleDatePreset(preset)}
                >
                  {preset === "today" ? "Hari ini" : preset === "7days" ? "7 Hari" : preset === "month" ? "Bulan ini" : "Custom"}
                </button>
              ))}
            </div>
            {datePreset === "custom" && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 w-auto min-w-0 flex-1 text-[11px]" />
                <span className="text-[11px] text-muted-foreground">—</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 w-auto min-w-0 flex-1 text-[11px]" />
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Branch select */}
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_BRANCHES">Semua Cabang</SelectItem>
            {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Transaction type popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 font-normal w-[140px] justify-between"
            >
              {directionFilter === "ALL_DIRECTIONS" ? "Semua" : directionFilter === "IN" ? "Masuk" : "Keluar"}
              <ChevronDown className="size-3 text-muted-foreground/60 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-1.5">
            <div className="flex flex-col gap-0.5">
              {(["ALL_DIRECTIONS", "IN", "OUT"] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-left ${
                    directionFilter === dir
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setDirectionFilter(dir)}
                >
                  {dir === "ALL_DIRECTIONS" ? "Semua" : dir === "IN" ? "Masuk" : "Keluar"}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={openIncomeModal}>
            <Plus className="size-3.5" /> Tambah Pendapatan
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={openExpenseModal}>
            <Plus className="size-3.5" /> Tambah Pengeluaran
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="size-3 text-green-600" /> {summaryLabel}
            </span>
            <span className="text-xl font-semibold text-green-600">
              {loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.totalIncome)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowDownRight className="size-3 text-red-600" /> Total Pengeluaran
            </span>
            <span className="text-xl font-semibold text-red-600">
              {loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.totalExpense)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <List className="size-3" /> Net
            </span>
            <span className={`text-xl font-semibold ${summary.netManual >= 0 ? "text-green-600" : "text-red-600"}`}>
              {loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(summary.netManual)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Jumlah Transaksi</span>
            <span className="text-xl font-semibold">
              {loading ? <Skeleton className="h-7 w-16" /> : totalCount}
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
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <ScrollText className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Belum ada transaksi pada periode ini.</p>
              <p className="text-xs text-muted-foreground/60">Gunakan filter sumber atau tombol di atas untuk mencatat transaksi manual.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead className="max-w-[160px]">Deskripsi</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      {sourceFilter === "MANUAL" && <TableHead className="w-12" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className={tx.isVoided ? "opacity-50" : ""}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDateShort(tx.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={sourceBadgeVariant(tx.sourceLabel)} className="text-[10px] px-1.5 py-0">
                              {tx.sourceLabel}
                            </Badge>
                            {tx.isAutomatic && (
                              <span className="text-[10px] text-muted-foreground italic">Otomatis</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            tx.direction === "IN"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : tx.entryType === "MDR_EXPENSE"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {tx.direction === "IN" ? "Pendapatan" : tx.entryType === "MDR_EXPENSE" ? "MDR" : "Pengeluaran"}
                          </span>
                          {tx.isVoided && (
                            <span className="ml-1.5 inline-flex items-center text-[10px] text-muted-foreground">(void)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{tx.branchName || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate text-muted-foreground">
                          {tx.description || "-"}
                        </TableCell>
                        <TableCell className={`text-xs text-right font-medium tabular-nums ${
                          tx.direction === "IN" ? "text-green-600" : "text-red-600"
                        }`}>
                          {tx.direction === "IN" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </TableCell>
                        {sourceFilter === "MANUAL" && (
                          <TableCell>
                            {!tx.isAutomatic && !tx.isVoided && (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title="Batalkan"
                                onClick={() => handleVoidOpen(tx)}
                              >
                                <Ban className="size-3.5" />
                              </button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Footer */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {loading ? "Memuat data..." : `Menampilkan ${rangeStart} - ${rangeEnd} dari ${totalCount} transaksi`}
                </p>
                <div className="flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
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
                    <Button variant="outline" size="icon" className="size-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-[2rem] text-center text-xs tabular-nums text-muted-foreground">{safePage}</span>
                    <Button variant="outline" size="icon" className="size-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ──── Income Modal ──── */}
      <Dialog open={showIncomeModal} onOpenChange={setShowIncomeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pendapatan</DialogTitle>
            <DialogDescription>Catat pemasukan manual di luar servis dan POS.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Cabang</Label>
              <Select value={incBranch} onValueChange={setIncBranch}>
                <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                <SelectContent>
                  {branches.filter((b) => !resolvedBranchId || b.id === resolvedBranchId).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Akun Pembayaran</Label>
              <Select value={incAccount} onValueChange={setIncAccount}>
                <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Kategori</Label>
              <Select value={incCategory} onValueChange={setIncCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Jumlah (Rp)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={incAmount}
                onChange={(e) => setIncAmount(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Deskripsi</Label>
              <Textarea
                placeholder="Deskripsi pendapatan..."
                value={incDescription}
                onChange={(e) => setIncDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tanggal</Label>
              <Input type="date" value={incDate} onChange={(e) => setIncDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncomeModal(false)} disabled={submitting}>Batal</Button>
            <Button
              onClick={handleCreateIncome}
              disabled={submitting || !incBranch || !incAccount || !incAmount || !incDescription}
            >
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Expense Modal ──── */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pengeluaran</DialogTitle>
            <DialogDescription>Catat pengeluaran manual untuk operasional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Cabang</Label>
              <Select value={expBranch} onValueChange={setExpBranch}>
                <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                <SelectContent>
                  {branches.filter((b) => !resolvedBranchId || b.id === resolvedBranchId).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Akun Pembayaran</Label>
              <Select value={expAccount} onValueChange={setExpAccount}>
                <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Kategori</Label>
              <Select value={expCategory} onValueChange={setExpCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Jumlah (Rp)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Deskripsi</Label>
              <Textarea
                placeholder="Deskripsi pengeluaran..."
                value={expDescription}
                onChange={(e) => setExpDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tanggal</Label>
              <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseModal(false)} disabled={submitting}>Batal</Button>
            <Button
              onClick={handleCreateExpense}
              disabled={submitting || !expBranch || !expAccount || !expAmount || !expDescription}
            >
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Void Confirmation Modal ──── */}
      <Dialog open={showVoidModal} onOpenChange={setShowVoidModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Batalkan Transaksi</DialogTitle>
            <DialogDescription>
              Transaksi ini akan dibatalkan dengan membuat jurnal pembalik. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {voidTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p><span className="text-muted-foreground">Sumber:</span> {voidTarget.sourceLabel}</p>
                <p><span className="text-muted-foreground">Jumlah:</span> {formatCurrency(voidTarget.amount)}</p>
                <p className="truncate"><span className="text-muted-foreground">Deskripsi:</span> {voidTarget.description || "-"}</p>
              </div>
              <div className="grid gap-2">
                <Label>Alasan Pembatalan</Label>
                <Textarea
                  placeholder="Alasan pembatalan..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidModal(false)} disabled={submitting}>Tutup</Button>
            <Button
              variant="destructive"
              onClick={handleVoidConfirm}
              disabled={submitting || !voidReason.trim()}
            >
              {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Batalkan Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
