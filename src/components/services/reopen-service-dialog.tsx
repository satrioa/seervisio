"use client";

import * as React from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  validateReopenService,
  type ServiceWorkflowStatus,
  type ServiceWorkflowRole,
} from "@/domain/service/service-workflow";
import type { ServiceRecord } from "@/components/services/service-data";
import { reopenServiceAction } from "@/server/actions/service-workflow.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

/* ─── Types ─── */

interface ReopenServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRecord;
  brandSlug?: string;
  role?: ServiceWorkflowRole;
  onConfirm: (reason: string) => void;
}

/* ─── Component ─── */

export function ReopenServiceDialog({
  open,
  onOpenChange,
  service,
  brandSlug,
  role = "MASTER_ADMIN",
  onConfirm,
}: ReopenServiceDialogProps) {
  const hasBrandSlug = Boolean(brandSlug);
  // Safety guard: if service is empty/undefined, don't render
  if (!service || !service.id) {
    return null;
  }

  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const workflowStatus = service.status.toUpperCase() as ServiceWorkflowStatus;

  const handleConfirm = async () => {
    const validation = validateReopenService({
      currentStatus: workflowStatus,
      role,
      reason,
    });

    if (!validation.allowed) {
      setError(validation.reason ?? "Tidak dapat membuka ulang servis.");
      return;
    }

    setError(null);

    if (hasBrandSlug) {
      triggerDynamicIslandFeedback({
        type: "loading",
        title: "Membuka ulang servis",
        description: "Memproses...",
      });

      try {
        const response = await reopenServiceAction({
          brandSlug: brandSlug!,
          serviceId: service.id,
          reason,
        });

        if (response.success) {
          triggerDynamicIslandFeedback({
            type: "success",
            title: "Servis dibuka ulang",
            description: "Servis berhasil dibuka ulang.",
            duration: 1800,
          });
          onConfirm(reason);
          onOpenChange(false);
        } else {
          triggerDynamicIslandFeedback({
            type: "error",
            title: "Gagal membuka ulang",
            description: response.error ?? "Gagal membuka ulang servis.",
            duration: 2400,
          });
          setError(response.error ?? "Gagal membuka ulang servis.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.";
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Gagal membuka ulang",
          description: msg,
          duration: 2400,
        });
        setError(msg);
      }
    } else {
      onConfirm(reason);
      onOpenChange(false);
    }
  };

  const isDiambil = service.status === "selesai";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5 text-primary" />
            Buka Ulang Servis
          </DialogTitle>
          <DialogDescription>
            {service.deviceBrand} {service.deviceModel} — {service.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isDiambil && (
            <Alert variant="default" className="border-amber-300 bg-amber-50 py-3 dark:border-amber-800 dark:bg-amber-950/20">
              <AlertTriangle className="size-4 text-amber-600" />
              <AlertTitle className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Perhatian
              </AlertTitle>
              <AlertDescription className="text-[11px] text-amber-700 dark:text-amber-400">
                Servis ini sudah selesai. Membuka ulang akan mengembalikan status ke <strong>QC</strong>.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reopen-reason" className="text-xs font-medium">
              Alasan Dibuka Ulang <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reopen-reason"
              placeholder="Jelaskan mengapa servis ini perlu dibuka ulang..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              className="min-h-[80px] text-xs"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Kembali
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            <RotateCcw className="size-3.5" />
            Buka Ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
