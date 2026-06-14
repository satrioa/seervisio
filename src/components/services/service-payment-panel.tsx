"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import {
  Coins,
  PiggyBank,
  CreditCard,
  Wallet,
  Check,
  Loader2,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  type ServiceRecord,
  type ServicePaymentRecord,
  type ServicePaymentRecordType,
  type ServicePaymentSummary,
  formatCurrency,
  calculateServicePaymentSummary,
} from "@/components/services/service-data";
import { receiveServicePaymentAction, getServicePaymentMethodsAction } from "@/server/actions/service-workflow.actions";

interface PaymentMethodOption {
  id: string;
  name: string;
  type: string;
  mdrPercentage: number;
}

/* ── Props ── */

interface ServicePaymentPanelProps {
  service: ServiceRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded?: () => void;
  brandSlug: string;
}

/* ── Payment Panel ── */

export function ServicePaymentPanel({
  service,
  open,
  onOpenChange,
  onPaymentRecorded,
  brandSlug,
}: ServicePaymentPanelProps) {
  const [paymentType, setPaymentType] = useState<ServicePaymentRecordType>("FINAL_PAYMENT");
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [methodsError, setMethodsError] = useState<string | null>(null);

  // Load real payment methods from DB when panel opens
  useEffect(() => {
    if (!open) return;
    setMethodsLoading(true);
    setMethodsError(null);
    getServicePaymentMethodsAction(brandSlug).then((result) => {
      if (result.success) {
        setMethods(result.data);
      } else {
        setMethodsError(result.error ?? "Gagal memuat metode pembayaran.");
      }
    }).catch((err) => {
      setMethodsError(err instanceof Error ? err.message : "Gagal memuat metode pembayaran.");
    }).finally(() => {
      setMethodsLoading(false);
    });
  }, [open, brandSlug]);

  // Reset form when panel opens
  useEffect(() => {
    if (open) {
      setPaymentType("FINAL_PAYMENT");
      setAmount("");
      setMethodId("");
      setNote("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Get current payment records (from a store or passed in)
  const paymentRecords: ServicePaymentRecord[] = useMemo(() => {
    return (service as any).__paymentRecords ?? [];
  }, [service]);

  // Calculate payment summary
  const totalDue = useMemo(() => {
    const sparepartCost = service.spareparts.reduce(
      (sum, sp) => sum + sp.price * sp.qty, 0
    );
    const estimatedCost = Number(service.estimatedCost || 0);
    const finalCost = Number(service.finalCost || 0);
    return Math.max(sparepartCost, finalCost || estimatedCost, 100000);
  }, [service]);

  const summary: ServicePaymentSummary = useMemo(() => {
    return calculateServicePaymentSummary(totalDue, paymentRecords);
  }, [totalDue, paymentRecords]);

  const remainingBalance = summary.remainingBalance;

  // Auto-fill amount when payment type changes
  useEffect(() => {
    if (paymentType === "FINAL_PAYMENT") {
      setAmount(String(remainingBalance));
    }
  }, [paymentType, remainingBalance]);

  const paymentTypeLabel = useMemo(() => {
    switch (paymentType) {
      case "DOWN_PAYMENT": return "DP";
      case "PARTIAL_PAYMENT": return "Pembayaran Sebagian";
      case "FINAL_PAYMENT": return "Pelunasan";
      default: return paymentType;
    }
  }, [paymentType]);

  // Validation
  const validationError = useMemo(() => {
    const amountNum = parseInt(amount);
    if (!amount || amountNum <= 0) return "Jumlah pembayaran harus lebih dari 0";
    if (!methodId) return "Pilih metode pembayaran";
    if (amountNum > remainingBalance && paymentType !== "PARTIAL_PAYMENT") {
      if (paymentType !== "DOWN_PAYMENT") {
        return "Jumlah melebihi sisa tagihan";
      }
    }
    return null;
  }, [amount, methodId, remainingBalance, paymentType]);

  const handleSubmit = async () => {
    if (!methodId || amountNum <= 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const { triggerDynamicIslandFeedback } = await import(
        "@/lib/dynamic-island/dynamic-island-events"
      );
      triggerDynamicIslandFeedback({
        type: "loading",
        title: "Memproses pembayaran",
        description: "Mencatat pembayaran servis...",
      });

      const result = await receiveServicePaymentAction({
        brandSlug,
        serviceId: service.id,
        amount: amountNum,
        paymentMethodId: methodId,
        note: note || undefined,
      });

      if (result.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: "Pembayaran berhasil",
          description: "Pembayaran berhasil dicatat.",
          duration: 2200,
        });
        onPaymentRecorded?.();
        onOpenChange(false);
        resetForm();
      } else {
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Pembayaran gagal",
          description: result.error,
          duration: 2500,
        });
        setError(result.error);
      }
    } catch (err) {
      const { triggerDynamicIslandFeedback } = await import(
        "@/lib/dynamic-island/dynamic-island-events"
      );
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Pembayaran gagal",
        description: err instanceof Error ? err.message : "Gagal memproses pembayaran",
        duration: 2500,
      });
      setError(err instanceof Error ? err.message : "Gagal memproses pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setMethodId("");
    setNote("");
  };

  const amountNum = parseInt(amount) || 0;
  const canSubmit = !validationError && !submitting;

  const selectedMethod = methods.find((m) => m.id === methodId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-md"
      >
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-muted-foreground" />
            Terima Pembayaran
          </SheetTitle>
          <SheetDescription className="text-xs">
            {service.customerName} — {service.deviceBrand} {service.deviceModel}
          </SheetDescription>
        </SheetHeader>

        {methodsError && methods.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <AlertTriangle className="size-8 text-destructive/60" />
            <p className="text-sm font-medium text-destructive">
              Metode pembayaran belum dikonfigurasi.
            </p>
            <p className="text-xs text-muted-foreground">
              Hubungi administrator untuk mengatur metode pembayaran.
            </p>
          </div>
        ) : methodsLoading ? (
          <div className="mt-6 flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Payment Summary */}
            <div className="mt-2 rounded-lg border bg-card p-3">
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(totalDue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sudah Dibayar</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(summary.totalPaid)}
                  </span>
                </div>
                <Separator className="my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Sisa Tagihan
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(summary.remainingBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="mt-4 flex flex-col gap-4">
              {/* Payment Type */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Tipe Pembayaran</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: "DOWN_PAYMENT" as const, label: "DP", icon: PiggyBank },
                    { value: "PARTIAL_PAYMENT" as const, label: "Sebagian", icon: Coins },
                    { value: "FINAL_PAYMENT" as const, label: "Pelunasan", icon: CreditCard },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentType(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs transition-colors ${
                        paymentType === opt.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <opt.icon className="size-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-amount" className="text-xs font-medium">
                  Jumlah Pembayaran
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="pay-amount"
                    type="number"
                    min={0}
                    max={remainingBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 pl-10 text-sm"
                    placeholder="0"
                  />
                </div>
                {paymentType === "FINAL_PAYMENT" && (
                  <p className="text-[10px] text-muted-foreground">
                    Default ke sisa tagihan ({formatCurrency(remainingBalance)})
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-method" className="text-xs font-medium">
                  Metode Pembayaran
                </Label>
                <Select value={methodId} onValueChange={setMethodId}>
                  <SelectTrigger className="h-10 text-sm" id="pay-method">
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent className="z-[1001]">
                    {methods.map((method) => (
                      <SelectItem key={method.id} value={method.id} className="text-sm">
                        {method.name}
                        {method.mdrPercentage > 0 && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            (MDR {method.mdrPercentage}%)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-note" className="text-xs font-medium">
                  Catatan
                </Label>
                <Input
                  id="pay-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-10 text-sm"
                  placeholder="Catatan pembayaran (opsional)"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Validation hint */}
            {validationError && !error && !submitting && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                {validationError}
              </div>
            )}

            {/* Submit */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="gap-1.5 text-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Catat Pembayaran
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
