"use client";

import * as React from "react";
import { Plus, Trash2, AlertTriangle, Wrench, Loader2 } from "lucide-react";

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@/components/ui/b-autocomplete";
import {
  useSparepartForServiceV4Action,
  searchServiceSparepartsV4Action,
  removeSparepartFromServiceV4Action,
} from "@/server/actions/inventory-v4.actions";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/components/services/service-data";
import type { SparepartItem } from "@/components/services/service-data";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import { type ServiceWorkflowStatus } from "@/domain/service/service-workflow";
import type { PurchaseVariantSearchRow } from "@/server/domain/inventory-v4.types";

const DEFAULT_ALLOWED_SPAREPART_STATUSES: ServiceWorkflowStatus[] = ["PERBAIKAN", "QC"];

interface ServiceSparepartSectionProps {
  serviceId: string;
  serviceNumber: string;
  branchId: string;
  spareparts: SparepartItem[];
  currentStatus: string;
  onSparepartAdded?: () => void;
  onSparepartRemoved?: () => void;
  brandSlug: string;
  allowedStatuses?: ServiceWorkflowStatus[];
}

interface SelectedSparepart {
  tempId: string;
  variantId: string;
  productId: string;
  displayName: string;
  variantName: string;
  qty: number;
  price: number;
  maxStock: number;
  unitName: string;
}

