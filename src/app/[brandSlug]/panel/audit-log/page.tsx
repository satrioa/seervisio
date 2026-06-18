"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Search, Filter, RefreshCw, AlertTriangle, Info, AlertCircle,
  ShieldAlert, Clock, User, Building2, ChevronLeft, ChevronRight,
  List, Columns, ExternalLink, Eye, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from "@/components/ui/sheet";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import {
  getAuditLogsAction,
  type AuditLogRow, type AuditLogCounts, type AuditFilterParams,
} from "@/server/actions/audit.actions";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";

/* ═══════════════════════════════════════════════════════════════
   Formatter
   ═══════════════════════════════════════════════════════════════ */

type Severity = "info" | "important" | "warning" | "critical";
type Module = "SERVICE" | "POS" | "FINANCE" | "INVENTORY" | "ACCOUNT" | "PAYMENT_METHOD" | "SHIFT" | "SYSTEM" | "OTHER";

const SEVERITY_CRITICAL = new Set([
  "DELETE", "REMOVE", "VOID", "ROLLBACK", "ACCOUNT_REMOVED",
  "PAYMENT_ACCOUNT_DELETED", "IMPORT_ROLLBACK", "POS_TRANSACTION_VOID",
]);
const SEVERITY_WARNING = new Set([
  "CANCEL_SERVICE", "BALANCE_ADJUSTMENT", "REFUND",
  "STOCK_ADJUSTMENT_IN", "STOCK_ADJUSTMENT_OUT", "PASSWORD_RESET",
  "PAYMENT_METHOD_CHANGED", "PAYMENT_ACCOUNT_BALANCE_ADJUSTED",
]);
const SEVERITY_IMPORTANT = new Set([
  "SERVICE_CREATED", "SERVICE_STATUS_UPDATED", "SERVICE_COMPLETED",
  "PAYMENT_ACCOUNT_CREATED", "PAYMENT_ACCOUNT_UPDATED",
  "PAYMENT_ACCOUNT_GLOBAL_CREATED", "PAYMENT_ACCOUNT_BRANCH_CREATED",
  "CASH_ACCOUNT_CREATED", "STOCK_OPNAME_ADJUSTMENT", "ACCOUNT_CREATED",
  "STORE_SHIFT_OPENED", "STORE_SHIFT_CLOSED", "SYSTEM_SETTINGS_UPDATED",
  "PAYMENT_METHOD_LINKED", "TECHNICIAN_ASSIGNED",
]);

const MODULE_ACTIONS: Record<string, Set<string>> = {
  SERVICE: new Set(["SERVICE_CREATED", "SERVICE_STATUS_UPDATED", "SERVICE_UPDATED", "CANCEL_SERVICE", "SERVICE_COMPLETED", "TECHNICIAN_ASSIGNED"]),
  POS: new Set(["POS_TRANSACTION_CREATED", "POS_TRANSACTION_VOID"]),
  FINANCE: new Set(["CREATE", "VOID"]),
  INVENTORY: new Set(["STOCK_ADJUSTMENT_IN", "STOCK_ADJUSTMENT_OUT", "STOCK_OPNAME_ADJUSTMENT"]),
  ACCOUNT: new Set(["ACCOUNT_CREATED", "ACCOUNT_REMOVED", "PASSWORD_RESET"]),
  PAYMENT_METHOD: new Set(["PAYMENT_METHOD_LINKED", "PAYMENT_METHOD_CHANGED", "PAYMENT_ACCOUNT_CREATED", "PAYMENT_ACCOUNT_UPDATED", "PAYMENT_ACCOUNT_DELETED", "PAYMENT_ACCOUNT_ARCHIVED", "PAYMENT_ACCOUNT_BALANCE_ADJUSTED", "CASH_ACCOUNT_CREATED", "PAYMENT_ACCOUNT_GLOBAL_CREATED", "PAYMENT_ACCOUNT_BRANCH_CREATED"]),
  SHIFT: new Set(["STORE_SHIFT_OPENED", "STORE_SHIFT_CLOSED"]),
  SYSTEM: new Set(["SYSTEM_SETTINGS_UPDATED"]),
};

