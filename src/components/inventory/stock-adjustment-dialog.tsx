"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BarcodeSearchInput } from "@/components/inventory/barcode-search-input";
import { adjustInventoryStockAction, listInventoryItemsAction, type InventoryItemRow } from "@/server/actions/inventory.actions";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { Loader2, Package, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: () => void;
  onSuccess?: () => void;
}

export function StockAdjustmentDialog({ open, onOpenChange, onSuccess }: StockAdjustmentDialogProps) {
  const { activeBranchId, branches } = useActiveBranch();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<"search" | "confirm">("search");

  const [branchId, setBranchId] = React.useState(activeBranchId ?? branches[0]?.id ?? "");
  const [search, setSearch] = React.useState("");
  const [selectedItem, setSelectedItem] = React.useState<InventoryItemRow | null>(null);
  const [direction, setDirection] = React.useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = React.useState("1");
  const [reason, setReason] = React.useState("");
  const [currentStock, setCurrentStock] = React.useState(0);

  React.useEffect(() => {
    if (!open) {
      setStep("search");
      setSearch("");
      setSelectedItem(null);
      setDirection("IN");
      setQuantity("1");
      setReason("");
      setError(null);
      setBranchId(activeBranchId ?? branches[0]?.id ?? "");
    }
  }, [open, activeBranchId, branches]);

  const handleSelectItem = async (item: InventoryItemRow) => {
    setSelectedItem(item);
    setCurrentStock(item.currentStock);
    setStep("confirm");
  };

  const handleBarcodeLookup = async (code: string) => {
    const brandSlug = window.location.pathname.split("/")[1];
    const res = await listInventoryItemsAction(brandSlug, {
      search: code,
      branchId,
      pageSize: 1,
    });
    if (res.success && res.data.items.length > 0) {
      handleSelectItem(res.data.items[0]);
    } else {
      setError("Item tidak ditemukan. Gunakan pencarian manual.");
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setSaving(true);
    setError(null);

    const qty = Number(quantity);
    if (qty <= 0) {
      setError("Jumlah harus lebih dari 0");
      setSaving(false);
      return;
    }
    if (!reason.trim()) {
      setError("Alasan penyesuaian wajib diisi");
      setSaving(false);
      return;
    }
    if (!branchId) {
      setError("Cabang wajib dipilih");
      setSaving(false);
      return;
    }
    if (direction === "OUT" && qty > currentStock) {
      setError(`Stok tidak mencukupi. Stok saat ini: ${currentStock}`);
      setSaving(false);
      return;
    }

    const brandSlug = window.location.pathname.split("/")[1];
    const res = await adjustInventoryStockAction(brandSlug, {
      itemId: selectedItem.id,
      branchId,
      direction,
      quantity: qty,
      reason: reason.trim(),
    });

    if (res.success) {
      onSuccess?.();
      onOpenChange();
    } else {
      setError(res.error);
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            {direction === "IN" ? <ArrowUpCircle className="size-4 text-emerald-500" /> : <ArrowDownCircle className="size-4 text-destructive" />}
            Penyesuaian Stok
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === "search" ? "Cari item yang akan disesuaikan." : "Konfirmasi penyesuaian stok."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>
          )}

          {/* Branch */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Cabang</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {step === "search" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cari Item</Label>
                <BarcodeSearchInput
                  value={search}
                  onChange={setSearch}
                  onLookup={handleBarcodeLookup}
                  placeholder="Cari nama, SKU, atau scan barcode"
                />
              </div>

              {/* Recent items quick pick could go here */}
              {selectedItem && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-primary" />
                    <div>
                      <p className="text-xs font-medium">{selectedItem.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Stok: {selectedItem.currentStock} {selectedItem.unitName}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto h-7 text-xs"
                      onClick={() => handleSelectItem(selectedItem)}
                    >
                      Pilih
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {step === "confirm" && selectedItem && (
            <>
              {/* Selected item info */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Package className="size-5 text-primary" />
                  <div>
                    <p className="text-xs font-medium">{selectedItem.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedItem.sku && `SKU: ${selectedItem.sku}`}
                      {selectedItem.sku && selectedItem.barcode && " · "}
                      {selectedItem.barcode && `${selectedItem.barcode}`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Stok saat ini</span>
                  <span className="font-semibold tabular-nums">{currentStock} {selectedItem.unitName}</span>
                </div>
              </div>

              {/* Direction */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Arah Penyesuaian</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={direction === "IN" ? "default" : "outline"}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => setDirection("IN")}
                  >
                    <ArrowUpCircle className="mr-1.5 size-3.5" /> Tambah Stok
                  </Button>
                  <Button
                    type="button"
                    variant={direction === "OUT" ? "destructive" : "outline"}
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => setDirection("OUT")}
                  >
                    <ArrowDownCircle className="mr-1.5 size-3.5" /> Kurangi Stok
                  </Button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Jumlah</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Alasan *</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[60px] text-xs"
                  placeholder="Contoh: Rusak saat pengiriman, stok opname, dll."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setStep("search")} disabled={saving}>
                  Kembali
                </Button>
                <Button
                  size="sm"
                  className="h-9 text-xs"
                  onClick={handleSave}
                  disabled={saving || !reason.trim() || Number(quantity) <= 0}
                >
                  {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Simpan Penyesuaian
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
