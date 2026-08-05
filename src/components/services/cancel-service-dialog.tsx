"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw, XCircle, Undo2, Ban } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  validateCancelService,
  type ServiceWorkflowStatus,
  type ServiceWorkflowRole,
} from "@/domain/service/service-workflow";
import type { ServiceRecord } from "@/components/services/service-data";
import { cancelServiceAction } from "@/server/actions/service-workflow.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

/* ─── Types ─── */

interface CancelServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRecord;
  brandSlug?: string;
  role?: ServiceWorkflowRole;
  payments?: { id: string; amount: number; method: string }[];
  onConfirm: (input: { reason: string; returnStock: boolean; paymentAction?: "void" | "refund" }) => void;
}

/* ─── Component ─── */

export function CancelServiceDialog({
  open,
  onOpenChange,
  service,
  brandSlug,
  role = "MASTER_ADMIN",
  payments,
  onConfirm,
}: CancelServiceDialogProps) {
  const hasBrandSlug = Boolean(brandSlug);
  if (!service || !service.spareparts) {
    return null;
  }

  const [reason, setReason] = React.useState("");
  const [returnStock, setReturnStock] = React.useState(true);
  const [paymentAction, setPaymentAction] = React.useState<"refund" | "void">("refund");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setReason("");
      setReturnStock(true);
      setPaymentAction("refund");
      setError(null);
    }
  }, [open]);

  const hasSpareparts = service.spareparts.length > 0;
  const totalSparepartCost = service.spareparts.reduce(
    (sum, sp) => sum + sp.price * sp.qty,
    0,
  );

  const workflowStatus = service.status.toUpperCase() as ServiceWorkflowStatus;
  const isSelesai = workflowStatus === "SELESAI";
  const hasPayments = payments && payments.length > 0;
  const totalPaymentAmount = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const handleConfirm = async () => {
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

    if (hasBrandSlug) {
      triggerDynamicIslandFeedback({
        type: "loading",
        title: "Membatalkan servis",
        description: "Memproses pembatalan servis...",
      });

      try {
        const response = await cancelServiceAction({
          brandSlug: brandSlug!,
          serviceId: service.id,
          reason,
          returnStock,
          paymentAction: isSelesai && hasPayments ? paymentAction : undefined,
        });

        if (response.success) {
          triggerDynamicIslandFeedback({
            type: "success",
            title: "Servis dibatalkan",
            description: "Servis berhasil dibatalkan.",
            duration: 1800,
          });
          onConfirm({ reason, returnStock, paymentAction: isSelesai && hasPayments ? paymentAction : undefined });
          onOpenChange(false);
        } else {
          triggerDynamicIslandFeedback({
            type: "error",
            title: "Gagal membatalkan",
            description: response.error ?? "Gagal membatalkan servis.",
            duration: 2400,
          });
          setError(response.error ?? "Gagal membatalkan servis.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.";
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Gagal membatalkan",
          description: msg,
          duration: 2400,
        });
        setError(msg);
      }
    } else {
      onConfirm({ reason, returnStock, paymentAction: isSelesai && hasPayments ? paymentAction : undefined });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          data-radix-dialog-content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          )}
        >
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
            <Alert variant="destructive" className="py-3">
              <AlertTriangle className="size-4" />
              <AlertTitle className="text-xs font-semibold">Perhatian</AlertTitle>
              <AlertDescription className="text-[11px]">
                Membatalkan servis akan mengubah status menjadi <strong>Batal</strong>.
                Tindakan ini tidak dapat dibatalkan.
              </AlertDescription>
            </Alert>

            {isSelesai && hasPayments && (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Undo2 className="size-3.5 text-muted-foreground" />
                  Pengembalian Pembayaran
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Total pembayaran: <strong className="text-foreground">Rp {totalPaymentAmount.toLocaleString("id-ID")}</strong>
                </p>
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{p.method}</span>
                    <span className="tabular-nums">Rp {p.amount.toLocaleString("id-ID")}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      paymentAction === "refund"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                    onClick={() => setPaymentAction("refund")}
                  >
                    <Undo2 className="size-3.5" />
                    <div className="text-left">
                      <p className="text-xs font-medium">Refund</p>
                      <p className="text-[10px] text-muted-foreground">Dana dikembalikan</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      paymentAction === "void"
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                    onClick={() => setPaymentAction("void")}
                  >
                    <Ban className="size-3.5" />
                    <div className="text-left">
                      <p className="text-xs font-medium">Void</p>
                      <p className="text-[10px] text-muted-foreground">Transaksi dibatalkan</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
