"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
  getInventoryCategoriesAction,
  type InventoryItemRow,
  type InventoryCategoryRow,
  type VariationGroup,
  type VariantInput,
  type UserFacingItemType,
} from "@/server/actions/inventory.actions";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

const NO_CATEGORY = "__none__";

interface StockItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockType: "SPAREPART" | "PRODUCT" | "UNIT_BARU";
  item?: InventoryItemRow | null;
  branchId?: string;
  brandSlug: string;
}

export function StockItemFormDialog({
  open, onOpenChange, stockType, item, branchId: propBranchId, brandSlug,
}: StockItemFormDialogProps) {
  const { branches } = useActiveBranch();
  const isEdit = !!item;
  const isSparepart = stockType === "SPAREPART";
  const isProduk = stockType === "PRODUCT";
  const isUnitBaru = stockType === "UNIT_BARU";
  const unitCondition = isUnitBaru ? "NEW" : null;

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<InventoryCategoryRow[]>([]);

  const [branchId, setBranchId] = React.useState(propBranchId ?? branches[0]?.id ?? "");
  const [categoryId, setCategoryId] = React.useState("");
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [unitName, setUnitName] = React.useState(isUnitBaru ? "unit" : "pcs");
  const [minStock, setMinStock] = React.useState("0");
  const [initialStock, setInitialStock] = React.useState("0");
  const [costPrice, setCostPrice] = React.useState("0");
  const [sellingPrice, setSellingPrice] = React.useState("0");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [hasVariants, setHasVariants] = React.useState(false);
  const [variationGroups, setVariationGroups] = React.useState<VariationGroup[]>([]);
  const [variants, setVariants] = React.useState<Record<string, VariantInput>>({});

  React.useEffect(() => {
    if (open) {
      getInventoryCategoriesAction(brandSlug, stockType, false).then((res) => {
        if (res.success) setCategories(res.data);
      });
    }
  }, [open, brandSlug, stockType]);

  React.useEffect(() => {
    if (!open) return;
    if (item) {
      setBranchId(item.branchId || branches[0]?.id || "");
      setCategoryId(item.categoryId ?? "");
      setName(item.name);
      setSku(item.sku ?? "");
      setBarcode(item.barcode ?? "");
      setUnitName(item.unitName);
      setMinStock(String(item.minStock));
      setInitialStock("0");
      setCostPrice(String(item.costPrice));
      setSellingPrice(String(item.sellingPrice));
      setDescription(item.description ?? "");
      setIsActive(item.isActive);
      setHasVariants(item.hasVariants);
      setVariationGroups([]);
      setVariants({});
      setError(null);
    } else {
      setBranchId(propBranchId ?? branches[0]?.id ?? "");
      setCategoryId("");
      setName("");
      setSku("");
      setBarcode("");
      setUnitName(isUnitBaru ? "unit" : "pcs");
      setMinStock("0");
      setInitialStock("0");
      setCostPrice("0");
      setSellingPrice("0");
      setDescription("");
      setIsActive(true);
      setHasVariants(false);
      setVariationGroups([]);
      setVariants({});
      setError(null);
    }
  }, [open, item, branches, propBranchId, isUnitBaru]);

  const title = isEdit
    ? `Edit ${isSparepart ? "Sparepart" : isProduk ? "Produk" : "Unit Baru"}`
    : `Tambah ${isSparepart ? "Sparepart" : isProduk ? "Produk" : "Unit Baru"}`;

  const priceLabel = isSparepart ? "Harga Jual Servis" : "Harga Jual POS";

  const addVariationGroup = () => {
    setVariationGroups((prev) => [
      ...prev,
      { id: `vg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: "", options: [] },
    ]);
  };

  const updateGroup = (id: string, field: string, value: any) => {
    setVariationGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)),
    );
  };

  const addOption = (groupId: string) => {
    setVariationGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: [
                ...g.options,
                { id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: "" },
              ],
            }
          : g,
      ),
    );
  };

  const updateOption = (groupId: string, optionId: string, name: string) => {
    setVariationGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, name } : o)) }
          : g,
      ),
    );
  };

  const removeOption = (groupId: string, optionId: string) => {
    setVariationGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g,
      ),
    );
  };

  const removeGroup = (id: string) => {
    setVariationGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Nama wajib diisi."); return; }
    if (!branchId) { setError("Pilih cabang."); return; }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        branchId,
        categoryId: categoryId === NO_CATEGORY ? null : categoryId,
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        unitName,
        minStock: Number(minStock) || 0,
        initialStock: hasVariants ? 0 : Number(initialStock) || 0,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        description: description.trim() || null,
        isActive,
        hasVariants,
        stockType: isUnitBaru ? "UNIT" : stockType,
        itemType: isSparepart ? "SPAREPART" : isProduk ? "PRODUCT" : "DEVICE_UNIT",
        unitCondition,
        appearsInPos: !isSparepart,
        serviceUsageEnabled: isSparepart,
        userFacingType: (isSparepart ? "SPAREPART" : isProduk ? "PRODUCT" : "UNIT") as UserFacingItemType,
        variationGroups: hasVariants ? variationGroups : [],
        variants: hasVariants ? variants : {},
      };

      const res = item
        ? await updateInventoryItemAction(brandSlug, item.id, payload)
        : await createInventoryItemAction(brandSlug, payload);

      if (res.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: isEdit ? "Berhasil diperbarui" : "Berhasil ditambahkan",
          description: `${name} telah ${isEdit ? "diperbarui" : "ditambahkan"}.`,
        });
        onOpenChange(false);
      } else {
        setError(res.error ?? "Gagal menyimpan.");
      }
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isSparepart ? "Sparepart digunakan untuk kebutuhan servis." : isProduk ? "Produk untuk penjualan retail/POS." : "Unit baru untuk dijual di POS."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-0.5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Cabang <span className="text-red-500">*</span></Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nama {isSparepart ? "Sparepart" : isProduk ? "Produk" : "Unit"} <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" placeholder={isSparepart ? "Contoh: Battery iPhone 11" : isProduk ? "Contoh: Case iPhone 15" : "Contoh: iPhone 16 Pro Max"} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Kategori</Label>
            <Select value={categoryId || NO_CATEGORY} onValueChange={setCategoryId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY} className="text-xs">Tidak ada</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">SKU / Kode Item</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} className="h-9 text-xs font-mono" placeholder={isSparepart ? "SP-BAT-IP11" : isProduk ? "PR-CASE-15" : "UNT-IP16"} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Barcode</Label>
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="h-9 text-xs font-mono" placeholder="Opsional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Satuan</Label>
              <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Minimum Stok</Label>
              <Input type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Aktifkan Variasi</Label>
            <Switch checked={hasVariants} onCheckedChange={setHasVariants} />
          </div>

          {hasVariants ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Grup Variasi</span>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={addVariationGroup}>
                  <Plus className="size-3 mr-1" /> Tambah Grup
                </Button>
              </div>
              {variationGroups.map((group, gi) => (
                <div key={group.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                      <Input
                        value={group.name}
                        onChange={(e) => updateGroup(group.id, "name", e.target.value)}
                        placeholder={`Variasi ${gi + 1}, contoh: Warna`}
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                    <Button size="sm" variant="ghost" className="size-7 p-0 shrink-0 ml-1" onClick={() => removeGroup(group.id)}>
                      <Trash2 className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-1 rounded-md border px-2 py-1">
                        <Input
                          value={opt.name}
                          onChange={(e) => updateOption(group.id, opt.id, (e.target as HTMLInputElement).value)}
                          placeholder="Opsi"
                          className="h-6 w-20 text-[10px] border-0 p-0"
                        />
                        <button type="button" onClick={() => removeOption(group.id, opt.id)} className="text-muted-foreground hover:text-red-500">
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => addOption(group.id)}>
                      + Tambah Opsi
                    </Button>
                  </div>
                </div>
              ))}
              {variationGroups.length > 0 && (
                <div className="text-[10px] text-muted-foreground italic">
                  Setelah menyimpan, variant item akan dibuat. Atur stok dan harga per varian.
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Stok Awal</Label>
                <Input type="number" min="0" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Harga Modal</Label>
                <Input type="number" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{priceLabel}</Label>
                <Input type="number" min="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Catatan</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs" placeholder="Opsional" rows={2} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Status Aktif</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-3 mr-1 animate-spin" />}
            Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
