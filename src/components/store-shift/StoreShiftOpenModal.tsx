"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Store, AlertTriangle, Loader2 } from "lucide-react";

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
import { openStoreShiftAction } from "@/server/actions/store-shift.actions";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

interface StoreShiftOpenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  branchId: string;
  branchName?: string;
  previousClosingCash?: number | null;
  onSuccess?: () => void;
}

export function StoreShiftOpenModal({
  open,
  onOpenChange,
  brandSlug,
  branchId,
  branchName,
  previousClosingCash,
  onSuccess,
}: StoreShiftOpenModalProps) {
  const [openingCash, setOpeningCash] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setOpeningCash("");
    setOpeningNotes("");
    setError(null);
    onOpenChange(false);
  }, [submitting, onOpenChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cashAmount = Number(openingCash.replace(/[^0-9]/g, ""));
    if (!openingCash.trim() || isNaN(cashAmount) || cashAmount < 0) {
      setError("Saldo kas awal harus diisi dan tidak boleh negatif.");
      return;
    }

    if (
      previousClosingCash != null &&
      cashAmount !== previousClosingCash &&
      !openingNotes.trim()
    ) {
      setError("Saldo awal berbeda dari saldo tutup terakhir. Tambahkan catatan.");
      return;
    }

    setSubmitting(true);
    const result = await openStoreShiftAction(brandSlug, branchId, cashAmount, openingNotes || null);
    setSubmitting(false);

    if (result.success) {
      triggerDynamicIslandFeedback({
        type: "success",
        title: "Shift berhasil dibuka",
        description: branchName ? `Cabang ${branchName}` : undefined,
        duration: 2500,
      });
      window.dispatchEvent(new CustomEvent("seervis:shift-changed"));
      setOpeningCash("");
      setOpeningNotes("");
      setError(null);
      onOpenChange(false);
      onSuccess?.();
    } else {
      setError(result.error);
    }
  };

  const cashDisplay = openingCash
    ? Number(openingCash.replace(/[^0-9]/g, "")).toLocaleString("id-ID")
    : "";

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!submitting) handleClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Store className="size-5" />
            Buka Shift {branchName ? `- ${branchName}` : ""}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Masukkan saldo kas awal untuk memulai shift.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="modal-opening-cash">Saldo Kas Awal</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                id="modal-opening-cash"
                placeholder="0"
                value={cashDisplay}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, "");
                  setOpeningCash(cleaned);
                }}
                className="pl-9"
                disabled={submitting}
                autoFocus
              />
            </div>
          </div>

          {previousClosingCash != null && (
            <p className="text-xs text-muted-foreground">
              Saldo tutup terakhir: Rp {previousClosingCash.toLocaleString("id-ID")}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="modal-opening-notes">Catatan (opsional)</Label>
            <Textarea
              id="modal-opening-notes"
              placeholder="Catatan pembukaan shift..."
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              rows={2}
              disabled={submitting}
            />
          </div>

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
            <Button type="submit" size="sm" className="gap-2" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Membuka Shift...
                </>
              ) : (
                <>
                  <Store className="size-3.5" />
                  Buka Shift
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
