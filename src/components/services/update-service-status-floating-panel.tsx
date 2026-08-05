"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { Drawer } from "vaul";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceRecord, ServiceStatus } from "@/components/services/service-data";
import { useServiceWorkflow } from "@/components/services/use-service-workflow";
import {
  getStatusLabel,
  type ServiceWorkflowStatus,
} from "@/domain/service/service-workflow";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import { updateServiceStatusAction } from "@/server/actions/service-workflow.actions";

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
  CANCELLED: "cancelled",
};

interface Props {
  service: ServiceRecord;
  brandSlug?: string;
  onStatusUpdated?: (status: ServiceStatus) => void;
}

function UpdateStatusForm({
  service,
  nextStatus,
  currentStatus,
  currentLabel,
  nextLabel,
  isSubmitting,
  error,
  note,
  onNoteChange,
  onSubmit,
  onCancel,
}: {
  service: ServiceRecord;
  nextStatus: ServiceWorkflowStatus | null;
  currentStatus: ServiceWorkflowStatus;
  currentLabel: string;
  nextLabel: string | null;
  isSubmitting: boolean;
  error: string | null;
  note: string;
  onNoteChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
        <span className="text-xs text-muted-foreground">Status saat ini</span>
        <Badge variant="outline" className="text-[10px]">{currentLabel}</Badge>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">Status berikutnya</span>
        {nextLabel ? (
          <Badge className="text-[10px]">{nextLabel}</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">Tidak tersedia</Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 p-2 overflow-x-auto">
        {WORKFLOW_STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <span
              className={
                "shrink-0 rounded-full px-2 py-1 text-[10px] font-medium " +
                (step === currentStatus
                  ? "bg-foreground text-background"
                  : step === nextStatus
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground")
              }
            >
              {getStatusLabel(step)}
            </span>
            {i < WORKFLOW_STEPS.length - 1 && (
              <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
            )}
          </React.Fragment>
        ))}
      </div>

      <Separator />

      <div>
        <label htmlFor="sn" className="mb-1.5 block text-xs font-medium text-foreground">
          Catatan update
        </label>
        <Textarea
          id="sn"
          placeholder="Tambahkan catatan perubahan status..."
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          className="min-h-24"
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

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting || !nextStatus}>
          {isSubmitting ? (
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="size-3 animate-spin" />
              Memproses
            </span>
          ) : nextLabel ? (
            "Update ke " + nextLabel
          ) : (
            "Tidak tersedia"
          )}
        </Button>
      </div>
    </form>
  );
}

export function UpdateServiceStatusDialog({ service, brandSlug, onStatusUpdated }: Props) {
  const hasBrandSlug = Boolean(brandSlug);
  const workflow = useServiceWorkflow("MASTER_ADMIN");
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const currentStatus = workflow.getServiceStatus(service);
  const actions = workflow.getAllowedActions(service);
  const nextStatus = actions.allowedNext[0] ?? null;
  const currentLabel = getStatusLabel(currentStatus);
  const nextLabel = nextStatus ? getStatusLabel(nextStatus) : null;
  const canUpdate = Boolean(nextStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nextStatus) {
      const msg = "Role Anda tidak memiliki akses untuk mengubah status ini.";
      setError(msg);
      triggerDynamicIslandFeedback({ type: "error", title: "Ditolak", description: msg, duration: 2400 });
      return;
    }

    setError(null);
    const validation = workflow.preValidateTransition(service, nextStatus, note);

    if (!validation.allowed) {
      const msg = validation.reason ?? "Perubahan status tidak valid.";
      setError(msg);
      triggerDynamicIslandFeedback({ type: "error", title: "Ditolak", description: msg, duration: 2400 });
      return;
    }

    if (validation.requiresReason && !note.trim()) {
      setError("Catatan update wajib diisi.");
      triggerDynamicIslandFeedback({ type: "error", title: "Ditolak", description: "Catatan wajib diisi.", duration: 2400 });
      return;
    }

    setIsSubmitting(true);
    triggerDynamicIslandFeedback({ type: "loading", title: "Memproses", description: "Mengubah status..." });

    if (hasBrandSlug) {
      try {
        const response = await updateServiceStatusAction({
          brandSlug: brandSlug!,
          serviceId: service.id,
          nextStatus,
          note,
        });

        if (response.success) {
          const nextServiceStatus = WORKFLOW_TO_SERVICE_STATUS[nextStatus];
          if (nextServiceStatus) onStatusUpdated?.(nextServiceStatus);

          triggerDynamicIslandFeedback({ type: "success", title: "Berhasil", description: "Status diubah ke " + (nextLabel ?? "") + ".", duration: 1800 });
          setIsSubmitting(false);
          setOpen(false);
          setNote("");
        } else {
          triggerDynamicIslandFeedback({
            type: "error",
            title: "Gagal",
            description: response.error ?? "Gagal mengubah status servis.",
            duration: 2400,
          });
          setError(response.error ?? "Gagal mengubah status servis.");
          setIsSubmitting(false);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.";
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Gagal",
          description: msg,
          duration: 2400,
        });
        setError(msg);
        setIsSubmitting(false);
      }
    } else {
      await new Promise((r) => setTimeout(r, 650));
      const nextServiceStatus = WORKFLOW_TO_SERVICE_STATUS[nextStatus];
      if (nextServiceStatus) onStatusUpdated?.(nextServiceStatus);
      triggerDynamicIslandFeedback({ type: "success", title: "Berhasil", description: "Status diubah ke " + (nextLabel ?? "") + ".", duration: 1800 });
      setIsSubmitting(false);
      setOpen(false);
      setNote("");
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setError(null);
    setNote("");
  };

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => setOpen(true)}
          disabled={!canUpdate}
        >
          Update Status
        </Button>

        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Portal>
            <Drawer.Overlay
              className="fixed inset-0 z-50 bg-black/40"
              onPointerDownCapture={(e: React.PointerEvent) => e.stopPropagation()}
            />
            <Drawer.Content
              data-radix-dialog-content
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[85vh] flex-col rounded-t-2xl border border-border bg-background px-4 pb-6 pt-2 outline-none"
            >
              <div className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
              <h3 className="mb-1 text-base font-semibold text-foreground">Update Status Servis</h3>
              <p className="mb-4 text-xs text-muted-foreground">
                {service.customerName} — {service.deviceBrand} {service.deviceModel}
              </p>
              <div className="overflow-y-auto">
                <UpdateStatusForm
                  service={service}
                  nextStatus={nextStatus}
                  currentStatus={currentStatus}
                  currentLabel={currentLabel}
                  nextLabel={nextLabel}
                  isSubmitting={isSubmitting}
                  error={error}
                  note={note}
                  onNoteChange={setNote}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </>
    );
  }

  // Desktop: shadcn Dialog
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => setOpen(true)}
        disabled={!canUpdate}
      >
        Update Status
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Status Servis</DialogTitle>
            <DialogDescription>
              {service.customerName} — {service.deviceBrand} {service.deviceModel}
            </DialogDescription>
          </DialogHeader>

          <UpdateStatusForm
            service={service}
            nextStatus={nextStatus}
            currentStatus={currentStatus}
            currentLabel={currentLabel}
            nextLabel={nextLabel}
            isSubmitting={isSubmitting}
            error={error}
            note={note}
            onNoteChange={setNote}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
