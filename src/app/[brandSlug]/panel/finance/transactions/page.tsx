"use client";

import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Search, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Calendar, Download, History, ArrowRightLeft,
  Plus, X, ChevronLeft, ChevronRight, Landmark,
  Wallet, ScrollText, Ban, Loader2,
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  listFinanceTransactionsAction,
  createOtherIncomeAction,
  createOperatingExpenseAction,
  voidFinanceTransactionAction,
  type FinanceTransactionRow,
  type FinanceTransactionSummary,
} from "@/server/actions/finance-transaction.actions";

import { listPaymentAccountsAction } from "@/server/actions/payment-account.actions";

import { MOVEMENT_TYPE_LABELS } from "@/lib/finance/movement-labels";

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

/* ── Formatting ── */

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try { return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return value; }
}

function formatDateShort(value: string | null | undefined): string {
  if (!value) return "-";
  try { return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return value; }
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
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateFrom, setDateFrom] = useState(monthStartISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [branchFilter, setBranchFilter] = useState("ALL_BRANCHES");
  const [accountFilter, setAccountFilter] = useState("ALL_ACCOUNTS");
  const [typeFilter, setTypeFilter] = useState("ALL_TYPES");
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
    listPaymentAccountsAction(brandSlug, null, null, "ALL").then((r) => {
      if (r.success) {
        setAccounts(r.data.map((a) => ({ id: a.id, name: a.accountName })));
      }
      setAccountsLoading(false);
    });
  }, [brandSlug]);

  /* Date preset */
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

  /* Fetch transactions */
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listFinanceTransactionsAction({
      brandSlug,
      branchId: branchFilter === "ALL_BRANCHES" ? resolvedBranchId ?? null : branchFilter,
      accountId: accountFilter === "ALL_ACCOUNTS" ? null : accountFilter,
      movementType: typeFilter === "ALL_TYPES" ? null : typeFilter,
      direction: directionFilter === "ALL_DIRECTIONS" ? null : directionFilter,
      search: search || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      page,
      pageSize,
    });
    if (result.success) {
      setTransactions(result.data.transactions);
      setTotalCount(result.data.totalCount);
      setSummary(result.data.summary);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug, branchFilter, resolvedBranchId, accountFilter, typeFilter, directionFilter, search, dateFrom, dateTo, page, pageSize]);

  useEffect(() => { void fetchTransactions(); }, [fetchTransactions]);

  useEffect(() => { setPage(1); }, [branchFilter, accountFilter, typeFilter, directionFilter, search, dateFrom, dateTo, datePreset]);

  const movementTypeOptions = Object.entries(MOVEMENT_TYPE_LABELS).filter(
    ([key]) => ["OTHER_INCOME", "OPERATING_EXPENSE", "BANK_FEE"].includes(key),
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalCount);

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
      <p className="text-sm text-muted-foreground -mt-4">Catat transaksi keuangan manual di luar servis dan POS.</p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Terjadi kesalahan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
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
              <SelectTrigger className="w-36 h-8 text-xs">
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
              <Download className="size-3.5" /> Export
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openIncomeModal}>
              <Plus className="size-3.5" /> Tambah Pendapatan
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={openExpenseModal}>
              <Plus className="size-3.5" /> Tambah Pengeluaran
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="size-3 text-green-600" /> Total Pendapatan Lain
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
              <ArrowRightLeft className="size-3" /> Net Manual
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
              <p className="text-sm text-muted-foreground">Belum ada pendapatan atau pengeluaran.</p>
              <p className="text-xs text-muted-foreground/60">Gunakan tombol di atas untuk mencatat transaksi keuangan manual.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Akun</TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead className="max-w-[160px]">Deskripsi</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead>Dibuat Oleh</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className={tx.isVoided ? "opacity-50" : ""}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDateShort(tx.createdAt)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            tx.movementType === "OTHER_INCOME"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : tx.movementType === "BANK_FEE"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {MOVEMENT_TYPE_LABELS[tx.movementType] || tx.movementType}
                          </span>
                          {tx.isVoided && (
                            <span className="ml-1.5 inline-flex items-center text-[10px] text-muted-foreground">(void)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{tx.accountName}</TableCell>
                        <TableCell className="text-xs">{tx.branchName || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate text-muted-foreground">
                          {tx.description || "-"}
                        </TableCell>
                        <TableCell className={`text-xs text-right font-medium tabular-nums ${
                          tx.direction === "IN" ? "text-green-600" : "text-red-600"
                        }`}>
                          {tx.direction === "IN" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{tx.createdByName || "-"}</TableCell>
                        <TableCell>
                          {!tx.isVoided && (
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
            <DialogTitle>Tambah Pendapatan Lain</DialogTitle>
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
                <p><span className="text-muted-foreground">Tipe:</span> {MOVEMENT_TYPE_LABELS[voidTarget.movementType] || voidTarget.movementType}</p>
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
