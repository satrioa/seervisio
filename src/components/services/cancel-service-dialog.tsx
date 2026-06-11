"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw, XCircle } from "lucide-react";

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
  validateCancelService,
  type ServiceWorkflowStatus,
  type ServiceWorkflowRole,
} from "@/domain/service/service-workflow";
import type { ServiceRecord, SparepartItem } from "@/components/services/service-data";

/* ─── Types ─── */

interface CancelServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRecord;
  role?: ServiceWorkflowRole;
  onConfirm: (input: { reason: string; returnStock: boolean }) => void;
}

/* ─── Component ─── */

export function CancelServiceDialog({
  open,
  onOpenChange,
  service,
  role = "MASTER_ADMIN",
  onConfirm,
}: CancelServiceDialogProps) {
  // Safety guard: if service is empty/undefined, don't render
  if (!service || !service.spareparts) {
    return null;
  }

  const [reason, setReason] = React.useState("");
  const [returnStock, setReturnStock] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setReason("");
      setReturnStock(true);
      setError(null);
    }
  }, [open]);

  const hasSpareparts = service.spareparts.length > 0;
  const totalSparepartCost = service.spareparts.reduce(
    (sum, sp) => sum + sp.price * sp.qty,
    0,
  );

  const workflowStatus = service.status.toUpperCase() as ServiceWorkflowStatus;

  const handleConfirm = () => {
    // Validate using domain logic
    const validation = validateCancelService({
      currentStatus: workflowStatus,
      role,
      reason,
      hasUsedSpareparts: hasSpareparts,
      returnStockConfirmed: returnStock,
    });

    if (!validation.allowed) {
      setError(validation.reason ?? "Tidak dapat membatalkan servis.");
      return;
    }

    setError(null);
    onConfirm({ reason, returnStock });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="size-5 text-destructive" />
            Batalkan Servis
          </DialogTitle>
          <DialogDescription>
            {service.deviceBrand} {service.deviceModel} — {service.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning alert */}
          <Alert variant="destructive" className="py-3">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Perhatian</AlertTitle>
            <AlertDescription className="text-[11px]">
              Membatalkan servis akan mengubah status menjadi <strong>Batal</strong>.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDescription>
          </Alert>

          {/* Sparepart info */}
          {hasSpareparts && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <RotateCcw className="size-3.5 text-muted-foreground" />
                Sparepart Terpakai ({service.spareparts.length} item)
              </div>
              <div className="mt-2 space-y-1">
                {service.spareparts.map((sp, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[11px] text-muted-foreground"
                  >
                    <span>
                      {sp.qty}x {sp.name}
                    </span>
                    <span className="tabular-nums">
                      Rp {((sp.price * sp.qty) / 1000).toFixed(0)}K
                    </span>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between border-t pt-1 text-[11px] font-medium text-foreground">
                  <span>Total sparepart</span>
                  <span className="tabular-nums">
                    Rp {(totalSparepartCost / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>

              {/* Return stock option */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="return-stock"
                  type="checkbox"
                  checked={returnStock}
                  onChange={(e) => setReturnStock(e.target.checked)}
                  className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label
                  htmlFor="return-stock"
                  className="text-[11px] font-normal text-foreground cursor-pointer"
                >
                  Kembalikan sparepart ke stok
                </Label>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-xs font-medium">
              Alasan Pembatalan <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Jelaskan mengapa servis ini dibatalkan..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              className="min-h-[80px] text-xs"
            />
          </div>

          {/* Error display */}
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
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            <XCircle className="size-3.5" />
            Batalkan Servis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
