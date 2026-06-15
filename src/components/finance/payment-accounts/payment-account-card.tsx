"use client";

import { CreditCard, Banknote, MoreHorizontal, Edit, CircleDollarSign, History, ShieldCheck, Globe, Store as StoreIcon, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PaymentAccountRow } from "@/server/actions/payment-account.actions";

/* ── Method Badge Config ── */

const METHOD_CONFIG: Record<string, { label: string; color: string }> = {
  QRIS: { label: "QRIS", color: "purple" },
  TRANSFER: { label: "Transfer", color: "blue" },
  DEBIT: { label: "Debit", color: "amber" },
  EWALLET: { label: "E-Wallet", color: "cyan" },
};

const methodBadgeClass: Record<string, string> = {
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

/* ── Helpers ── */

function formatCurrencyCompact(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ── Card Component ── */

export interface PaymentAccountCardProps {
  account: PaymentAccountRow;
  onEdit: (account: PaymentAccountRow) => void;
  onAdjustBalance: (account: PaymentAccountRow) => void;
  onViewMovements: (account: PaymentAccountRow) => void;
  onDelete?: (account: PaymentAccountRow) => void;
}

export function PaymentAccountCard({
  account,
  onEdit,
  onAdjustBalance,
  onViewMovements,
  onDelete,
}: PaymentAccountCardProps) {
  const isCash = account.isCashAccount;
  const isGlobal = !account.branchId;
  const watermark = account.accountName.charAt(0).toUpperCase();
  const hasBankInfo = account.bankName || account.accountNumber || account.accountHolderName;
  const canDelete = !account.isSystemAccount && !account.isCashAccount;

  const linkedMethods = account.linkedMethods ?? [];
  const visibleMethods = linkedMethods.slice(0, 4);
  const extraCount = linkedMethods.length - 4;
  const statusMeta = account.isActive
    ? {
        label: "Active",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
        dotClassName: "bg-emerald-500",
      }
    : {
        label: "Inactive",
        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
        dotClassName: "bg-red-500",
      };

  return (
    <article className="group flex min-h-[200px] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:shadow-black/20">
      {/* Header: dark navy card top */}
      <div className="relative flex items-start gap-3 bg-slate-900 p-4 text-white dark:bg-black/70">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/95 dark:bg-white/90 ${isCash ? "text-emerald-600" : "text-slate-900"}`}>
          {isCash ? <Banknote className="size-5" /> : <CreditCard className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold">{account.accountName}</h3>
            {account.isSystemAccount && (
              <Badge variant="secondary" className="shrink-0 h-5 gap-0.5 border-white/20 bg-white/10 text-white text-[10px]">
                <ShieldCheck className="size-3" />
                Sistem
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-white/70">
            {isGlobal ? (
              <span className="inline-flex items-center gap-1"><Globe className="size-3" />Semua Cabang</span>
            ) : (
              <span className="inline-flex items-center gap-1"><StoreIcon className="size-3" />{account.branchName || "Cabang"}</span>
            )}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0 text-white/70 hover:text-white hover:bg-white/10">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Edit className="size-3.5 mr-2" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAdjustBalance(account)}>
              <CircleDollarSign className="size-3.5 mr-2" />Penyesuaian
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewMovements(account)}>
              <History className="size-3.5 mr-2" />Mutasi
            </DropdownMenuItem>
            {canDelete && onDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400" onClick={() => onDelete(account)}>
                  <Trash2 className="size-3.5 mr-2" />Hapus Akun
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-4xl font-black uppercase text-white/5 select-none pointer-events-none">
          {watermark}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 bg-card p-4 text-card-foreground">
        {/* Status + info */}
        {isCash ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Banknote className="size-3.5 text-emerald-600" />
            Akun kas tunai sistem cabang
          </p>
        ) : (
          <>
            {hasBankInfo && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="size-3 text-emerald-600 shrink-0" />
                <span className="truncate">
                  {[account.bankName, account.accountNumber, account.accountHolderName]
                    .filter(Boolean)
                    .join(" · ") || "Telah Ditambahkan"}
                </span>
              </p>
            )}
          </>
        )}

        {/* System badge */}
        <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
          {account.isSystemAccount && (
            <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <ShieldCheck className="size-2.5 mr-0.5" />Sistem
            </span>
          )}
        </div>

        {/* Linked method badges */}
        {linkedMethods.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {visibleMethods.map((m, i) => {
              const cfg = METHOD_CONFIG[m.methodType];
              if (!cfg) return null;
              const cls = methodBadgeClass[cfg.color] || "";
              return (
                <span key={`${m.methodType}-${i}`} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
                  {cfg.label}
                  {m.branchName ? <span className="ml-0.5 opacity-60">·{m.branchName}</span> : null}
                </span>
              );
            })}
            {extraCount > 0 && (
              <span className="text-[10px] text-muted-foreground">+{extraCount} lainnya</span>
            )}
          </div>
        ) : !isCash ? (
          <p className="text-[10px] text-muted-foreground">Belum ditautkan ke metode pembayaran</p>
        ) : null}

        {/* Balance */}
        <div className="mt-auto">
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{formatCurrencyCompact(account.currentBalance)}</p>
        </div>
      </div>

      {/* Footer: action bar */}
      <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-3 py-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold leading-none ${statusMeta.className}`}>
          <span className={`size-1.5 rounded-full ${statusMeta.dotClassName}`} />
          {statusMeta.label}
        </span>
        <div className="flex items-center justify-end gap-0.5">
          <Button type="button" variant="ghost" size="icon" className="size-8 hover:bg-background/80 dark:hover:bg-background/60" onClick={() => onEdit(account)} title="Edit">
            <Edit className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8 hover:bg-background/80 dark:hover:bg-background/60" onClick={() => onAdjustBalance(account)} title="Penyesuaian Saldo">
            <CircleDollarSign className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8 hover:bg-background/80 dark:hover:bg-background/60" onClick={() => onViewMovements(account)} title="Riwayat Mutasi">
            <History className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
