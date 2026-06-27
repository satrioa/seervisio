"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  Copy,
  Check,
  Building2,
  Terminal,
  ExternalLink,
} from "lucide-react";
import {
  getPlatformAuditLogsAction,
  getPlatformAuditActionTypesAction,
  exportAuditLogsAction,
} from "@/server/actions/platform-audit.actions";
import type { PlatformAuditLogRow } from "@/server/repositories/platform.repository";

const PAGE_SIZE = 25;
const DATE_PRESETS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
] as const;

const ACTION_LABELS: Record<string, string> = {
  BRAND_CREATED: "Brand Created",
  BRAND_PROFILE_UPDATED: "Brand Profile Updated",
  BRANCH_CREATED: "Branch Created",
  BRANCH_UPDATED: "Branch Updated",
  BRANCH_DEACTIVATED: "Branch Deactivated",
  BRANCH_ACTIVATED: "Branch Activated",
  SUBSCRIPTION_CHANGED: "Subscription Changed",
  SUBSCRIPTION_UPDATED: "Subscription Updated",
  FACTORY_RESET: "Factory Reset",
  EXPORT_BRAND_CONFIG: "Export Brand Config",
  EXPORT_USERS: "Export Users",
  EXPORT_CUSTOMERS: "Export Customers",
  EXPORT_SERVICES: "Export Services",
  EXPORT_INVENTORY: "Export Inventory",
  EXPORT_FINANCE: "Export Finance",
  EXPORT_FULL_BACKUP: "Export Full Backup",
  LOGIN_AS_TENANT: "Login As Tenant",
};

type Severity = "critical" | "warning" | "info";

const SEVERITY_MAP: Record<string, Severity> = {
  FACTORY_RESET: "critical",
  BRANCH_DEACTIVATED: "critical",
  SUBSCRIPTION_CHANGED: "warning",
  BRAND_PROFILE_UPDATED: "warning",
  BRANCH_UPDATED: "warning",
  EXPORT_BRAND_CONFIG: "warning",
  EXPORT_USERS: "warning",
  EXPORT_CUSTOMERS: "warning",
  EXPORT_SERVICES: "warning",
  EXPORT_INVENTORY: "warning",
  EXPORT_FINANCE: "warning",
  EXPORT_FULL_BACKUP: "warning",
  BRAND_CREATED: "info",
  BRANCH_CREATED: "info",
  BRANCH_ACTIVATED: "info",
  LOGIN_AS_TENANT: "info",
  SUBSCRIPTION_UPDATED: "info",
};

function getSeverity(action: string): Severity {
  return SEVERITY_MAP[action] ?? "info";
}

function severityStyles(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400";
    case "info":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-400";
  }
}

function severityDot(severity: Severity): string {
  switch (severity) {
    case "critical": return "bg-red-500";
    case "warning": return "bg-amber-500";
    case "info": return "bg-blue-500";
  }
}

function getDateRange(preset: string): { start?: string; end?: string } {
  if (preset === "all") return {};
  const now = new Date();
  const start = new Date(now);
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: now.toISOString() };
}

function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined") {
    navigator.clipboard.writeText(text);
  }
}

