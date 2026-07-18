"use client";

import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Wallet, ChevronRight, Store, Clock, User, Timer,
  X, AlertTriangle, Loader2, ArrowUpRight, ArrowDownRight,
  BadgeCheck, Ban, Plus, LogOut, ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { useStoreShift } from "@/features/store-shift/store-shift-provider";
import { getStoreShiftOverviewAction } from "@/server/actions/store-shift.actions";
import { createOtherIncomeAction, createOperatingExpenseAction } from "@/server/actions/finance-transaction.actions";
import { listPaymentAccountsAction } from "@/server/actions/payment-account.actions";
import { StoreShiftCloseModal } from "@/components/store-shift/StoreShiftCloseModal";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import type { Role } from "@/lib/permissions/roles";
import { ROLE_LABELS } from "@/lib/permissions/roles";

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try { return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return value; }
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "-";
  try { return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }); }
  catch { return value; }
}

interface ShiftCashWidgetProps {
  brandSlug: string;
  role: Role;
  canAccessAllBranches: boolean;
  onOpenShift?: () => void;
  grouped?: boolean;
}

const METHOD_TYPE_LABELS: Record<string, string> = {
  CASH: "Cash",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  DEBIT: "Debit",
  EWALLET: "E-Wallet",
};

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

export function ShiftCashWidget({ brandSlug, role, canAccessAllBranches, onOpenShift, grouped = false }: ShiftCashWidgetProps) {
  const pathname = usePathname();
  const { activeBranchId, activeBranchName, branches } = useActiveBranch();
  const { activeShift, isShiftLoading, refreshShiftStatus } = useStoreShift();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [duration, setDuration] = useState("");

  /* Income quick action */
  const [showIncome, setShowIncome] = useState(false);
  const [incAmount, setIncAmount] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [incAccount, setIncAccount] = useState("");
  const [incCategory, setIncCategory] = useState(INCOME_CATEGORIES[0]);
  const [incAccounts, setIncAccounts] = useState<any[]>([]);
  const [incLoading, setIncLoading] = useState(false);
  const [incError, setIncError] = useState<string | null>(null);

  /* Expense quick action */
  const [showExpense, setShowExpense] = useState(false);
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expAccount, setExpAccount] = useState("");
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expAccounts, setExpAccounts] = useState<any[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  /* Close shift quick action */
  const [showCloseShift, setShowCloseShift] = useState(false);

  const isGeneralMode = !activeBranchId || activeBranchId === "ALL_BRANCHES";

  /* Format duration */
  useEffect(() => {
    if (!overview?.activeShift?.openedAt) {
      setDuration("");
      return;
    }
    function updateDuration() {
      const opened = new Date(overview.activeShift.openedAt).getTime();
      const now = Date.now();
      const diff = Math.floor((now - opened) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setDuration(`${h}j ${m}m`);
    }
    updateDuration();
    const interval = setInterval(updateDuration, 60000);
    return () => clearInterval(interval);
  }, [overview?.activeShift?.openedAt]);

  /* ── Shared overview fetcher ── */
  const refreshOverview = useCallback(async () => {
    if (isGeneralMode) return;
    if (!activeBranchId) return;

    setOverviewLoading(true);
    setOverviewError(null);
    const result = await getStoreShiftOverviewAction(brandSlug, activeBranchId);
    if (result.success) {
      setOverview(result.data);
    } else {
      setOverviewError(result.error);
    }
    setOverviewLoading(false);
  }, [brandSlug, activeBranchId, isGeneralMode]);

  /* Pre-fetch overview on mount + when shift changes */
  useEffect(() => {
    refreshOverview();
  }, [refreshOverview, activeShift?.id]);

  /* Listen for shift-changed event to auto-refresh */
  useEffect(() => {
    const handler = () => { refreshOverview(); };
    window.addEventListener("seervis:shift-changed", handler);
    window.addEventListener("seervis:cash-transaction", handler);
    return () => {
      window.removeEventListener("seervis:shift-changed", handler);
      window.removeEventListener("seervis:cash-transaction", handler);
    };
  }, [refreshOverview]);

  /* Fetch overview when drawer opens */
  const openDrawer = useCallback(async () => {
    setDrawerOpen(true);
    await refreshOverview();
  }, [refreshOverview]);

  /* ── Income / Expense Quick Action Handlers ── */

  const openIncomeForm = useCallback(async () => {
    setIncAmount("");
    setIncDesc("");
    setIncAccount("");
    setIncCategory(INCOME_CATEGORIES[0]);
    setIncError(null);
    setIncLoading(true);
    const result = await listPaymentAccountsAction(brandSlug, activeBranchId!);
    if (result.success) {
      setIncAccounts(result.data);
      if (result.data.length > 0) setIncAccount(result.data[0].id);
    } else {
      setIncError(result.error);
    }
    setIncLoading(false);
    setShowIncome(true);
  }, [brandSlug, activeBranchId]);

  const handleCreateIncome = useCallback(async () => {
    if (!incAmount || !incDesc || !incAccount) return;
    const amount = parseInt(incAmount.replace(/[^0-9]/g, ""), 10);
    if (amount <= 0) { setIncError("Jumlah harus lebih dari 0."); return; }
    setIncLoading(true);
    setIncError(null);
    const today = new Date().toISOString().split("T")[0];
    const result = await createOtherIncomeAction({
      brandSlug,
      branchId: activeBranchId!,
      paymentAccountId: incAccount,
      category: incCategory,
      amount,
      description: incDesc.trim(),
      date: today,
    });
    setIncLoading(false);
    if (result.success) {
      setShowIncome(false);
      triggerDynamicIslandFeedback({ type: "success", title: "Pemasukan berhasil dicatat" });
      window.dispatchEvent(new CustomEvent("seervis:cash-transaction"));
    } else {
      setIncError(result.error);
    }
  }, [brandSlug, activeBranchId, incAmount, incDesc, incAccount, openDrawer]);

  const openExpenseForm = useCallback(async () => {
    setExpAmount("");
    setExpDesc("");
    setExpAccount("");
    setExpCategory(EXPENSE_CATEGORIES[0]);
    setExpError(null);
    setExpLoading(true);
    const result = await listPaymentAccountsAction(brandSlug, activeBranchId!);
    if (result.success) {
      setExpAccounts(result.data);
      if (result.data.length > 0) setExpAccount(result.data[0].id);
    } else {
      setExpError(result.error);
    }
    setExpLoading(false);
    setShowExpense(true);
  }, [brandSlug, activeBranchId]);

  const handleCreateExpense = useCallback(async () => {
    if (!expAmount || !expDesc || !expAccount) return;
    const amount = parseInt(expAmount.replace(/[^0-9]/g, ""), 10);
    if (amount <= 0) { setExpError("Jumlah harus lebih dari 0."); return; }
    setExpLoading(true);
    setExpError(null);
    const today = new Date().toISOString().split("T")[0];
    const result = await createOperatingExpenseAction({
      brandSlug,
      branchId: activeBranchId!,
      paymentAccountId: expAccount,
      category: expCategory,
      amount,
      description: expDesc.trim(),
      date: today,
    });
    setExpLoading(false);
    if (result.success) {
      setShowExpense(false);
      triggerDynamicIslandFeedback({ type: "success", title: "Pengeluaran berhasil dicatat" });
      window.dispatchEvent(new CustomEvent("seervis:cash-transaction"));
    } else {
      setExpError(result.error);
    }
  }, [brandSlug, activeBranchId, expAmount, expDesc, expAccount, openDrawer]);

  /* Visibility logic */
  if (role === "TECHNICIAN") return null;

  /* General mode */
  if (isGeneralMode) {
    return (
      <div className={grouped ? "w-full" : "px-3 py-2"}>
        <button
          type="button"
          disabled
          className="flex w-full items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-2 opacity-50 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-data-[collapsible=icon]:size-8">
            <Wallet className="size-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium text-muted-foreground">Saldo Kasir</span>
            <span className="text-xs text-muted-foreground/60">Pilih cabang</span>
          </div>
        </button>
      </div>
    );
  }

  const resolvedBranchName = branches.find((b) => b.id === activeBranchId)?.name ?? activeBranchName ?? "Cabang";

  return (
    <>
      <div className={grouped ? "w-full" : "px-3 py-1"}>
        <button
          type="button"
          onClick={openDrawer}
          className="flex w-full items-center gap-2 rounded-xl border border-transparent bg-background/70 p-2 text-left shadow-sm transition-colors hover:border-border/60 hover:bg-background group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-data-[collapsible=icon]:size-8">
            <Wallet className="size-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium text-foreground">Saldo Kasir</span>
            {isShiftLoading ? (
              <Skeleton className="mt-0.5 h-4 w-20" />
            ) : activeShift ? (
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {overview?.expectedCash != null ? formatCurrency(overview.expectedCash) : formatCurrency(activeShift.openingCash)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Belum buka</span>
            )}
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </button>
      </div>

      {/* Shift Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(o) => { if (!o) setDrawerOpen(false); }}>
        <SheetContent
          side="left"
          className="flex h-full w-[calc(100vw-1rem)] max-w-md flex-col overflow-y-auto p-0 sm:max-w-lg [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.3)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/40"
        >
          <SheetHeader className="border-b p-5 pr-12 text-left">
            <SheetTitle>Rincian Shift</SheetTitle>
            <SheetDescription>
              {resolvedBranchName}
              {activeShift ? ` · Shift aktif` : " · Tidak ada shift aktif"}
            </SheetDescription>
          </SheetHeader>

          {overviewLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Memuat rincian shift...</p>
              </div>
            </div>
          ) : overviewError ? (
            <div className="flex flex-1 items-center justify-center p-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertTriangle className="size-8 text-destructive" />
                <p className="text-sm text-destructive">{overviewError}</p>
                <Button variant="outline" size="sm" onClick={openDrawer}>Coba Lagi</Button>
              </div>
            </div>
          ) : !overview?.activeShift ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <Store className="size-12 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">Toko belum dibuka</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Buka toko terlebih dahulu untuk mencatat transaksi kas.
                </p>
              </div>
              {onOpenShift && (
                <Button onClick={onOpenShift} className="gap-2">
                  <Store className="size-4" /> Buka Toko
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-5 p-5">
              {/* Shift header */}
              <section className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600 text-white text-[10px]">
                      <BadgeCheck className="size-3 mr-1" /> Aktif
                    </Badge>
                    <span className="text-sm font-medium">{duration}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">#{overview.activeShift.shiftNumber}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="size-3" />
                    {overview.activeShift.openedByName || "-"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3" />
                    {formatDate(overview.activeShift.openedAt)} {formatTime(overview.activeShift.openedAt)}
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Store className="size-3" />
                    {overview.activeShift.branchName || resolvedBranchName}
                  </div>
                </div>
              </section>

              {/* Opening cash */}
              <section className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Modal awal (kas tunai)</p>
                <p className="mt-1 text-base font-semibold">{formatCurrency(overview.openingCash)}</p>
              </section>

              {/* Cash breakdown */}
              <section className="space-y-2 rounded-xl border bg-card p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo awal kas tunai</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(overview.openingCash)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Penjualan POS (tunai)</span>
                  <span className="font-semibold tabular-nums text-green-600">{formatCurrency(overview.cashSales)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pembayaran Service (tunai)</span>
                  <span className="font-semibold tabular-nums text-green-600">{formatCurrency(overview.serviceCashPayments)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Kas Masuk manual</span>
                  <span className="font-semibold tabular-nums text-green-600">{formatCurrency(overview.cashInTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Kas Keluar manual</span>
                  <span className="font-semibold tabular-nums text-red-600">{formatCurrency(overview.cashOutTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Refund</span>
                  <span className="font-semibold tabular-nums text-red-600">{formatCurrency(overview.refunds)}</span>
                </div>
                <hr className="border-border/50" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Kas yang Diharapkan</span>
                  <span className="font-semibold tabular-nums text-primary">{formatCurrency(overview.expectedCash)}</span>
                </div>
              </section>

              {/* Payment breakdown */}
              {overview.paymentBreakdown && overview.paymentBreakdown.length > 0 && (
                <section>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Metode Pembayaran</p>
                  <div className="space-y-1.5">
                    {overview.paymentBreakdown.map((pb: any) => (
                      <div
                        key={pb.methodType}
                        className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                      >
                        <span className="text-xs font-medium">{METHOD_TYPE_LABELS[pb.methodType] || pb.methodName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs tabular-nums text-muted-foreground">{pb.count}x</span>
                          <span className="text-xs font-medium tabular-nums">{formatCurrency(pb.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Quick actions */}
              <section className="mt-auto flex flex-col gap-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Aksi Cepat</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs justify-center" onClick={openIncomeForm}>
                    <Plus className="size-3.5" /> Tambah Pemasukan
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs justify-center" onClick={openExpenseForm}>
                    <Plus className="size-3.5" /> Catat Pengeluaran
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-9 gap-1.5 text-xs justify-center"
                  onClick={() => setShowCloseShift(true)}
                >
                  <LogOut className="size-3.5" /> Akhiri Shift
                </Button>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Income Quick Action Dialog */}
      <Dialog open={showIncome} onOpenChange={(o) => { if (!o) setShowIncome(false); }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" /> Tambah Pemasukan
            </DialogTitle>
            <DialogDescription className="text-xs">Catat pemasukan manual ke kas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Akun Kas</Label>
              <Select value={incAccount} onValueChange={setIncAccount} disabled={incLoading}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                <SelectContent>
                  {incAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">{a.accountName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <Select value={incCategory} onValueChange={setIncCategory} disabled={incLoading}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Jumlah (Rp)</Label>
              <Input
                type="text" inputMode="numeric"
                placeholder="0"
                value={incAmount}
                onChange={(e) => setIncAmount(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-9 text-xs"
                disabled={incLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Keterangan</Label>
              <Textarea
                placeholder="Deskripsi pemasukan..."
                value={incDesc}
                onChange={(e) => setIncDesc(e.target.value)}
                rows={2}
                className="text-xs"
                disabled={incLoading}
              />
            </div>
            {incError && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="size-4" />
                <AlertDescription className="text-xs">{incError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowIncome(false)} disabled={incLoading}>Batal</Button>
            <Button size="sm" className="gap-2" onClick={handleCreateIncome} disabled={incLoading || !incAmount || !incDesc || !incAccount}>
              {incLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Quick Action Dialog */}
      <Dialog open={showExpense} onOpenChange={(o) => { if (!o) setShowExpense(false); }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" /> Catat Pengeluaran
            </DialogTitle>
            <DialogDescription className="text-xs">Catat pengeluaran manual dari kas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Akun Kas</Label>
              <Select value={expAccount} onValueChange={setExpAccount} disabled={expLoading}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                <SelectContent>
                  {expAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">{a.accountName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <Select value={expCategory} onValueChange={setExpCategory} disabled={expLoading}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Jumlah (Rp)</Label>
              <Input
                type="text" inputMode="numeric"
                placeholder="0"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-9 text-xs"
                disabled={expLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Keterangan</Label>
              <Textarea
                placeholder="Deskripsi pengeluaran..."
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                rows={2}
                className="text-xs"
                disabled={expLoading}
              />
            </div>
            {expError && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="size-4" />
                <AlertDescription className="text-xs">{expError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowExpense(false)} disabled={expLoading}>Batal</Button>
            <Button size="sm" className="gap-2" onClick={handleCreateExpense} disabled={expLoading || !expAmount || !expDesc || !expAccount}>
              {expLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Modal (reuses existing StoreShiftCloseModal) */}
      {overview?.activeShift && (
        <StoreShiftCloseModal
          open={showCloseShift}
          onOpenChange={setShowCloseShift}
          brandSlug={brandSlug}
          shiftId={overview.activeShift.id}
          expectedCash={overview.expectedCash}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent("seervis:cash-transaction"));
            window.dispatchEvent(new CustomEvent("seervis:shift-changed"));
          }}
        />
      )}
    </>
  );
}
