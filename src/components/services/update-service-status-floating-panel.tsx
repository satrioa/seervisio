"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  FloatingPanelCloseButton,
  FloatingPanelContent,
  FloatingPanelFooter,
  FloatingPanelForm,
  FloatingPanelLabel,
  FloatingPanelRoot,
  FloatingPanelSubmitButton,
  FloatingPanelTextarea,
  FloatingPanelTrigger,
} from "@/components/ui/floating-panel";
import { Separator } from "@/components/ui/separator";
import type { ServiceRecord, ServiceStatus } from "@/components/services/service-data";
import { STATUS_CONFIG } from "@/components/services/service-data";
import { useServiceWorkflow } from "@/components/services/use-service-workflow";
import {
  getStatusLabel,
  type ServiceWorkflowStatus,
} from "@/domain/service/service-workflow";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

const WORKFLOW_STEPS: ServiceWorkflowStatus[] = [
  "MASUK",
  "DIAGNOSA",
  "PERBAIKAN",
  "QC",
  "SELESAI",
];

const WORKFLOW_TO_SERVICE_STATUS: Partial<Record<ServiceWorkflowStatus, ServiceStatus>> = {
  MASUK: "masuk",
  DIAGNOSA: "diagnosa",
  PERBAIKAN: "perbaikan",
  QC: "qc",
  SELESAI: "selesai",
  CANCELLED: "batal",
};

interface UpdateServiceStatusFloatingPanelProps {
  service: ServiceRecord;
  onStatusUpdated?: (status: ServiceStatus) => void;
}

export function UpdateServiceStatusFloatingPanel({
  service,
  onStatusUpdated,
}: UpdateServiceStatusFloatingPanelProps) {
  const workflow = useServiceWorkflow("MASTER_ADMIN");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const currentStatus = workflow.getServiceStatus(service);
  const actions = workflow.getAllowedActions(service);
  const nextStatus = actions.allowedNext[0] ?? null;
  const currentLabel = getStatusLabel(currentStatus);
  const nextLabel = nextStatus ? getStatusLabel(nextStatus) : null;
  const canUpdate = Boolean(nextStatus);

  const handleSubmit = React.useCallback(
    async (note: string) => {
      if (!nextStatus) {
        const message = "Role Anda tidak memiliki akses untuk mengubah status ini.";
        setError(message);
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Perubahan status ditolak",
          description: message,
          duration: 2400,
        });
        return false;
      }

      setError(null);
      const validation = workflow.preValidateTransition(service, nextStatus, note);

      if (!validation.allowed) {
        const message = validation.reason ?? "Perubahan status tidak valid.";
        setError(message);
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Perubahan status ditolak",
          description: message,
          duration: 2400,
        });
        return false;
      }

      if (validation.requiresReason && !note.trim()) {
        const message = "Catatan update wajib diisi untuk perubahan status ini.";
        setError(message);
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Perubahan status ditolak",
          description: message,
          duration: 2400,
        });
        return false;
      }

      setIsSubmitting(true);
      triggerDynamicIslandFeedback({
        type: "loading",
        title: "Memproses status",
        description: "Mengubah status servis...",
      });

      await new Promise((resolve) => window.setTimeout(resolve, 650));

      const nextServiceStatus = WORKFLOW_TO_SERVICE_STATUS[nextStatus];
      if (nextServiceStatus) {
        onStatusUpdated?.(nextServiceStatus);
      }

      triggerDynamicIslandFeedback({
        type: "success",
        title: "Status berhasil diperbarui",
        description: `Servis berhasil dipindahkan ke ${nextLabel}.`,
        duration: 1800,
      });
      setIsSubmitting(false);

      return true;
    },
    [nextLabel, nextStatus, onStatusUpdated, service, workflow]
  );

  return (
    <div className="flex flex-col gap-1">
      <FloatingPanelRoot>
        <FloatingPanelTrigger
          title="Update Status Servis"
          disabled={!canUpdate}
          className="h-8 rounded-md border-input bg-background px-3 text-xs font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          Update Status
        </FloatingPanelTrigger>
        <FloatingPanelContent className="w-[360px] border-border bg-card text-card-foreground shadow-xl">
          <FloatingPanelForm onSubmit={handleSubmit}>
            <div className="space-y-3 px-4 pb-2">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">Status saat ini</span>
                <Badge variant="outline" className="text-[10px]">
                  {currentLabel}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <span className="text-xs text-muted-foreground">Status berikutnya</span>
                {nextLabel ? (
                  <Badge className="text-[10px]">{nextLabel}</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Tidak tersedia
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 p-2">
                {WORKFLOW_STEPS.map((step, index) => {
                  const isCurrent = step === currentStatus;
                  const isNext = step === nextStatus;
                  return (
                    <React.Fragment key={step}>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                          isCurrent
                            ? "bg-foreground text-background"
                            : isNext
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground"
                        }`}
                      >
                        {getStatusLabel(step)}
                      </span>
                      {index < WORKFLOW_STEPS.length - 1 && (
                        <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <Separator />

              <div>
                <FloatingPanelLabel htmlFor="status-note" className="text-foreground">
                  Catatan update
                </FloatingPanelLabel>
                <FloatingPanelTextarea
                  id="status-note"
                  className="min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Tambahkan catatan perubahan status bila diperlukan.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!canUpdate && (
                <p className="text-[11px] text-muted-foreground">
                  Role Anda tidak memiliki akses untuk mengubah status ini.
                </p>
              )}
            </div>

            <FloatingPanelFooter className="items-center border-t border-border bg-muted/20 px-4 py-3">
              <FloatingPanelCloseButton className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-background hover:text-foreground" />
              <FloatingPanelSubmitButton
                disabled={!canUpdate || isSubmitting}
                className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="size-3 animate-spin" />
                    Memproses
                  </span>
                ) : nextLabel ? (
                  `Update ke ${nextLabel}`
                ) : (
                  "Tidak tersedia"
                )}
              </FloatingPanelSubmitButton>
            </FloatingPanelFooter>
          </FloatingPanelForm>
        </FloatingPanelContent>
      </FloatingPanelRoot>
    </div>
  );
}