export function AuditLogsContent() {
  const [logs, setLogs] = useState<PlatformAuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState("30d");
  const [actionFilter, setActionFilter] = useState("all");
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [detailLog, setDetailLog] = useState<PlatformAuditLogRow | null>(null);
  const [copiedDetails, setCopiedDetails] = useState(false);
  const [copiedRequestId, setCopiedRequestId] = useState(false);
  const [tenantDrawer, setTenantDrawer] = useState<PlatformAuditLogRow | null>(null);

  const loadActionTypes = useCallback(async () => {
    const res = await getPlatformAuditActionTypesAction();
    if (res.success) {
      setActionTypes(res.data);
    }
  }, []);

  useEffect(() => {
    loadActionTypes();
  }, [loadActionTypes]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const dateRange = getDateRange(datePreset);
    const res = await getPlatformAuditLogsAction({
      startDate: dateRange.start,
      endDate: dateRange.end,
      actions: actionFilter !== "all" ? [actionFilter] : null,
      searchQuery: searchQuery || null,
      page,
      pageSize: PAGE_SIZE,
    });
    if (res.success) {
      setLogs(res.data.rows);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [datePreset, actionFilter, searchQuery, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, datePreset, actionFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleExport = async (format: "csv" | "json") => {
    setExporting(format);
    const dateRange = getDateRange(datePreset);
    const res = await exportAuditLogsAction(
      {
        startDate: dateRange.start,
        endDate: dateRange.end,
        actions: actionFilter !== "all" ? [actionFilter] : null,
        searchQuery: searchQuery || null,
      },
      format,
    );
    setExporting(null);
    if (!res.success) return;

    const blob = new Blob([res.data], { type: format === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openDetail = (log: PlatformAuditLogRow) => {
    setCopiedDetails(false);
    setCopiedRequestId(false);
    setDetailLog(log);
  };

  const handleCopyDetails = () => {
    if (!detailLog) return;
    const json = JSON.stringify(
      {
        id: detailLog.id,
        timestamp: detailLog.createdAt,
        action: detailLog.action,
        actor: { name: detailLog.actorName, email: detailLog.actorEmail },
        target: { label: detailLog.targetLabel, type: detailLog.targetType },
        brand: detailLog.brandName,
        description: detailLog.description,
        details: detailLog.details,
        ipAddress: detailLog.ipAddress,
        requestId: detailLog.requestId,
      },
      null,
      2,
    );
    copyToClipboard(json);
    setCopiedDetails(true);
    setTimeout(() => setCopiedDetails(false), 2000);
  };

  const handleCopyRequestId = () => {
    if (!detailLog?.requestId) return;
    copyToClipboard(detailLog.requestId);
    setCopiedRequestId(true);
    setTimeout(() => setCopiedRequestId(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Audit Logs
          </h2>
          <p className="text-sm text-muted-foreground">
            Lacak aktivitas platform dan setiap tenant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
          >
            <Download className="size-3.5" />
            {exporting === "csv" ? "Exporting..." : "CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => handleExport("json")}
            disabled={exporting !== null}
          >
            <Terminal className="size-3.5" />
            {exporting === "json" ? "Exporting..." : "JSON"}
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari aksi, target, aktor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Actions
              </SelectItem>
              {actionTypes.map((a) => (
                <SelectItem key={a} value={a} className="text-xs">
                  {ACTION_LABELS[a] ?? a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ScrollText className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Tidak ada audit log ditemukan</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {searchQuery || actionFilter !== "all"
                ? "Coba ubah filter atau kata kunci pencarian"
                : "Belum ada aktivitas yang tercatat"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                    <TableHead className="whitespace-nowrap">Severity</TableHead>
                    <TableHead className="whitespace-nowrap">Actor</TableHead>
                    <TableHead className="whitespace-nowrap">Action</TableHead>
                    <TableHead className="whitespace-nowrap">Target</TableHead>
                    <TableHead className="whitespace-nowrap">Brand</TableHead>
                    <TableHead className="hidden whitespace-nowrap md:table-cell max-w-[200px]">Description</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const severity = getSeverity(log.action);
                    return (
                      <TableRow key={log.id} className="group">
                        <TableCell className="whitespace-nowrap">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex size-2 rounded-full ${severityDot(severity)}`} />
                        </TableCell>
                        <TableCell className="max-w-[140px]">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">
                              {log.actorName || "-"}
                            </p>
                            <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                              {log.actorEmail || ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityStyles(severity)}`}>
                            <span className={`inline-flex size-1.5 rounded-full ${severityDot(severity)}`} />
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[120px]">
                          <div className="min-w-0">
                            <p className="truncate text-xs text-foreground">
                              {log.targetLabel || "-"}
                            </p>
                            {log.targetType && (
                              <p className="truncate text-[10px] text-muted-foreground">{log.targetType}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[120px]">
                          {log.brandName ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              onClick={() => setTenantDrawer(log)}
                            >
                              <Building2 className="size-3 shrink-0" />
                              <span className="truncate">{log.brandName}</span>
                            </button>
                          ) : (
                            <span className="text-xs italic text-muted-foreground/50">Platform</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] md:table-cell">
                          <p className="truncate text-xs text-muted-foreground">
                            {log.description || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openDetail(log)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 border-t px-3 py-2.5">
                <span className="text-[10px] text-muted-foreground">
                  {total} total
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-lg"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 min-w-8 rounded-lg px-2 text-xs"
                >
                  {page}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-lg"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ScrollText className="size-4 text-platform" />
              Detail Audit Log
            </DialogTitle>
          </DialogHeader>
          {detailLog && (() => {
            const severity = getSeverity(detailLog.action);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Timestamp</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(detailLog.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Action / Severity</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityStyles(severity)}`}>
                        <span className={`inline-flex size-1.5 rounded-full ${severityDot(severity)}`} />
                        {ACTION_LABELS[detailLog.action] ?? detailLog.action}
                      </span>
                      <span className="text-[10px] uppercase text-muted-foreground">{severity}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Actor</p>
                    <p className="text-sm font-medium">{detailLog.actorName || "-"}</p>
                    {detailLog.actorEmail && (
                      <p className="text-xs text-muted-foreground">{detailLog.actorEmail}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Target</p>
                    <p className="text-sm">{detailLog.targetLabel || "-"}</p>
                    {detailLog.targetType && (
                      <p className="text-xs text-muted-foreground">{detailLog.targetType}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Brand</p>
                    <p className="text-sm text-muted-foreground">
                      {detailLog.brandName || (
                        <span className="italic text-muted-foreground/50">Platform</span>
                      )}
                    </p>
                  </div>
                  {detailLog.ipAddress && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">IP Address</p>
                      <p className="text-sm font-mono text-muted-foreground">{detailLog.ipAddress}</p>
                    </div>
                  )}
                  {detailLog.requestId && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Request ID</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
                          {detailLog.requestId}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={handleCopyRequestId}
                        >
                          {copiedRequestId ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {detailLog.description && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Description</p>
                    <p className="text-sm text-muted-foreground">{detailLog.description}</p>
                  </div>
                )}

                {detailLog.details && Object.keys(detailLog.details).length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Details</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 text-[10px]"
                        onClick={handleCopyDetails}
                      >
                        {copiedDetails ? (
                          <>
                            <Check className="size-3 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" /> Copy JSON
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="max-h-[200px] overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                      <code>{JSON.stringify(detailLog.details, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Tenant Summary Drawer */}
      <Sheet open={!!tenantDrawer} onOpenChange={(open) => !open && setTenantDrawer(null)}>
        <SheetContent side="right" className="w-[360px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-platform" />
              {tenantDrawer?.brandName}
            </SheetTitle>
          </SheetHeader>
          {tenantDrawer && (
            <div className="mt-6 space-y-5">
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Brand Name</p>
                <p className="text-sm font-medium">{tenantDrawer.brandName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Brand ID</p>
                <p className="text-sm text-muted-foreground">{tenantDrawer.brandId ?? "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Latest Activity</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(tenantDrawer.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Last Action</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityStyles(getSeverity(tenantDrawer.action))}`}>
                  <span className={`inline-flex size-1.5 rounded-full ${severityDot(getSeverity(tenantDrawer.action))}`} />
                  {ACTION_LABELS[tenantDrawer.action] ?? tenantDrawer.action}
                </span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    setTenantDrawer(null);
                    window.open(`/platform/tenants`, "_blank");
                  }}
                >
                  <ExternalLink className="size-3.5" />
                  View in Tenants
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
