"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  manageInventoryCategoryAction,
  toggleInventoryCategoryAction,
  deleteInventoryCategoryAction,
  getInventoryCategoriesAction,
  type InventoryCategoryRow,
} from "@/server/actions/inventory.actions";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { Loader2, Plus, Pencil, Ban, Check, Trash2, AlertTriangle } from "lucide-react";

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  role?: string;
}

const STOCK_TYPE_TABS = [
  { value: "SPAREPART", label: "Sparepart" },
  { value: "PRODUCT", label: "Produk" },
  { value: "UNIT", label: "Unit" },
];

export function CategoryManagerDialog({ open, onOpenChange, brandSlug, role }: CategoryManagerDialogProps) {
  const activeTab = React.useRef("SPAREPART");
  const [tab, setTab] = React.useState("SPAREPART");
  const stockType = tab;
  const [categories, setCategories] = React.useState<InventoryCategoryRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editItem, setEditItem] = React.useState<InventoryCategoryRow | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formActive, setFormActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const canManage = role === "MASTER_ADMIN" || role === "ADMIN" || role === "PLATFORM_OWNER";

  const fetchData = React.useCallback(async (itemType: string) => {
    setLoading(true);
    try {
      const res = await getInventoryCategoriesAction(brandSlug, stockType, true);
      if (res.success) {
        setCategories(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [brandSlug]);

  React.useEffect(() => {
    if (open) {
      activeTab.current = tab;
      fetchData(tab);
      setShowForm(false);
      setEditItem(null);
      setError(null);
      setSuccess(null);
    }
  }, [open, tab, fetchData]);

  const handleTabChange = (val: string) => {
    activeTab.current = val;
    setTab(val);
    setShowForm(false);
    setEditItem(null);
    setError(null);
    setSuccess(null);
  };

  const openAddForm = () => {
    setEditItem(null);
    setFormName("");
    setFormDesc("");
    setFormActive(true);
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (cat: InventoryCategoryRow) => {
    setEditItem(cat);
    setFormName(cat.name);
    setFormDesc(cat.description ?? "");
    setFormActive(cat.isActive);
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await manageInventoryCategoryAction(brandSlug, {
        id: editItem?.id,
        name: formName.trim(),
        stockType,
        description: formDesc.trim() || null,
        isActive: formActive,
      });
      if (res.success) {
        setSuccess(editItem ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan.");
        setShowForm(false);
        setEditItem(null);
        fetchData(tab);
      } else {
        setError(res.error ?? "Gagal menyimpan kategori.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: InventoryCategoryRow) => {
    setError(null);
    const res = await toggleInventoryCategoryAction(brandSlug, cat.id, !cat.isActive);
    if (res.success) {
      setSuccess(`Kategori ${cat.isActive ? "dinonaktifkan" : "diaktifkan"}.`);
      fetchData(tab);
    } else {
      setError(res.error ?? "Gagal mengubah status.");
    }
  };

  const handleDelete = async (cat: InventoryCategoryRow) => {
    if (!window.confirm(`Hapus kategori "${cat.name}"?`)) return;
    setError(null);
    const res = await deleteInventoryCategoryAction(brandSlug, cat.id);
    if (res.success) {
      setSuccess("Kategori berhasil dihapus.");
      fetchData(tab);
    } else {
      setError(res.error ?? "Gagal menghapus kategori.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Kelola Kategori</DialogTitle>
          <DialogDescription>Atur kategori inventory berdasarkan jenis barang.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange} className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              {STOCK_TYPE_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
            {canManage && !showForm && (
              <Button size="sm" variant="outline" onClick={openAddForm}>
                <Plus className="size-3.5 mr-1" /> Tambah
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div>
          )}

          {showForm && canManage && (
            <div className="mb-4 rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-medium">{editItem ? "Edit Kategori" : "Tambah Kategori Baru"}</h4>
              <div>
                <Label className="text-xs">Jenis Barang</Label>
                <Input value={STOCK_TYPE_TABS.find(t => t.value === tab)?.label ?? tab} disabled className="mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Nama Kategori <span className="text-red-500">*</span></Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-1 text-xs" placeholder="Masukkan nama kategori" />
              </div>
              <div>
                <Label className="text-xs">Deskripsi</Label>
                <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="mt-1 text-xs" placeholder="Opsional" rows={2} />
              </div>
              {editItem && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Status Aktif</Label>
                  <Button
                    size="sm"
                    variant={formActive ? "default" : "outline"}
                    onClick={() => setFormActive(!formActive)}
                    className="text-xs"
                  >
                    {formActive ? "Aktif" : "Nonaktif"}
                  </Button>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="size-3 mr-1 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </div>
          )}

          <TabsContent value={tab} className="min-h-0 flex-1 overflow-y-auto m-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground">Belum ada kategori.</div>
            ) : (
              <div className="space-y-1.5">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{cat.name}</span>
                        {!cat.isActive && (
                          <Badge variant="outline" className="text-[9px] text-muted-foreground">Nonaktif</Badge>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{cat.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => openEditForm(cat)} title="Edit">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => handleToggle(cat)} title={cat.isActive ? "Nonaktifkan" : "Aktifkan"}>
                          {cat.isActive ? <Ban className="size-3.5 text-amber-500" /> : <Check className="size-3.5 text-emerald-500" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => handleDelete(cat)} title="Hapus">
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
