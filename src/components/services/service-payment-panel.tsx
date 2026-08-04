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
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  type ServiceRecord,
  type ServicePaymentStatus,
  formatCurrency,
} from "@/components/services/service-data";
import {
  receiveServicePaymentAction,
  getServicePaymentMethodsAction,
  getServicePaymentPanelDataAction,
  type PaymentPanelPaymentRow,
} from "@/server/actions/service-workflow.actions";

interface PaymentMethodOption {
  id: string;
  name: string;
  type: string;
  mdrPercentage: number;
  mdrMinTransaction: number;
  accountName: string | null;
  accountBranchId: string | null;
}

/* ── Props ── */

interface ServicePaymentPanelProps {
  service: ServiceRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded?: () => void;
  brandSlug: string;
  onSetBill?: () => void;
}

/* ── Helpers ── */

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Payment Panel ── */

export function ServicePaymentPanel({
  service,
  open,
  onOpenChange,
  onPaymentRecorded,
  brandSlug,
  onSetBill,
}: ServicePaymentPanelProps) {
  const [paymentType, setPaymentType] = useState<"DOWN_PAYMENT" | "PARTIAL_PAYMENT" | "FINAL_PAYMENT">("FINAL_PAYMENT");
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [methodsError, setMethodsError] = useState<string | null>(null);

  // Fresh payment data — fetched directly from service_payments when panel opens
  const [paymentData, setPaymentData] = useState<{
    totalBill: number;
    totalPaid: number;
    remainingAmount: number;
    paymentState: string;
    payments: PaymentPanelPaymentRow[];
  } | null>(null);
  const [paymentDataLoading, setPaymentDataLoading] = useState(false);
  const [paymentDataError, setPaymentDataError] = useState<string | null>(null);

  // Fetch fresh payment data on open
  useEffect(() => {
    if (!open) return;
    setPaymentData(null);
    setPaymentDataLoading(true);
    setPaymentDataError(null);

    getServicePaymentPanelDataAction(brandSlug, service.id).then((result) => {
      if (result.success) {
        setPaymentData(result.data);
        console.log("[service-payment/ui-summary]", {
          serviceId: service.id,
          ...result.data,
        });
      } else {
        setPaymentDataError(result.error ?? "Gagal memuat data pembayaran.");
      }
    }).catch((err) => {
      setPaymentDataError(err instanceof Error ? err.message : "Gagal memuat data pembayaran.");
    }).finally(() => {
      setPaymentDataLoading(false);
    });
  }, [open, brandSlug, service.id]);

  // For backward compat while loading — fallback to service.__paymentRecords
  const {
    totalBill,
    totalPaid,
    remainingAmount: remainingBalance,
    paymentState,
    payments: paymentRecords,
  } = useMemo(() => {
    if (paymentData) {
      return {
        totalBill: paymentData.totalBill,
        totalPaid: paymentData.totalPaid,
        remainingAmount: paymentData.remainingAmount,
        paymentState: paymentData.paymentState as ServicePaymentStatus,
        payments: paymentData.payments,
      };
    }
    // Fallback to preloaded __paymentRecords while fresh data loads
    const rawRecords: any[] = (service as any).__paymentRecords ?? [];
    const bill = Number(service.finalCost || service.estimatedCost || 0);
    const paid = rawRecords.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
    const rem = Math.max(0, bill - paid);
    let ps: ServicePaymentStatus = "UNPAID";
    if (paid <= 0) ps = "UNPAID";
    else if (paid < bill) ps = "PARTIAL";
    else ps = "PAID";
    return { totalBill: bill, totalPaid: paid, remainingAmount: rem, paymentState: ps, payments: [] };
  }, [paymentData, service]);

  // Load real payment methods from DB when panel opens
  useEffect(() => {
    if (!open) return;
    setMethodsLoading(true);
    setMethodsError(null);
    getServicePaymentMethodsAction(brandSlug, service.branchId).then((result) => {
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
  }, [open, brandSlug, service.branchId]);

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

  // Auto-fill amount on payment type change
  useEffect(() => {
    if (paymentType === "FINAL_PAYMENT" && remainingBalance > 0) {
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
    if (paymentState === "PAID") return null;
    const amountNum = parseInt(amount);
    if (!amount || amountNum <= 0) return "Jumlah pembayaran harus lebih dari 0";
    if (!methodId) return "Pilih metode pembayaran";
    if (amountNum > remainingBalance && paymentType !== "PARTIAL_PAYMENT" && paymentType !== "DOWN_PAYMENT") {
      return "Jumlah melebihi sisa tagihan";
    }
    return null;
  }, [amount, methodId, remainingBalance, paymentType, paymentState]);

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
        branchPaymentMethodId: methodId,
        note: note || undefined,
        paymentType,
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
        window.dispatchEvent(new CustomEvent("seervis:cash-transaction"));
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
  const isPaid = paymentState === "PAID";
  const billMissing = totalBill <= 0 && !isPaid;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-6 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 p-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-muted-foreground" />
            Terima Pembayaran
          </SheetTitle>
          <SheetDescription className="text-xs">
            {service.customerName} — {service.deviceBrand} {service.deviceModel}
          </SheetDescription>
        </SheetHeader>

        {paymentDataLoading ? (
          <div className="mt-6 flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : billMissing ? (
          <div className="mt-4 flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/20 p-6 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted/40">
              <Wallet className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Total Tagihan belum ada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Estimasi biaya servis belum diisi. Atur tagihan terlebih dahulu agar pembayaran bisa dicatat.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              className="text-xs"
              onClick={() => (onSetBill ? onSetBill() : onOpenChange(false))}
            >
              Atur Tagihan
            </Button>
          </div>
        ) : (
          <>
            {/* Payment Summary */}
            <div className="mt-2 rounded-lg border bg-card p-3">
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Tagihan</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(totalBill)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sudah Dibayar</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
                <Separator className="my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Sisa Tagihan
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── PAID State: success card ── */}
            {isPaid && (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
                <CheckCircle className="size-10 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Pembayaran Lunas
                  </p>
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Tagihan servis ini sudah dibayar penuh.
                  </p>
                </div>
              </div>
            )}

            {/* ── Payment Form (hidden when PAID) ── */}
            {!isPaid && (
              <>
                {methodsError && methods.length === 0 ? (
                  <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
                    <AlertTriangle className="size-8 text-destructive/60" />
                    <p className="text-sm font-medium text-destructive">
                      Belum ada metode pembayaran aktif untuk cabang ini.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hubungkan akun pembayaran di menu Payment Methods terlebih dahulu.
                    </p>
                  </div>
                ) : methodsLoading ? (
                  <div className="mt-4 flex items-center justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-4">
                    {/* Payment Type */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium">Tipe Pembayaran</Label>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
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
                          type="text"
                          inputMode="numeric"
                          min={0}
                          max={remainingBalance}
                          value={amount ? Number(amount).toLocaleString("id-ID") : ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            setAmount(raw);
                          }}
                          className={`h-10 pl-10 text-sm tabular-nums ${
                            amount !== "" && (parseInt(amount) <= 0 || Number.isNaN(parseInt(amount)))
                              ? "border-destructive ring-1 ring-destructive/20"
                              : ""
                          }`}
                          placeholder={`Min. Rp1`}
                        />
                      </div>
                      {/* Persistent validation hint */}
                      {amount !== "" && (parseInt(amount) <= 0 || Number.isNaN(parseInt(amount))) ? (
                        <p className="flex items-center gap-1 text-[10px] text-destructive">
                          <AlertTriangle className="size-3" />
                          Jumlah pembayaran harus lebih dari 0
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">
                          Masukkan nominal pembayaran
                        </p>
                      )}
                      {paymentType === "FINAL_PAYMENT" && (
                        <p className="text-[10px] text-muted-foreground">
                          Default ke sisa tagihan ({formatCurrency(remainingBalance)})
                        </p>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium">Metode Pembayaran</Label>
                      {methodsLoading ? (
                        <div className="h-10 flex items-center justify-center rounded-sm border bg-muted/30">
                          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      ) : methodsError ? (
                        <p className="text-[10px] text-destructive">{methodsError}</p>
                      ) : methods.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">Tidak ada metode pembayaran tersedia.</p>
                      ) : (
                        <div className="flex rounded-sm overflow-hidden border border-border/70">
                          {methods.map((method, idx) => {
                            const isSelected = methodId === method.id;
                            return (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => setMethodId(method.id)}
                                className={`flex-1 px-2.5 py-2.5 text-xs font-medium transition-colors
                                  ${isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card text-muted-foreground hover:bg-muted"
                                  }
                                  ${idx > 0 ? "border-l border-border/70" : ""}
                                `}
                              >
                                {method.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
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
                )}
              </>
            )}

            {/* Payment History */}
            {paymentRecords.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <Separator />
                <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  Riwayat Pembayaran
                </span>
                <div className="flex flex-col gap-1.5">
                  {paymentRecords.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-foreground truncate">
                            {p.paymentNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                          <Clock className="size-2.5" />
                          {formatDateTime(p.paidAt || p.createdAt)}
                        </div>
                        {(p.methodType || p.accountName) && (
                          <span className="text-[9px] text-muted-foreground truncate">
                            {p.methodType}{p.methodType && p.accountName ? " · " : ""}{p.accountName}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-medium tabular-nums text-foreground ml-2">
                        {formatCurrency(p.grossAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {paymentRecords.length === 0 && !paymentDataLoading && (
              <p className="mt-3 text-[10px] text-muted-foreground">
                Tidak ada pembayaran.
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                {error}
              </div>
            )}

            {paymentDataError && !error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                {paymentDataError}
              </div>
            )}

            {/* Submit button */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
                disabled={submitting}
              >
                Tutup
              </Button>
              {!isPaid && methods.length > 0 && !methodsLoading && !paymentDataLoading && (
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
                      {paymentState === "PARTIAL" ? "Bayar Sisa Tagihan" : "Catat Pembayaran"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
