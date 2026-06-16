"use client";

import * as React from "react";
import { Plus, X, AlertTriangle, Wrench, Search, Smartphone, Package } from "lucide-react";

import { addServiceSparepartAction } from "@/server/actions/service-workflow.actions";
import {
  listInventoryItemsAction,
  findInventoryByBarcodeAction,
  listSerializedUnitsAction,
  type InventoryItemRow,
  type SerializedUnitRow,
} from "@/server/actions/inventory.actions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { BarcodeSearchInput } from "@/components/inventory/barcode-search-input";
import { formatCurrency } from "@/components/services/service-data";
import type { SparepartItem } from "@/components/services/service-data";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";
import { type ServiceWorkflowStatus } from "@/domain/service/service-workflow";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  CONDITION_GRADE_LABELS,
  type SerializedUnitStatus,
  type ConditionGrade,
} from "@/types/app";

const ALLOWED_SPAREPART_STATUSES: ServiceWorkflowStatus[] = ["PERBAIKAN", "QC"];

interface ServiceSparepartSectionProps {
  serviceId: string;
  serviceNumber: string;
  spareparts: SparepartItem[];
  currentStatus: string;
  onSparepartAdded?: () => void;
  onSparepartRemoved?: () => void;
  brandSlug: string;
}

interface SelectedSparepart {
  tempId: string;
  inventoryItemId: string;
  name: string;
  qty: number;
  price: number;
  maxStock: number;
  unitName: string;
  serializedUnitId?: string | null;
  serializedUnit?: SerializedUnitRow | null;
}

