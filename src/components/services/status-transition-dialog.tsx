"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getStatusLabel,
} from "@/domain/service/service-workflow";
import { STATUS_CONFIG } from "@/components/services/service-data";

export interface PendingStatusTransition {
  serviceId: string;
  serviceNumber: string;
  fromUiStatus: string;
  toUiStatus: string;
}

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: PendingStatusTransition | null;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: (note: string) => void;
}

export function StatusTransitionDialog({
  open,
  onOpenChange,
  pending,
  isSubmitting,
  error,
  onConfirm,
}: StatusTransitionDialogProps) {
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setNote("");
    }
  }, [open]);

  const fromLabel = pending
    ? STATUS_CONFIG[pending.fromUiStatus as keyof typeof STATUS_CONFIG]?.label ?? pending.fromUiStatus
    : "";
  const toLabel = pending
    ? STATUS_CONFIG[pending.toUiStatus as keyof typeof STATUS_CONFIG]?.label ?? pending.toUiStatus
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Konfirmasi Perubahan Status</DialogTitle>
          <DialogDescription>
            Tambahkan catatan untuk perpindahan status servis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {pending && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs font-medium text-foreground">{pending.serviceNumber}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{fromLabel}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{toLabel}</span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="status-note" className="mb-1.5 block text-xs font-medium text-foreground">
              Catatan Status
            </label>
            <Textarea
              id="status-note"
              placeholder="Masukkan catatan perubahan status (opsional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none text-xs"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onConfirm(note)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Konfirmasi Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
