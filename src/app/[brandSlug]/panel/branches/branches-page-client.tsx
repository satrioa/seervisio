"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Plus, Store, Users, Building2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, Eye, Edit, UserCog, ToggleLeft, ToggleRight } from "lucide-react";

import {
  getBranchesListAction, getBranchDetailAction, getBranchStatsAction,
  getBranchSubscriptionAction, createBranchAction, updateBranchAction,
  toggleBranchActiveAction, getBranchUsersAction,
} from "@/server/actions/branch.actions";
import type { BranchDetail, BranchStats, BranchSubscription } from "@/server/actions/branch.actions";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_OWNER: "Platform Owner",
  MASTER_ADMIN: "Master Admin",
  ADMIN: "Admin Cabang",
  FRONTLINER: "Frontliner",
  TECHNICIAN: "Teknisi",
};

const BRANCH_FORM_DEFAULTS = {
  name: "", code: "", address: "", city: "", province: "",
  phone: "", whatsapp: "", email: "",
};

export function BranchesPageClient() {
  const params = useParams();
  const brandSlug = params.brandSlug as string;

  const [branches, setBranches] = React.useState<BranchDetail[]>([]);
  const [stats, setStats] = React.useState<BranchStats | null>(null);
  const [subscription, setSubscription] = React.useState<BranchSubscription | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [selectedBranch, setSelectedBranch] = React.useState<BranchDetail | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [branchUsers, setBranchUsers] = React.useState<Array<{ name: string; role: string; isActive: boolean }>>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(BRANCH_FORM_DEFAULTS);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<"activate" | "deactivate">("deactivate");
  const [confirmName, setConfirmName] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [branchesRes, statsRes, subRes] = await Promise.all([
      getBranchesListAction(brandSlug),
      getBranchStatsAction(brandSlug),
      getBranchSubscriptionAction(brandSlug),
    ]);
    if (branchesRes.success) setBranches(branchesRes.data);
    if (statsRes.success) setStats(statsRes.data);
    if (subRes.success) setSubscription(subRes.data);
    setLoading(false);
  }, [brandSlug]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditingId(null);
    setForm(BRANCH_FORM_DEFAULTS);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (branch: BranchDetail) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      code: branch.code ?? "",
      address: branch.address ?? "",
      city: (branch as any).city ?? "",
      province: (branch as any).province ?? "",
      phone: branch.phone ?? "",
      whatsapp: (branch as any).whatsapp ?? "",
      email: (branch as any).email ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async () => {
    if (!form.name.trim()) { setFormError("Nama cabang wajib diisi."); return; }
    if (!form.code.trim()) { setFormError("Kode cabang wajib diisi."); return; }

    setSaving(true);
    setFormError(null);

    if (editingId) {
      const res = await updateBranchAction(brandSlug, editingId, form);
      if (!res.success) { setFormError(res.error); setSaving(false); return; }
    } else {
      const res = await createBranchAction(brandSlug, form);
      if (!res.success) { setFormError(res.error); setSaving(false); return; }
    }

    setSaving(false);
    setFormOpen(false);
    loadData();
  };

  const openDetail = async (branch: BranchDetail) => {
    setSelectedBranch(branch);
    setDetailOpen(true);
    setBranchUsers([]);
    setUsersLoading(true);
    const usersRes = await getBranchUsersAction(brandSlug, branch.id);
    if (usersRes.success) setBranchUsers(usersRes.data);
    setUsersLoading(false);
  };

  const handleToggleActive = (branch: BranchDetail) => {
    setConfirmId(branch.id);
    setConfirmAction(branch.is_active ? "deactivate" : "activate");
    setConfirmName(branch.name);
    setConfirmOpen(true);
  };

  const confirmToggleActive = async () => {
    if (!confirmId) return;
    const isActive = confirmAction === "activate";
    await toggleBranchActiveAction(brandSlug, confirmId, isActive);
    setConfirmOpen(false);
    setConfirmId(null);
    loadData();
  };

  const maxBranches = subscription?.maxBranches ?? 1;
  const branchCount = branches.length;
  const planLabel = PLAN_LABELS[subscription?.plan ?? "starter"] ?? "Starter";
  const atLimit = branchCount >= maxBranches;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cabang</h2>
          <p className="text-sm text-muted-foreground">Kelola seluruh cabang operasional dalam brand ini.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-1 size-4" />
            Tambah Cabang
          </Button>
        </div>
      </div>

      {/* Package Usage Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Paket Saat Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{planLabel}</p>
                <p className="text-sm text-muted-foreground">
                  Cabang Digunakan: {branchCount} / {maxBranches}
                </p>
                {atLimit && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Upgrade ke Pro untuk menambah cabang baru
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" disabled>
                Upgrade Paket
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-12" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cabang</CardTitle>
              <Building2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cabang Aktif</CardTitle>
              <Store className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.active ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total User</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalUsers ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Toko Buka</CardTitle>
              <Store className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.openStores ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branch Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : branches.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Building2 className="size-10 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Belum ada cabang. Tambah cabang pertama Anda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Kota</TableHead>
                  <TableHead>Admin Cabang</TableHead>
                  <TableHead className="text-center">User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{branch.name}</p>
                        {branch.code && (
                          <p className="text-xs text-muted-foreground">{branch.code}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(branch as any).city || "-"}
                    </TableCell>
                    <TableCell>{branch.adminName ?? "-"}</TableCell>
                    <TableCell className="text-center">{branch.userCount}</TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? "default" : "secondary"}>
                        {branch.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openDetail(branch)}>
                            <Eye className="mr-2 size-4" />
                            Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(branch)}>
                            <Edit className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedBranch(branch);
                            setDetailOpen(true);
                            setBranchUsers([]);
                            setUsersLoading(true);
                            getBranchUsersAction(brandSlug, branch.id).then(r => {
                              if (r.success) setBranchUsers(r.data);
                              setUsersLoading(false);
                            });
                          }}>
                            <UserCog className="mr-2 size-4" />
                            Kelola User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(branch)}>
                            {branch.is_active ? (
                              <ToggleLeft className="mr-2 size-4" />
                            ) : (
                              <ToggleRight className="mr-2 size-4" />
                            )}
                            {branch.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedBranch?.name ?? "Detail Cabang"}</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">Info Cabang</TabsTrigger>
                <TabsTrigger value="users">User Cabang</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-3">
                {selectedBranch && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nama Cabang</p>
                      <p className="font-medium">{selectedBranch.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Kode</p>
                      <p className="font-medium">{selectedBranch.code ?? "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Alamat</p>
                      <p className="font-medium">{selectedBranch.address ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Kota</p>
                      <p className="font-medium">{(selectedBranch as any).city ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Provinsi</p>
                      <p className="font-medium">{(selectedBranch as any).province ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Telepon</p>
                      <p className="font-medium">{selectedBranch.phone ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Whatsapp</p>
                      <p className="font-medium">{(selectedBranch as any).whatsapp ?? "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{(selectedBranch as any).email ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant={selectedBranch.is_active ? "default" : "secondary"}>
                        {selectedBranch.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                {usersLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : branchUsers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Belum ada user di cabang ini.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchUsers.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                          <TableCell>
                            <Badge variant={u.isActive ? "default" : "secondary"}>
                              {u.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Cabang" : "Tambah Cabang"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Ubah informasi cabang yang sudah ada."
                : "Isi data untuk menambahkan cabang baru."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="name">Nama Cabang *</Label>
              <Input id="name" value={form.name} onChange={(e) => handleFormChange("name", e.target.value)} placeholder="Kasservice Sragen" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="code">Kode Cabang *</Label>
              <Input id="code" value={form.code} onChange={(e) => handleFormChange("code", e.target.value)} placeholder="KSR-SRG" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Alamat</Label>
              <Input id="address" value={form.address} onChange={(e) => handleFormChange("address", e.target.value)} placeholder="Jl. Raya Sragen ..." />
            </div>
            <div>
              <Label htmlFor="city">Kota</Label>
              <Input id="city" value={form.city} onChange={(e) => handleFormChange("city", e.target.value)} placeholder="Sragen" />
            </div>
            <div>
              <Label htmlFor="province">Provinsi</Label>
              <Input id="province" value={form.province} onChange={(e) => handleFormChange("province", e.target.value)} placeholder="Jawa Tengah" />
            </div>
            <div>
              <Label htmlFor="phone">Telepon</Label>
              <Input id="phone" value={form.phone} onChange={(e) => handleFormChange("phone", e.target.value)} placeholder="0812xxxx" />
            </div>
            <div>
              <Label htmlFor="whatsapp">Whatsapp</Label>
              <Input id="whatsapp" value={form.whatsapp} onChange={(e) => handleFormChange("whatsapp", e.target.value)} placeholder="0812xxxx" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} onChange={(e) => handleFormChange("email", e.target.value)} placeholder="sragen@kasservice.com" />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Batal</Button>
            </DialogClose>
            <Button onClick={handleFormSubmit} disabled={saving}>
              {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Cabang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Toggle Active Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "deactivate" ? "Nonaktifkan Cabang" : "Aktifkan Cabang"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "deactivate"
                ? `Cabang "${confirmName}" akan dinonaktifkan. Pengguna tidak akan bisa mengakses cabang ini.`
                : `Cabang "${confirmName}" akan diaktifkan kembali.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button
              variant={confirmAction === "deactivate" ? "destructive" : "default"}
              onClick={confirmToggleActive}
            >
              {confirmAction === "deactivate" ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