export function ServiceSparepartSection({
  serviceId,
  serviceNumber,
  spareparts,
  currentStatus,
  onSparepartAdded,
  onSparepartRemoved,
  brandSlug,
}: ServiceSparepartSectionProps) {
  const { userRole } = useActiveBranch();
  const canManage = can(userRole as any, PERMISSIONS.INVENTORY_MANAGE);
  const [expanded, setExpanded] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<InventoryItemRow[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<SelectedSparepart[]>([]);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Serialized unit picker state
  const [unitPickerItemId, setUnitPickerItemId] = React.useState<string | null>(null);
  const [availableUnits, setAvailableUnits] = React.useState<SerializedUnitRow[]>([]);
  const [unitsLoading, setUnitsLoading] = React.useState(false);

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
    setUnitPickerItemId(null);
    setAvailableUnits([]);
  }, []);

  // Search inventory items (not mock data!)
  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const res = await listInventoryItemsAction(brandSlug, {
      search: q.trim(),
      pageSize: 10,
      stockType: "SPAREPART",
    });
    if (res.success) {
      const addedIds = new Set(selected.map((s) => s.inventoryItemId));
      setSearchResults(res.data.items.filter((i) => !addedIds.has(i.id)));
    }
    setSearching(false);
  };

  // Barcode / IMEI scan handler
  const handleBarcodeScan = async (code: string) => {
    if (!code || code.trim().length < 2) return;
    setSearch(code);
    setSearching(true);
    const res = await findInventoryByBarcodeAction(brandSlug, { code: code.trim() });
    setSearching(false);

    if (res.success) {
      const item = res.data.item;
      const addedIds = new Set(selected.map((s) => s.inventoryItemId));
      if (addedIds.has(item.id)) {
        triggerDynamicIslandFeedback({
          type: "info",
          title: "Sudah ditambahkan",
          description: `${item.name} sudah ada di daftar.`,
          duration: 1500,
        });
        return;
      }

      if (res.data.type === "SERIALIZED_UNIT" && res.data.serializedUnit) {
        // Found serialized unit directly — add it
        const su = res.data.serializedUnit;
        if (su.status !== "READY_STOCK") {
          triggerDynamicIslandFeedback({
            type: "error",
            title: "Unit tidak tersedia",
            description: `Status: ${su.status}. Hanya unit READY_STOCK yang bisa digunakan.`,
            duration: 2400,
          });
          return;
        }
        addItem(item, su);
      } else {
        // Found inventory item — check if serialized and show unit picker
        if (item.trackingType === "SERIALIZED" || item.itemType === "DEVICE_UNIT") {
          setUnitPickerItemId(item.id);
          setUnitsLoading(true);
          const unitRes = await listSerializedUnitsAction(brandSlug, {
            inventoryItemId: item.id,
            status: "READY_STOCK",
            pageSize: 50,
          });
          if (unitRes.success) {
            setAvailableUnits(unitRes.data.items);
            if (unitRes.data.items.length === 0) {
              triggerDynamicIslandFeedback({
                type: "info",
                title: "Tidak ada unit tersedia",
                description: `${item.name} — tidak ada unit READY_STOCK.`,
                duration: 1500,
              });
            }
          }
          setUnitsLoading(false);
        } else {
          addItem(item, null);
        }
      }
    } else {
      triggerDynamicIslandFeedback({
        type: "error",
        title: "Tidak ditemukan",
        description: res.error ?? "Item tidak ditemukan.",
        duration: 1800,
      });
    }
  };

  const addItem = (item: InventoryItemRow, serializedUnit: SerializedUnitRow | null) => {
    const newItem: SelectedSparepart = {
      tempId: Math.random().toString(36).slice(2),
      inventoryItemId: item.id,
      name: item.name,
      qty: 1,
      price: serializedUnit?.sellingPrice ?? item.sellingPrice ?? 0,
      maxStock: serializedUnit ? 1 : item.currentStock,
      unitName: item.unitName,
      serializedUnitId: serializedUnit?.id ?? null,
      serializedUnit: serializedUnit ?? null,
    };
    setSelected((prev) => [...prev, newItem]);
    setSearch("");
    setSearchResults([]);
    setUnitPickerItemId(null);
    setAvailableUnits([]);
    setError(null);
  };

  // Add serialized unit from picker
  const addSerializedUnit = (unit: SerializedUnitRow, item: InventoryItemRow) => {
    addItem(item, unit);
  };

  // Quantity change (only for non-serialized items)
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
      const input = {
        brandSlug,
        serviceId,
        items: selected.map((s) => ({
          inventoryItemId: s.inventoryItemId,
          quantity: s.qty,
          sellingPrice: s.price,
          serializedUnitId: s.serializedUnitId ?? null,
        })),
        note: notes || undefined,
      };

      const result = await addServiceSparepartAction(input);

      if (result.success) {
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
                  {part.conditionGradeSnapshot && ` · ${CONDITION_GRADE_LABELS[part.conditionGradeSnapshot] ?? part.conditionGradeSnapshot}`}
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

          {/* Barcode / IMEI Search */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Scan / Cari Sparepart</Label>
            <BarcodeSearchInput
              value={search}
              onChange={handleSearch}
              onLookup={handleBarcodeScan}
              placeholder="Cari sparepart atau scan barcode/IMEI..."
            />
          </div>

          {/* Serialized unit picker */}
          {unitPickerItemId && availableUnits.length > 0 && (
            <div className="rounded-lg border bg-background p-2 space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">Pilih unit serial tersedia:</p>
              {availableUnits.map((unit) => {
                const item = searchResults.find((i) => i.id === unit.inventoryItemId);
                return (
                  <div key={unit.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        {unit.imei ?? unit.serialNumber ?? unit.barcode ?? unit.id.slice(0, 8)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        BH: {unit.batteryHealth != null ? `${unit.batteryHealth}%` : "—"}
                        {unit.conditionGrade && ` · ${CONDITION_GRADE_LABELS[unit.conditionGrade] ?? unit.conditionGrade}`}
                        {canManage && unit.sellingPrice != null && ` · ${formatCurrency(unit.sellingPrice)}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => addSerializedUnit(unit, item ?? { id: unit.inventoryItemId, name: unit.itemName ?? "", currentStock: 1, unitName: "pcs", sellingPrice: unit.sellingPrice ?? 0 } as InventoryItemRow)}
                    >
                      Pilih
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search results */}
          {search.trim().length >= 2 && !unitPickerItemId && (
            <div className="max-h-40 overflow-y-auto rounded-lg border bg-background p-1.5">
              {searching ? (
                <div className="flex items-center justify-center py-4">
                  <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Item tidak ditemukan.
                </div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Stok: {item.currentStock} {item.unitName}
                        {canManage && item.sellingPrice > 0 && ` · ${formatCurrency(item.sellingPrice)}`}
                        {item.trackingType === "SERIALIZED" && " · Serial"}
                      </p>
                    </div>
                    {item.currentStock > 0 || item.trackingType === "SERIALIZED" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={async () => {
                          if (item.trackingType === "SERIALIZED" || item.itemType === "DEVICE_UNIT") {
                            setUnitPickerItemId(item.id);
                            setUnitsLoading(true);
                            const unitRes = await listSerializedUnitsAction(brandSlug, {
                              inventoryItemId: item.id,
                              status: "READY_STOCK",
                              pageSize: 50,
                            });
                            if (unitRes.success) {
                              setAvailableUnits(unitRes.data.items);
                              if (unitRes.data.items.length === 0) {
                                triggerDynamicIslandFeedback({
                                  type: "info",
                                  title: "Tidak ada unit tersedia",
                                  description: `${item.name} — tidak ada unit READY_STOCK.`,
                                  duration: 1500,
                                });
                              }
                            }
                            setUnitsLoading(false);
                          } else {
                            addItem(item, null);
                          }
                        }}
                      >
                        Tambah
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-[9px]">Habis</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Selected items */}
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
                      <p className="text-xs font-medium text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.serializedUnit ? (
                          <>
                            Unit serial: {s.serializedUnit.imei ?? s.serializedUnit.serialNumber ?? s.serializedUnit.barcode ?? "—"}
                            {s.serializedUnit.batteryHealth != null && ` · BH: ${s.serializedUnit.batteryHealth}%`}
                          </>
                        ) : (
                          `Stok tersedia: ${s.maxStock} ${s.unitName}`
                        )}
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
                  {!s.serializedUnit && (
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
                  )}
                  {s.serializedUnit && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {canManage && s.price > 0 && formatCurrency(s.price)}
                      </span>
                      {canManage && (
                        <span className="text-xs font-medium tabular-nums">
                          {s.price > 0 ? formatCurrency(s.price) : "—"}
                        </span>
                      )}
                    </div>
                  )}
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
