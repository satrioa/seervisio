"use client";

import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Wallet, ChevronRight, Store, Clock, User, Timer,
  X, AlertTriangle, Loader2, ArrowUpRight, ArrowDownRight,
  BadgeCheck, Ban, Plus, LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { useStoreShift } from "@/features/store-shift/store-shift-provider";
import { getStoreShiftOverviewAction } from "@/server/actions/store-shift.actions";
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

export function ShiftCashWidget({ brandSlug, role, canAccessAllBranches, onOpenShift, grouped = false }: ShiftCashWidgetProps) {
  const pathname = usePathname();
  const { activeBranchId, activeBranchName, branches } = useActiveBranch();
  const { activeShift, isShiftLoading, refreshShiftStatus } = useStoreShift();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [duration, setDuration] = useState("");

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

  /* Fetch overview when drawer opens */
  const openDrawer = useCallback(async () => {
    setDrawerOpen(true);
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
          className="flex h-full w-[calc(100vw-1rem)] max-w-md flex-col overflow-y-auto p-0 sm:max-w-lg"
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

              {/* Income / Expense */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-green-50/50 dark:bg-green-950/10 p-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="size-3 text-green-600" /> Pemasukan
                  </span>
                  <p className="mt-1 text-base font-semibold text-green-600">{formatCurrency(overview.cashInTotal)}</p>
                </div>
                <div className="rounded-xl border bg-red-50/50 dark:bg-red-950/10 p-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowDownRight className="size-3 text-red-600" /> Pengeluaran
                  </span>
                  <p className="mt-1 text-base font-semibold text-red-600">{formatCurrency(overview.cashOutTotal)}</p>
                </div>
              </div>

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
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs justify-center" disabled>
                    <Plus className="size-3.5" /> Tambah Pemasukan
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs justify-center" disabled>
                    <Plus className="size-3.5" /> Catat Pengeluaran
                  </Button>
                </div>
                {onOpenShift && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 gap-1.5 text-xs justify-center"
                    disabled
                  >
                    <LogOut className="size-3.5" /> Akhiri Shift
                  </Button>
                )}
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
