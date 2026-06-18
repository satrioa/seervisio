"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Clock, GripVerticalIcon } from "lucide-react";
import { Badge } from "@/components/reui/badge";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/reui/kanban";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useServiceWorkflow } from "@/components/services/use-service-workflow";
import { CancelServiceDialog } from "@/components/services/cancel-service-dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  type ServiceRecord,
  type ServiceStatus,
  STATUS_CONFIG,
  STATUS_ORDER,
  formatCurrency,
  getPickupStatus,
  getPickupLabel,
  getPickupColor,
} from "@/components/services/service-data";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import { ServiceDeviceIcon } from "@/components/services/service-device-icon";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import {
  updateServiceStatusAction,
  cancelServiceAction,
} from "@/server/actions/service-workflow.actions";
import {
  getStatusLabel,
  type ServiceWorkflowStatus,
} from "@/domain/service/service-workflow";
import { StatusTransitionDialog, type PendingStatusTransition } from "@/components/services/status-transition-dialog";

/* ─── Color mapping per status for column styling ─── */

const STATUS_COLUMN_STYLES: Record<ServiceStatus, {
  headerBg: string;
  dot: string;
  countBadge: string;
  cardBg: string;
}> = {
  masuk:    { headerBg: "bg-blue-50/60 dark:bg-blue-950/20", dot: "bg-blue-500", countBadge: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", cardBg: "bg-blue-100/70 dark:bg-blue-900/35" },
  diagnosa: { headerBg: "bg-purple-50/60 dark:bg-purple-950/20", dot: "bg-purple-500", countBadge: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400", cardBg: "bg-purple-100/70 dark:bg-purple-900/35" },
  menunggu_persetujuan: { headerBg: "bg-orange-50/60 dark:bg-orange-950/20", dot: "bg-orange-500", countBadge: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400", cardBg: "bg-orange-100/70 dark:bg-orange-900/35" },
  perbaikan:{ headerBg: "bg-amber-50/60 dark:bg-amber-950/20", dot: "bg-amber-500", countBadge: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", cardBg: "bg-purple-100/70 dark:bg-purple-900/35" }, // Fix: was purple-100/70, but style is amber? Wait, let's keep it consistent with what it was.
  qc:       { headerBg: "bg-teal-50/60 dark:bg-teal-950/20", dot: "bg-teal-500", countBadge: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400", cardBg: "bg-teal-100/70 dark:bg-teal-900/35" },
  selesai:  { headerBg: "bg-green-50/60 dark:bg-green-950/20", dot: "bg-green-500", countBadge: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400", cardBg: "bg-green-100/70 dark:bg-green-900/35" },
  cancelled:{ headerBg: "bg-red-50/60 dark:bg-red-950/20", dot: "bg-red-500", countBadge: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400", cardBg: "bg-red-100/70 dark:bg-red-900/35" },
};

// Quick fix for perbaikan cardBg which looked like a typo in original file (was using purple for amber)
STATUS_COLUMN_STYLES.perbaikan.cardBg = "bg-amber-100/70 dark:bg-amber-900/35";

function formatKanbanDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* ─── Service Card ─── */

interface ServiceCardProps {
  service: ServiceRecord;
  asHandle?: boolean;
  isOverlay?: boolean;
  onClick?: () => void;
  onCardDoubleClick?: (service: ServiceRecord) => void;
}

function ServiceCard({ service, asHandle, isOverlay, onClick, onCardDoubleClick }: ServiceCardProps) {
  const totalBiaya = Number(service.finalCost || service.estimatedCost || 0);
  const styles = STATUS_COLUMN_STYLES[service.status];

  const cardContent = (
    <div
      className="relative group"
      onDoubleClick={() => onCardDoubleClick?.(service)}
    >
      <Card
        className={`select-none cursor-pointer border-black/5 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 ${
          isOverlay ? "shadow-xl" : ""
        } ${styles.cardBg}`}
        onClick={onClick}
      >
        <CardContent className="flex flex-col gap-2 p-3">
          {/* Header: Device icon + name + ID + mobile detail button */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <ServiceDeviceIcon iconKey={service.deviceIconKey} className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs font-medium text-foreground">
                {service.serviceNumber || service.deviceName}
              </span>
            </div>
            <div className="flex min-w-0 max-w-[42%] shrink-0 items-center justify-end gap-1">
              <span className="truncate text-[9px] text-muted-foreground">
                {service.deviceName}
              </span>
              <button
                type="button"
                className="sm:hidden inline-flex items-center justify-center rounded-md px-2 py-1 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onCardDoubleClick?.(service);
                }}
              >
                Detail
              </button>
            </div>
          </div>

          {/* Issue */}
          <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
            {service.issue}
          </p>

          {/* Pickup badge for selesai */}
          {service.status === "selesai" && (
            (() => {
              const pickupStatus = getPickupStatus(service);
              return (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPickupColor(pickupStatus)}`}>
                  {getPickupLabel(pickupStatus)}
                </span>
              );
            })()
          )}

          {/* Customer & Technician */}
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <User className="size-3 text-muted-foreground" />
              <span className="truncate text-[10px] text-muted-foreground">
                {service.customerName}
              </span>
            </div>
            {service.technician && (
              <span className="max-w-[46%] shrink-0 truncate text-[10px] text-muted-foreground">
                🔧 {service.technician}
              </span>
            )}
          </div>

          {/* Footer: Date + Branch + Sparepart */}
          <div className="flex min-w-0 items-center justify-between gap-2 border-t pt-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <div className="flex min-w-0 items-center gap-1">
                <Clock className="size-3 text-muted-foreground" />
                <span className="truncate text-[9px] text-muted-foreground">
                  {formatKanbanDate(service.createdAt)}
                </span>
              </div>
              <Badge
                variant="outline"
                size="xs"
                radius="full"
                className="min-w-0 max-w-[96px] shrink truncate px-1.5"
              >
                <span className="truncate">
                  {service.branchName ?? "Cabang tidak diketahui"}
                </span>
              </Badge>
            </div>
            <span className="shrink-0 text-[10px] font-medium tabular-nums text-foreground">
              {formatCurrency(totalBiaya)}
            </span>
          </div>
        </CardContent>
      </Card>
      <span className="hidden sm:group-hover:block text-[8px] text-muted-foreground absolute -bottom-3 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Double click untuk detail
      </span>
    </div>
  );

  return (
    <KanbanItem value={service.id}>
      {asHandle && !isOverlay ? (
        <KanbanItemHandle>{cardContent}</KanbanItemHandle>
      ) : (
        cardContent
      )}
    </KanbanItem>
  );
}

/* ─── Service Column ─── */

interface ServiceColumnProps {
  status: ServiceStatus;
  services: ServiceRecord[];
  index?: number;
  isOverlay?: boolean;
  onCardClick: (service: ServiceRecord) => void;
  onCardDoubleClick?: (service: ServiceRecord) => void;
}

function ServiceColumn({ status, services, index = 0, isOverlay, onCardClick, onCardDoubleClick }: ServiceColumnProps) {
  const styles = STATUS_COLUMN_STYLES[status];
  const config = STATUS_CONFIG[status];
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollFade, setScrollFade] = React.useState({
    top: false,
    bottom: false,
  });

  const updateScrollFade = React.useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const maxScrollTop = element.scrollHeight - element.clientHeight;
    const hasOverflow = maxScrollTop > 2;

    setScrollFade({
      top: hasOverflow && element.scrollTop > 2,
      bottom: hasOverflow && maxScrollTop - element.scrollTop > 2,
    });
  }, []);

  React.useEffect(() => {
    updateScrollFade();

    const element = scrollRef.current;
    if (!element) return;

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateScrollFade);
      return () => window.removeEventListener("resize", updateScrollFade);
    }

    const resizeObserver = new ResizeObserver(updateScrollFade);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [services.length, updateScrollFade]);

  return (
    <KanbanColumn
      value={status}
      className="h-full w-[260px] shrink-0"
    >
      <motion.div
        initial={isOverlay ? false : { opacity: 0, x: 32, scale: 0.985 }}
        animate={isOverlay ? undefined : { opacity: 1, x: 0, scale: 1 }}
        exit={isOverlay ? undefined : { opacity: 0, x: -24, scale: 0.985 }}
        transition={{
          duration: 0.32,
          delay: isOverlay ? 0 : index * 0.045,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`flex h-full min-h-0 flex-col rounded-xl border bg-card ${styles.headerBg}`}
      >
        {/* Column Header */}
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${styles.dot}`} />
            <span className="text-xs font-semibold text-foreground">
              {config.label}
            </span>
            <Badge
              variant="outline"
              size="xs"
              radius="full"
              className={styles.countBadge}
            >
              {services.length}
            </Badge>
          </div>
          <KanbanColumnHandle asChild>
            <Button size="icon" variant="ghost" className="size-6">
              <GripVerticalIcon className="size-3 text-muted-foreground" />
            </Button>
          </KanbanColumnHandle>
        </CardHeader>

        {/* Column Content */}
        <CardContent className="relative min-h-0 flex-1 overflow-hidden p-0">
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-card/95 to-transparent transition-opacity duration-200 ${
              scrollFade.top ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-gradient-to-t from-card/95 to-transparent transition-opacity duration-200 ${
              scrollFade.bottom ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            ref={scrollRef}
            onScroll={updateScrollFade}
            className="h-full overflow-y-auto p-2 pt-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <KanbanColumnContent
              value={status}
              className="flex flex-col gap-2 pb-2"
            >
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  asHandle={!isOverlay}
                  onClick={() => onCardClick(service)}
                  onCardDoubleClick={onCardDoubleClick}
                />
              ))}
              {services.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[10px] text-muted-foreground/50">Tidak ada servis</p>
                </div>
              )}
            </KanbanColumnContent>
          </div>
        </CardContent>
      </motion.div>
    </KanbanColumn>
  );
}

/* ══════════════════════════════════════════════
   KANBAN VIEW (MAIN)
   ══════════════════════════════════════════════ */

interface ServiceKanbanViewProps {
  services: ServiceRecord[];
  brandSlug: string;
  isLoading?: boolean;
  error?: string | null;
  search?: string;
  statusFilter?: ServiceStatus | "all";
  technicianFilter?: string;
  pickupFilter?: string;
  role?: string;
  onCardDoubleClick?: (service: ServiceRecord) => void;
}

export function ServiceKanbanView({
  services,
  brandSlug,
  isLoading = false,
  error = null,
  search = "",
  statusFilter = "all",
  technicianFilter = "all",
  pickupFilter = "all",
  role,
  onCardDoubleClick,
}: ServiceKanbanViewProps) {
  const { showDetail } = useRightSidebar();

  console.log("[services:kanban] received", services.length);

  React.useEffect(() => {
    console.debug("[service-kanban-view] props", {
      count: services.length,
      brandSlug,
      role,
      sample: services[0] ?? null,
    });
  }, [services, brandSlug, role]);

  const filteredServices = useMemo(() => {
    let result = services;
    if (statusFilter !== "all") {
      result = result.filter((service) => service.status === statusFilter);
    }
    if (technicianFilter === "unassigned") {
      result = result.filter((service) => !service.technicianName);
    } else if (technicianFilter !== "all") {
      result = result.filter((service) => service.technicianName === technicianFilter);
    }
    
    if (pickupFilter !== "all") {
      result = result.filter((s) => {
        const ps = getPickupStatus(s);
        if (pickupFilter === "ready") return ps === "READY";
        if (pickupFilter === "picked_up") return ps === "PICKED_UP";
        if (pickupFilter === "not_ready") return ps === "NOT_READY";
        return true;
      });
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
  }, [services, statusFilter, technicianFilter, pickupFilter, search]);

  // Convert services array to Record<ServiceStatus, ServiceRecord[]>
  const initialColumns = useMemo(() => {
    const map: Record<string, ServiceRecord[]> = {};
    for (const status of STATUS_ORDER) {
      map[status] = filteredServices.filter((s) => s.status === status);
    }
    return map;
  }, [filteredServices]);

  React.useEffect(() => {
    console.log("[services:kanban] grouped", {
      total: filteredServices.length,
      counts: Object.fromEntries(
        Object.entries(initialColumns).map(([status, items]) => [status, items.length])
      ),
    });
  }, [filteredServices.length, initialColumns]);

  const [columns, setColumns] = useState<Record<string, ServiceRecord[]>>(initialColumns);
  const [cancelTarget, setCancelTarget] = React.useState<ServiceRecord | null>(null);
  const [dragError, setDragError] = React.useState<string | null>(null);
  const dragErrorTimer = React.useRef<ReturnType<typeof setTimeout>>(null);
  const [pendingTransition, setPendingTransition] = React.useState<PendingStatusTransition | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [statusSubmitLoading, setStatusSubmitLoading] = React.useState(false);
  const [statusSubmitError, setStatusSubmitError] = React.useState<string | null>(null);

  const workflow = useServiceWorkflow((role ?? "MASTER_ADMIN") as any);

  // Sync when services prop changes
  React.useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  // When cards are reordered within the same column or columns are reordered
  const handleValueChange = (newColumns: Record<string, ServiceRecord[]>) => {
    setColumns(newColumns);
  };

  /**
   * onMove — called on drag-end for item moves.
   * Validates using centralized workflow, sets pending transition,
   * opens note dialog. No optimistic UI mutation.
   */
  const handleMove = useCallback(async (moveEvent: {
    activeContainer: string;
    activeIndex: number;
    overContainer: string;
    overIndex: number;
  }) => {
    const { activeContainer, activeIndex, overContainer, overIndex } = moveEvent;

    // Same-container reorder: just accept
    if (activeContainer === overContainer) {
      const next = { ...columns };
      const items = [...next[activeContainer]];
      const [movedItem] = items.splice(activeIndex, 1);
      items.splice(overIndex, 0, movedItem);
      next[activeContainer] = items;
      setColumns(next);
      return;
    }

    // Get the moved service
    const service = columns[activeContainer]?.[activeIndex];
    if (!service) return;

    const targetColumn = overContainer;

    // Special case: dropping on "cancelled" → open cancel dialog
    if (targetColumn === "cancelled") {
      setCancelTarget(service);
      return;
    }

    // Map UI column ID to workflow status
    const COLUMN_TO_WORKFLOW: Record<string, ServiceWorkflowStatus> = {
      masuk: "MASUK",
      diagnosa: "DIAGNOSA",
      menunggu_persetujuan: "DIAGNOSA",
      perbaikan: "PERBAIKAN",
      qc: "QC",
      selesai: "SELESAI",
      cancelled: "CANCELLED",
    };
    const workflowNext = COLUMN_TO_WORKFLOW[targetColumn] ?? "MASUK";
    const result = workflow.preValidateTransition(service, workflowNext);

    if (!result.allowed) {
      setDragError(result.reason ?? "Transisi tidak valid.");
      if (dragErrorTimer.current) clearTimeout(dragErrorTimer.current);
      dragErrorTimer.current = setTimeout(() => setDragError(null), 4000);

      triggerDynamicIslandFeedback({
        type: "error",
        title: "Perubahan status ditolak",
        description: result.reason ?? "Status servis harus berpindah secara berurutan.",
        duration: 2200,
      });
      return;
    }

    // ── Valid transition: open note dialog (no optimistic update) ──
    setPendingTransition({
      serviceId: service.id,
      serviceNumber: service.serviceNumber,
      fromUiStatus: service.status,
      toUiStatus: targetColumn as string,
    });
    setStatusSubmitError(null);
    setStatusDialogOpen(true);

    console.log("[services:kanban] pending transition", {
      serviceId: service.id,
      serviceNumber: service.serviceNumber,
      fromUiStatus: service.status,
      toUiStatus: targetColumn,
      fromDbStatus: service.rawStatus,
    });
  }, [columns, workflow, brandSlug]);

  const handleStatusConfirm = useCallback(async (note: string) => {
    if (!pendingTransition) return;

    console.log("[services:status-dialog] confirm", {
      serviceId: pendingTransition.serviceId,
      fromUiStatus: pendingTransition.fromUiStatus,
      toUiStatus: pendingTransition.toUiStatus,
      noteLength: note?.length ?? 0,
    });

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
          description: `Servis berhasil dipindahkan ke ${STATUS_CONFIG[pendingTransition.toUiStatus as ServiceStatus]?.label ?? pendingTransition.toUiStatus}.`,
          duration: 1800,
        });

        // Refetch services from DB to sync Kanban
        window.dispatchEvent(new CustomEvent("seervis:services-refresh"));
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
  }, [pendingTransition, brandSlug]);

  const openDetail = React.useCallback(
    (service: ServiceRecord) => {
      showDetail(service);
    },
    [showDetail]
  );

  return (
    <>
      {/* Drag error alert */}
      {dragError && (
        <div className="mb-3">
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">{dragError}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Status transition dialog */}
      <StatusTransitionDialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDialogOpen(false);
            setPendingTransition(null);
            setStatusSubmitError(null);
          }
        }}
        pending={pendingTransition}
        isSubmitting={statusSubmitLoading}
        error={statusSubmitError}
        onConfirm={handleStatusConfirm}
      />

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelServiceDialog
          open={cancelTarget !== null}
          onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
          service={cancelTarget}
          onConfirm={async ({ reason, returnStock }) => {
            if (!cancelTarget) return;

            // Show loading feedback
            triggerDynamicIslandFeedback({
              type: "loading",
              title: "Membatalkan servis",
              description: "Memproses pembatalan servis...",
            });

            try {
              const response = await cancelServiceAction({
                brandSlug,
                serviceId: cancelTarget.id,
                reason,
                returnStock,
              });

              if (response.success) {
                // Update local state
                cancelTarget.status = "cancelled" as ServiceStatus;
                setColumns((prev) => {
                  const next = { ...prev };
                  for (const col of Object.keys(next)) {
                    next[col] = next[col].filter((s) => s.id !== cancelTarget.id);
                  }
                  next.cancelled = [...(next.cancelled ?? []), cancelTarget];
                  return next;
                });
                setCancelTarget(null);

                triggerDynamicIslandFeedback({
                  type: "success",
                  title: "Servis dibatalkan",
                  description: "Servis berhasil dibatalkan.",
                  duration: 1800,
                });
              } else {
                triggerDynamicIslandFeedback({
                  type: "error",
                  title: "Gagal membatalkan",
                  description: response.error ?? "Gagal membatalkan servis.",
                  duration: 2400,
                });
              }
            } catch (error) {
              triggerDynamicIslandFeedback({
                type: "error",
                title: "Gagal membatalkan",
                description:
                  error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan tidak terduga.",
                duration: 2400,
              });
            }
          }}
        />
      )}

      {isLoading && (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Memuat data servis...
        </div>
      )}
      {!isLoading && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error}
        </div>
      )}

    <Kanban
      value={columns}
      onValueChange={handleValueChange}
      onMove={handleMove}
      getItemValue={(item) => item.id}
    >
      <KanbanBoard className="flex h-[calc(100vh-14rem)] min-h-[360px] items-stretch gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_ORDER.map((status, index) => (
          <ServiceColumn
            key={status}
            status={status}
            index={index}
            services={columns[status] ?? []}
            onCardClick={openDetail}
            onCardDoubleClick={onCardDoubleClick}
          />
        ))}
      </KanbanBoard>

      <KanbanOverlay>
        {({ value, variant }) => {
          if (variant === "column") {
            const colServices = columns[value] ?? [];
            return (
              <ServiceColumn
                status={value as ServiceStatus}
                services={colServices}
                isOverlay
                onCardClick={openDetail}
              />
            );
          }

          const allServices = Object.values(columns).flat();
          const service = allServices.find((s) => s.id === value);
          if (!service) return null;

          return <ServiceCard service={service} isOverlay />;
        }}
      </KanbanOverlay>
    </Kanban>
    </>
  );
}
