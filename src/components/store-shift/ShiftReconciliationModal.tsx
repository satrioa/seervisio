"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { AlertTriangle, Clock, Loader2, RotateCcw } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { reconcileShiftAction } from "@/server/actions/store-shift.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import type { StoreShift } from "@/types/app";

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ShiftReconciliationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  shift: StoreShift | null;
  onSuccess?: () => void;
}

export function ShiftReconciliationModal({
  open,
  onOpenChange,
  brandSlug,
  shift,
  onSuccess,
}: ShiftReconciliationModalProps) {
  const [actualCash, setActualCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expected = shift?.expectedClosingCash ?? 0;
  const actualNum = Number(actualCash.replace(/[^0-9]/g, "")) || 0;
  const diff = actualNum - expected;

  const diffLabel =
    diff > 0 ? "Selisih lebih" : diff < 0 ? "Selisih kurang" : "Sesuai";
  const diffColor =
    diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground";

  const handleClose = useCallback(() => {
    if (submitting) return;
    setActualCash("");
    setClosingNotes("");
    setError(null);
    onOpenChange(false);
  }, [submitting, onOpenChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) return;
    setError(null);

    if (isNaN(actualNum) || actualNum < 0) {
      setError("Jumlah kas fisik harus berupa angka dan tidak boleh negatif.");
      return;
    }

    if (diff !== 0 && !closingNotes.trim()) {
      setError("Catatan diperlukan jika terdapat selisih kas.");
      return;
    }

    setSubmitting(true);
    const result = await reconcileShiftAction(
      brandSlug,
      shift.id,
      actualNum,
      closingNotes || null,
    );
    setSubmitting(false);

    if (result.success) {
      triggerDynamicIslandFeedback({
        type: "success",
        title: "Rekonsiliasi berhasil",
        duration: 2500,
      });
      window.dispatchEvent(new CustomEvent("seervis:shift-changed"));
      setActualCash("");
      setClosingNotes("");
      setError(null);
      onOpenChange(false);
      onSuccess?.();
    } else {
      setError(result.error);
    }
  };

  const actualDisplay = actualCash
    ? actualNum.toLocaleString("id-ID")
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting && !o) handleClose(); }}>
      <DialogContent className="sm:max-w-[440px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="size-5 text-amber-500" />
            Rekonsiliasi Shift
          </DialogTitle>
          <DialogDescription className="text-xs">
            Shift sebelumnya ditutup otomatis oleh sistem. Hitung kas fisik dan masukkan jumlahnya untuk melanjutkan.
          </DialogDescription>
        </DialogHeader>

        {shift && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-start gap-2 text-xs">
              <Clock className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-amber-800 dark:text-amber-300">
                  {shift.shiftNumber}
                </span>
                <span className="text-amber-700/80 dark:text-amber-400/70">
                  Ditutup otomatis pada {formatDateTime(shift.closedAt)}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kas yang Diharapkan (Expected Cash)</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
              {formatCurrency(expected)}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reconcile-actual-cash">
              Kas Fisik (Actual Cash) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                id="reconcile-actual-cash"
                placeholder="0"
                value={actualDisplay}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, "");
                  setActualCash(cleaned);
                }}
                className="pl-9"
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          {(actualNum > 0 || actualCash) && (
            <div className="space-y-1.5">
              <Label>Selisih</Label>
              <div className={`rounded-md border px-3 py-2 text-sm font-medium ${diffColor}`}>
                {diffLabel}: {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
              </div>
            </div>
          )}

          {(diff !== 0 || closingNotes) && (
            <div className="space-y-1.5">
              <Label htmlFor="reconcile-notes">
                Catatan {diff !== 0 && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="reconcile-notes"
                placeholder="Jelaskan alasan selisih kas..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                rows={2}
                disabled={submitting}
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="submit" size="sm" className="gap-2 w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Merekonsiliasi...
                </>
              ) : (
                <>
                  <RotateCcw className="size-3.5" />
                  Rekonsiliasi & Lanjut Buka Shift
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
