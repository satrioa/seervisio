"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Plus, Loader2, Pencil, Trash2, Search, Store, Phone, Banknote,
} from "lucide-react";

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  listSuppliersAction,
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
  type SupplierRow,
} from "@/server/actions/supplier.actions";

export default function SuppliersPage() {
  const params = useParams();
  const brandSlug = (Array.isArray(params.brandSlug) ? params.brandSlug[0] : params.brandSlug) ?? "";

  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [includeInactive, setIncludeInactive] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SupplierRow | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formWhatsapp, setFormWhatsapp] = React.useState("");
  const [formStore, setFormStore] = React.useState("");
  const [formBank, setFormBank] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<SupplierRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!brandSlug) return;
    setLoading(true);
    const res = await listSuppliersAction(brandSlug, { search, includeInactive });
    if (res.success) setSuppliers(res.data);
    setLoading(false);
  }, [brandSlug, search, includeInactive]);

  React.useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormWhatsapp("");
    setFormStore("");
    setFormBank("");
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (s: SupplierRow) => {
    setEditing(s);
    setFormName(s.name);
    setFormWhatsapp(s.whatsapp ?? "");
    setFormStore(s.storeName ?? "");
    setFormBank(s.bankAccountInfo ?? "");
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError("Nama supplier wajib diisi");
      return;
    }
    setSaving(true);
    setFormError(null);
    const input = {
      name: formName,
      whatsapp: formWhatsapp,
      storeName: formStore,
      bankAccountInfo: formBank,
    };
    const res = editing
      ? await updateSupplierAction(brandSlug, editing.id, input)
      : await createSupplierAction(brandSlug, input);
    setSaving(false);
    if (res.success) {
      setDialogOpen(false);
      load();
    } else {
      setFormError(res.error ?? "Gagal menyimpan supplier");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteSupplierAction(brandSlug, deleteTarget.id);
    setDeleting(false);
    if (res.success) {
      setDeleteTarget(null);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Supplier</h2>
          <p className="text-sm text-muted-foreground">
            Kelola database supplier untuk Belanja Stok (Nama, WhatsApp, Nama Toko, Bank Account).
          </p>
        </div>
        <Button onClick={openAdd} className="h-9 text-xs">
          <Plus className="mr-1 size-4" />
          Tambah Supplier
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Daftar Supplier</CardTitle>
              <CardDescription className="text-xs">Total {suppliers.length} supplier</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-56 pl-8 text-xs"
                  placeholder="Cari nama / toko / whatsapp"
                />
              </div>
              <Button
                variant={includeInactive ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setIncludeInactive((v) => !v)}
              >
                {includeInactive ? "Tampil Nonaktif" : "Sembunyi Nonaktif"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Memuat supplier...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Belum ada supplier. Klik &quot;Tambah Supplier&quot; untuk membuat.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Nama</th>
                    <th className="px-3 py-2 font-medium">WhatsApp</th>
                    <th className="px-3 py-2 font-medium">Nama Toko</th>
                    <th className="px-3 py-2 font-medium">Informasi Bank Account</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">{s.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.whatsapp ? (
                          <span className="inline-flex items-center gap-1"><Phone className="size-3" />{s.whatsapp}</span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.storeName ? (
                          <span className="inline-flex items-center gap-1"><Store className="size-3" />{s.storeName}</span>
                        ) : "—"}
                      </td>
                      <td className="max-w-[280px] px-3 py-2 text-muted-foreground whitespace-pre-wrap">
                        {s.bankAccountInfo ? (
                          <span className="inline-flex items-start gap-1"><Banknote className="mt-0.5 size-3 shrink-0" />{s.bankAccountInfo}</span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {s.isActive ? (
                          <Badge variant="secondary" className="text-[10px]">Aktif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Nonaktif</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(s)} title="Edit">
                            <Pencil className="size-3.5" />
                          </Button>
                          {s.isActive && (
                            <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleteTarget(s)} title="Hapus">
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) { setDialogOpen(false); setFormError(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editing ? "Edit Supplier" : "Tambah Supplier"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Data ini akan tersimpan di database dan bisa dipilih saat Belanja Stok.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {formError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive">{formError}</div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nama Supplier *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="h-9 text-xs" placeholder="Nama supplier" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">WhatsApp</Label>
                <Input value={formWhatsapp} onChange={(e) => setFormWhatsapp(e.target.value)} className="h-9 text-xs" placeholder="08..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nama Toko</Label>
                <Input value={formStore} onChange={(e) => setFormStore(e.target.value)} className="h-9 text-xs" placeholder="Nama toko" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Informasi Bank Account</Label>
              <Textarea value={formBank} onChange={(e) => setFormBank(e.target.value)} className="text-xs" rows={3} placeholder="Bank, No. Rekening, Atas Nama" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => { setDialogOpen(false); setFormError(null); }} disabled={saving}>
              Batal
            </Button>
            <Button size="sm" className="h-9 text-xs" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan Supplier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Hapus Supplier</DialogTitle>
            <DialogDescription className="text-xs">
              Supplier &quot;{deleteTarget?.name}&quot; akan dinonaktifkan. Riwayat Belanja Stok tetap tersimpan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="destructive" size="sm" className="h-9 text-xs" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
