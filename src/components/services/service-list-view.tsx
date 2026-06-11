"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Smartphone,
  Laptop,
  Tablet,
  Monitor,
  Headphones,
  User,
  Wrench,
  CreditCard,
  ArrowRight,
  Clock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ServiceRecord,
  type ServiceStatus,
  STATUS_CONFIG,
  STATUS_ORDER,
  formatCurrency,
  getTotalSparepartCost,
  getTotalPayment,
} from "@/components/services/service-data";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import { useServiceWorkflow } from "@/components/services/use-service-workflow";
import { CancelServiceDialog } from "@/components/services/cancel-service-dialog";
import { ReopenServiceDialog } from "@/components/services/reopen-service-dialog";
import { XCircle, RotateCcw, ArrowRightCircle } from "lucide-react";

/* ─── Status Stepper Mini ─── */

function StatusStepper({ status }: { status: ServiceStatus }) {
  const statusIndex = STATUS_ORDER.indexOf(status);
  const visibleStatuses: ServiceStatus[] = ["masuk", "diagnosa", "perbaikan", "qc", "selesai"];

  return (
    <div className="flex items-center gap-1">
      {visibleStatuses.map((s, i) => {
        const isActive = i <= statusIndex;
        const isCurrent = i === statusIndex;
        const isLast = i === visibleStatuses.length - 1;
        return (
          <React.Fragment key={s}>
            <div
              className={`flex size-5 items-center justify-center rounded-full ${
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="text-[8px] font-bold">{i + 1}</span>
            </div>
            {!isLast && (
              <div
                className={`h-0.5 w-4 rounded-full ${
                  i < statusIndex ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
      {status === "batal" && (
        <>
          <div className="h-0.5 w-2 rounded-full bg-border" />
          <div className="flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
            <span className="text-[8px] font-bold">X</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Device Icon Helper ─── */

function DeviceIcon({ record }: { record: ServiceRecord }) {
  const Icon = record.deviceIcon;
  return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

/* ══════════════════════════════════════════════
   LIST VIEW COMPONENT
   ══════════════════════════════════════════════ */

interface ServiceListViewProps {
  services: ServiceRecord[];
}

interface ServicePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function ServicePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  startItem,
  endItem,
  onPageChange,
  onPageSizeChange,
}: ServicePaginationProps) {
  const pages = React.useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  return (
    <div className="flex flex-col gap-3 border-t bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-muted-foreground">
        Menampilkan{" "}
        <span className="font-medium text-foreground">{startItem}</span>
        {" - "}
        <span className="font-medium text-foreground">{endItem}</span>
        {" dari "}
        <span className="font-medium text-foreground">{totalItems}</span>
        {" servis"}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[72px] rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {[10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pages.map((item) => (
            <Button
              key={item}
              type="button"
              variant={item === page ? "default" : "outline"}
              size="icon"
              className="size-8 rounded-lg text-xs"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </Button>
          ))}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ServiceListView({ services }: ServiceListViewProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const { showDetail } = useRightSidebar();

  const toggleExpand = React.useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const totalItems = services.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedServices = services.slice(startIndex, startIndex + pageSize);
  const startItem = totalItems === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + pageSize, totalItems);

  React.useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [services, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // ── Workflow state ──
  const [cancelTarget, setCancelTarget] = React.useState<ServiceRecord | null>(null);
  const [reopenTarget, setReopenTarget] = React.useState<ServiceRecord | null>(null);
  const workflow = useServiceWorkflow("MASTER_ADMIN");

  const pagination = (
    <ServicePagination
      page={safePage}
      pageSize={pageSize}
      totalItems={totalItems}
      totalPages={totalPages}
      startItem={startItem}
      endItem={endItem}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );

  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden md:block">
        <div className="flex flex-col gap-0 overflow-hidden rounded-lg border bg-card">
          {/* Header */}
          <div className="grid grid-cols-[28px_1fr_120px_120px_100px_60px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span />
            <span>Service / Customer</span>
            <span>Teknisi</span>
            <span>Status</span>
            <span>Biaya</span>
            <span />
          </div>

          {/* Rows */}
          {paginatedServices.map((service) => {
            const isExpanded = expandedId === service.id;
            const totalBiaya = getTotalSparepartCost(service.spareparts);
            const totalDibayar = getTotalPayment(service.payments);

            return (
              <div key={service.id} className="flex flex-col">
                {/* Row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(service.id)}
                  className="grid grid-cols-[28px_1fr_120px_120px_100px_60px] gap-2 border-b px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/30"
                >
                  <div className="flex items-center">
                    <DeviceIcon record={service} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {service.deviceBrand} {service.deviceModel}
                      </span>
                      <span className="shrink-0 text-[9px] text-muted-foreground">
                        {service.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="size-3 text-muted-foreground" />
                      <span className="truncate text-[10px] text-muted-foreground">
                        {service.customerName}
                      </span>
                      <span className="text-[9px] text-muted-foreground/50">·</span>
                      <span className="truncate text-[9px] text-muted-foreground">
                        {service.issue.slice(0, 40)}...
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {service.technician ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {service.technician}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_CONFIG[service.status].color}`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${STATUS_CONFIG[service.status].dot}`}
                      />
                      {STATUS_CONFIG[service.status].label}
                    </span>
                  </div>
                  <div className="flex flex-col items-start justify-center gap-0">
                    {totalBiaya > 0 && (
                      <span className="truncate text-xs font-medium tabular-nums text-foreground">
                        {formatCurrency(totalBiaya)}
                      </span>
                    )}
                    {totalDibayar > 0 && (
                      <span className="text-[9px] text-muted-foreground">
                        Dibayar: {formatCurrency(totalDibayar)}
                      </span>
                    )}
                    {totalBiaya === 0 && (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Inline Detail */}
                {isExpanded && (
                  <div className="border-b bg-muted/20 px-6 py-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {/* Issue */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Issue
                        </span>
                        <p className="text-xs text-foreground">
                          {service.issue}
                        </p>
                      </div>

                      {/* Status Stepper */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Progress
                        </span>
                        <StatusStepper status={service.status} />
                      </div>

                      {/* Spareparts */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Sparepart
                        </span>
                        {service.spareparts.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {service.spareparts.map((sp, i) => (
                              <span
                                key={i}
                                className="text-xs text-foreground"
                              >
                                {sp.qty}x {sp.name}
                              </span>
                            ))}
                            <span className="text-[10px] font-medium text-muted-foreground">
                              Total: {formatCurrency(totalBiaya)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            Belum ada
                          </span>
                        )}
                      </div>

                      {/* Payment */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Pembayaran
                        </span>
                        {service.payments.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {service.payments.map((p, i) => (
                              <span
                                key={i}
                                className="text-xs text-foreground"
                              >
                                {p.method}: {formatCurrency(p.amount)}
                                {p.status === "lunas"
                                  ? " ✅"
                                  : p.status === "sebagian"
                                    ? " (DP)"
                                    : ""}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            Belum dibayar
                          </span>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-2">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Aksi Cepat
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(workflow.getAllowedActions(service).allowedNext.length > 0) && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 gap-1 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                showDetail(service);
                              }}
                            >
                              <ArrowRightCircle className="size-3" />
                              {workflow.getAllowedActions(service).nextLabel ?? "Update Status"}
                            </Button>
                          )}
                          {workflow.getAllowedActions(service).canCancel && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[10px] text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCancelTarget(service);
                              }}
                            >
                              <XCircle className="size-3" />
                              Batalkan
                            </Button>
                          )}
                          {workflow.getAllowedActions(service).canReopen && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReopenTarget(service);
                              }}
                            >
                              <RotateCcw className="size-3" />
                              Buka Ulang
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              showDetail(service);
                            }}
                          >
                            <Wrench className="size-3" />
                            Sparepart
                          </Button>
                          {service.payments.every(
                            (p) => p.status === "belum"
                          ) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                showDetail(service);
                              }}
                            >
                              <CreditCard className="size-3" />
                              Pembayaran
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              showDetail(service);
                            }}
                          >
                            Lihat Detail
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {pagination}
        </div>
      </div>

      {/* Mobile: Card-style */}
      <div className="flex flex-col gap-3 md:hidden">
        {paginatedServices.map((service) => {
          const totalBiaya = getTotalSparepartCost(service.spareparts);
          const isExpanded = expandedId === service.id;

          return (
            <div
              key={service.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-xs"
            >
              {/* Card Header */}
              <button
                type="button"
                onClick={() => toggleExpand(service.id)}
                className="flex items-start justify-between gap-2 text-left"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <DeviceIcon record={service} />
                    <span className="truncate text-xs font-medium text-foreground">
                      {service.deviceBrand} {service.deviceModel}
                    </span>
                  </div>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {service.customerName}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_CONFIG[service.status].color}`}
                >
                  {STATUS_CONFIG[service.status].label}
                </span>
              </button>

              {/* Card Meta */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{service.id}</span>
                <span>·</span>
                <span>{service.technician || "—"}</span>
                {totalBiaya > 0 && (
                  <>
                    <span>·</span>
                    <span className="tabular-nums">
                      {formatCurrency(totalBiaya)}
                    </span>
                  </>
                )}
              </div>

              {/* Expand Toggle */}
              <button
                type="button"
                onClick={() => toggleExpand(service.id)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? "Sembunyikan detail" : "Lihat detail"}
                {isExpanded ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>

              {/* Expanded Mobile Detail */}
              {isExpanded && (
                <div className="flex flex-col gap-3 border-t pt-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Issue
                    </span>
                    <p className="text-xs text-foreground">{service.issue}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Progress
                    </span>
                    <StatusStepper status={service.status} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Sparepart
                    </span>
                    {service.spareparts.length > 0 ? (
                      service.spareparts.map((sp, i) => (
                        <span key={i} className="text-xs text-foreground">
                          {sp.qty}x {sp.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground/50">
                        Belum ada
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Pembayaran
                    </span>
                    {service.payments.length > 0 ? (
                      service.payments.map((p, i) => (
                        <span key={i} className="text-xs text-foreground">
                          {p.method}: {formatCurrency(p.amount)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground/50">
                        Belum dibayar
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[10px]"
                      onClick={() => showDetail(service)}
                    >
                      <ArrowRightCircle className="size-3" />
                      {workflow.getAllowedActions(service).nextLabel ?? "Update Status"}
                    </Button>
                    {workflow.getAllowedActions(service).canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-[10px] text-destructive hover:text-destructive"
                        onClick={() => setCancelTarget(service)}
                      >
                        <XCircle className="size-3" />
                        Batalkan
                      </Button>
                    )}
                    {workflow.getAllowedActions(service).canReopen && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-[10px]"
                        onClick={() => setReopenTarget(service)}
                      >
                        <RotateCcw className="size-3" />
                        Buka Ulang
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[10px]"
                      onClick={() => showDetail(service)}
                    >
                      Tambah Sparepart
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-[10px]"
                      onClick={() => showDetail(service)}
                    >
                      Lihat Detail
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="overflow-hidden rounded-lg border bg-card">
          {pagination}
        </div>
      </div>

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelServiceDialog
          open={cancelTarget !== null}
          onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
          service={cancelTarget}
          onConfirm={() => {
            setCancelTarget(null);
          }}
        />
      )}

      {/* Reopen dialog */}
      {reopenTarget && (
        <ReopenServiceDialog
          open={reopenTarget !== null}
          onOpenChange={(open) => { if (!open) setReopenTarget(null); }}
          service={reopenTarget}
          onConfirm={() => {
            setReopenTarget(null);
          }}
        />
      )}
    </>
  );
}
