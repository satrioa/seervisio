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
  getTotalSparepartCost,
  getPickupStatus,
  getPickupLabel,
  getPickupColor,
} from "@/components/services/service-data";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import {
  updateServiceStatusAction,
  cancelServiceAction,
} from "@/server/actions/service-workflow.actions";
import {
  getStatusLabel,
  type ServiceWorkflowStatus,
} from "@/domain/service/service-workflow";

/* ─── Color mapping per status for column styling ─── */

const STATUS_COLUMN_STYLES: Record<ServiceStatus, {
  headerBg: string;
  dot: string;
  countBadge: string;
  cardBg: string;
}> = {
  masuk:    { headerBg: "bg-blue-50/60 dark:bg-blue-950/20", dot: "bg-blue-500", countBadge: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", cardBg: "bg-blue-100/70 dark:bg-blue-900/35" },
  diagnosa: { headerBg: "bg-purple-50/60 dark:bg-purple-950/20", dot: "bg-purple-500", countBadge: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400", cardBg: "bg-purple-100/70 dark:bg-purple-900/35" },
  perbaikan:{ headerBg: "bg-amber-50/60 dark:bg-amber-950/20", dot: "bg-amber-500", countBadge: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", cardBg: "bg-amber-100/70 dark:bg-amber-900/35" },
  qc:       { headerBg: "bg-teal-50/60 dark:bg-teal-950/20", dot: "bg-teal-500", countBadge: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400", cardBg: "bg-teal-100/70 dark:bg-teal-900/35" },
  selesai:  { headerBg: "bg-green-50/60 dark:bg-green-950/20", dot: "bg-green-500", countBadge: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400", cardBg: "bg-green-100/70 dark:bg-green-900/35" },
  batal:    { headerBg: "bg-red-50/60 dark:bg-red-950/20", dot: "bg-red-500", countBadge: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400", cardBg: "bg-red-100/70 dark:bg-red-900/35" },
};

/* ─── Badge variant per status for reui Badge ─── */

function getStatusBadgeVariant(status: ServiceStatus) {
  switch (status) {
    case "masuk":     return "info-light" as const;
    case "diagnosa":  return "focus-light" as const;
    case "perbaikan": return "warning-light" as const;
    case "qc":        return "primary-light" as const;
    case "selesai":   return "success-light" as const;
    case "batal":     return "destructive-light" as const;
  }
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
  const totalBiaya = getTotalSparepartCost(service.spareparts);
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
              <service.deviceIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs font-medium text-foreground">
                {service.deviceBrand} {service.deviceModel}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] text-muted-foreground">
                {service.id}
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <User className="size-3 text-muted-foreground" />
              <span className="truncate text-[10px] text-muted-foreground">
                {service.customerName}
              </span>
            </div>
            {service.technician && (
              <span className="truncate text-[10px] text-muted-foreground">
                🔧 {service.technician}
              </span>
            )}
          </div>

          {/* Footer: Date + Branch + Sparepart */}
          <div className="flex items-center justify-between border-t pt-1.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">
                  {service.createdAt.slice(5)}
                </span>
              </div>
              <Badge variant="outline" size="xs" radius="full">
                {service.branch === "Semarang Pusat"
                  ? "Pusat"
                  : service.branch === "Salatiga"
                    ? "Salatiga"
                    : "Sragen"}
              </Badge>
            </div>
            {totalBiaya > 0 && (
              <span className="text-[10px] font-medium tabular-nums text-foreground">
                {formatCurrency(totalBiaya)}
              </span>
            )}
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
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-card/95 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-gradient-to-t from-card/95 to-transparent" />
          <div className="h-full overflow-y-auto p-2 pt-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
  onCardDoubleClick?: (service: ServiceRecord) => void;
}

export function ServiceKanbanView({ services, brandSlug, onCardDoubleClick }: ServiceKanbanViewProps) {
  const { showDetail } = useRightSidebar();

  // Convert services array to Record<ServiceStatus, ServiceRecord[]>
  const initialColumns = useMemo(() => {
    const map: Record<string, ServiceRecord[]> = {};
    for (const status of STATUS_ORDER) {
      map[status] = services.filter((s) => s.status === status);
    }
    return map;
  }, [services]);

  const [columns, setColumns] = useState<Record<string, ServiceRecord[]>>(initialColumns);
  const [cancelTarget, setCancelTarget] = React.useState<ServiceRecord | null>(null);
  const [dragError, setDragError] = React.useState<string | null>(null);
  const dragErrorTimer = React.useRef<ReturnType<typeof setTimeout>>(null);

  const workflow = useServiceWorkflow("MASTER_ADMIN");

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
   * Validates using centralized workflow, optimistically updates UI,
   * calls server action as source of truth, reverts on failure.
   * Triggers Dynamic Island feedback for all outcomes.
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

    // Special case: dropping on "batal" → open cancel dialog
    if (targetColumn === "batal") {
      setCancelTarget(service);
      return;
    }

    // Validate transition using centralized workflow
    const workflowNext = targetColumn.toUpperCase() as ServiceWorkflowStatus;
    const result = workflow.preValidateTransition(service, workflowNext);

    if (!result.allowed) {
      // Invalid: inline alert + Dynamic Island error feedback
      setDragError(result.reason ?? "Transisi tidak valid.");
      if (dragErrorTimer.current) clearTimeout(dragErrorTimer.current);
      dragErrorTimer.current = setTimeout(() => setDragError(null), 4000);

      triggerDynamicIslandFeedback({
        type: "error",
        title: "Perubahan status ditolak",
        description: result.reason ?? "Status servis harus berpindah secara berurutan.",
        duration: 2200,
      });
      return; // Don't update columns → card snaps back
    }

    // ── Valid transition: optimistic update + server call ──

    // Capture current workflow status BEFORE mutating local state
    const currentWorkflowStatus = workflow.getServiceStatus(service);

    // Snapshot for revert on failure
    const prevColumns = { ...columns };

    // Optimistic column update
    const next = { ...columns };
    const sourceItems = [...next[activeContainer]];
    const [movedItem] = sourceItems.splice(activeIndex, 1);
    next[activeContainer] = sourceItems;

    movedItem.status = targetColumn as ServiceStatus;

    const targetItems = [...(next[targetColumn] || [])];
    targetItems.splice(overIndex, 0, movedItem);
    next[targetColumn] = targetItems;

    setColumns(next);

    // Show loading feedback
    triggerDynamicIslandFeedback({
      type: "loading",
      title: "Memproses status",
      description: "Mengubah status servis...",
    });

    // Call server action (source of truth)
    try {
      const response = await updateServiceStatusAction({
        brandSlug,
        serviceId: service.id,
        nextStatus: workflowNext,
      });

      if (response.success) {
        // Keep optimistic update, show success
        triggerDynamicIslandFeedback({
          type: "success",
          title: "Status berhasil diperbarui",
          description: `Servis berhasil dipindahkan ke ${getStatusLabel(workflowNext)}.`,
          duration: 1800,
        });
      } else {
        // Server rejected: revert + show error
        setColumns(prevColumns);

        triggerDynamicIslandFeedback({
          type: "error",
          title: "Gagal memperbarui status",
          description: response.error ?? "Status servis gagal diperbarui.",
          duration: 2400,
        });
      }
    } catch (error) {
      // Unexpected error: revert + show error
      setColumns(prevColumns);

      triggerDynamicIslandFeedback({
        type: "error",
        title: "Gagal memperbarui status",
        description:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan tidak terduga.",
        duration: 2400,
      });
    }
  }, [columns, workflow]);

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

            const currentWorkflowStatus = workflow.getServiceStatus(cancelTarget);

            try {
              const response = await cancelServiceAction({
                brandSlug,
                serviceId: cancelTarget.id,
                reason,
                returnStock,
              });

              if (response.success) {
                // Update local state
                cancelTarget.status = "batal" as ServiceStatus;
                setColumns((prev) => {
                  const next = { ...prev };
                  for (const col of Object.keys(next)) {
                    next[col] = next[col].filter((s) => s.id !== cancelTarget.id);
                  }
                  next.batal = [...(next.batal ?? []), cancelTarget];
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
