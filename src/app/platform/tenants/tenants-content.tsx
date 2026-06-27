"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  Building2,
  LogIn,
  ExternalLink,
  Plus,
  Loader2,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getTenantsListAction,
  suspendTenantAction,
  activateTenantAction,
  createTenantAction,
  type CreateTenantInput,
} from "@/server/actions/tenant.actions";
import { loginAsTenantAction } from "@/server/actions/platform-audit.actions";
import { getAllTenantsHealthAction } from "@/server/actions/platform-monitoring.actions";
import type { TenantRow, PackageRow } from "@/server/repositories/platform.repository";
import { getPackagesListAction } from "@/server/actions/package.actions";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["all", "active", "suspended", "trial", "expired"] as const;
const PLAN_OPTIONS = ["all", "starter", "pro", "enterprise"] as const;

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "suspended":
    case "expired":
    case "cancelled": return "destructive";
    case "trial": return "secondary";
    default: return "outline";
  }
}

function planVariant(plan: string): "default" | "secondary" | "outline" {
  switch (plan) {
    case "enterprise": return "default";
    case "pro": return "secondary";
    default: return "outline";
  }
}

function renderHealthDot(status: string | undefined) {
  if (!status) {
    return <span className="inline-flex size-2 rounded-full bg-muted-foreground/30" title="Unknown" />;
  }
  const colors: Record<string, string> = {
    healthy: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
    unknown: "bg-muted-foreground/30",
  };
  return (
    <span
      className={`inline-flex size-2 rounded-full ${colors[status] ?? colors.unknown}`}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  );
}

