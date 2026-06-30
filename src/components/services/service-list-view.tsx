"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  formatCurrency,
  getPickupStatus,
  getPickupLabel,
  getPickupColor,
} from "@/components/services/service-data";

import { useServiceWorkflow } from "@/components/services/use-service-workflow";
import { CancelServiceDialog } from "@/components/services/cancel-service-dialog";
import { ReopenServiceDialog } from "@/components/services/reopen-service-dialog";
import { AssignTechnicianDialog } from "@/components/services/assign-technician-dialog";
import { ServiceDeviceIcon } from "@/components/services/service-device-icon";
import { StatusTransitionDialog, type PendingStatusTransition } from "@/components/services/status-transition-dialog";
import { updateServiceStatusAction } from "@/server/actions/service-workflow.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

/* ─── Device Icon Helper ─── */

function DeviceIcon({ record }: { record: ServiceRecord }) {
  return <ServiceDeviceIcon iconKey={record.deviceIconKey} className="size-4 shrink-0 text-muted-foreground" />;
}

/* ══════════════════════════════════════════════
   LIST VIEW COMPONENT
   ══════════════════════════════════════════════ */

interface ServiceListViewProps {
  services: ServiceRecord[];
  isLoading?: boolean;
  error?: string | null;
  search?: string;
  statusFilter?: ServiceStatus | "all";
  technicianFilter?: string;
  pickupFilter?: string;
  role?: string;
  brandSlug: string;
  onServiceUpdated?: () => void;
  onOpenPayment?: (serviceId: string) => void;
  onOpenSparepart?: (serviceId: string) => void;
  onShowDetail?: (service: ServiceRecord) => void;
}

interface ServicePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  isLoading?: boolean;
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
  isLoading = false,
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
        {isLoading ? (
          "Memuat data..."
        ) : (
          <>
            Menampilkan{" "}
            <span className="font-medium text-foreground">{startItem}</span>
            {" - "}
            <span className="font-medium text-foreground">{endItem}</span>
            {" dari "}
            <span className="font-medium text-foreground">{totalItems}</span>
            {" servis"}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
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
            disabled={isLoading || page <= 1}
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
              disabled={isLoading}
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
            disabled={isLoading || page >= totalPages}
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

const SERVICE_TABLE_GRID = "grid-cols-[28px_1fr_130px_120px_120px_100px]";

function ServiceTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`service-skeleton-${index}`}
          className={`grid ${SERVICE_TABLE_GRID} gap-2 border-b px-3 py-2.5 last:border-0`}
        >
          <div className="flex items-center">
            <Skeleton className="size-4 rounded-sm" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-56 max-w-full" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex flex-col justify-center gap-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      ))}
    </>
  );
}

function ServiceEmptyState() {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">Tidak ada servis ditemukan</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Coba ubah kata kunci, status, teknisi, atau filter pengambilan.
      </p>
    </div>
  );
}

function ServiceMobileSkeletonCards() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`service-mobile-skeleton-${index}`}
          className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-56 max-w-full" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </>
  );
}

type ServiceListPaymentSummary = {
  total: number
  paid: number
  remaining: number
  label: string
  detail: string
}

function coerceServiceListPaymentNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function readServiceListPaymentNumber(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = coerceServiceListPaymentNumber(source[key])
    if (value > 0) return value
  }
  return 0
}

