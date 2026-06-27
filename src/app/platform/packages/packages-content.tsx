"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  Plus,
  Pencil,
  DollarSign,
  Building2,
  Users,
  HardDrive,
  Receipt,
} from "lucide-react";
import {
  getPackagesListAction,
  createPackageAction,
  updatePackageAction,
} from "@/server/actions/package.actions";
import type { PackageRow } from "@/server/repositories/platform.repository";
import { cn } from "@/lib/utils";

function PlanCard({
  pkg,
  onEdit,
}: {
  pkg: PackageRow;
  onEdit: (pkg: PackageRow) => void;
}) {
  return (
    <Card className={cn(
      "relative border-border/60 shadow-sm transition-all hover:border-border",
      !pkg.isActive && "opacity-60"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-platform/10 text-platform">
              <Package className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{pkg.name}</CardTitle>
              <CardDescription className="text-xs">{pkg.description}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(pkg)}>
            <Pencil className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <span className="text-2xl font-bold">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(pkg.price)}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">/bulan</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="size-3" />
              <span>Max Branches</span>
            </div>
            <p className="text-sm font-medium tabular-nums">{pkg.maxBranches}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3" />
              <span>Max Users</span>
            </div>
            <p className="text-sm font-medium tabular-nums">{pkg.maxUsers}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HardDrive className="size-3" />
              <span>Storage</span>
            </div>
            <p className="text-sm font-medium tabular-nums">{pkg.maxStorageMb} MB</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Receipt className="size-3" />
              <span>Transactions</span>
            </div>
            <p className="text-sm font-medium tabular-nums">
              {pkg.maxTransactions.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant={pkg.isActive ? "default" : "secondary"}
            className="text-[10px]"
          >
            {pkg.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline" className="text-[10px] lowercase">
            {pkg.slug}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

const defaultForm = {
  name: "",
  slug: "",
  description: "",
  price: 0,
  maxBranches: 1,
  maxUsers: 5,
  maxStorageMb: 100,
  maxTransactions: 500,
};

export function PackagesContent() {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getPackagesListAction();
    if (res.success) setPackages(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (pkg: PackageRow) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description ?? "",
      price: pkg.price,
      maxBranches: pkg.maxBranches,
      maxUsers: pkg.maxUsers,
      maxStorageMb: pkg.maxStorageMb,
      maxTransactions: pkg.maxTransactions,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      description: form.description || null,
    };
    const res = editingId
      ? await updatePackageAction(editingId, payload)
      : await createPackageAction({ ...payload, slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-") });
    setSaving(false);
    if (res.success) {
      setDialogOpen(false);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Packages
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola paket langganan yang tersedia untuk brand
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-3.5" />
          Tambah Paket
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Belum ada paket</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Buat paket langganan pertama untuk brand
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PlanCard key={pkg.id} pkg={pkg} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Paket" : "Tambah Paket"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Ubah detail paket langganan" : "Buat paket langganan baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs">Nama Paket</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-9 text-xs"
                  placeholder="Starter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-xs">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="h-9 text-xs"
                  placeholder="starter"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs">Deskripsi</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="text-xs"
                rows={2}
                placeholder="Deskripsi paket..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-xs">Harga (per bulan)</Label>
              <Input
                id="price"
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxBranches" className="text-xs">Max Branches</Label>
                <Input
                  id="maxBranches"
                  type="number"
                  value={form.maxBranches}
                  onChange={(e) => setForm((f) => ({ ...f, maxBranches: Number(e.target.value) }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers" className="text-xs">Max Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={form.maxUsers}
                  onChange={(e) => setForm((f) => ({ ...f, maxUsers: Number(e.target.value) }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxStorageMb" className="text-xs">Max Storage (MB)</Label>
                <Input
                  id="maxStorageMb"
                  type="number"
                  value={form.maxStorageMb}
                  onChange={(e) => setForm((f) => ({ ...f, maxStorageMb: Number(e.target.value) }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTransactions" className="text-xs">Max Transactions</Label>
                <Input
                  id="maxTransactions"
                  type="number"
                  value={form.maxTransactions}
                  onChange={(e) => setForm((f) => ({ ...f, maxTransactions: Number(e.target.value) }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Menyimpan..." : editingId ? "Simpan" : "Buat Paket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