function getSeverity(action: string): Severity {
  if (SEVERITY_CRITICAL.has(action)) return "critical";
  if (SEVERITY_WARNING.has(action)) return "warning";
  if (SEVERITY_IMPORTANT.has(action)) return "important";
  return "info";
}

function getModule(action: string): Module {
  for (const [mod, actions] of Object.entries(MODULE_ACTIONS)) {
    if (actions.has(action)) return mod as Module;
  }
  return "OTHER";
}

const MODULE_LABELS: Record<string, string> = {
  SERVICE: "Servis", POS: "POS", FINANCE: "Keuangan",
  INVENTORY: "Inventori", ACCOUNT: "Akun", PAYMENT_METHOD: "Pembayaran",
  SHIFT: "Shift", SYSTEM: "Sistem", OTHER: "Lainnya",
};

const SEVERITY_LABELS: Record<string, string> = {
  info: "Info", important: "Penting", warning: "Peringatan", critical: "Kritis",
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-gray-100 text-gray-700 border-gray-200",
  important: "bg-orange-50 text-orange-700 border-orange-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const SEVERITY_ICONS: Record<string, any> = {
  info: Info,
  important: AlertCircle,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Hari ini";
  if (d.toDateString() === yesterday.toDateString()) return "Kemarin";

  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    CREATE: "Membuat", VOID: "Membatalkan",
    STORE_SHIFT_OPENED: "Buka shift", STORE_SHIFT_CLOSED: "Tutup shift",
    PAYMENT_ACCOUNT_CREATED: "Membuat akun pembayaran",
    PAYMENT_ACCOUNT_GLOBAL_CREATED: "Membuat akun global",
    PAYMENT_ACCOUNT_BRANCH_CREATED: "Membuat akun cabang",
    PAYMENT_ACCOUNT_UPDATED: "Mengubah akun pembayaran",
    PAYMENT_ACCOUNT_DELETED: "Menghapus akun pembayaran",
    PAYMENT_ACCOUNT_ARCHIVED: "Mengarsipkan akun pembayaran",
    PAYMENT_ACCOUNT_BALANCE_ADJUSTED: "Menyesuaikan saldo",
    CASH_ACCOUNT_CREATED: "Membuat akun kas",
    PAYMENT_METHOD_LINKED: "Menautkan metode pembayaran",
    PAYMENT_METHOD_CHANGED: "Mengubah metode pembayaran",
    SYSTEM_SETTINGS_UPDATED: "Memperbarui pengaturan sistem",
    STOCK_ADJUSTMENT_IN: "Menambah stok",
    STOCK_ADJUSTMENT_OUT: "Mengurangi stok",
    STOCK_OPNAME_ADJUSTMENT: "Penyesuaian stok opname",
    ACCOUNT_CREATED: "Menambahkan user",
    ACCOUNT_REMOVED: "Menghapus akses user",
    PASSWORD_RESET: "Reset kata sandi",
    CANCEL_SERVICE: "Membatalkan servis",
    SERVICE_CREATED: "Membuat servis",
    SERVICE_STATUS_UPDATED: "Mengubah status servis",
    SERVICE_COMPLETED: "Menyelesaikan servis",
    TECHNICIAN_ASSIGNED: "Menugaskan teknisi",
    POS_TRANSACTION_CREATED: "Membuat transaksi POS",
    POS_TRANSACTION_VOID: "Membatalkan transaksi POS",
    BALANCE_ADJUSTMENT: "Menyesuaikan saldo",
    REFUND: "Melakukan refund",
    IMPORT_ROLLBACK: "Mengembalikan import",
    ROLLBACK: "Rollback",
    DELETE: "Menghapus",
    REMOVE: "Menghapus",
  };
  return map[action] ?? `Melakukan ${action.replace(/_/g, " ").toLowerCase()}`;
}

function extractBranchName(details: Record<string, any> | null): string | null {
  if (!details) return null;
  return details.branch_name ?? details.branchName ?? null;
}

