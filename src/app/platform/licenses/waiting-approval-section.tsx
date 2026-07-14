"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { verifyLicenseOrderAction, rejectLicenseOrderAction } from "@/server/actions/license.actions";
import type { LicenseOrder } from "@/types/license";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  waiting_verification: "Waiting Verification",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "secondary",
  waiting_verification: "default",
  approved: "outline",
  paid: "outline",
  rejected: "destructive",
  expired: "destructive",
  cancelled: "secondary",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function getProofFileUrl(proofUrl: string): string {
  return proofUrl.startsWith("http") ? proofUrl : `/api/files?path=${encodeURIComponent(proofUrl)}`;
}

function durationLabel(order: LicenseOrder): string {
  if (!order.billing_duration_enabled) return "Lifetime";
  if (order.billing_duration_type === "month") return `${order.billing_duration_value} Month`;
  if (order.billing_duration_type === "year") return `${order.billing_duration_value} Year`;
  return "";
}

interface WaitingApprovalSectionProps {
  orders: LicenseOrder[];
}

export function WaitingApprovalSection({ orders }: WaitingApprovalSectionProps) {
  const [selectedOrder, setSelectedOrder] = React.useState<LicenseOrder | null>(null);
  const [rejectOrder, setRejectOrder] = React.useState<LicenseOrder | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [processing, setProcessing] = React.useState(false);

  const handleApprove = async (orderId: string) => {
    setProcessing(true);
    try {
      const result = await verifyLicenseOrderAction(orderId);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("License approved successfully");
        setSelectedOrder(null);
      }
    } catch {
      toast.error("Failed to approve license");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectOrder) return;
    setProcessing(true);
    try {
      const result = await rejectLicenseOrderAction(rejectOrder.id, rejectReason);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("License rejected");
        setRejectOrder(null);
        setRejectReason("");
      }
    } catch {
      toast.error("Failed to reject license");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">Waiting Approval</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Payment proofs awaiting review
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No pending verifications
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="group relative rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{order.invoice_number}</p>
                  <p className="mt-0.5 font-semibold">{order.brand_name ?? `Brand #${order.brand_id}`}</p>
                </div>
                <Badge variant={STATUS_VARIANTS[order.status] ?? "outline"}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </Badge>
              </div>

              <div className="mb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium">{order.package_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{durationLabel(order)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono font-medium">{formatPrice(order.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-mono text-xs">
                    {format(new Date(order.created_at), "d MMM yyyy", { locale: id })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedOrder(order)}
                >
                  <Download className="mr-1.5 size-3.5" />
                  Review
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleApprove(order.id)}
                  disabled={processing}
                >
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectOrder(order)}
                  disabled={processing}
                >
                  <XCircle className="mr-1.5 size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.invoice_number}</DialogTitle>
            <DialogDescription>Review payment proof and order information</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Package</span>
                  <p className="font-medium">{selectedOrder.package_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <p className="font-medium">{formatPrice(selectedOrder.total_amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <p className="font-medium">{durationLabel(selectedOrder)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>
                    <Badge variant={STATUS_VARIANTS[selectedOrder.status] ?? "outline"}>
                      {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {format(new Date(selectedOrder.created_at), "d MMM yyyy HH:mm", { locale: id })}
                  </p>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="mt-1 rounded-lg bg-muted p-3 text-sm">{selectedOrder.notes}</p>
                </div>
              )}
              {selectedOrder.proof_url && (
                <div>
                  <span className="text-sm text-muted-foreground">Payment Proof</span>
                  {selectedOrder.proof_url.match(/\.(pdf)$/i) ? (
                    <div className="mt-1">
                      <a
                        href={getProofFileUrl(selectedOrder.proof_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        View PDF
                      </a>
                    </div>
                  ) : (
                    <div className="mt-1 max-h-64 overflow-hidden rounded-lg border">
                      <img
                        src={getProofFileUrl(selectedOrder.proof_url)}
                        alt="Payment proof"
                        className="w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setSelectedOrder(null);
                    setRejectOrder(selectedOrder);
                  }}
                >
                  <XCircle className="mr-1.5 size-3.5" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedOrder.id)}
                  disabled={processing}
                >
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!rejectOrder} onOpenChange={(open) => !open && (setRejectOrder(null), setRejectReason(""))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject License Order</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejecting this license order. The user will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason.trim() || processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
