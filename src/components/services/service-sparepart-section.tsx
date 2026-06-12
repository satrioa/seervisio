"use client";

import * as React from "react";
import { Plus, X, Search, Minus, AlertTriangle, Wrench } from "lucide-react";

import { addServiceSparepartAction } from "@/server/actions/service-workflow.actions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/components/services/service-data";
import type { SparepartItem } from "@/components/services/service-data";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import { type ServiceWorkflowStatus } from "@/domain/service/service-workflow";

/* ─── Mock inventory ─── */
interface MockInventoryItem {
  id: string;
  name: string;
  stock: number;
  price: number;
}

const INITIAL_INVENTORY: MockInventoryItem[] = [
  { id: "inv-1", name: "Battery iPhone 11", stock: 4, price: 350000 },
  { id: "inv-2", name: "LCD Samsung Galaxy S22", stock: 2, price: 1250000 },
  { id: "inv-3", name: "Flexible Charger iPhone 12", stock: 6, price: 180000 },
  { id: "inv-4", name: "Speaker iPhone XR", stock: 3, price: 220000 },
  { id: "inv-5", name: "Kamera Belakang iPhone 12", stock: 0, price: 780000 },
  { id: "inv-6", name: "SSD NVMe 512GB", stock: 5, price: 650000 },
  { id: "inv-7", name: "LCD iPhone 11 Pro", stock: 1, price: 980000 },
  { id: "inv-8", name: "Battery Samsung S22", stock: 3, price: 295000 },
];

/* ─── Status gating ─── */
const ALLOWED_SPAREPART_STATUSES: ServiceWorkflowStatus[] = ["PERBAIKAN", "QC"];

/* ─── Props ─── */
interface ServiceSparepartSectionProps {
  serviceId: string;
  serviceNumber: string;
  spareparts: SparepartItem[];
  currentStatus: string;
  onSparepartAdded?: () => void;
  onSparepartRemoved?: () => void;
  brandSlug: string;
}

/* ─── Selected item tracked during editing ─── */
interface SelectedSparepart {
  inventoryId: string;
  name: string;
  qty: number;
  price: number;
  maxStock: number;
}

