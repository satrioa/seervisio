"use client";

import * as React from "react";
import { Plus, X, AlertTriangle, Wrench, Search } from "lucide-react";

import { useSparepartForServiceV4Action, searchServiceSparepartsV4Action } from "@/server/actions/inventory-v4.actions";

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
import type { PurchaseVariantSearchRow } from "@/server/domain/inventory-v4.types";

const ALLOWED_SPAREPART_STATUSES: ServiceWorkflowStatus[] = ["PERBAIKAN", "QC"];

interface ServiceSparepartSectionProps {
  serviceId: string;
  serviceNumber: string;
  branchId: string;
  spareparts: SparepartItem[];
  currentStatus: string;
  onSparepartAdded?: () => void;
  onSparepartRemoved?: () => void;
  brandSlug: string;
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
}: ServiceSparepartSectionProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<PurchaseVariantSearchRow[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<SelectedSparepart[]>([]);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const workflowStatus = currentStatus.toUpperCase() as ServiceWorkflowStatus;
  const canAddSparepart = ALLOWED_SPAREPART_STATUSES.includes(workflowStatus);

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

  const searchV4 = async (q: string) => {
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
        console.log("[service-sparepart-v4/search]", {
          brandSlug,
          branchId,
          query: q.trim(),
          resultCount: res.data.length,
          results: res.data.map((r) => ({
            variantId: r.variantId,
            productId: r.productId,
            name: r.productName,
            variantName: r.variantName,
            stockAvailable: r.stockAvailable,
          })),
        });
      }
    } catch (err: any) {
      console.error("[service-sparepart-v4/search] error:", err);
    }
    setSearching(false);
  };

  const handleSearch = async (q: string) => {
    setSearch(q);
    await searchV4(q);
  };

  const handleBarcodeScan = async (code: string) => {
    if (!code || code.trim().length < 2) return;
    setSearch(code);
    await searchV4(code);
  };

  const addItem = (item: PurchaseVariantSearchRow) => {
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
  };

  const handleQtyChange = (tempId: string, delta: number) => {
    setSelected((prev) =>
      prev.map((s) => {
        if (s.tempId !== tempId) return s;
        const next = s.qty + delta;
        if (next < 1 || next > s.maxStock) return s;
        return { ...s, qty: next };
      }),
    );
  };

  const handleRemoveSelected = (tempId: string) => {
    setSelected((prev) => prev.filter((s) => s.tempId !== tempId));
  };

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
      console.log("[service-sparepart-v4/add]", {
        serviceId,
        branchId,
        items: selected.map((s) => ({
          variantId: s.variantId,
          productId: s.productId,
          quantity: s.qty,
        })),
      });

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
      console.error("[service-sparepart] add failed", {
        serviceId,
        branchId,
        items: selected.map((s) => ({ variantId: s.variantId, quantity: s.qty })),
        error: msg,
      });
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

      {spareparts.length > 0 ? (
        <div className="space-y-2">
          {spareparts.map((part, index) => (
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
              <div className="flex items-center gap-2">
                <p className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                  {formatCurrency(part.price * part.qty)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada sparepart digunakan.</p>
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

          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Scan / Cari Sparepart</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim().length >= 2) {
                    handleBarcodeScan(search);
                  }
                }}
                placeholder="Cari sparepart atau scan barcode..."
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>

          {search.trim().length >= 2 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border bg-background p-1.5">
              {searching ? (
                <div className="flex items-center justify-center py-4">
                  <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Tidak ada sparepart tersedia.
                  <br />
                  <span className="text-[10px]">Pastikan sparepart sudah dibuat, memiliki varian aktif, dan stok tersedia di cabang servis.</span>
                </div>
              ) : (
                searchResults.map((item) => {
                  const displayName = item.variantName
                    ? `${item.productName} - ${item.variantName}`
                    : item.productName;
                  return (
                    <div
                      key={item.variantId}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">{displayName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Stok: {item.stockAvailable} {item.unit}
                          {item.sellingPrice > 0 && ` · Rp ${item.sellingPrice.toLocaleString("id-ID")}`}
                        </p>
                      </div>
                      {item.stockAvailable > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => addItem(item)}
                        >
                          Tambah
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-[9px]">Habis</Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {selected.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <p className="text-[10px] font-medium text-muted-foreground">Sparepart dipilih:</p>
              {selected.map((s) => (
                <div
                  key={s.tempId}
                  className="rounded-lg border bg-background px-3 py-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{s.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Stok tersedia: {s.maxStock} {s.unitName}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveSelected(s.tempId)}
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
                    <span className="text-xs font-medium tabular-nums">
                      {formatCurrency(s.price * s.qty)}
                    </span>
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