function extractServiceNumber(details: Record<string, any> | null, description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/SRV-\d+/);
  return match?.[0] ?? null;
}

function extractAmount(details: Record<string, any> | null): number | null {
  if (!details) return null;
  return details.amount ?? details.Amount ?? null;
}

/* ── Formatted entry ── */
interface FormattedEntry {
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  module: Module;
  severity: Severity;
  branchLabel: string | null;
  serviceLink: string | null;
  targetLabel: string | null;
  changeSummary: { label: string; before: string; after: string }[];
}

function formatEntry(log: AuditLogRow): FormattedEntry {
  const sev = getSeverity(log.action);
  const mod = getModule(log.action);
  const actor = log.actorName ?? "Sistem";
  const desc = log.description ?? "";
  const det = log.details;
  const action = log.action;

  const SeverityIcon = SEVERITY_ICONS[sev];

  const iconMap: Record<string, { icon: any; bg: string; color: string }> = {
    STORE_SHIFT_OPENED: { icon: Clock, bg: "bg-green-100", color: "text-green-700" },
    STORE_SHIFT_CLOSED: { icon: Clock, bg: "bg-blue-100", color: "text-blue-700" },
    VOID: { icon: ShieldAlert, bg: "bg-red-100", color: "text-red-700" },
    CREATE: { icon: Info, bg: "bg-blue-100", color: "text-blue-700" },
    SYSTEM_SETTINGS_UPDATED: { icon: AlertCircle, bg: "bg-purple-100", color: "text-purple-700" },
    PAYMENT_ACCOUNT_BALANCE_ADJUSTED: { icon: AlertTriangle, bg: "bg-amber-100", color: "text-amber-700" },
    ACCOUNT_REMOVED: { icon: User, bg: "bg-red-100", color: "text-red-700" },
    ACCOUNT_CREATED: { icon: User, bg: "bg-green-100", color: "text-green-700" },
    PASSWORD_RESET: { icon: ShieldAlert, bg: "bg-amber-100", color: "text-amber-700" },
  };

  let iconData = iconMap[action] ?? { icon: SeverityIcon, bg: "bg-gray-100", color: "text-gray-700" };

  let title = "";
  let subtitle = "";
  let branchLabel: string | null = extractBranchName(det);
  let serviceLink: string | null = extractServiceNumber(det, desc);
  const targetLabel = log.targetLabel;
  const changes: { label: string; before: string; after: string }[] = [];

  if (action === "CREATE") {
    if (desc.includes("Pendapatan lain")) {
      title = `${actor} mencatat pendapatan lain`;
      const match = desc.match(/: (.+?) - (.+?) \((\d+)\)/);
      if (match) subtitle = `${match[2]} — ${formatCurrency(Number(match[3]))}`;
      else subtitle = desc;
    } else if (desc.includes("Pengeluaran")) {
      title = `${actor} mencatat pengeluaran`;
      const match = desc.match(/: (.+?) - (.+?) \((\d+)\)/);
      if (match) subtitle = `${match[2]} — ${formatCurrency(Number(match[3]))}`;
      else subtitle = desc;
    } else {
      title = `${actor} membuat data baru`;
      subtitle = desc;
    }
  } else if (action === "VOID") {
    title = `${actor} membatalkan transaksi`;
    subtitle = desc.replace(/^Pembatalan transaksi: /, "Alasan: ");
  } else if (action === "STORE_SHIFT_OPENED") {
    title = `${actor} membuka shift`;
    if (det?.opening_cash !== undefined) subtitle = `Kas awal: ${formatCurrency(det.opening_cash)}`;
  } else if (action === "STORE_SHIFT_CLOSED") {
    title = `${actor} menutup shift`;
    if (det?.cash_difference !== undefined) {
      const diff = Number(det.cash_difference);
      subtitle = `Selisih kas: ${diff >= 0 ? "+" : ""}${formatCurrency(diff)}`;
    }
  } else if (action === "PAYMENT_ACCOUNT_BALANCE_ADJUSTED") {
    title = `${actor} menyesuaikan saldo`;
    if (det) {
      const amt = Number(det.amount ?? 0);
      subtitle = `${det.direction === "IN" ? "Penambahan" : "Pengurangan"} ${formatCurrency(amt)} — ${det.reason ?? ""}`;
    }
  } else if (action.startsWith("PAYMENT_ACCOUNT_") || action === "CASH_ACCOUNT_CREATED") {
    title = `${actor} ${actionLabel(action)}`;
    if (det?.account_name) subtitle = det.account_name;
    else subtitle = targetLabel ?? desc;
  } else if (action === "PAYMENT_METHOD_LINKED") {
    title = `${actor} menautkan metode pembayaran`;
    if (det?.method_type) subtitle = det.method_type;
    else subtitle = desc;
  } else if (action.startsWith("STOCK_")) {
    title = `${actor} ${actionLabel(action)}`;
    subtitle = desc;
    if (det) {
      if (det.quantity !== undefined) changes.push({ label: "Jumlah", before: "", after: `${det.quantity} ${det.unit ?? "pcs"}` });
      if (det.reason) changes.push({ label: "Alasan", before: "", after: det.reason });
    }
  } else if (action === "ACCOUNT_CREATED") {
    title = `${actor} menambahkan user`;
    subtitle = targetLabel ?? desc;
  } else if (action === "ACCOUNT_REMOVED") {
    title = `${actor} menghapus akses user`;
    subtitle = targetLabel ?? "Data profil tetap disimpan";
  } else if (action === "PASSWORD_RESET") {
    title = `${actor} melakukan reset kata sandi`;
    subtitle = targetLabel ?? "";
  } else if (action === "SYSTEM_SETTINGS_UPDATED") {
    title = `${actor} memperbarui pengaturan`;
    subtitle = targetLabel ?? desc;
  } else {
    title = `${actor} ${actionLabel(action)}`;
    subtitle = desc || targetLabel || "";
  }

  if (serviceLink) {
    const idx = subtitle.indexOf(serviceLink);
    if (idx >= 0) subtitle = subtitle.slice(0, idx) + subtitle.slice(idx + serviceLink.length).trim();
  }

  return {
    icon: iconData.icon, iconBg: iconData.bg, iconColor: iconData.color,
    title, subtitle, module: mod, severity: sev,
    branchLabel, serviceLink, targetLabel,
    changeSummary: changes,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Detail Sheet
   ═══════════════════════════════════════════════════════════════ */

const MODULE_COLORS: Record<string, string> = {
  SERVICE: "bg-blue-100 text-blue-700", POS: "bg-green-100 text-green-700",
  FINANCE: "bg-emerald-100 text-emerald-700", INVENTORY: "bg-purple-100 text-purple-700",
  ACCOUNT: "bg-cyan-100 text-cyan-700", PAYMENT_METHOD: "bg-pink-100 text-pink-700",
  SHIFT: "bg-amber-100 text-amber-700", SYSTEM: "bg-gray-100 text-gray-700",
  OTHER: "bg-gray-100 text-gray-500",
};

function DetailSheet({
  log, open, onOpenChange,
}: {
  log: AuditLogRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!log) return null;

  const fmt = formatEntry(log);
  const SeverityIcon = SEVERITY_ICONS[fmt.severity];
  const date = new Date(log.createdAt);

  const detailFields: { label: string; value: string }[] = [];
  detailFields.push({ label: "Waktu", value: date.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) });
  detailFields.push({ label: "User", value: log.actorName ?? log.actorId ?? "Sistem" });
  if (log.actorEmail) detailFields.push({ label: "Email", value: log.actorEmail });
  if (fmt.branchLabel) detailFields.push({ label: "Cabang", value: fmt.branchLabel });
  detailFields.push({ label: "Modul", value: MODULE_LABELS[fmt.module] ?? fmt.module });
  detailFields.push({ label: "Aksi", value: actionLabel(log.action) });
  if (log.targetLabel) detailFields.push({ label: "Target", value: log.targetLabel });

  const beforeAfter: { label: string; before: string; after: string }[] = [...fmt.changeSummary];

  const det = log.details;
  if (det) {
    if (det.old_status && det.new_status) {
      beforeAfter.push({ label: "Status", before: det.old_status, after: det.new_status });
    }
    if (det.direction && det.amount) {
      beforeAfter.push({
        label: "Nominal",
        before: det.old_balance ? formatCurrency(det.old_balance) : "Rp 0",
        after: `Rp ${Number(det.amount).toLocaleString("id-ID")}`,
      });
    }
    if (det.changes) {
      const changes = det.changes;
      if (typeof changes === "object") {
        Object.entries(changes).forEach(([key, val]) => {
          beforeAfter.push({ label: key.replace(/_/g, " "), before: "", after: String(val ?? "") });
        });
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-md ${fmt.iconBg}`}>
              <SeverityIcon className={`h-4 w-4 ${fmt.iconColor}`} />
            </div>
            <SheetTitle className="text-base">{fmt.title}</SheetTitle>
          </div>
          {fmt.subtitle && (
            <SheetDescription className="text-xs">{fmt.subtitle}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${SEVERITY_STYLES[fmt.severity]}`}>
            <SeverityIcon className="h-3 w-3 mr-0.5" />
            {SEVERITY_LABELS[fmt.severity]}
          </Badge>
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${MODULE_COLORS[fmt.module]}`}>
            {MODULE_LABELS[fmt.module] ?? fmt.module}
          </Badge>
        </div>

        <Separator className="mb-4" />

        <div className="space-y-2 text-sm mb-4">
          {detailFields.map((f) => (
            <div key={f.label} className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[64px] text-xs">{f.label}</span>
              <span className="font-medium">{f.value || "—"}</span>
            </div>
          ))}
        </div>

        {log.description && (
          <>
            <Separator className="mb-3" />
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
              <p className="text-sm bg-amber-50 rounded-lg p-3 border border-amber-100">{log.description}</p>
            </div>
          </>
        )}

        {beforeAfter.length > 0 && (
          <>
            <Separator className="mb-3" />
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Perubahan</p>
              <div className="space-y-1.5">
                {beforeAfter.map((ba, i) => (
                  <div key={i} className="text-sm bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">{ba.label}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-red-600 line-through text-xs">{ba.before || "—"}</span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="text-green-700 font-medium text-xs">{ba.after || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Raw metadata collapsible */}
        {det && Object.keys(det).length > 0 && (
          <>
            <Separator className="mb-3" />
            <details className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground font-medium select-none">
                Metadata Teknis
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 text-[10px] leading-relaxed overflow-x-auto max-h-48 overflow-y-auto">
                {JSON.stringify(det, null, 2)}
              </pre>
            </details>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <SheetClose asChild>
            <Button variant="outline" size="sm">
              Tutup
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Audit Item Card
   ═══════════════════════════════════════════════════════════════ */

function AuditItem({ log, onDetail }: { log: AuditLogRow; onDetail: (l: AuditLogRow) => void }) {
  const fmt = formatEntry(log);
  const SeverityIcon = SEVERITY_ICONS[fmt.severity];

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border border-amber-100/50 hover:border-amber-200/80 hover:bg-amber-50/30 transition-colors cursor-pointer group"
      onClick={() => onDetail(log)}
    >
      <div className={`p-2 rounded-lg shrink-0 ${fmt.iconBg} ${fmt.iconColor}`}>
        <fmt.icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{fmt.title}</p>
            {fmt.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{fmt.subtitle}</p>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {formatTime(log.createdAt)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${SEVERITY_STYLES[fmt.severity]}`}>
            <SeverityIcon className="h-2.5 w-2.5 mr-0.5" />
            {SEVERITY_LABELS[fmt.severity]}
          </Badge>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${MODULE_COLORS[fmt.module]}`}>
            {MODULE_LABELS[fmt.module]}
          </Badge>
          {fmt.branchLabel && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Building2 className="h-2.5 w-2.5" />
              {fmt.branchLabel}
            </span>
          )}
          {fmt.serviceLink && (
            <span className="text-[10px] text-orange-600 font-medium">{fmt.serviceLink}</span>
          )}
        </div>
      </div>
      <Eye className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-orange-500 transition-colors shrink-0 mt-1" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KPI Card
   ═══════════════════════════════════════════════════════════════ */

function KPICard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Skeleton
   ═══════════════════════════════════════════════════════════════ */

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-24" /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-1" /><Skeleton className="h-6 w-16" /></CardContent></Card>
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════ */

const PERIOD_OPTIONS = [
  { value: "TODAY", label: "Hari Ini" },
  { value: "7_DAYS", label: "7 Hari" },
  { value: "THIS_MONTH", label: "Bulan Ini" },
  { value: "CUSTOM", label: "Kustom" },
];

const MODULE_OPTIONS = [
  { value: "**ALL_MODULES**", label: "Semua Modul" },
  { value: "SERVICE", label: "Servis" },
  { value: "POS", label: "POS" },
  { value: "FINANCE", label: "Keuangan" },
  { value: "INVENTORY", label: "Inventori" },
  { value: "ACCOUNT", label: "Akun" },
  { value: "PAYMENT_METHOD", label: "Pembayaran" },
  { value: "SHIFT", label: "Shift" },
  { value: "SYSTEM", label: "Sistem" },
];

const SEVERITY_OPTIONS = [
  { value: "**ALL_SEVERITY**", label: "Semua" },
  { value: "info", label: "Info" },
  { value: "important", label: "Penting" },
  { value: "warning", label: "Peringatan" },
  { value: "critical", label: "Kritis" },
];

export default function AuditLogPage() {
  const params = useParams();
  const brandSlug = params?.brandSlug as string;
  const { userRole, branches } = useActiveBranch();
  const canView = can(userRole as any, PERMISSIONS.AUDIT_LOG_VIEW);

  const [data, setData] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<AuditLogCounts | null>(null);
  const [actors, setActors] = useState<{ actorId: string; name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<string>("THIS_MONTH");
  const [customStart, setCustomStart] = useState("");
  const [customEnd] = useState("");
  const [branchFilter, setBranchFilter] = useState("**ALL_BRANCHES**");
  const [userFilter, setUserFilter] = useState("**ALL_USERS**");
  const [moduleFilter, setModuleFilter] = useState("**ALL_MODULES**");
  const [severityFilter, setSeverityFilter] = useState("**ALL_SEVERITY**");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [detailLog, setDetailLog] = useState<AuditLogRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pageSize = 25;

  const fetchData = useCallback(async (pageNum = 1) => {
    if (!brandSlug) return;
    setLoading(true);
    setError(null);
    try {
      const filters: AuditFilterParams = {
        period: period as any,
        customStart: period === "CUSTOM" && customStart ? customStart : null,
        customEnd: period === "CUSTOM" && customEnd ? customEnd : null,
        actorId: userFilter !== "**ALL_USERS**" ? userFilter : null,
        searchQuery: searchQuery || null,
        moduleFilter: moduleFilter !== "**ALL_MODULES**" ? moduleFilter : null,
        severityFilter: severityFilter !== "**ALL_SEVERITY**" ? severityFilter : null,
        page: pageNum,
        pageSize,
      };
      const result = await getAuditLogsAction(brandSlug, filters);
      if (result.success) {
        setData(result.data.rows);
        setTotal(result.data.total);
        setCounts(result.data.counts);
        setActors(result.data.actors);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message ?? "Gagal memuat data.");
    }
    setLoading(false);
  }, [brandSlug, period, customStart, customEnd, userFilter, moduleFilter, severityFilter, searchQuery, pageSize]);

  useEffect(() => { fetchData(page); }, [fetchData, page]);

  /* Search debounce */
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchInput]);

  /* Severity filter applied client-side (since it's computed, not in DB) */
  const filteredData = useMemo(() => {
    if (severityFilter === "**ALL_SEVERITY**") return data;
    return data.filter((log) => getSeverity(log.action) === severityFilter);
  }, [data, severityFilter]);

  /* Branch filter applied client-side */
  const branchFilteredData = useMemo(() => {
    if (branchFilter === "**ALL_BRANCHES**") return filteredData;
    return filteredData.filter((log) => {
      if (!log.details) return false;
      const branchId = log.details.branch_id ?? log.details.branchId;
      return branchId === branchFilter;
    });
  }, [filteredData, branchFilter]);

  /* Group by date */
  const grouped = useMemo(() => {
    const groups: Record<string, AuditLogRow[]> = {};
    for (const log of branchFilteredData) {
      const key = new Date(log.createdAt).toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });

    return sortedKeys.map((key) => ({
      dateLabel: formatDate(groups[key][0].createdAt),
      rows: groups[key],
    }));
  }, [branchFilteredData]);

  const totalPages = Math.ceil(total / pageSize);

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
    <div className="space-y-5">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Riwayat aktivitas sistem, perubahan data, dan tindakan penting di brand ini.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(page)} disabled={loading} className="h-9">
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang
        </Button>
      </div>

      {/* ═══ KPI Cards ═══ */}
      {counts && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Total Aktivitas" value={counts.total} icon={List} color="bg-orange-500" />
          <KPICard title="Aktivitas Hari Ini" value={counts.today} icon={Clock} color="bg-blue-500" />
          <KPICard title="Aktivitas Sensitif" value={counts.sensitive} icon={ShieldAlert} color="bg-red-500" />
          <KPICard title="User Aktif" value={counts.activeUsers} icon={User} color="bg-green-500" />
        </div>
      )}

      {/* ═══ Filter Bar ═══ */}
      <Card className="border-amber-100/60 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari user, servis, invoice, transaksi, modul..."
                className="pl-8 h-9 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={(v) => { setPeriod(v); setPage(1); }}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {period === "CUSTOM" && (
              <Input type="date" className="h-8 w-[140px] text-xs" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            )}
            <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Semua Cabang" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="**ALL_BRANCHES**" className="text-xs">Semua Cabang</SelectItem>
                {(branches ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Semua User" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="**ALL_USERS**" className="text-xs">Semua User</SelectItem>
                {actors.map((a) => (
                  <SelectItem key={a.actorId} value={a.actorId} className="text-xs">{a.name ?? a.actorId.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Error ═══ */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ═══ Loading ═══ */}
      {loading && <PageSkeleton />}

      {/* ═══ Timeline ═══ */}
      {!loading && !error && (
        <>
          {branchFilteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {searchQuery || branchFilter !== "**ALL_BRANCHES**" || userFilter !== "**ALL_USERS**" || moduleFilter !== "**ALL_MODULES**" || severityFilter !== "**ALL_SEVERITY**"
                  ? "Tidak ada log ditemukan" : "Belum ada aktivitas"}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {searchQuery || branchFilter !== "**ALL_BRANCHES**" || userFilter !== "**ALL_USERS**" || moduleFilter !== "**ALL_MODULES**" || severityFilter !== "**ALL_SEVERITY**"
                  ? "Coba ubah kata kunci atau filter." : "Aktivitas penting akan muncul di sini setelah user menggunakan sistem."}
              </p>
              {(searchQuery || branchFilter !== "**ALL_BRANCHES**" || userFilter !== "**ALL_USERS**" || moduleFilter !== "**ALL_MODULES**" || severityFilter !== "**ALL_SEVERITY**") && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                  setSearchInput(""); setSearchQuery(""); setBranchFilter("**ALL_BRANCHES**");
                  setUserFilter("**ALL_USERS**"); setModuleFilter("**ALL_MODULES**");
                  setSeverityFilter("**ALL_SEVERITY**"); setPage(1);
                }}>
                  Reset Filter
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.dateLabel}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">{group.dateLabel}</h3>
                  <div className="space-y-1.5">
                    {group.rows.map((log) => (
                      <AuditItem key={log.id} log={log} onDetail={(l) => { setDetailLog(l); setDetailOpen(true); }} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Menampilkan {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} dari {total} log
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ Detail Sheet ═══ */}
      <DetailSheet log={detailLog} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
