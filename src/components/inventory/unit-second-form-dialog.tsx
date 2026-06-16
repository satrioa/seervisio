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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listInventoryItemsAction,
  createInventoryItemAction,
  getInventoryCategoriesAction,
  type InventoryItemRow,
  type InventoryCategoryRow,
} from "@/server/actions/inventory.actions";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { Loader2, Plus, Trash2, Search, Smartphone } from "lucide-react";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

interface UnitRow {
  id: string;
  warna: string;
  storage: string;
  batteryHealth: string;
  imei: string;
  serialNumber: string;
  barcode: string;
  conditionGrade: string;
  warrantyUntil: string;
  costPrice: number;
  sellingPrice: number;
  notes: string;
}

interface VariationGroup {
  id: string;
  name: string;
  options: string[];
}

interface UnitSecondFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
}

const GRADE_OPTIONS = [
  { value: "A", label: "A - Mulus" },
  { value: "B", label: "B - Minimal Lecet" },
  { value: "C", label: "C - Lecet/Baret" },
  { value: "D", label: "D - Rusak/Cacat" },
];

export function UnitSecondFormDialog({ open, onOpenChange, brandSlug }: UnitSecondFormDialogProps) {
  const { branches } = useActiveBranch();

  const [step, setStep] = React.useState<"model" | "detail">("model");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<InventoryCategoryRow[]>([]);

  const [branchId, setBranchId] = React.useState(branches[0]?.id ?? "");
  const [categoryId, setCategoryId] = React.useState("");
  const [modelSearch, setModelSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<InventoryItemRow[]>([]);
  const [selectedModel, setSelectedModel] = React.useState<InventoryItemRow | null>(null);

  const [modelName, setModelName] = React.useState("");
  const [modelSku, setModelSku] = React.useState("");
  const [modelBarcode, setModelBarcode] = React.useState("");
  const [description, setDescription] = React.useState("");

  // Variation groups for dynamic columns
  const [groups, setGroups] = React.useState<VariationGroup[]>([
    { id: "vg-warna", name: "Warna", options: ["", "", ""] },
    { id: "vg-storage", name: "Storage", options: ["", "", ""] },
  ]);
  const [activeColumns, setActiveColumns] = React.useState<string[]>(["Warna", "Storage"]);

  // Unit rows
  const [rows, setRows] = React.useState<UnitRow[]>([]);

  React.useEffect(() => {
    if (open) {
      getInventoryCategoriesAction(brandSlug, "UNIT", false).then((res) => {
        if (res.success) setCategories(res.data);
      });
    }
  }, [open, brandSlug]);

  React.useEffect(() => {
    if (!open) return;
    setStep("model");
    setSelectedModel(null);
    setModelName("");
    setModelSku("");
    setModelBarcode("");
    setDescription("");
    setGroups([
      { id: "vg-warna", name: "Warna", options: ["", "", ""] },
      { id: "vg-storage", name: "Storage", options: ["", "", ""] },
    ]);
    setActiveColumns(["Warna", "Storage"]);
    setRows([]);
    setError(null);
    setBranchId(branches[0]?.id ?? "");
    setCategoryId("");
  }, [open, branches]);

  const handleSearch = React.useCallback(async () => {
    if (!modelSearch.trim()) return;
    setSearchResults([]);
    const res = await listInventoryItemsAction(brandSlug, {
      search: modelSearch.trim(),
      itemType: "DEVICE_UNIT",
      mode: "grouped",
      pageSize: 20,
    });
    if (res.success) {
      setSearchResults((res.data as any).items ?? []);
    }
  }, [brandSlug, modelSearch]);

  const selectModel = (item: InventoryItemRow) => {
    setSelectedModel(item);
    setModelName(item.name);
    setModelSku(item.sku ?? "");
    setModelBarcode(item.barcode ?? "");
    setDescription(item.description ?? "");
    setStep("detail");
  };

  const createNewModel = () => {
    setSelectedModel(null);
    setModelName(modelSearch.trim());
    setSearchResults([]);
    setStep("detail");
  };

  const updateGroup = (id: string, field: "name" | "options", value: any) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };

  const updateGroupOption = (groupId: string, index: number, value: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.map((o, i) => (i === index ? value : o)) }
          : g,
      ),
    );
  };

  const addGroup = () => {
    const id = `vg-${Date.now()}`;
    setGroups((prev) => [...prev, { id, name: "", options: [""] }]);
    setActiveColumns((prev) => [...prev, ""]);
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    const grp = groups.find((g) => g.id === id);
    if (grp) {
      setActiveColumns((prev) => prev.filter((c) => c !== grp.name));
    }
  };

  const addOptionToGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, options: [...g.options, ""] } : g)),
    );
  };

  const addRow = () => {
    const rowDefaults: Record<string, string> = {};
    activeColumns.forEach((col) => { rowDefaults[col] = ""; });
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        warna: "",
        storage: "",
        batteryHealth: "",
        imei: "",
        serialNumber: "",
        barcode: "",
        conditionGrade: "",
        warrantyUntil: "",
        costPrice: 0,
        sellingPrice: 0,
        notes: "",
        ...rowDefaults,
      } as any,
    ]);
  };

  const updateRow = (id: string, field: string, value: string | number) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = async () => {
    if (!branchId) { setError("Pilih cabang."); return; }
    if (!modelName.trim()) { setError("Nama model unit wajib diisi."); return; }
    if (rows.length === 0) { setError("Tambahkan minimal 1 unit."); return; }
    if (rows.some((r) => !r.imei.trim())) { setError("Setiap unit harus memiliki IMEI."); return; }

    setSaving(true);
    setError(null);

    try {
      const variationTags: Record<string, string> = {};
      groups.forEach((g) => {
        const opts = g.options.filter((o) => o.trim());
        if (g.name.trim() && opts.length > 0) {
          variationTags[g.name.trim()] = opts[0];
        }
      });

      let modelId = selectedModel?.id;
      if (!modelId) {
        const createRes = await createInventoryItemAction(brandSlug, {
          branchId,
          categoryId: categoryId || null,
          name: modelName.trim(),
          sku: modelSku.trim() || null,
          barcode: modelBarcode.trim() || null,
          description: description.trim() || null,
          itemType: "DEVICE_UNIT",
          stockType: "UNIT",
          unitCondition: "SECOND",
          appearsInPos: true,
          serviceUsageEnabled: false,
          userFacingType: "UNIT",
          unitName: "unit",
          minStock: 0,
          hasVariants: false,
          isActive: true,
          costPrice: 0,
          sellingPrice: 0,
          initialStock: 0,
        });
        if (!createRes.success) { setError(createRes.error ?? "Gagal membuat model"); setSaving(false); return; }
        modelId = createRes.data.id;
      }

      for (const row of rows) {
        const unitVariation: Record<string, string> = {};
        activeColumns.forEach((col) => {
          const val = (row as any)[col];
          if (val) unitVariation[col] = val;
        });

        await createInventoryItemAction(brandSlug, {
          branchId,
          name: `${modelName.trim()} - ${row.imei.trim()}`,
          itemType: "DEVICE_UNIT",
          stockType: "UNIT",
          unitCondition: "SECOND",
          appearsInPos: true,
          serviceUsageEnabled: false,
          userFacingType: "UNIT",
          unitName: "unit",
          minStock: 0,
          costPrice: row.costPrice,
          sellingPrice: row.sellingPrice,
          initialStock: 1,
          hasVariants: false,
          isActive: true,
          parentId: modelId,
          sku: null,
          barcode: row.barcode || row.imei.trim(),
          description: row.notes || null,
          unitAttributes: {
            ...unitVariation,
            imei: row.imei.trim(),
            serialNumber: row.serialNumber || null,
            batteryHealth: row.batteryHealth ? Number(row.batteryHealth) : null,
            conditionGrade: row.conditionGrade || null,
            warrantyUntil: row.warrantyUntil || null,
          },
        });
      }

      triggerDynamicIslandFeedback({
        type: "success",
        title: "Unit Second berhasil ditambahkan",
        description: `${rows.length} unit telah ditambahkan.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{step === "model" ? "Tambah Unit Second - Pilih Model" : "Tambah Unit Second - Detail Unit"}</DialogTitle>
          <DialogDescription>
            {step === "model" ? "Cari model unit yang sudah ada, atau buat model baru." : "Atur variasi dan daftar unit fisik."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        {step === "model" ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="h-9 pl-8 text-xs"
                  placeholder="Cari model unit..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                />
              </div>
              <Button size="sm" variant="outline" className="h-9 text-xs" onClick={handleSearch}>Cari</Button>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                {searchResults.map((item) => (
                  <button key={item.id} type="button" onClick={() => selectModel(item)}
                    className="w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors"
                  >
                    <Smartphone className="size-4 text-purple-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      {item.sku && <div className="text-[10px] text-muted-foreground">{item.sku}</div>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{item.currentStock} unit</Badge>
                  </button>
                ))}
              </div>
            )}

            {modelSearch.trim() && searchResults.length === 0 && (
              <Button size="sm" variant="secondary" className="w-full text-xs" onClick={createNewModel}>
                <Plus className="size-3.5 mr-1" /> Buat Model Baru &ldquo;{modelSearch.trim()}&rdquo;
              </Button>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto space-y-4 px-0.5">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setStep("model")}>
                &larr; Kembali
              </Button>
              {selectedModel && <Badge variant="secondary" className="text-[10px]">Model: {selectedModel.name}</Badge>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cabang <span className="text-red-500">*</span></Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (<SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nama Model <span className="text-red-500">*</span></Label>
                <Input value={modelName} onChange={(e) => setModelName(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">SKU Induk</Label>
                <Input value={modelSku} onChange={(e) => setModelSku(e.target.value)} className="h-9 text-xs font-mono" placeholder="2ND-IP14PM" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Kategori</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (<SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Variation Groups */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Variasi / Tag</Label>
              {groups.map((group) => (
                <div key={group.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={group.name}
                      onChange={(e) => updateGroup(group.id, "name", e.target.value)}
                      placeholder="Nama variasi (contoh: Warna)"
                      className="h-8 w-[160px] text-xs"
                    />
                    <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => removeGroup(group.id)}>
                      <Trash2 className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((opt, i) => (
                      <Input
                        key={i}
                        value={opt}
                        onChange={(e) => updateGroupOption(group.id, i, e.target.value)}
                        placeholder={`Opsi ${i + 1}`}
                        className="h-7 w-[120px] text-[10px]"
                      />
                    ))}
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => addOptionToGroup(group.id)}>
                      + Opsi
                    </Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={addGroup}>
                <Plus className="size-3 mr-1" /> Tambah Grup Variasi
              </Button>
            </div>

            <Separator />

            {/* Unit Rows Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Daftar Unit Fisik <span className="text-red-500">*</span></Label>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={addRow}>
                  <Plus className="size-3 mr-1" /> Tambah Baris
                </Button>
              </div>

              {rows.length > 0 && (
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-muted/50">
                        {groups.filter((g) => g.name.trim()).map((g) => (
                          <th key={g.id} className="px-1.5 py-1 text-left font-medium whitespace-nowrap">{g.name}</th>
                        ))}
                        <th className="px-1.5 py-1 text-left font-medium whitespace-nowrap">Batre</th>
                        <th className="px-1.5 py-1 text-left font-medium whitespace-nowrap">IMEI <span className="text-red-500">*</span></th>
                        <th className="px-1.5 py-1 text-left font-medium whitespace-nowrap">Serial</th>
                        <th className="px-1.5 py-1 text-left font-medium whitespace-nowrap">Barcode</th>
                        <th className="px-1.5 py-1 text-left font-medium whitespace-nowrap">Kondisi</th>
                        <th className="px-1.5 py-1 text-left font-medium whitespace-nowrap">Garansi</th>
                        <th className="px-1.5 py-1 text-right font-medium whitespace-nowrap">Modal</th>
                        <th className="px-1.5 py-1 text-right font-medium whitespace-nowrap">Jual</th>
                        <th className="px-1.5 py-1 text-left font-medium whitespace-nowrap">Catatan</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-t">
                          {groups.filter((g) => g.name.trim()).map((g) => (
                            <td key={g.id} className="px-1.5 py-0.5">
                              <Select
                                value={(row as any)[g.name] ?? ""}
                                onValueChange={(v) => updateRow(row.id, g.name, v)}
                              >
                                <SelectTrigger className="h-7 text-[10px] min-w-[80px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {g.options.filter((o) => o.trim()).map((o) => (
                                    <SelectItem key={o} value={o} className="text-[10px]">{o}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          ))}
                          <td className="px-1.5 py-0.5">
                            <Input type="number" min={0} max={100} value={row.batteryHealth}
                              onChange={(e) => updateRow(row.id, "batteryHealth", e.target.value)}
                              className="h-7 text-[10px] w-[52px]" placeholder="%" />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Input value={row.imei} onChange={(e) => updateRow(row.id, "imei", e.target.value)}
                              className="h-7 text-[10px] font-mono min-w-[100px]" placeholder="IMEI" />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Input value={row.serialNumber} onChange={(e) => updateRow(row.id, "serialNumber", e.target.value)}
                              className="h-7 text-[10px] font-mono min-w-[80px]" placeholder="Serial" />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Input value={row.barcode} onChange={(e) => updateRow(row.id, "barcode", e.target.value)}
                              className="h-7 text-[10px] font-mono min-w-[80px]" placeholder="Barcode" />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Select value={row.conditionGrade} onValueChange={(v) => updateRow(row.id, "conditionGrade", v)}>
                              <SelectTrigger className="h-7 text-[10px] min-w-[80px]"><SelectValue placeholder="-" /></SelectTrigger>
                              <SelectContent>
                                {GRADE_OPTIONS.map((g) => (
                                  <SelectItem key={g.value} value={g.value} className="text-[10px]">{g.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Input type="date" value={row.warrantyUntil}
                              onChange={(e) => updateRow(row.id, "warrantyUntil", e.target.value)}
                              className="h-7 text-[10px] w-[110px]" />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Input type="number" min={0} value={row.costPrice || ""}
                              onChange={(e) => updateRow(row.id, "costPrice", Number(e.target.value) || 0)}
                              className="h-7 text-[10px] w-[80px] text-right" />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Input type="number" min={0} value={row.sellingPrice || ""}
                              onChange={(e) => updateRow(row.id, "sellingPrice", Number(e.target.value) || 0)}
                              className="h-7 text-[10px] w-[80px] text-right" />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Input value={row.notes} onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                              className="h-7 text-[10px] min-w-[80px]" placeholder="-" />
                          </td>
                          <td className="px-1.5 py-0.5">
                            <Button size="sm" variant="ghost" className="size-6 p-0" onClick={() => removeRow(row.id)}>
                              <Trash2 className="size-3 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {rows.length === 0 && (
                <div className="text-center py-6 text-[11px] text-muted-foreground italic">
                  Belum ada unit. Klik &ldquo;+ Tambah Baris&rdquo; untuk mulai.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          {step === "detail" && (
            <Button size="sm" onClick={handleSave} disabled={saving || rows.length === 0}>
              {saving && <Loader2 className="size-3 mr-1 animate-spin" />}
              Simpan {rows.length} Unit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