/* ─── Component ─── */
export function ServiceSparepartSection({
  serviceId,
  serviceNumber,
  spareparts,
  currentStatus,
  onSparepartAdded,
  onSparepartRemoved,
  brandSlug,
}: ServiceSparepartSectionProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<SelectedSparepart[]>([]);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  /* Mutable inventory — stock tracks adds/removes within session */
  const [inventory, setInventory] = React.useState<MockInventoryItem[]>(INITIAL_INVENTORY);

  /* Derive allowed status */
  const workflowStatus = currentStatus.toUpperCase() as ServiceWorkflowStatus;
  const canAddSparepart = ALLOWED_SPAREPART_STATUSES.includes(workflowStatus);

  /* Filtered suggestions from current inventory */
  const suggestions = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? inventory.filter(
          (item) =>
            item.name.toLowerCase().includes(q) &&
            !selected.some((s) => s.inventoryId === item.id)
        )
      : [];
  }, [search, selected, inventory]);

  /* Total for selected items */
  const selectedTotal = React.useMemo(
    () => selected.reduce((sum, s) => sum + s.price * s.qty, 0),
    [selected]
  );

  /* Reset form */
  const reset = React.useCallback(() => {
    setSearch("");
    setSelected([]);
    setNotes("");
    setError(null);
    setExpanded(false);
    setIsSubmitting(false);
  }, []);

  /* Add item from inventory to selected */
  const handleAddItem = (item: MockInventoryItem) => {
    if (item.stock <= 0) return;
    if (selected.some((s) => s.inventoryId === item.id)) return;
    setSelected((prev) => [
      ...prev,
      {
        inventoryId: item.id,
        name: item.name,
        qty: 1,
        price: item.price,
        maxStock: item.stock,
      },
    ]);
    setSearch("");
    setError(null);
  };

  /* Update qty */
  const handleQtyChange = (id: string, delta: number) => {
    setSelected((prev) =>
      prev.map((s) => {
        if (s.inventoryId !== id) return s;
        const next = s.qty + delta;
        if (next < 1 || next > s.maxStock) return s;
        return { ...s, qty: next };
      })
    );
  };

  /* Remove item from selection list (within the add panel) */
  const handleRemoveSelected = (id: string) => {
    setSelected((prev) => prev.filter((s) => s.inventoryId !== id));
  };

  /* ─── Remove sparepart from the active list & return to stock ─── */
  const handleRemoveSparepart = (part: SparepartItem, index: number) => {
    /* Try to match by name to return stock */
    const match = inventory.find(
      (inv) => inv.name.toLowerCase() === part.name.toLowerCase()
    );

    if (match) {
      setInventory((prev) =>
        prev.map((inv) =>
          inv.id === match.id
            ? { ...inv, stock: inv.stock + part.qty }
            : inv
        )
      );
    }

    /* Remove from parent state */
    onSparepartRemoved?.();

    triggerDynamicIslandFeedback({
      type: "info",
      title: "Sparepart dihapus",
      description: match
        ? part.name + " (" + part.qty + "x) dikembalikan ke stok."
        : part.name + " dihapus dari daftar.",
      duration: 1800,
    });
  };

  /* Submit */
  const handleSubmit = async () => {
    if (selected.length === 0) {
      setError("Pilih minimal satu sparepart.");
      return;
    }

    setIsSubmitting(true);
    triggerDynamicIslandFeedback({
      type: "loading",
      title: "Menambahkan sparepart",
      description: "Memproses penggunaan sparepart...",
    });

    try {
      const input = {
        brandSlug,
        serviceId,
        items: selected.map((s) => ({
          inventoryItemId: s.inventoryId,
          quantity: s.qty,
          sellingPrice: s.price,
        })),
        note: notes || undefined,
      };

      const result = await addServiceSparepartAction(input);

      if (result.success) {
        /* Decrement stock in local inventory */
        setInventory((prev) =>
          prev.map((inv) => {
            const sel = selected.find((s) => s.inventoryId === inv.id);
            if (sel) {
              return { ...inv, stock: Math.max(0, inv.stock - sel.qty) };
            }
            return inv;
          })
        );

        triggerDynamicIslandFeedback({
          type: "success",
          title: "Sparepart berhasil ditambahkan",
          description: "Stok dan rincian servis diperbarui.",
          duration: 1800,
        });

        reset();
        onSparepartAdded?.();
      } else {
        setError(result.error);
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Gagal",
          description: result.error,
          duration: 2400,
        });
      }
    } catch (err: any) {
      const msg = err?.message ?? "Gagal menambahkan sparepart.";
      setError(msg);
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Gagal",
        description: msg,
        duration: 2400,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Wrench className="size-3" />
        Sparepart Digunakan
      </h3>

      {/* ─── Current sparepart list ─── */}
      {spareparts.length > 0 ? (
        <div className="space-y-2">
          {spareparts.map((part, index) => (
            <div
              key={part.name + "-" + index}
              className="flex items-center justify-between rounded-xl border bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {part.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {part.qty}x @ {formatCurrency(part.price)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                  {formatCurrency(part.price * part.qty)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveSparepart(part, index)}
                >
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada sparepart digunakan.</p>
      )}

      {/* ─── Tambah Sparepart button ─── */}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 text-xs"
        onClick={() => setExpanded((prev) => !prev)}
        disabled={!canAddSparepart}
      >
        <Plus className="size-3" />
        {expanded ? "Tutup Form Sparepart" : "Tambah Sparepart"}
      </Button>

      {!canAddSparepart && (
        <p className="text-[10px] text-muted-foreground">
          Sparepart hanya bisa ditambahkan saat status Perbaikan atau QC.
        </p>
      )}

      {/* ─── Inline expandable panel ─── */}
      {expanded && (
        <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
          <h4 className="text-xs font-semibold text-foreground">Tambah Sparepart</h4>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari sparepart..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-lg border bg-background p-1.5">
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Stok: {item.stock} &middot; {formatCurrency(item.price)}
                    </p>
                  </div>
                  {item.stock > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleAddItem(item)}
                    >
                      Tambah
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-[9px]">
                      Habis
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Selected items */}
          {selected.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <p className="text-[10px] font-medium text-muted-foreground">Sparepart dipilih:</p>
              {selected.map((s) => (
                <div
                  key={s.inventoryId}
                  className="rounded-lg border bg-background px-3 py-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Stok tersedia: {s.maxStock}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveSelected(s.inventoryId)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={s.qty <= 1}
                        onClick={() => handleQtyChange(s.inventoryId, -1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-6 text-center text-xs font-medium tabular-nums">
                        {s.qty}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={s.qty >= s.maxStock}
                        onClick={() => handleQtyChange(s.inventoryId, 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <span className="text-xs font-medium tabular-nums">
                      {formatCurrency(s.price * s.qty)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <span className="text-xs font-medium text-foreground">
                  Total sparepart:
                </span>
                <span className="text-xs font-semibold tabular-nums">
                  {formatCurrency(selectedTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="sparepart-notes" className="text-[10px] text-muted-foreground">
              Catatan
            </Label>
            <Textarea
              id="sparepart-notes"
              placeholder="Catatan penggunaan sparepart..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-16 text-xs"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={reset}
            >
              Batalkan
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={selected.length === 0 || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Memproses..." : "Tambahkan Sparepart"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