function getServiceListPaymentSummary(service: ServiceRecord): ServiceListPaymentSummary {
  const source = service as unknown as Record<string, unknown>
  const total = readServiceListPaymentNumber(source, [
    "totalAmount",
    "totalCost",
    "grandTotal",
    "finalPrice",
    "estimatedCost",
    "estimatedPrice",
    "estimated_price",
    "amount",
    "price",
  ])

  const directPaid = readServiceListPaymentNumber(source, [
    "paidAmount",
    "totalPaid",
    "amountPaid",
    "paid",
    "paymentTotal",
  ])

  const payments = (
    Array.isArray(source.payments)
      ? source.payments
      : Array.isArray(source.paymentHistory)
        ? source.paymentHistory
        : Array.isArray(source.payment_history)
          ? source.payment_history
          : []
  ) as Array<Record<string, unknown>>

  const historyPaid = payments.reduce(
    (sum, payment) =>
      sum +
      readServiceListPaymentNumber(payment, [
        "amount",
        "nominal",
        "paidAmount",
        "value",
        "total",
      ]),
    0,
  )

  const paid = Math.max(directPaid, historyPaid)
  const remaining = Math.max(total - paid, 0)

  if (total > 0 && paid > 0 && remaining <= 0) {
    return {
      total,
      paid,
      remaining,
      label: "Sudah lunas",
      detail: `Lunas - dibayar ${formatCurrency(paid)}`,
    }
  }

  if (paid > 0) {
    return {
      total,
      paid,
      remaining,
      label: `Sisa ${formatCurrency(remaining)}`,
      detail: `Dibayar ${formatCurrency(paid)} - sisa ${formatCurrency(remaining)}`,
    }
  }

  return {
    total,
    paid,
    remaining,
    label: "Belum dibayar",
    detail: "Belum dibayar",
  }
}

