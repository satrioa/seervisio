"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BarcodeSearchInput } from "@/components/inventory/barcode-search-input";
import {
  createStockPurchaseAction,
  getPaymentAccountsForPurchaseAction,
  listInventoryItemsAction,
  type InventoryItemRow,
} from "@/server/actions/inventory.actions";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { Loader2, Package, Plus, Trash2, ShoppingCart } from "lucide-react";

interface LineItem {
  tempId: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  unitName: string;
  quantity: string;
  unitCost: string;
  subtotal: number;
}

interface PurchaseFormDialogProps {
  open: boolean;
  onOpenChange: () => void;
  onSuccess?: () => void;
}

export function PurchaseFormDialog({ open, onOpenChange, onSuccess }: PurchaseFormDialogProps) {
  const { activeBranchId, branches } = useActiveBranch();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [branchId, setBranchId] = React.useState(activeBranchId ?? branches[0]?.id ?? "");
  const [supplierName, setSupplierName] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [paymentAccountId, setPaymentAccountId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);
  const [paymentAccounts, setPaymentAccounts] = React.useState<{ id: string; name: string; balance: number }[]>([]);

  // Search state for item addition
  const [searchValue, setSearchValue] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<InventoryItemRow[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setBranchId(activeBranchId ?? branches[0]?.id ?? "");
      setSupplierName("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setPaymentAccountId("");
      setNotes("");
      setLineItems([]);
      setSearchValue("");
      setSearchResults([]);
      setError(null);
    }
  }, [open, activeBranchId, branches]);

  React.useEffect(() => {
    if (!open || !branchId) return;
    const brandSlug = window.location.pathname.split("/")[1];
    getPaymentAccountsForPurchaseAction(brandSlug, branchId).then((res) => {
      if (res.success) setPaymentAccounts(res.data);
    });
  }, [open, branchId]);

  const handleSearch = async (q: string) => {
    setSearchValue(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const brandSlug = window.location.pathname.split("/")[1];
    const res = await listInventoryItemsAction(brandSlug, {
      search: q.trim(),
      branchId,
      pageSize: 8,
    });
    if (res.success) {
      // Filter out already-added items
      const addedIds = new Set(lineItems.map((li) => li.itemId));
      setSearchResults(res.data.items.filter((i) => !addedIds.has(i.id)));
    }
    setSearching(false);
  };

  const addItem = (item: InventoryItemRow) => {
    const newItem: LineItem = {
      tempId: Math.random().toString(36).slice(2),
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku ?? "",
      unitName: item.unitName,
      quantity: "1",
      unitCost: String(item.costPrice || 0),
      subtotal: item.costPrice || 0,
    };
    setLineItems((prev) => [...prev, newItem]);
    setSearchValue("");
    setSearchResults([]);
  };

  const removeItem = (tempId: string) => {
    setLineItems((prev) => prev.filter((li) => li.tempId !== tempId));
  };

  const updateLineItem = (tempId: string, field: "quantity" | "unitCost", value: string) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.tempId !== tempId) return li;
        const updated = { ...li, [field]: value };
        updated.subtotal = (Number(updated.quantity) || 0) * (Number(updated.unitCost) || 0);
        return updated;
      }),
    );
  };

  const totalAmount = lineItems.reduce((sum, li) => sum + li.subtotal, 0);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    if (!branchId) {
      setError("Cabang wajib dipilih");
      setSaving(false);
      return;
    }
    if (!paymentAccountId) {
      setError("Akun pembayaran wajib dipilih");
      setSaving(false);
      return;
    }
    if (lineItems.length === 0) {
      setError("Minimal 1 item harus ditambahkan");
      setSaving(false);
      return;
    }

    const brandSlug = window.location.pathname.split("/")[1];
    const { triggerDynamicIslandFeedback } = await import("@/lib/dynamic-island/dynamic-island-events");

    triggerDynamicIslandFeedback({ type: "loading", title: "Memproses Belanja Stok", description: "Mencatat pembelian dan memperbarui stok..." });

    const res = await createStockPurchaseAction(brandSlug, {
      branchId,
      supplierName: supplierName.trim() || undefined,
      paymentAccountId,
      purchaseDate,
      notes: notes.trim() || undefined,
      items: lineItems.map((li) => ({
        itemId: li.itemId,
        quantity: Number(li.quantity),
        unitCost: Number(li.unitCost),
      })),
    });

    if (res.success) {
      const purchaseNumber = res.data?.purchaseNumber;
      triggerDynamicIslandFeedback({
        type: "success",
        title: "Belanja stok berhasil",
        description: purchaseNumber ? `${purchaseNumber} berhasil dicatat` : "Belanja stok berhasil dicatat",
        duration: 2200,
      });
      onSuccess?.();
      onOpenChange();
    } else {
      triggerDynamicIslandFeedback({ type: "error", title: "Gagal mencatat belanja stok", description: res.error, duration: 2500 });
      setError(res.error);
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingCart className="size-4" />
            Belanja Stok Baru
          </DialogTitle>
          <DialogDescription className="text-xs">
            Buat purchase order untuk menambah stok inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>
          )}

          {/* Branch + Date */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Supplier + Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Supplier</Label>
              <Input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="h-9 text-xs"
                placeholder="Nama supplier (opsional)"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Akun Pembayaran *</Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih akun" />
                </SelectTrigger>
                <SelectContent>
                  {paymentAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name} (Rp {a.balance.toLocaleString("id-ID")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[50px] text-xs"
              placeholder="Catatan pembelian (opsional)"
            />
          </div>

          <Separator />

          {/* Item Search */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tambah Item</Label>
            <div className="relative">
              <BarcodeSearchInput
                value={searchValue}
                onChange={handleSearch}
                placeholder="Cari item atau scan barcode"
              />
            </div>

            {searchValue.trim().length >= 2 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border">
                {searching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Item tidak ditemukan. Buat item baru?
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className="flex w-full cursor-pointer items-center gap-2 border-b px-3 py-2 text-left text-xs transition-colors last:border-0 hover:bg-muted/50"
                      onClick={() => addItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          addItem(item);
                        }
                      }}
                    >
                      <Package className="size-3.5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{item.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {item.sku && `SKU: ${item.sku}`}
                          {item.sku && item.barcode && " · "}
                          {item.barcode && item.barcode}
                          {(!item.sku && !item.barcode) && `Stok: ${item.currentStock} ${item.unitName}`}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0">
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Item ({lineItems.length})</Label>
              <div className="rounded-lg border divide-y">
                {lineItems.map((li) => (
                  <div key={li.tempId} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{li.itemName}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{li.itemSku || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={li.quantity}
                        onChange={(e) => updateLineItem(li.tempId, "quantity", e.target.value)}
                        className="h-8 w-16 text-xs text-center"
                      />
                      <span className="text-[10px] text-muted-foreground w-8">{li.unitName}</span>
                      <Input
                        type="number"
                        min={0}
                        value={li.unitCost}
                        onChange={(e) => updateLineItem(li.tempId, "unitCost", e.target.value)}
                        className="h-8 w-24 text-xs text-right"
                      />
                      <span className="w-20 text-right text-xs tabular-nums font-medium text-foreground">
                        Rp {(li.subtotal).toLocaleString("id-ID")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-destructive"
                        onClick={() => removeItem(li.tempId)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-foreground">Total</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  Rp {totalAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => onOpenChange()} disabled={saving}>
            Batal
          </Button>
          <Button size="sm" className="h-9 text-xs" onClick={handleSave} disabled={saving || lineItems.length === 0}>
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {saving ? "Menyimpan..." : "Simpan Belanja Stok"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
