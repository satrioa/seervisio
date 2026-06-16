"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { BarcodeSearchInput } from "@/components/inventory/barcode-search-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
  type InventoryItemRow,
  type InventoryCategoryRow,
} from "@/server/actions/inventory.actions";
import {
  mapToItemType,
  resolveTrackingTypeSync,
  type UserFacingItemType,
} from "@/types/app";
import { VariationBuilder, type VariationGroup, type VariantRow } from "@/components/inventory/variation-builder";
import type { ActiveBranchOption } from "@/components/layout/active-branch-context";
import { Loader2, Package, HelpCircle } from "lucide-react";

const NO_CATEGORY = "NO_CATEGORY";

const USER_TYPE_OPTIONS: { value: UserFacingItemType; label: string }[] = [
  { value: "SPAREPART", label: "Sparepart" },
  { value: "PRODUCT", label: "Produk" },
  { value: "UNIT", label: "Unit" },
];

const UNIT_OPTIONS = [
  "pcs", "unit", "pack", "box", "roll", "meter",
  "gram", "kg", "liter", "ml", "tube", "set", "lainnya",
];

interface InventoryItemDialogProps {
  open: boolean;
  onOpenChange: () => void;
  item: InventoryItemRow | null;
  categories: InventoryCategoryRow[];
  branches: ActiveBranchOption[];
  activeBranchId?: string;
  onSuccess?: (data: InventoryItemRow | null) => void;
}