export function ServiceListView({
  services,
  isLoading = false,
  error = null,
  search = "",
  statusFilter = "all",
  technicianFilter = "all",
  pickupFilter = "all",
  role,
  brandSlug,
  onServiceUpdated,
  onOpenPayment,
  onOpenSparepart,
  onShowDetail,
}: ServiceListViewProps) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [pendingTransition, setPendingTransition] = React.useState<PendingStatusTransition | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [statusSubmitLoading, setStatusSubmitLoading] = React.useState(false);
  const [statusSubmitError, setStatusSubmitError] = React.useState<string | null>(null);

  console.log("[services:table] received", services.length);

  React.useEffect(() => {
    console.debug("[service-list-view] props", {
      count: services.length,
      role,
      sample: services[0] ?? null,
    });
  }, [services, role]);

  const filteredServices = React.useMemo(() => {
    let result = services;
    if (statusFilter !== "all") {
      result = result.filter((service) => service.status === statusFilter);
    }
    if (technicianFilter === "unassigned") {
      result = result.filter((service) => !service.technicianName);
    } else if (technicianFilter !== "all") {
      result = result.filter((service) => service.technicianName === technicianFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((service) =>
        service.id.toLowerCase().includes(q) ||
        service.serviceNumber.toLowerCase().includes(q) ||
        service.customerName.toLowerCase().includes(q) ||
        (service.deviceBrand ?? "").toLowerCase().includes(q) ||
        (service.deviceModel ?? "").toLowerCase().includes(q) ||
        service.issue.toLowerCase().includes(q)
      );
    }
    return result;
  }, [services, statusFilter, technicianFilter, search]);

  const pickupFilteredServices = React.useMemo(() => {
    if (pickupFilter === "all") return filteredServices;
    return filteredServices.filter((s) => {
      const ps = getPickupStatus(s);
      if (pickupFilter === "ready") return ps === "READY";
      if (pickupFilter === "picked_up") return ps === "PICKED_UP";
      if (pickupFilter === "not_ready") return ps === "NOT_READY";
      return true;
    });
  }, [filteredServices, pickupFilter]);

  console.log("[services:table] filtered", pickupFilteredServices.length);

  React.useEffect(() => {
    console.debug("[service-list-view] pickup-filter", {
      input: services.length,
      output: pickupFilteredServices.length,
      pickupFilter,
    });
  }, [services.length, pickupFilteredServices.length, pickupFilter]);

  console.log("[services/table-payment-summary]", pickupFilteredServices.map(s => ({
    serviceNumber: s.serviceNumber ?? s.serviceNumber,
    paymentsCount: s.payments?.length ?? 0,
    totalPaid: s.paymentSummary?.totalPaid,
    remainingAmount: s.paymentSummary?.remainingBalance,
    paymentState: s.paymentSummary?.paymentStatus,
  })));

  const totalItems = pickupFilteredServices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedServices = pickupFilteredServices.slice(startIndex, startIndex + pageSize);
  const startItem = totalItems === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + pageSize, totalItems);

  React.useEffect(() => {
    setPage(1);
  }, [services, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // ── Workflow state ──
  const [cancelTarget, setCancelTarget] = React.useState<ServiceRecord | null>(null);
  const [reopenTarget, setReopenTarget] = React.useState<ServiceRecord | null>(null);
  const [assignTarget, setAssignTarget] = React.useState<ServiceRecord | null>(null);
  const workflow = useServiceWorkflow((role ?? "MASTER_ADMIN") as any);

  const pagination = (
    <ServicePagination
      page={safePage}
      pageSize={pageSize}
      totalItems={totalItems}
      totalPages={totalPages}
      startItem={startItem}
      endItem={endItem}
      isLoading={isLoading}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );

  return (
    <>
      {!isLoading && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <div className="flex flex-col gap-0 overflow-hidden rounded-lg border bg-card">
          {/* Header */}
          <div className={`grid ${SERVICE_TABLE_GRID} gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground`}>
            <span />
            <span>Service / Customer</span>
            <span>Cabang</span>
            <span>Teknisi</span>
            <span>Status</span>
            <span>Biaya</span>
            <span />
          </div>

          {/* Rows */}
          {isLoading ? (
            <ServiceTableSkeletonRows />
          ) : paginatedServices.length > 0 ? (
            paginatedServices.map((service) => {
            const totalBiaya = Number(service.finalCost || service.estimatedCost || 0);

            return (
              <div key={service.id} className="flex flex-col">
                {/* Row */}
                <button
                  type="button"
                  onClick={() => onShowDetail?.(service)}
                  className={`grid ${SERVICE_TABLE_GRID} gap-2 border-b px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/30`}
                >
                  <div className="flex min-w-max items-center whitespace-nowrap">
                    <DeviceIcon record={service} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {service.serviceNumber || service.deviceName}
                      </span>
                    </div>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {service.deviceName}
                    </span>
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
                    <span className="truncate text-xs text-muted-foreground">
                      {service.branchName ?? "Cabang tidak diketahui"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {service.technicianName ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {service.technicianName}
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
                    {service.status === "selesai" && (
                      (() => {
                        const ps = getPickupStatus(service);
                        return (
                          <span className={`ml-1 inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-medium leading-none ${getPickupColor(ps)}`}>
                            {getPickupLabel(ps)}
                          </span>
                        );
                      })()
                    )}
                  </div>
                  <div className="flex flex-col items-start justify-center gap-0">
                    <span className="truncate text-xs font-medium tabular-nums text-foreground">
                      {formatCurrency(totalBiaya)}
                    </span>
                    {service.paymentSummary?.paymentStatus === "PAID" && (
                      <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                        LUNAS
                      </span>
                    )}
                    {service.paymentSummary?.paymentStatus === "PARTIAL" && (
                      <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400">
                        Sisa {formatCurrency(service.paymentSummary.remainingBalance)}
                      </span>
                    )}
                    {(!service.paymentSummary || service.paymentSummary.paymentStatus === "UNPAID") && (
                      <span className="text-[9px] text-muted-foreground/50">
                        Belum dibayar
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })
          ) : (
            <ServiceEmptyState />
          )}

          {pagination}
        </div>
      </div>

      {/* Mobile: Card-style */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <ServiceMobileSkeletonCards />
        ) : paginatedServices.length > 0 ? (
          paginatedServices.map((service) => {
          const totalBiaya = Number(service.finalCost || service.estimatedCost || 0);

          return (
            <div
              key={service.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-xs"
            >
              {/* Card Header */}
              <button
                type="button"
                onClick={() => onShowDetail?.(service)}
                className="flex items-start justify-between gap-2 text-left"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <DeviceIcon record={service} />
                    <span className="truncate text-xs font-medium text-foreground">
                      {service.serviceNumber || service.deviceName}
                    </span>
                  </div>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {service.deviceName} · {service.customerName}
                  </span>
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_CONFIG[service.status].color}`}
                >
                  {STATUS_CONFIG[service.status].label}
                </span>
                {service.status === "selesai" && (
                  (() => {
                    const ps = getPickupStatus(service);
                    return (
                      <span className={`ml-1 inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-medium leading-none ${getPickupColor(ps)}`}>
                        {getPickupLabel(ps)}
                      </span>
                    );
                  })()
                )}
              </button>

              {/* Card Meta */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{service.branchName ?? "Cabang tidak diketahui"}</span>
                <span>·</span>
                <span>{service.technicianName || "—"}</span>
                <span>·</span>
                <span className="tabular-nums">
                  {formatCurrency(totalBiaya)}
                </span>
              </div>
            </div>
          );
        })
        ) : (
          <div className="rounded-lg border bg-card">
            <ServiceEmptyState />
          </div>
        )}
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
          brandSlug={brandSlug}
          role={role as any}
          onConfirm={() => {
            setCancelTarget(null);
            onServiceUpdated?.();
          }}
        />
      )}

      {/* Reopen dialog */}
      {reopenTarget && (
        <ReopenServiceDialog
          open={reopenTarget !== null}
          onOpenChange={(open) => { if (!open) setReopenTarget(null); }}
          service={reopenTarget}
          brandSlug={brandSlug}
          role={role as any}
          onConfirm={() => {
            setReopenTarget(null);
            onServiceUpdated?.();
          }}
        />
      )}

      {/* Assign technician dialog */}
      {assignTarget && (
        <AssignTechnicianDialog
          open={assignTarget !== null}
          onOpenChange={(open) => { if (!open) setAssignTarget(null); }}
          service={assignTarget}
          brandSlug={brandSlug}
          onConfirm={() => {
            setAssignTarget(null);
            onServiceUpdated?.();
          }}
        />
      )}

      {/* Status transition dialog */}
      <StatusTransitionDialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          setStatusDialogOpen(open);
          if (!open) setPendingTransition(null);
        }}
        pending={pendingTransition}
        isSubmitting={statusSubmitLoading}
        error={statusSubmitError}
        onConfirm={async (note) => {
          if (!pendingTransition) return;
          setStatusSubmitLoading(true);
          setStatusSubmitError(null);
          try {
            const response = await updateServiceStatusAction({
              brandSlug,
              serviceId: pendingTransition.serviceId,
              nextStatus: pendingTransition.toUiStatus,
              targetColumn: pendingTransition.toUiStatus,
              note: note || undefined,
            });
            if (response.success) {
              setStatusDialogOpen(false);
              setPendingTransition(null);
              triggerDynamicIslandFeedback({
                type: "success",
                title: "Status berhasil diperbarui",
                description: `Servis berhasil dipindahkan.`,
                duration: 1800,
              });
              onServiceUpdated?.();
            } else {
              setStatusSubmitError(response.error ?? "Gagal memperbarui status servis.");
              triggerDynamicIslandFeedback({
                type: "error",
                title: "Gagal memperbarui status",
                description: response.error ?? "Status servis gagal diperbarui.",
                duration: 2400,
              });
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga.";
            setStatusSubmitError(msg);
            triggerDynamicIslandFeedback({
              type: "error",
              title: "Gagal memperbarui status",
              description: msg,
              duration: 2400,
            });
          } finally {
            setStatusSubmitLoading(false);
          }
        }}
      />
    </>
  );
}
