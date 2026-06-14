"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

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
import { closeStoreShiftAction } from "@/server/actions/store-shift.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

interface StoreShiftCloseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  shiftId: string;
  expectedCash: number | null;
  onSuccess?: () => void;
}

export function StoreShiftCloseModal({
  open,
  onOpenChange,
  brandSlug,
  shiftId,
  expectedCash,
  onSuccess,
}: StoreShiftCloseModalProps) {
  const [actualCash, setActualCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expected = expectedCash ?? 0;
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
    const result = await closeStoreShiftAction(brandSlug, shiftId, actualNum, closingNotes || null);
    setSubmitting(false);

    if (result.success) {
      triggerDynamicIslandFeedback({
        type: "success",
        title: "Shift berhasil diakhiri",
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
    <Dialog open={open} onOpenChange={(open) => { if (!submitting) handleClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <X className="size-5" />
            Akhiri Shift
          </DialogTitle>
          <DialogDescription className="text-xs">
            Hitung kas fisik dan masukkan jumlahnya untuk mengakhiri shift.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kas yang Diharapkan (Expected Cash)</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
              {formatCurrency(expected)}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="close-actual-cash">Kas Fisik (Actual Cash)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                id="close-actual-cash"
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
              <Label htmlFor="close-closing-notes">
                Catatan {diff !== 0 && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="close-closing-notes"
                placeholder="Catatan penutupan shift..."
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
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" size="sm" variant="destructive" className="gap-2" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Mengakhiri Shift...
                </>
              ) : (
                <>
                  <X className="size-3.5" />
                  Akhiri Shift
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
