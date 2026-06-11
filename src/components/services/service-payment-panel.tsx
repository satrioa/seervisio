"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Coins,
  PiggyBank,
  CreditCard,
  Wallet,
  ArrowRight,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  type MockPaymentMethod,
  type MockPaymentAccount,
  MOCK_PAYMENT_METHODS,
  MOCK_PAYMENT_ACCOUNTS,
  formatCurrency,
  calculateServicePaymentSummary,
  getPaymentTypeLabel,
  getPaymentStatusLabel,
  getPaymentRecordTypeLabel,
  getDefaultPaymentAccountForMethod,
  generatePaymentId,
} from "@/components/services/service-data";

/* ── Props ── */

interface ServicePaymentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRecord;
  onPaymentComplete?: (payment: ServicePaymentRecord) => void;
}

/* ── Payment Panel ── */

export function ServicePaymentPanel({
  open,
  onOpenChange,
  service,
  onPaymentComplete,
}: ServicePaymentPanelProps) {
  const [paymentType, setPaymentType] = useState<ServicePaymentRecordType>("FINAL_PAYMENT");
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when panel opens
  useEffect(() => {
    if (open) {
      setPaymentType("FINAL_PAYMENT");
      setAmount("");
      setMethodId("");
      setAccountId("");
      setNote("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Get current payment records (from a store or passed in)
  // For the mock, we derive from the service's ServiceRecord
  const paymentRecords: ServicePaymentRecord[] = useMemo(() => {
    return (service as any).__paymentRecords ?? [];
  }, [service]);

  // Calculate payment summary
  const totalDue = useMemo(() => {
    const sparepartCost = service.spareparts.reduce(
      (sum, sp) => sum + sp.price * sp.qty, 0
    );
    return Math.max(sparepartCost, 100000);
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

  // Filter available accounts based on selected method
  const availableAccounts = useMemo(() => {
    if (!methodId) return MOCK_PAYMENT_ACCOUNTS.filter((a) => a.isActive);

    const selectedMethod = MOCK_PAYMENT_METHODS.find((m) => m.id === methodId);
    if (!selectedMethod) return MOCK_PAYMENT_ACCOUNTS.filter((a) => a.isActive);

    return MOCK_PAYMENT_ACCOUNTS.filter((a) => {
      if (!a.isActive) return false;
      if (selectedMethod.type === "CASH") return a.isCashAccount;
      if (selectedMethod.type === "QRIS") return a.type === "QRIS";
      if (selectedMethod.type === "TRANSFER") return a.type === "BANK" || a.type === "TRANSFER";
      if (selectedMethod.type === "DEBIT") return a.type === "DEBIT" || a.type === "BANK";
      if (selectedMethod.type === "CREDIT") return a.type === "DEBIT" || a.type === "BANK";
      return true;
    });
  }, [methodId]);

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
    if (!accountId) return "Pilih akun pembayaran";
    if (amountNum > remainingBalance && paymentType !== "PARTIAL_PAYMENT") {
      if (paymentType !== "DOWN_PAYMENT") {
        return "Jumlah melebihi sisa tagihan";
      }
    }
    return null;
  }, [amount, methodId, accountId, remainingBalance, paymentType]);

  const handleMethodChange = (newMethodId: string) => {
    setMethodId(newMethodId);
    const defaultAccount = getDefaultPaymentAccountForMethod(newMethodId);
    if (defaultAccount) {
      setAccountId(defaultAccount);
    }
  };

  const handleSubmit = async () => {
    if (validationError) return;

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

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const amountNum = parseInt(amount);
      const newPayment: ServicePaymentRecord = {
        id: generatePaymentId(),
        serviceId: service.id,
        paymentType,
        amount: amountNum,
        method: MOCK_PAYMENT_METHODS.find((m) => m.id === methodId)?.name ?? methodId,
        methodType: MOCK_PAYMENT_METHODS.find((m) => m.id === methodId)?.type ?? "",
        accountName: MOCK_PAYMENT_ACCOUNTS.find((a) => a.id === accountId)?.accountName ?? accountId,
        status: "SUCCEEDED",
        paidAt: new Date().toISOString(),
        note: note || undefined,
      };

      onPaymentComplete?.(newPayment);

      triggerDynamicIslandFeedback({
        type: "success",
        title: "Pembayaran berhasil",
        description: `${paymentTypeLabel} sebesar ${formatCurrency(amountNum)} berhasil dicatat.`,
        duration: 2200,
      });

      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (err) {
      const { triggerDynamicIslandFeedback } = await import(
        "@/lib/dynamic-island/dynamic-island-events"
      );
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Pembayaran gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        duration: 2500,
      });
      setError("Gagal memproses pembayaran. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const amountNum = parseInt(amount) || 0;
  const canSubmit = !validationError && !submitting;

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
            <Select value={methodId} onValueChange={handleMethodChange}>
              <SelectTrigger className="h-10 text-sm" id="pay-method">
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent className="z-[1001]">
                {MOCK_PAYMENT_METHODS.filter((m) => m.isActive).map((method) => (
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

          {/* Payment Account */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-account" className="text-xs font-medium">
              Akun Pembayaran
            </Label>
            <Select
              value={accountId}
              onValueChange={setAccountId}
              disabled={availableAccounts.length === 0}
            >
              <SelectTrigger className="h-10 text-sm" id="pay-account">
                <SelectValue placeholder="Pilih akun" />
              </SelectTrigger>
              <SelectContent className="z-[1001]">
                {availableAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id} className="text-sm">
                    {account.accountName}
                    {account.isCashAccount ? " (Tunai)" : ""}
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      Rp {account.currentBalance.toLocaleString("id-ID")}
                    </span>
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
        {validationError && !error && (
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
      </SheetContent>
    </Sheet>
  );
}