export function ServiceSparepartSection({
  serviceId,
  serviceNumber,
  branchId,
  spareparts,
  currentStatus,
  onSparepartAdded,
  onSparepartRemoved,
  brandSlug,
  allowedStatuses: allowedStatusesProp,
}: ServiceSparepartSectionProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<PurchaseVariantSearchRow[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<SelectedSparepart[]>([]);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [removingIds, setRemovingIds] = React.useState<Set<string>>(new Set());

  const workflowStatus = currentStatus.toUpperCase() as ServiceWorkflowStatus;
  const allowedStatuses = allowedStatusesProp ?? DEFAULT_ALLOWED_SPAREPART_STATUSES;
  const canAddSparepart = allowedStatuses.includes(workflowStatus);

  const selectedTotal = React.useMemo(
    () => selected.reduce((sum, s) => sum + s.price * s.qty, 0),
    [selected],
  );

  const reset = React.useCallback(() => {
    setSearch("");
    setSearchResults([]);
    setSelected([]);
    setNotes("");
    setError(null);
    setExpanded(false);
    setIsSubmitting(false);
  }, []);

  const searchV4 = React.useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchServiceSparepartsV4Action(brandSlug, branchId, q.trim());
      if (res.success) {
        const addedVariantIds = new Set(selected.map((s) => s.variantId));
        setSearchResults(res.data.filter((r) => !addedVariantIds.has(r.variantId)));
      }
    } catch (err: any) {
      console.error("[service-sparepart-v4/search] error:", err);
    }
    setSearching(false);
  }, [brandSlug, branchId, selected]);

  const handleValueChange = React.useCallback((nextValue: string) => {
    setSearch(nextValue);
    searchV4(nextValue);
  }, [searchV4]);

  const handleOpenChange = React.useCallback((_open: boolean, details: { reason?: string }) => {
    if (!_open) {
      if (details?.reason === "item-press") {
        setSearch("");
      }
      setSearchResults([]);
    }
  }, []);

  const addItem = React.useCallback((item: PurchaseVariantSearchRow) => {
    const displayName = item.variantName
      ? `${item.productName} - ${item.variantName}`
      : item.productName;
    const newItem: SelectedSparepart = {
      tempId: Math.random().toString(36).slice(2),
      variantId: item.variantId,
      productId: item.productId,
      displayName,
      variantName: item.variantName ?? "",
      qty: 1,
      price: item.sellingPrice,
      maxStock: Math.max(1, item.stockAvailable),
      unitName: item.unit,
    };
    setSelected((prev) => [...prev, newItem]);
    setSearch("");
    setSearchResults([]);
    setError(null);
  }, []);

  const handleQtyChange = React.useCallback((tempId: string, delta: number) => {
    setSelected((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const next = s.qty + delta;
        if (next < 1 || next > s.maxStock) return s;
        return { ...s, qty: next };
      }),
    );
  }, []);

  const handleRemoveSelected = React.useCallback((tempId: string) => {
    setSelected((prev) => prev.filter((s) => s.tempId !== tempId));
  }, []);

  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(new Set());

  const handleRemoveSaved = React.useCallback(async (part: SparepartItem) => {
    setHiddenIds((prev) => new Set(prev).add(part.id));
    setRemovingIds((prev) => new Set(prev).add(part.id));

    triggerDynamicIslandFeedback({
      type: "loading",
      title: "Mengembalikan sparepart",
      description: "Memproses pengembalian sparepart...",
    });

    try {
      const result = await removeSparepartFromServiceV4Action(brandSlug, {
        branchId,
        serviceId,
        usageId: part.id,
      });

      if (result.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: "Sparepart dikembalikan",
          description: "Stok sparepart telah dikembalikan.",
          duration: 1800,
        });
        onSparepartRemoved?.();
      } else {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(part.id);
          return next;
        });
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Gagal",
          description: result.error,
          duration: 2400,
        });
      }
    } catch (err: any) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(part.id);
        return next;
      });
      const msg = err?.message ?? "Gagal mengembalikan sparepart.";
      console.error("[service-sparepart] remove failed", { serviceId, branchId, partId: part.id, error: msg });
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Gagal",
        description: msg,
        duration: 2400,
      });
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(part.id);
        return next;
      });
    }
  }, [brandSlug, branchId, serviceId, onSparepartRemoved]);

  const handleSubmit = React.useCallback(async () => {
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
      const result = await useSparepartForServiceV4Action(brandSlug, {
        serviceId,
        branchId,
        items: selected.map((s) => ({
          variantId: s.variantId,
          quantity: s.qty,
        })),
        notes: notes || null,
      });

      if (result.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: "Sparepart berhasil ditambahkan",
          description: "Stok dan riwayat servis diperbarui.",
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
      console.error("[service-sparepart] add failed", { serviceId, branchId, error: msg });
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
  }, [selected, notes, brandSlug, serviceId, branchId, reset, onSparepartAdded]);

  const showPopup = search.trim().length >= 2;

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Wrench className="size-3" />
        Sparepart Digunakan
      </h3>

      {spareparts.filter((p) => !hiddenIds.has(p.id ?? "")).length > 0 ? (
        <div className="space-y-2">
          {spareparts.filter((p) => !hiddenIds.has(p.id ?? "")).map((part, index) => (
            <div
              key={part.id ?? `${part.name}-${index}`}
              className="flex items-center justify-between rounded-xl border bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{part.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {part.qty}x @ {formatCurrency(part.price)}
                  {part.imeiSnapshot && ` · IMEI: ${part.imeiSnapshot}`}
                  {part.batteryHealthSnapshot != null && ` · BH: ${part.batteryHealthSnapshot}%`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <p className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                  {formatCurrency(part.price * part.qty)}
                </p>
                {canAddSparepart && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveSaved(part)}
                    disabled={removingIds.has(part.id ?? "")}
                    title="Kembalikan sparepart"
                  >
                    {removingIds.has(part.id ?? "") ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {hiddenIds.size > 0 && spareparts.length > 0
            ? "Menghapus sparepart..."
            : "Belum ada sparepart digunakan."}
        </p>
      )}

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

      {expanded && (
        <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
          <h4 className="text-xs font-semibold text-foreground">Tambah Sparepart</h4>

          <Autocomplete<PurchaseVariantSearchRow>
            mode="none"
            value={search}
            onValueChange={handleValueChange}
            items={searchResults}
            open={showPopup}
            onOpenChange={handleOpenChange}
          >
            <AutocompleteInput
              placeholder="Cari sparepart atau scan barcode..."
              showClear
              className="h-9 text-xs"
            />
            <AutocompleteContent>
              <AutocompleteList>
                {searching ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                    <div className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    Mencari...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Tidak ada sparepart tersedia.
                    <br />
                    <span className="text-[10px]">
                      Pastikan sparepart sudah dibuat, memiliki varian aktif, dan stok tersedia di cabang servis.
                    </span>
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const displayName = item.variantName
                      ? `${item.productName} - ${item.variantName}`
                      : item.productName;
                    const isOutOfStock = item.stockAvailable <= 0;
                    return (
                      <AutocompleteItem
                        key={item.variantId}
                        value={item}
                        onClick={() => {
                          if (!isOutOfStock) addItem(item);
                        }}
                        description={
                          <>
                            Stok: {item.stockAvailable} {item.unit}
                            {item.sellingPrice > 0 && ` · ${formatCurrency(item.sellingPrice)}`}
                            {isOutOfStock && " · Habis"}
                          </>
                        }
                      >
                        <span className={isOutOfStock ? "opacity-50" : ""}>
                          {displayName}
                        </span>
                      </AutocompleteItem>
                    );
                  })
                )}
              </AutocompleteList>
            </AutocompleteContent>
          </Autocomplete>

          {selected.length > 0 && (
            <div className="space-y-1.5">
              {selected.map((s) => (
                <div
                  key={s.tempId}
                  className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{s.displayName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      @ {formatCurrency(s.price)}
                      {` · Stok: ${s.maxStock} ${s.unitName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={s.qty <= 1}
                        onClick={() => handleQtyChange(s.tempId, -1)}
                      >
                        <Plus className="size-3 rotate-45" />
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
                        onClick={() => handleQtyChange(s.tempId, 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <span className="text-xs font-medium tabular-nums text-foreground">
                      {formatCurrency(s.price * s.qty)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveSelected(s.tempId)}
                      title="Hapus"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <span className="text-xs font-medium text-foreground">Total:</span>
                <span className="text-xs font-semibold tabular-nums">
                  {formatCurrency(selectedTotal)}
                </span>
              </div>
            </div>
          )}

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

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