export function InventoryItemDialog({
  open, onOpenChange, item, categories, branches, activeBranchId, onSuccess,
}: InventoryItemDialogProps) {
  const isEdit = !!item;
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [branchId, setBranchId] = React.useState(activeBranchId ?? branches[0]?.id ?? "");
  const [categoryId, setCategoryId] = React.useState("");
  const [userType, setUserType] = React.useState<UserFacingItemType>("SPAREPART");
  const [unitCondition, setUnitCondition] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [unit, setUnit] = React.useState("pcs");
  const [minStock, setMinStock] = React.useState("0");
  const [initialStock, setInitialStock] = React.useState("0");
  const [costPrice, setCostPrice] = React.useState("0");
  const [sellingPrice, setSellingPrice] = React.useState("0");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [hasVariants, setHasVariants] = React.useState(false);
  const [variationGroups, setVariationGroups] = React.useState<VariationGroup[]>([]);
  const [variants, setVariants] = React.useState<Record<string, VariantRow>>({});

  const itemType = React.useMemo(
    () => mapToItemType(userType),
    [userType],
  );
  const trackingType = resolveTrackingTypeSync(itemType, unitCondition);

  const isUnitSecond = userType === "UNIT" && unitCondition === "SECOND";
  const isSerialized = trackingType === "SERIALIZED";

  // Map user-facing type to category item_type filter values
  const categoryItemTypes = React.useMemo(() => {
    switch (userType) {
      case "SPAREPART": return ["SPAREPART"];
      case "PRODUCT": return ["PRODUCT", "ACCESSORY", "CONSUMABLE"];
      case "UNIT": return ["DEVICE_UNIT"];
      default: return [];
    }
  }, [userType]);

  const filteredCategories = React.useMemo(
    () => categories.filter((c) => {
      if (!(c as any).itemType) return true; // legacy: no itemType on category
      return categoryItemTypes.includes((c as any).itemType);
    }),
    [categories, categoryItemTypes],
  );

  // Reset category when userType changes and current category is invalid
  const prevUserType = React.useRef(userType);
  React.useEffect(() => {
    if (prevUserType.current !== userType) {
      prevUserType.current = userType;
      if (categoryId) {
        const cat = categories.find((c) => c.id === categoryId);
        if (cat && (cat as any).itemType && !categoryItemTypes.includes((cat as any).itemType)) {
          setCategoryId("");
        }
      }
    }
  }, [userType, categoryItemTypes, categories, categoryId]);

  // Reset form on open
  React.useEffect(() => {
    if (!open) return;
    if (item) {
      setBranchId("");
      setCategoryId(item.categoryId ?? "");
      setUserType(
        item.itemType === "SPAREPART" ? "SPAREPART"
        : item.itemType === "PRODUCT" || item.itemType === "ACCESSORY" || item.itemType === "CONSUMABLE" ? "PRODUCT"
        : "UNIT"
      );
      setUnitCondition(item.unitCondition ?? (item.itemType === "DEVICE_UNIT" ? "SECOND" : null));
      setName(item.name);
      setSku(item.sku ?? "");
      setBarcode(item.barcode ?? "");
      setUnit(item.unitName);
      setMinStock(String(item.minStock));
      setInitialStock("0");
      setCostPrice(String(item.costPrice));
      setSellingPrice(String(item.sellingPrice));
      setDescription(item.description ?? "");
      setIsActive(item.isActive);
      setHasVariants(item.hasVariants);
      setVariationGroups([]);
      setVariants({});
    } else {
      setBranchId(branches[0]?.id ?? "");
      setCategoryId("");
      setUserType("SPAREPART");
      setUnitCondition(null);
      setName("");
      setSku("");
      setBarcode("");
      setUnit("pcs");
      setMinStock("0");
      setInitialStock("0");
      setCostPrice("0");
      setSellingPrice("0");
      setDescription("");
      setIsActive(true);
      setHasVariants(false);
      setVariationGroups([]);
      setVariants({});
    }
    setError(null);
  }, [open, item, branches]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const brandSlug = window.location.pathname.split("/")[1];
    const { triggerDynamicIslandFeedback } = await import("@/lib/dynamic-island/dynamic-island-events");

    triggerDynamicIslandFeedback({
      type: "loading",
      title: isEdit ? "Menyimpan item..." : "Menambahkan item...",
    });

    try {
      if (isEdit && item) {
        const res = await updateInventoryItemAction(brandSlug, item.id, {
          categoryId: categoryId === NO_CATEGORY ? null : categoryId,
          name: name.trim(),
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          description: description.trim() || null,
          unitName: unit,
          costPrice: Number(costPrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          minStock: Number(minStock) || 0,
          isActive,
          appearsInPos: userType !== "SPAREPART",
          serviceUsageEnabled: userType === "SPAREPART",
          stockType: userType === "SPAREPART" ? "SPAREPART" : userType === "UNIT" ? "UNIT" : "PRODUCT",
        });

        if (!res.success) {
          triggerDynamicIslandFeedback({ type: "error", title: res.error, duration: 2500 });
          setError(res.error);
          setSaving(false);
          return;
        }

        triggerDynamicIslandFeedback({ type: "success", title: `${item.name} berhasil disimpan`, duration: 2200 });
        onSuccess?.(res.data);
        onOpenChange();
        return;
      }

      const res = await createInventoryItemAction(brandSlug, {
        branchId: branchId || null,
        categoryId: categoryId === NO_CATEGORY ? null : categoryId,
        name: name.trim(),
        userFacingType: userType,
        stockType: userType === "SPAREPART" ? "SPAREPART" : userType === "UNIT" ? "UNIT" : "PRODUCT",
        itemType,
        unitCondition,
        appearsInPos: userType !== "SPAREPART",
        serviceUsageEnabled: userType === "SPAREPART",
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        unitName: unit,
        minStock: Number(minStock) || 0,
        costPrice: hasVariants ? undefined : (Number(costPrice) || 0),
        sellingPrice: hasVariants ? undefined : (Number(sellingPrice) || 0),
        initialStock: hasVariants ? undefined : (Number(initialStock) || 0),
        isActive,
        description: description.trim() || null,
        hasVariants,
        variationGroups: hasVariants ? variationGroups : [],
        variants: hasVariants ? variants : undefined,
      });

      if (!res.success) {
        triggerDynamicIslandFeedback({ type: "error", title: res.error, duration: 2500 });
        setError(res.error);
        setSaving(false);
        return;
      }

      const itemName = res.data?.name ?? name.trim();
      const variantCount = hasVariants ? Object.keys(variants).length : 0;
      const successMsg = variantCount > 0
        ? `${itemName} dan ${variantCount} varian berhasil ditambahkan`
        : `${itemName} berhasil ditambahkan`;

      triggerDynamicIslandFeedback({ type: "success", title: successMsg, duration: 2200 });
      onSuccess?.(res.data);
      onOpenChange();
    } catch (e: any) {
      triggerDynamicIslandFeedback({ type: "error", title: e.message ?? "Gagal menyimpan item", duration: 2500 });
      setError(e.message ?? "Gagal menyimpan item");
    } finally {
      setSaving(false);
    }
  };

  const canSave = name.trim().length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4" />
            {isEdit ? "Edit Item" : "Tambah Item Baru"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit
              ? "Ubah informasi item stok."
              : "Tambahkan item baru ke inventory."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* ── Branch (create only) ── */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cabang</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih cabang" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Jenis Barang ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Jenis Barang</Label>
            <div className="flex gap-2">
              {USER_TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={userType === opt.value ? "default" : "outline"}
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={() => {
                    setUserType(opt.value);
                    if (opt.value !== "UNIT") {
                      setUnitCondition(null);
                    } else {
                      setUnitCondition("SECOND");
                    }
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* ── Kondisi (only for Unit) ── */}
          {userType === "UNIT" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Kondisi</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={unitCondition === "NEW" ? "default" : "outline"}
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={() => setUnitCondition("NEW")}
                >
                  Baru
                </Button>
                <Button
                  type="button"
                  variant={unitCondition === "SECOND" ? "default" : "outline"}
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={() => setUnitCondition("SECOND")}
                >
                  Second
                </Button>
              </div>
            </div>
          )}

          {/* ── Nama Item ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nama Item *</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
              placeholder="Contoh: Battery iPhone 11"
            />
          </div>

          {/* ── Kategori ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Kategori</Label>
            <Select value={categoryId || NO_CATEGORY} onValueChange={setCategoryId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY} className="text-xs">Tidak ada</SelectItem>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── SKU + Barcode ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">SKU / Kode Item</Label>
              <Input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="h-9 text-xs font-mono"
                placeholder="SP-BAT-IP11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Barcode</Label>
              <BarcodeSearchInput
                value={barcode}
                onChange={setBarcode}
                placeholder="Scan atau ketik barcode"
              />
            </div>
          </div>

          {/* ── Unit + Min Stock ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Satuan Stok</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Minimum Stok</Label>
              <Input
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <Separator />

          {/* ── Variation Toggle ── */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Aktifkan Variasi</Label>
              {isSerialized && (
                <p className="text-[10px] text-muted-foreground">
                  Variasi untuk unit second
                </p>
              )}
            </div>
            <Switch
              checked={hasVariants}
              onCheckedChange={setHasVariants}
              disabled={isEdit}
            />
          </div>

          {/* ── Variation Builder ── */}
          {hasVariants && (
            <VariationBuilder
              groups={variationGroups}
              onChange={setVariationGroups}
              variants={variants}
              onVariantsChange={setVariants}
              trackingType={trackingType}
              unitCondition={unitCondition}
            />
          )}

          {/* ── Non-variant pricing & stock ── */}
          {!hasVariants && !isEdit && (
            <>
              {!isSerialized && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Stok Awal</Label>
                  <Input
                    type="number"
                    min={0}
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Stok awal untuk cabang terpilih.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Harga Modal</Label>
                  <Input
                    type="number"
                    min={0}
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Harga Jual</Label>
                  <Input
                    type="number"
                    min={0}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {isSerialized && (
                <div className="flex items-start gap-2 rounded-lg border border-muted bg-muted/30 p-3">
                  <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">
                    Stok unit second akan dicatat melalui tab <strong>Stok Unit / IMEI</strong> setelah item dibuat.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Description ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Deskripsi</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] text-xs"
              placeholder="Deskripsi item..."
            />
          </div>

          {/* ── Active ── */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Item Aktif</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={onOpenChange} disabled={saving}>
            Batal
          </Button>
          <Button size="sm" className="h-9 text-xs" onClick={handleSave} disabled={!canSave}>
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {isEdit ? "Simpan" : "Tambah"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
