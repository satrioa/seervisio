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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listInventoryForStockOpnameAction,
  adjustInventoryOpnameAction,
  type StockOpnameItem,
  type StockOpnameInput,
} from "@/server/actions/inventory-opname.actions";
import { getInventoryCategoriesAction, type InventoryCategoryRow } from "@/server/actions/inventory.actions";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { Loader2, Search, AlertTriangle, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { triggerDynamicIslandFeedback } from "@/lib/dynamic-island/dynamic-island-events";

const ITEM_TYPE_TABS = [
  { value: "SPAREPART", label: "Sparepart" },
  { value: "PRODUCT", label: "Produk" },
  { value: "DEVICE_UNIT", label: "Unit" },
];

const PAGE_SIZE = 25;

interface StockOpnameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  role?: string;
}

export function StockOpnameDialog({ open, onOpenChange, brandSlug, role }: StockOpnameDialogProps) {
  const { activeBranchId } = useActiveBranch();
  const [tab, setTab] = React.useState("SPAREPART");
  const [items, setItems] = React.useState<StockOpnameItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [categories, setCategories] = React.useState<InventoryCategoryRow[]>([]);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);

  // Map of itemId -> physicalStock value (user input)
  const [opnameValues, setOpnameValues] = React.useState<Record<string, string>>({});

  // Preview state
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewItems, setPreviewItems] = React.useState<Array<{ item: StockOpnameItem; current: number; opname: number; diff: number }>>([]);
  const [previewNote, setPreviewNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const isTechnician = role === "TECHNICIAN";

  const fetchData = React.useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        listInventoryForStockOpnameAction(brandSlug, {
          itemType: tab as "SPAREPART" | "PRODUCT" | "DEVICE_UNIT",
          categoryId,
          search: search || undefined,
          branchId: activeBranchId,
          page: pageNum,
          pageSize: PAGE_SIZE,
        }),
        getInventoryCategoriesAction(brandSlug, tab === "DEVICE_UNIT" ? "UNIT" : tab, false),
      ]);
      if (itemsRes.success) {
        setItems(itemsRes.data.items);
        setTotal(itemsRes.data.total);
        setTotalPages(itemsRes.data.totalPages);
      }
      if (catsRes.success) {
        setCategories(catsRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, [brandSlug, tab, categoryId, search, activeBranchId]);

  React.useEffect(() => {
    if (open) {
      setPage(1);
      setOpnameValues({});
      setPreviewOpen(false);
      setPreviewNote("");
      fetchData(1);
    }
  }, [open, tab, categoryId, fetchData]);

  const handleTabChange = (val: string) => {
    setTab(val);
    setCategoryId(null);
    setPage(1);
    setOpnameValues({});
    setSearch("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData(1);
  };

  const handleOpnameChange = (itemId: string, value: string) => {
    setOpnameValues((prev) => ({ ...prev, [itemId]: value }));
  };

  const changedItems = React.useMemo(() => {
    return items
      .filter((item) => {
        const val = opnameValues[item.id];
        if (val === undefined || val === "") return false;
        const num = Number(val);
        if (Number.isNaN(num)) return false;
        return num !== item.currentStock;
      })
      .map((item) => ({
        item,
        current: item.currentStock,
        opname: Number(opnameValues[item.id]),
        diff: Number(opnameValues[item.id]) - item.currentStock,
      }));
  }, [items, opnameValues]);

  const openPreview = async () => {
    if (changedItems.length === 0) return;
    setPreviewItems(changedItems);
    setPreviewNote("");
    setPreviewOpen(true);
  };

  const handleSaveAll = async () => {
    if (!previewNote.trim()) {
      return;
    }
    setSaving(true);
    try {
      const adjustments: StockOpnameInput[] = previewItems.map((p) => ({
        itemId: p.item.id,
        physicalStock: p.opname,
      }));
      const res = await adjustInventoryOpnameAction(brandSlug, {
        adjustments,
        note: previewNote.trim(),
        branchId: activeBranchId,
      });
      if (res.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: "Penyesuaian stok berhasil",
          description: `${res.data.updatedCount} item berhasil diperbarui.`,
        });
        setPreviewOpen(false);
        setOpnameValues({});
        fetchData(page);
      } else {
        triggerDynamicIslandFeedback({
          type: "error",
          title: "Gagal",
          description: res.error ?? "Terjadi kesalahan.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const totalPagesArr = React.useMemo(() => {
    const arr: number[] = [];
    for (let i = 1; i <= totalPages; i++) arr.push(i);
    return arr;
  }, [totalPages]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Penyesuaian Stok</DialogTitle>
            <DialogDescription>
              Cocokkan stok fisik dengan stok sistem. Sistem akan mencatat selisih sebagai movement stok.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={handleTabChange} className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between mb-3">
              <TabsList>
                {ITEM_TYPE_TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={tab} className="min-h-0 flex-1 flex flex-col m-0">
              {/* Helper text for DEVICE_UNIT */}
              {tab === "DEVICE_UNIT" && (
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Stok unit serial dikelola lewat daftar IMEI/Serial. Gunakan tab <strong>Unit Second</strong> untuk menambah, menjual, atau mengubah status unit. Item dengan pelacakan kuantitatif tetap dapat disesuaikan.
                </div>
              )}

              {/* Category filter + Search */}
              <div className="flex items-center gap-2 mb-3">
                <Select value={categoryId ?? "ALL"} onValueChange={(v) => { setCategoryId(v === "ALL" ? null : v); setPage(1); }}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kategori</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari nama item, SKU, atau barcode..."
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs">Cari</Button>
                </form>
              </div>

              {/* Data table */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-16 text-xs text-muted-foreground">Tidak ada item ditemukan.</div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                      <tr className="border-b">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nama Item</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground w-[100px]">Stok Saat Ini</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground w-[120px]">Stok Opname</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground w-[80px]">Selisih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const val = opnameValues[item.id];
                        const hasValue = val !== undefined && val !== "";
                        const numVal = hasValue ? Number(val) : NaN;
                        const isValid = !Number.isNaN(numVal);
                        const diff = isValid ? numVal - item.currentStock : 0;
                        const isSerialized = item.trackingType === "SERIALIZED";
                        const isChanged = isValid && diff !== 0;

                        return (
                          <tr key={item.id} className={`border-b last:border-0 hover:bg-muted/30 ${isChanged ? "bg-amber-50/50" : ""}`}>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">
                                  {item.name}
                                  {item.variantDisplayName && (
                                    <span className="text-muted-foreground ml-1">({item.variantDisplayName})</span>
                                  )}
                                </span>
                                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                  {item.sku && <span>SKU: {item.sku}</span>}
                                  {item.barcode && <span>Barcode: {item.barcode}</span>}
                                  {item.categoryName && <Badge variant="outline" className="text-[9px] px-1">{item.categoryName}</Badge>}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center font-medium tabular-nums">
                              {item.currentStock} {item.unitName}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {isSerialized ? (
                                <span className="text-[10px] text-muted-foreground italic">Kelola via Unit Second</span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  value={val ?? ""}
                                  onChange={(e) => handleOpnameChange(item.id, e.target.value)}
                                  placeholder={String(item.currentStock)}
                                  className="w-24 h-8 text-xs text-center tabular-nums mx-auto"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {isChanged ? (
                                <span className={`font-medium tabular-nums ${diff > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  {diff > 0 ? "+" : ""}{diff}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-muted-foreground">
                    {total} item · Halaman {page} dari {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="size-7 p-0" disabled={page <= 1} onClick={() => { setPage(page - 1); fetchData(page - 1); }}>
                      <ChevronLeft className="size-3.5" />
                    </Button>
                    {totalPagesArr.slice(Math.max(0, page - 3), page + 2).map((p) => (
                      <Button key={p} size="sm" variant={p === page ? "default" : "ghost"} className="size-7 p-0 text-xs" onClick={() => { setPage(p); fetchData(p); }}>
                        {p}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" className="size-7 p-0" disabled={page >= totalPages} onClick={() => { setPage(page + 1); fetchData(page + 1); }}>
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Global save button */}
              {changedItems.length > 0 && (
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    {changedItems.length} item berubah
                  </span>
                  <Button size="sm" onClick={openPreview}>
                    <Save className="size-3.5 mr-1" /> Simpan Semua Perubahan
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Preview confirmation dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Penyesuaian Stok</DialogTitle>
            <DialogDescription>Konfirmasi perubahan stok sebelum disimpan.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {previewItems.map((p) => (
              <div key={p.item.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{p.item.name}</span>
                  <Badge variant="outline" className={`text-[10px] ${p.diff > 0 ? "text-emerald-600 border-emerald-300" : "text-red-600 border-red-300"}`}>
                    {p.diff > 0 ? "Penyesuaian Masuk" : "Penyesuaian Keluar"} {Math.abs(p.diff)} {p.item.unitName}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                  <div><span className="block text-[9px]">Stok Sistem</span><span className="font-medium text-foreground">{p.current}</span></div>
                  <div><span className="block text-[9px]">Stok Opname</span><span className="font-medium text-foreground">{p.opname}</span></div>
                  <div><span className="block text-[9px]">Selisih</span><span className={`font-medium tabular-nums ${p.diff > 0 ? "text-emerald-600" : p.diff < 0 ? "text-red-600" : ""}`}>{p.diff > 0 ? "+" : ""}{p.diff}</span></div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Catatan / Alasan <span className="text-red-500">*</span></Label>
            <Textarea
              value={previewNote}
              onChange={(e) => setPreviewNote(e.target.value)}
              className="mt-1 text-xs"
              placeholder={isTechnician ? "Alasan penyesuaian wajib diisi." : "Contoh: Hasil stok opname bulan Juni 2026"}
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleSaveAll} disabled={saving || !previewNote.trim()}>
              {saving && <Loader2 className="size-3 mr-1 animate-spin" />}
              Simpan Penyesuaian
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
