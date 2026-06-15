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
import { useActiveBranch } from "@/components/layout/active-branch-context";
import {
  listInventoryItemsAction,
  createSerializedUnitAction,
  updateSerializedUnitAction,
  type SerializedUnitRow,
  type InventoryItemRow,
} from "@/server/actions/inventory.actions";
import { Loader2, Smartphone, Package } from "lucide-react";
import {
  CONDITION_GRADE_LABELS,
  SERIALIZED_UNIT_STATUS_LABELS,
} from "@/types/app";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const STATUS_OPTIONS = [
  "READY_STOCK", "RESERVED", "SOLD", "IN_SERVICE", "DEFECTIVE", "RETURNED", "ARCHIVED",
] as const;

interface SerializedUnitFormDialogProps {
  open: boolean;
  onOpenChange: () => void;
  onSuccess?: () => void;
  unit?: SerializedUnitRow | null;
  defaultItemId?: string | null;
}

export function SerializedUnitFormDialog({ open, onOpenChange, onSuccess, unit, defaultItemId }: SerializedUnitFormDialogProps) {
  const { activeBranchId, branches, userRole } = useActiveBranch();
  const isEdit = Boolean(unit);
  const canManage = can(userRole as any, PERMISSIONS.INVENTORY_MANAGE);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Item search
  const [itemSearch, setItemSearch] = React.useState("");
  const [itemResults, setItemResults] = React.useState<InventoryItemRow[]>([]);
  const [itemSearching, setItemSearching] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<InventoryItemRow | null>(null);

  const [branchId, setBranchId] = React.useState(activeBranchId ?? branches[0]?.id ?? "");
  const [imei, setImei] = React.useState("");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [batteryHealth, setBatteryHealth] = React.useState("");
  const [conditionGrade, setConditionGrade] = React.useState("");
  const [physicalConditionNotes, setPhysicalConditionNotes] = React.useState("");
  const [functionalConditionNotes, setFunctionalConditionNotes] = React.useState("");
  const [accessoriesIncluded, setAccessoriesIncluded] = React.useState("");
  const [purchaseCost, setPurchaseCost] = React.useState("");
  const [sellingPrice, setSellingPrice] = React.useState("");
  const [status, setStatus] = React.useState("READY_STOCK");

  React.useEffect(() => {
    if (!open) {
      setItemSearch("");
      setItemResults([]);
      setSelectedItem(null);
      setBranchId(activeBranchId ?? branches[0]?.id ?? "");
      setImei("");
      setSerialNumber("");
      setBarcode("");
      setBatteryHealth("");
      setConditionGrade("");
      setPhysicalConditionNotes("");
      setFunctionalConditionNotes("");
      setAccessoriesIncluded("");
      setPurchaseCost("");
      setSellingPrice("");
      setStatus("READY_STOCK");
      setError(null);
    } else if (unit) {
      setBranchId(unit.branchId);
      setImei(unit.imei ?? "");
      setSerialNumber(unit.serialNumber ?? "");
      setBarcode(unit.barcode ?? "");
      setBatteryHealth(unit.batteryHealth != null ? String(unit.batteryHealth) : "");
      setConditionGrade(unit.conditionGrade ?? "");
      setPhysicalConditionNotes(unit.physicalConditionNotes ?? "");
      setFunctionalConditionNotes(unit.functionalConditionNotes ?? "");
      setAccessoriesIncluded(unit.accessoriesIncluded ?? "");
      setPurchaseCost(unit.purchaseCost != null ? String(unit.purchaseCost) : "");
      setSellingPrice(unit.sellingPrice != null ? String(unit.sellingPrice) : "");
      setStatus(unit.status);
    } else if (defaultItemId) {
      loadDefaultItem(defaultItemId);
    }
  }, [open, unit, activeBranchId, branches]);

  const loadDefaultItem = async (itemId: string) => {
    const brandSlug = window.location.pathname.split("/")[1];
    const res = await listInventoryItemsAction(brandSlug, { pageSize: 1, search: itemId });
    if (res.success && res.data.items.length > 0) {
      setSelectedItem(res.data.items[0]);
    }
  };

  const handleItemSearch = async (q: string) => {
    setItemSearch(q);
    if (q.trim().length < 2) {
      setItemResults([]);
      return;
    }
    setItemSearching(true);
    const brandSlug = window.location.pathname.split("/")[1];
    const res = await listInventoryItemsAction(brandSlug, {
      search: q.trim(),
      branchId: "ALL_BRANCHES",
      pageSize: 6,
    });
    if (res.success) setItemResults(res.data.items);
    setItemSearching(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    if (!selectedItem && !unit) {
      setError("Pilih item inventory terlebih dahulu");
      setSaving(false);
      return;
    }
    if (!branchId) {
      setError("Cabang wajib dipilih");
      setSaving(false);
      return;
    }

    const brandSlug = window.location.pathname.split("/")[1];
    const input = {
      branchId,
      inventoryItemId: selectedItem?.id ?? unit!.inventoryItemId,
      imei: imei.trim() || null,
      serialNumber: serialNumber.trim() || null,
      barcode: barcode.trim() || null,
      batteryHealth: batteryHealth ? Number(batteryHealth) : null,
      conditionGrade: conditionGrade || null,
      physicalConditionNotes: physicalConditionNotes.trim() || null,
      functionalConditionNotes: functionalConditionNotes.trim() || null,
      accessoriesIncluded: accessoriesIncluded.trim() || null,
      purchaseCost: purchaseCost ? Number(purchaseCost) : null,
      sellingPrice: sellingPrice ? Number(sellingPrice) : null,
      status: status as any,
    };

    if (isEdit && unit) {
      const res = await updateSerializedUnitAction(brandSlug, unit.id, input);
      if (res.success) {
        onSuccess?.();
        onOpenChange();
      } else {
        setError(res.error);
      }
    } else {
      const res = await createSerializedUnitAction(brandSlug, input as any);
      if (res.success) {
        onSuccess?.();
        onOpenChange();
      } else {
        setError(res.error);
      }
    }

    setSaving(false);
  };

  const isSerializedType = selectedItem?.trackingType === "SERIALIZED" || selectedItem?.itemType === "DEVICE_UNIT";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="size-4" />
            {isEdit ? "Edit Unit Second" : "Tambah Unit Second"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit ? "Ubah data unit second / serialized device." : "Input data unit second atau perangkat serial baru."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>
          )}

          {/* Item search (create only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Item Inventory *</Label>
              {selectedItem ? (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Package className="size-3.5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{selectedItem.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {selectedItem.sku && `SKU: ${selectedItem.sku}`}
                      {selectedItem.sku && selectedItem.trackingType && " · "}
                      {selectedItem.trackingType}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedItem(null)}>
                    Ganti
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    value={itemSearch}
                    onChange={(e) => handleItemSearch(e.target.value)}
                    placeholder="Cari item inventory..."
                    className="h-9 text-xs"
                  />
                  {itemResults.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border divide-y">
                      {itemResults.filter((i) => i.trackingType === "SERIALIZED" || i.itemType === "DEVICE_UNIT").map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50"
                          onClick={() => { setSelectedItem(item); setItemSearch(""); setItemResults([]); }}
                        >
                          <Package className="size-3 shrink-0 text-primary" />
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span className="text-muted-foreground">({item.trackingType})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!isSerializedType && selectedItem && (
                <p className="text-[10px] text-amber-600">Item ini bukan tipe serial. Ubah tracking type ke SERIALIZED pada item.</p>
              )}
            </div>
          )}

          {/* Branch */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Cabang *</Label>
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

          {/* IMEI / Serial / Barcode */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">IMEI</Label>
              <Input value={imei} onChange={(e) => setImei(e.target.value)} className="h-9 text-xs" placeholder="3567..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Serial Number</Label>
              <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Barcode</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          {/* Battery Health + Condition */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Battery Health (%)</Label>
              <Input
                type="number" min={0} max={100}
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(e.target.value)}
                className="h-9 text-xs"
                placeholder="85"
              />
              <p className="text-[10px] text-muted-foreground">Battery Health sebaiknya diisi untuk unit iPhone second.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Kondisi</Label>
              <Select value={conditionGrade} onValueChange={setConditionGrade}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih kondisi" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_GRADE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Physical + Functional Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Kondisi Fisik</Label>
              <Textarea
                value={physicalConditionNotes}
                onChange={(e) => setPhysicalConditionNotes(e.target.value)}
                className="min-h-[50px] text-xs"
                placeholder="Lecet, baret, body..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Kondisi Fungsi</Label>
              <Textarea
                value={functionalConditionNotes}
                onChange={(e) => setFunctionalConditionNotes(e.target.value)}
                className="min-h-[50px] text-xs"
                placeholder="Touch ID, kamera, speaker..."
              />
            </div>
          </div>

          {/* Accessories */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Aksesoris Termasuk</Label>
            <Input
              value={accessoriesIncluded}
              onChange={(e) => setAccessoriesIncluded(e.target.value)}
              className="h-9 text-xs"
              placeholder="Charger, kabel, box..."
            />
          </div>

          {/* Cost + Price (admin only) */}
          {canManage && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Harga Beli</Label>
                  <Input
                    type="number" min={0}
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="h-9 text-xs"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Harga Jual</Label>
                  <Input
                    type="number" min={0}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="h-9 text-xs"
                    placeholder="0"
                  />
                </div>
              </div>
            </>
          )}

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {SERIALIZED_UNIT_STATUS_LABELS[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => onOpenChange()} disabled={saving}>
            Batal
          </Button>
          <Button size="sm" className="h-9 text-xs" onClick={handleSave} disabled={saving || (!selectedItem && !unit)}>
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {isEdit ? "Simpan" : "Tambah Unit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