export function TenantsContent() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [detailTenant, setDetailTenant] = useState<TenantRow | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<TenantRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "activate" | "login">("suspend");
  const [saving, setSaving] = useState(false);
  const [loginConfirmOpen, setLoginConfirmOpen] = useState(false);
  const [loginTarget, setLoginTarget] = useState<TenantRow | null>(null);
  const [healthMap, setHealthMap] = useState<Record<number, string>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    brandName: "",
    brandSlug: "",
    ownerEmail: "",
    ownerName: "",
    ownerPhone: "",
    planSlug: "starter",
    password: "",
  });

  const loadPackages = useCallback(async () => {
    const res = await getPackagesListAction();
    if (res.success) setPackages(res.data ?? []);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tenantRes, healthRes] = await Promise.all([
      getTenantsListAction(),
      getAllTenantsHealthAction(),
    ]);
    if (tenantRes.success) {
      setTenants(tenantRes.data);
    }
    if (healthRes.success) {
      const map: Record<number, string> = {};
      for (const h of healthRes.data) {
        map[h.brandId] = h.status;
      }
      setHealthMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    loadPackages();
  }, [loadData, loadPackages]);

  const filtered = useMemo(() => {
    let result = tenants;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          (t.ownerName ?? "").toLowerCase().includes(q) ||
          (t.ownerEmail ?? "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.subscriptionStatus === statusFilter);
    }

    if (planFilter !== "all") {
      result = result.filter((t) => t.plan === planFilter);
    }

    return result;
  }, [tenants, searchQuery, statusFilter, planFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, planFilter]);

  const handleSuspend = (tenant: TenantRow) => {
    setConfirmTarget(tenant);
    setConfirmAction("suspend");
    setConfirmOpen(true);
  };

  const handleActivate = (tenant: TenantRow) => {
    setConfirmTarget(tenant);
    setConfirmAction("activate");
    setConfirmOpen(true);
  };

  const confirmToggle = async () => {
    if (!confirmTarget) return;
    setSaving(true);
    const action = confirmAction === "suspend" ? suspendTenantAction : activateTenantAction;
    const res = await action(confirmTarget.id);
    setSaving(false);
    if (res.success) {
      setConfirmOpen(false);
      setConfirmTarget(null);
      loadData();
    }
  };

  const handleCreateSubmit = async () => {
    if (!createForm.brandName || !createForm.brandSlug || !createForm.ownerEmail || !createForm.ownerName || !createForm.password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setCreating(true);
    const res = await createTenantAction(createForm);
    setCreating(false);
    if (res.success) {
      toast.success(`Tenant "${createForm.brandName}" created successfully.`);
      setCreateOpen(false);
      setCreateForm({
        brandName: "",
        brandSlug: "",
        ownerEmail: "",
        ownerName: "",
        ownerPhone: "",
        planSlug: "starter",
        password: "",
      });
      loadData();
    } else {
      toast.error(res.error ?? "Failed to create tenant.");
    }
  };

  const handleLoginAsClick = (tenant: TenantRow) => {
    setLoginTarget(tenant);
    setLoginConfirmOpen(true);
  };

  const confirmLoginAs = async () => {
    if (!loginTarget) return;
    const res = await loginAsTenantAction(loginTarget.id);
    setLoginConfirmOpen(false);
    setLoginTarget(null);
    if (res.success) {
      router.push(`/${res.data.slug}/panel/dashboard`);
    }
  };

  const openDetail = (tenant: TenantRow) => {
    setDetailTenant(tenant);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Tenants
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola seluruh brand dalam platform Seervisio
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-4" />
          Create Tenant
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama brand, slug, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <Filter className="size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs capitalize">
                  {s === "all" ? "Semua Status" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <Filter className="size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_OPTIONS.map((p) => (
                <SelectItem key={p} value={p} className="text-xs capitalize">
                  {p === "all" ? "Semua Paket" : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Tidak ada tenant ditemukan</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {searchQuery || statusFilter !== "all" || planFilter !== "all"
                ? "Coba ubah filter atau kata kunci pencarian"
                : "Belum ada brand yang terdaftar"}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead className="text-center">Health</TableHead>
                  <TableHead className="text-center">Branches</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((tenant) => (
                  <TableRow key={tenant.id} className="cursor-pointer" onClick={() => openDetail(tenant)}>
                    <TableCell>
                      <span className="text-xs font-medium text-foreground">{tenant.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{tenant.slug}</span>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">
                          {tenant.ownerName || "-"}
                        </p>
                        {tenant.ownerEmail && (
                          <p className="truncate text-[10px] text-muted-foreground">{tenant.ownerEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={planVariant(tenant.plan)} className="text-[10px] capitalize">
                        {tenant.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {renderHealthDot(healthMap[tenant.id])}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs tabular-nums">{tenant.branchCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs tabular-nums">{tenant.userCount}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(tenant.subscriptionStatus)} className="text-[10px] capitalize">
                        {tenant.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(tenant); }}>
                            <Eye className="mr-2 size-4" /> Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleLoginAsClick(tenant); }}>
                            <LogIn className="mr-2 size-4 text-platform" /> Login As Tenant
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {tenant.subscriptionStatus === "suspended" || tenant.subscriptionStatus === "expired" ? (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleActivate(tenant); }}>
                              <CheckCircle className="mr-2 size-4 text-emerald-500" /> Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSuspend(tenant); }}>
                              <Ban className="mr-2 size-4 text-destructive" /> Suspend
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 border-t px-3 py-2.5">
                <span className="text-[10px] text-muted-foreground">
                  {filtered.length} total
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-lg"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  size="sm"
                  className="h-8 min-w-8 rounded-lg px-2 text-xs"
                >
                  {page}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-lg"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailTenant} onOpenChange={(open) => !open && setDetailTenant(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-platform" />
              {detailTenant?.name}
            </DialogTitle>
            <DialogDescription>
              Informasi detail tenant
            </DialogDescription>
          </DialogHeader>
          {detailTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Brand</p>
                  <p className="text-sm font-medium">{detailTenant.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Slug</p>
                  <p className="text-sm text-muted-foreground">{detailTenant.slug}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Owner</p>
                  <p className="text-sm">{detailTenant.ownerName || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">{detailTenant.ownerEmail || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Package</p>
                  <Badge variant={planVariant(detailTenant.plan)} className="text-[10px] capitalize">
                    {detailTenant.plan}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Subscription</p>
                  <Badge variant={statusVariant(detailTenant.subscriptionStatus)} className="text-[10px] capitalize">
                    {detailTenant.subscriptionStatus}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Branches</p>
                  <p className="text-sm tabular-nums">{detailTenant.branchCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Users</p>
                  <p className="text-sm tabular-nums">{detailTenant.userCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Created At</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(detailTenant.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status Brand</p>
                  <Badge variant={statusVariant(detailTenant.brandStatus)} className="text-[10px] capitalize">
                    {detailTenant.brandStatus}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => { setDetailTenant(null); handleLoginAsClick(detailTenant); }}
                >
                  <LogIn className="size-3.5" />
                  Login As
                </Button>
                {detailTenant.subscriptionStatus === "suspended" || detailTenant.subscriptionStatus === "expired" ? (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => { setDetailTenant(null); handleActivate(detailTenant); }}
                  >
                    <CheckCircle className="size-3.5" />
                    Activate
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => { setDetailTenant(null); handleSuspend(detailTenant); }}
                  >
                    <Ban className="size-3.5" />
                    Suspend
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Login As Dialog */}
      <AlertDialog open={loginConfirmOpen} onOpenChange={setLoginConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login As Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan login sebagai <strong>{loginTarget?.name}</strong> dan diarahkan ke panel brand tersebut.
              Tindakan ini akan dicatat dalam audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLoginAs}>
              Login As {loginTarget?.name}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Tenant Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Tenant</DialogTitle>
            <DialogDescription>
              Create a new brand with an owner account and subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                value={createForm.brandName}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    brandName: e.target.value,
                    brandSlug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  }))
                }
                placeholder="My Store"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="brandSlug">Brand Slug *</Label>
              <Input
                id="brandSlug"
                value={createForm.brandSlug}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, brandSlug: e.target.value }))
                }
                placeholder="my-store"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="ownerName">Owner Name *</Label>
              <Input
                id="ownerName"
                value={createForm.ownerName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, ownerName: e.target.value }))
                }
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="ownerEmail">Owner Email *</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={createForm.ownerEmail}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, ownerEmail: e.target.value }))
                }
                placeholder="owner@email.com"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="ownerPhone">Phone (optional)</Label>
              <Input
                id="ownerPhone"
                value={createForm.ownerPhone}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, ownerPhone: e.target.value }))
                }
                placeholder="+6281234567890"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="planSlug">Plan</Label>
              <Select
                value={createForm.planSlug}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, planSlug: v }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.slug} className="capitalize">
                      {p.name} —{" "}
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(p.price)}
                      /mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="password">Initial Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Min. 6 characters"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <EyeIcon className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={creating}>
              {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Tenant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "suspend" ? "Suspend Tenant" : "Activate Tenant"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "suspend"
                ? `Yakin ingin menonaktifkan ${confirmTarget?.name}? Tenant ini tidak akan bisa mengakses platform.`
                : `Aktifkan kembali ${confirmTarget?.name}? Tenant akan bisa mengakses platform seperti biasa.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={confirmToggle}
              className={confirmAction === "suspend" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {saving ? "Memproses..." : confirmAction === "suspend" ? "Suspend" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
