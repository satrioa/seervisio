"use client";

import * as React from "react";
import { Loader2, Users, AlertTriangle, Plus, Pencil, Power, PowerOff, RefreshCw, X, Check, Link2, KeyRound, Trash2 } from "lucide-react";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarUploadCropper } from "@/components/accounts/avatar-upload-cropper";

import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ROLE_LABELS } from "@/lib/permissions/roles";

import {
  listAccountsAction,
  createAccountAction,
  updateAccountAction,
  toggleAccountActiveAction,
  linkAccountAction,
  resetPasswordAction,
  deleteAccountFromBrandAction,
  type AccountRow,
} from "@/server/actions/account.actions";

/* ── Role Badge ── */
const ROLE_COLORS: Record<string, string> = {
  PLATFORM_OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MASTER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FRONTLINER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  TECHNICIAN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${
        ROLE_COLORS[role] || "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

/* ── Confirmation dialog ── */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 size-3 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Create/Edit dialog ── */
type DialogMode = "create" | "edit";

interface FormState {
  name: string;
  email: string;
  phone: string;
  role: string;
  branchIds: string[];
  createLogin: boolean;
  password: string;
  confirmPassword: string;
  shouldChangePassword: boolean;
}

const INIT_FORM: FormState = {
  name: "", email: "", phone: "", role: "", branchIds: [],
  createLogin: true, password: "", confirmPassword: "", shouldChangePassword: true,
};

function AccountFormDialog({
  mode,
  open,
  onOpenChange,
  form,
  setForm,
  branches,
  saving,
  error,
  onSave,
  profileId,
  brandSlug,
  currentAvatarUrl,
  onAvatarChange,
}: {
  mode: DialogMode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  branches: { id: string; name: string }[];
  saving: boolean;
  error: string | null;
  onSave: () => void;
  profileId?: string;
  brandSlug?: string;
  currentAvatarUrl?: string | null;
  onAvatarChange?: (url: string | null) => void;
}) {
  const allRoles = ["MASTER_ADMIN", "ADMIN", "FRONTLINER", "TECHNICIAN"];
  const canSave = form.name.trim() && form.email.trim() && form.role &&
    (mode !== "create" || !form.createLogin || (form.password.length >= 8 && form.password === form.confirmPassword));

  const handleToggleBranch = (branchId: string) => {
    setForm((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter((id) => id !== branchId)
        : [...prev.branchIds, branchId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah User" : "Edit Akses"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Buat akun baru untuk mengakses brand ini."
              : "Ubah role, akses cabang, atau status akun."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="size-3.5" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-2">
          {/* Avatar (edit only) */}
          {mode === "edit" && profileId && brandSlug && (
            <div className="flex flex-col items-center gap-1 border-b pb-4">
              <AvatarUploadCropper
                value={currentAvatarUrl}
                name={form.name}
                onChange={(url) => onAvatarChange?.(url)}
                disabled={saving}
                profileId={profileId}
                brandSlug={brandSlug}
              />
            </div>
          )}

          {/* Nama */}
          <div className="grid gap-1.5">
            <Label htmlFor="name" className="text-xs font-medium">
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nama lengkap"
              className="h-9 text-sm"
            />
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <Label htmlFor="email" className="text-xs font-medium">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="user@example.com"
              className="h-9 text-sm"
              readOnly={mode === "edit"}
            />
          </div>

          {/* Phone */}
          <div className="grid gap-1.5">
            <Label htmlFor="phone" className="text-xs font-medium">
              No. Telepon
            </Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="0812xxxxxxx"
              className="h-9 text-sm"
            />
          </div>

          {/* Role */}
          <div className="grid gap-1.5">
            <Label htmlFor="role" className="text-xs font-medium">
              Role <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                {allRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Buat akun login (create only) */}
          {mode === "create" && (
            <>
              <div className="flex items-start gap-2 rounded-md border p-3">
                <Checkbox
                  id="createLogin"
                  checked={form.createLogin}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, createLogin: v === true }))}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <Label htmlFor="createLogin" className="text-xs font-medium cursor-pointer">
                    Buat akun login
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    User bisa langsung login menggunakan email dan password. Nonaktifkan jika user
                    akan diundang atau dihubungkan nanti.
                  </p>
                </div>
              </div>

              {form.createLogin && (
                <div className="grid gap-3 rounded-md border p-3">
                  {/* Password */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="password" className="text-xs font-medium">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Minimal 8 karakter"
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium">
                      Konfirmasi Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Ketik ulang password"
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Should change password */}
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="shouldChangePassword"
                      checked={form.shouldChangePassword}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, shouldChangePassword: v === true }))}
                      className="mt-0.5"
                    />
                    <Label htmlFor="shouldChangePassword" className="text-xs font-medium cursor-pointer">
                      Wajib ganti password saat login pertama
                    </Label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Branch access */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Akses Cabang</Label>
            <div className="grid grid-cols-2 gap-1.5 rounded-md border p-3 max-h-44 overflow-y-auto">
              {branches.length === 0 && (
                <p className="col-span-2 text-xs text-muted-foreground">Tidak ada cabang tersedia.</p>
              )}
              {branches.map((b) => (
                <label
                  key={b.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={form.branchIds.includes(b.id)}
                    onCheckedChange={() => handleToggleBranch(b.id)}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button size="sm" onClick={onSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
            {mode === "create" ? "Simpan" : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main component ── */
export function AccountsPageClient({ brandSlug }: { brandSlug: string }) {
  const { userRole, branches } = useActiveBranch();
  const canManage = can(userRole as any, PERMISSIONS.USER_MANAGE);

  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [currentProfileId, setCurrentProfileId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  /* Search & Filters */
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("**ALL_ROLES**");
  const [branchFilter, setBranchFilter] = React.useState("**ALL_BRANCHES**");
  const [statusFilter, setStatusFilter] = React.useState("**ALL_STATUS**");
  const [authFilter, setAuthFilter] = React.useState("**ALL_AUTH**");

  /* Dialogs */
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<AccountRow | null>(null);
  const [confirmTarget, setConfirmTarget] = React.useState<AccountRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AccountRow | null>(null);
  const [resetPwOpen, setResetPwOpen] = React.useState(false);
  const [resetPwTarget, setResetPwTarget] = React.useState<AccountRow | null>(null);
  const [resetPwValue, setResetPwValue] = React.useState("");
  const [resetPwConfirm, setResetPwConfirm] = React.useState("");

  /* Form state for create/edit */
  const [form, setForm] = React.useState<FormState>(INIT_FORM);
  const [editAvatarUrl, setEditAvatarUrl] = React.useState<string | null>(null);

  const branchOptions = React.useMemo(
    () => branches.map((b) => ({ id: b.id, name: b.name })),
    [branches],
  );

  const branchMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const FILTER_SENTINELS = {
    ROLE_ALL: "**ALL_ROLES**",
    BRANCH_ALL: "**ALL_BRANCHES**",
    STATUS_ALL: "**ALL_STATUS**",
    AUTH_ALL: "**ALL_AUTH**",
  } as const;

  const filteredAccounts = React.useMemo(() => {
    let result = accounts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => {
        const branchNames = a.branchIds.map((id) => branchMap.get(id)?.toLowerCase() ?? "").join(" ");
        const roleLabel = (ROLE_LABELS[a.role as keyof typeof ROLE_LABELS] || a.role).toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          roleLabel.includes(q) ||
          branchNames.includes(q)
        );
      });
    }

    if (roleFilter !== FILTER_SENTINELS.ROLE_ALL) {
      result = result.filter((a) => a.role === roleFilter);
    }

    if (branchFilter !== FILTER_SENTINELS.BRANCH_ALL) {
      result = result.filter((a) => a.branchIds.includes(branchFilter));
    }

    if (statusFilter === "active") {
      result = result.filter((a) => a.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter((a) => !a.isActive);
    }

    if (authFilter === "linked") {
      result = result.filter((a) => !!a.authUserId);
    } else if (authFilter === "unlinked") {
      result = result.filter((a) => !a.authUserId);
    }

    return result;
  }, [accounts, searchQuery, roleFilter, branchFilter, statusFilter, authFilter, branchMap]);

  const handleResetFilters = React.useCallback(() => {
    setSearchQuery("");
    setRoleFilter(FILTER_SENTINELS.ROLE_ALL);
    setBranchFilter(FILTER_SENTINELS.BRANCH_ALL);
    setStatusFilter(FILTER_SENTINELS.STATUS_ALL);
    setAuthFilter(FILTER_SENTINELS.AUTH_ALL);
  }, []);

  const fetchAccounts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listAccountsAction(brandSlug);
    if (result.success) {
      setAccounts(result.data.accounts);
      setCurrentProfileId(result.data.currentProfileId);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug]);

  React.useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  /* ── Create ── */
  const handleCreate = React.useCallback(async () => {
    setActionError(null);
    if (!form.name.trim() || !form.email.trim() || !form.role) return;

    if (form.createLogin) {
      if (!form.password || form.password.length < 8) {
        setActionError("Password minimal 8 karakter.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setActionError("Konfirmasi password tidak cocok.");
        return;
      }
    }

    setSaving(true);
    const result = await createAccountAction(brandSlug, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      branchIds: form.branchIds,
      password: form.createLogin ? form.password : undefined,
      shouldChangePassword: form.createLogin ? form.shouldChangePassword : undefined,
    });
    setSaving(false);
    if (result.success) {
      setCreateOpen(false);
      setForm(INIT_FORM);
      void fetchAccounts();
      if (result.data.authWarning) {
        setActionError(result.data.authWarning);
      }
    } else {
      setActionError(result.error);
    }
  }, [brandSlug, form, fetchAccounts]);

  /* ── Open Edit ── */
  const handleOpenEdit = React.useCallback((account: AccountRow) => {
    setEditTarget(account);
    setForm({
      name: account.name,
      email: account.email,
      phone: account.phone ?? "",
      role: account.role,
      branchIds: [...account.branchIds],
      createLogin: false,
      password: "",
      confirmPassword: "",
      shouldChangePassword: false,
    });
    setEditAvatarUrl(account.avatarUrl);
    setActionError(null);
    setEditOpen(true);
  }, []);

  /* ── Save Edit ── */
  const handleSaveEdit = React.useCallback(async () => {
    if (!editTarget) return;
    setActionError(null);
    setSaving(true);
    const result = await updateAccountAction(brandSlug, editTarget.profileId, {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      branchIds: form.branchIds,
    });
    setSaving(false);
    if (result.success) {
      setEditOpen(false);
      setEditTarget(null);
      void fetchAccounts();
    } else {
      setActionError(result.error);
    }
  }, [brandSlug, editTarget, form, fetchAccounts]);

  /* ── Link Auth ── */
  const [linkingAuthId, setLinkingAuthId] = React.useState<string | null>(null);
  const [resettingPwId, setResettingPwId] = React.useState<string | null>(null);

  const handleLinkAuth = React.useCallback(
    async (account: AccountRow) => {
      setActionError(null);
      setLinkingAuthId(account.profileId);
      const result = await linkAccountAction(brandSlug, account.profileId, account.email);
      setLinkingAuthId(null);
      if (result.success) {
        void fetchAccounts();
        if (result.data.warning) {
          setActionError(result.data.warning);
        }
      } else {
        setActionError(result.error);
      }
    },
    [brandSlug, fetchAccounts],
  );

  /* ── Reset Password ── */
  const handleResetPassword = React.useCallback(async () => {
    if (!resetPwTarget) return;
    if (!resetPwValue || resetPwValue.length < 8) {
      setActionError("Password minimal 8 karakter.");
      return;
    }
    if (resetPwValue !== resetPwConfirm) {
      setActionError("Konfirmasi password tidak cocok.");
      return;
    }
    setActionError(null);
    setResettingPwId(resetPwTarget.profileId);
    const result = await resetPasswordAction(brandSlug, resetPwTarget.profileId, resetPwValue);
    setResettingPwId(null);
    if (result.success) {
      setResetPwOpen(false);
      setResetPwTarget(null);
      setResetPwValue("");
      setResetPwConfirm("");
    } else {
      setActionError(result.error);
    }
  }, [brandSlug, resetPwTarget, resetPwValue, resetPwConfirm]);

  /* ── Delete from brand ── */
  const handleDeleteFromBrand = React.useCallback(async () => {
    if (!deleteTarget) return;
    setActionError(null);
    setSaving(true);
    const result = await deleteAccountFromBrandAction(brandSlug, deleteTarget.profileId, deleteTarget.membershipId);
    setSaving(false);
    if (result.success) {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      void fetchAccounts();
    } else {
      setActionError(result.error);
    }
  }, [brandSlug, deleteTarget, fetchAccounts]);

  /* ── Toggle active ── */
  const handleToggleActive = React.useCallback(
    async (account: AccountRow) => {
      setActionError(null);
      setSaving(true);
      const result = await toggleAccountActiveAction(brandSlug, account.profileId, !account.isActive);
      setSaving(false);
      if (result.success) {
        setConfirmOpen(false);
        setConfirmTarget(null);
        void fetchAccounts();
      } else {
        setActionError(result.error);
      }
    },
    [brandSlug, fetchAccounts],
  );

  /* ── Permission guard ── */
  if (!canManage) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Users className="size-10 text-muted-foreground/40" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Akses Ditolak</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Anda tidak memiliki izin untuk mengelola akun.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Accounts"
        breadcrumbs={[
          { label: "Beranda", href: `/${brandSlug}/panel/dashboard` },
          { label: "Accounts" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={fetchAccounts} disabled={loading}>
              <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canManage && (
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setForm(INIT_FORM); setActionError(null); setCreateOpen(true); }}>
                <Plus className="size-3" />
                Tambah User
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="size-3.5" />
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {/* ── Search & Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        <div className="text-sm text-muted-foreground shrink-0">
          {!loading && (
            searchQuery || roleFilter !== FILTER_SENTINELS.ROLE_ALL || branchFilter !== FILTER_SENTINELS.BRANCH_ALL ||
            statusFilter !== FILTER_SENTINELS.STATUS_ALL || authFilter !== FILTER_SENTINELS.AUTH_ALL
              ? `Menampilkan ${filteredAccounts.length} dari ${accounts.length} pengguna`
              : `${accounts.length} pengguna`
          )}
        </div>
        <div className="relative flex-1">
          <Input
            placeholder="Cari nama, email, role, cabang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_SENTINELS.ROLE_ALL}>Semua Role</SelectItem>
              <SelectItem value="MASTER_ADMIN">Master Admin</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="FRONTLINER">Frontliner</SelectItem>
              <SelectItem value="TECHNICIAN">Technician</SelectItem>
            </SelectContent>
          </Select>

          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_SENTINELS.BRANCH_ALL}>Semua Cabang</SelectItem>
              {branchOptions.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_SENTINELS.STATUS_ALL}>Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>

          <Select value={authFilter} onValueChange={setAuthFilter}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="Semua Auth" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_SENTINELS.AUTH_ALL}>Semua Auth</SelectItem>
              <SelectItem value="linked">Terhubung</SelectItem>
              <SelectItem value="unlinked">Belum Terhubung</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={handleResetFilters}>
            Reset
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Users className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Belum ada akun.</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Users className="size-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-foreground">Tidak ada akun ditemukan</p>
              <p className="text-xs text-muted-foreground">Coba ubah kata kunci atau filter.</p>
              <Button variant="outline" size="sm" className="mt-1 h-7 text-xs" onClick={handleResetFilters}>
                Reset Filter
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop header */}
              <div className="hidden min-w-[860px] grid-cols-[0.6fr_1.5fr_1.5fr_1fr_1.2fr_0.8fr_0.8fr_1fr] gap-2 border-b bg-muted/50 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
                <span>Foto</span>
                <span>Nama</span>
                <span>Email</span>
                <span>Role</span>
                <span>Cabang</span>
                <span>Status</span>
                <span>Auth</span>
                <span className="text-right">Aksi</span>
              </div>

              {filteredAccounts.map((account) => {
                const branchNames = account.branchIds
                  .map((id) => branchMap.get(id))
                  .filter(Boolean) as string[];
                const branchLabel =
                  branchNames.length === 0
                    ? "Belum ada akses cabang"
                    : branchNames.length === branchOptions.length
                      ? "Semua Cabang"
                      : branchNames.slice(0, 2).join(", ") +
                        (branchNames.length > 2 ? ` +${branchNames.length - 2}` : "");

                return (
                  <div
                    key={account.membershipId}
                    className="grid min-w-[860px] grid-cols-[0.6fr_1.5fr_1.5fr_1fr_1.2fr_0.8fr_0.8fr_1fr] gap-2 border-b px-4 py-3 text-xs transition-colors last:border-0 hover:bg-muted/20 md:items-center"
                  >
                    {/* Mobile card */}
                    <div className="col-span-full flex flex-col gap-1.5 md:hidden">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{account.name}</p>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{account.email}</p>
                        </div>
                        <StatusBadge active={account.isActive} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={account.role} />
                        <span className="text-[10px] text-muted-foreground">{branchLabel}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => handleOpenEdit(account)}>
                          <Pencil className="size-2.5" />
                          Edit
                        </Button>
                        <ToggleButton account={account} onClick={() => { setConfirmTarget(account); setConfirmOpen(true); }} />
                        {account.profileId !== currentProfileId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                            title="Hapus akses user dari brand ini"
                            onClick={() => { setDeleteTarget(account); setActionError(null); setDeleteConfirmOpen(true); }}
                          >
                            <Trash2 className="size-2.5" />
                            Hapus
                          </Button>
                        )}
                        {account.authUserId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[10px] text-muted-foreground"
                            onClick={() => {
                              setResetPwTarget(account);
                              setResetPwValue("");
                              setResetPwConfirm("");
                              setActionError(null);
                              setResetPwOpen(true);
                            }}
                          >
                            {resettingPwId === account.profileId ? (
                              <Loader2 className="size-2.5 animate-spin" />
                            ) : (
                              <KeyRound className="size-2.5" />
                            )}
                            Reset Password
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[10px] text-muted-foreground"
                            onClick={() => handleLinkAuth(account)}
                            disabled={linkingAuthId === account.profileId}
                          >
                            {linkingAuthId === account.profileId ? (
                              <Loader2 className="size-2.5 animate-spin" />
                            ) : (
                              <Link2 className="size-2.5" />
                            )}
                            Hubungkan Auth
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Desktop cells */}
                    <div className="hidden md:flex items-center">
                      <Avatar className="size-7 rounded-full ring-1 ring-amber-200/30">
                        {account.avatarUrl ? (
                          <AvatarImage src={account.avatarUrl} alt={account.name} />
                        ) : null}
                        <AvatarFallback className="bg-amber-50 text-[10px] font-medium text-amber-600">
                          {getInitials(account.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="hidden min-w-0 md:block">
                      <p className="truncate font-medium text-foreground">{account.name}</p>
                    </div>
                    <div className="hidden min-w-0 md:block">
                      <p className="truncate text-muted-foreground">{account.email}</p>
                    </div>
                    <div className="hidden md:block">
                      <RoleBadge role={account.role} />
                    </div>
                    <div className="hidden truncate text-muted-foreground md:block" title={branchNames.join(", ")}>
                      {branchLabel}
                    </div>
                    <div className="hidden md:block">
                      <StatusBadge active={account.isActive} />
                    </div>
                    <div className="hidden md:block">
                      {account.authUserId ? (
                        <div className="flex items-center gap-1">
                          <AuthBadge linked />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title="Reset Password"
                            onClick={() => {
                              setResetPwTarget(account);
                              setResetPwValue("");
                              setResetPwConfirm("");
                              setActionError(null);
                              setResetPwOpen(true);
                            }}
                          >
                            {resettingPwId === account.profileId ? (
                              <Loader2 className="size-2.5 animate-spin" />
                            ) : (
                              <KeyRound className="size-2.5" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-1.5 text-[10px] font-normal text-muted-foreground hover:text-foreground"
                          onClick={() => handleLinkAuth(account)}
                          disabled={linkingAuthId === account.profileId}
                        >
                          {linkingAuthId === account.profileId ? (
                            <Loader2 className="size-2.5 animate-spin" />
                          ) : (
                            <Link2 className="size-2.5" />
                          )}
                          Hubungkan Auth
                        </Button>
                      )}
                    </div>
                    <div className="hidden items-center justify-end gap-1 md:flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Edit Akses"
                        onClick={() => handleOpenEdit(account)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <ToggleButton account={account} onClick={() => { setConfirmTarget(account); setConfirmOpen(true); }} />
                      {account.profileId !== currentProfileId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Hapus akses user dari brand ini"
                          onClick={() => { setDeleteTarget(account); setActionError(null); setDeleteConfirmOpen(true); }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create Dialog ── */}
      <AccountFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={form}
        setForm={setForm}
        branches={branchOptions}
        saving={saving}
        error={actionError}
        onSave={handleCreate}
      />

      {/* ── Edit Dialog ── */}
      {editTarget && (
        <AccountFormDialog
          mode="edit"
          open={editOpen}
          onOpenChange={(v) => { setEditOpen(v); if (!v) setEditTarget(null); }}
          form={form}
          setForm={setForm}
          branches={branchOptions}
          saving={saving}
          error={actionError}
          onSave={handleSaveEdit}
          profileId={editTarget.profileId}
          brandSlug={brandSlug}
          currentAvatarUrl={editAvatarUrl}
          onAvatarChange={setEditAvatarUrl}
        />
      )}

      {/* ── Confirm Deactivate/Activate ── */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTarget?.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
        description={
          confirmTarget?.isActive
            ? `Nonaktifkan akses ${confirmTarget.name} dari brand ini? Mereka tidak akan bisa login atau mengakses data brand.`
            : `Aktifkan kembali akses ${confirmTarget?.name} untuk brand ini?`
        }
        confirmLabel={confirmTarget?.isActive ? "Nonaktifkan" : "Aktifkan"}
        loading={saving}
        onConfirm={() => {
          if (confirmTarget) void handleToggleActive(confirmTarget);
        }}
      />

      {/* ── Delete from Brand Dialog ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(v) => { setDeleteConfirmOpen(v); if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hapus akses user?</DialogTitle>
            <DialogDescription>
              User ini akan dihapus dari brand ini. Data profil dan histori aktivitas tetap disimpan.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Nama</span>
                <span className="font-medium text-foreground">{deleteTarget.name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-foreground">{deleteTarget.email}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Role</span>
                <RoleBadge role={deleteTarget.role} />
              </div>
            </div>
          )}

          {actionError && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="size-3.5" />
              <AlertDescription className="text-xs">{actionError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }} disabled={saving}>
              Batal
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteFromBrand} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
              Hapus Akses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ── */}
      <Dialog open={resetPwOpen} onOpenChange={(v) => { setResetPwOpen(v); if (!v) setResetPwTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Setel ulang password untuk {resetPwTarget?.name} ({resetPwTarget?.email}).
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="size-3.5" />
              <AlertDescription className="text-xs">{actionError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="resetPw" className="text-xs font-medium">
                Password Baru <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resetPw"
                type="password"
                value={resetPwValue}
                onChange={(e) => setResetPwValue(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="resetPwConfirm" className="text-xs font-medium">
                Konfirmasi Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resetPwConfirm"
                type="password"
                value={resetPwConfirm}
                onChange={(e) => setResetPwConfirm(e.target.value)}
                placeholder="Ketik ulang password"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => { setResetPwOpen(false); setResetPwTarget(null); }} disabled={resettingPwId !== null}>
              Batal
            </Button>
            <Button size="sm" onClick={handleResetPassword} disabled={!resetPwValue || resetPwValue.length < 8 || resetPwValue !== resetPwConfirm || resettingPwId !== null}>
              {resettingPwId !== null && <Loader2 className="mr-1.5 size-3 animate-spin" />}
              Simpan Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Helpers ── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ── Sub-components ── */

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="outline" className="rounded-full px-2 text-[10px] text-emerald-600">
      Aktif
    </Badge>
  ) : (
    <Badge variant="secondary" className="rounded-full px-2 text-[10px]">
      Nonaktif
    </Badge>
  );
}

function AuthBadge({ linked }: { linked: boolean }) {
  if (linked) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
        <Check className="size-2.5" />
        Terhubung
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <X className="size-2.5" />
      Belum terhubung
    </span>
  );
}

function ToggleButton({
  account,
  onClick,
}: {
  account: AccountRow;
  onClick: () => void;
}) {
  const label = account.isActive ? "Nonaktifkan" : "Aktifkan";
  const Icon = account.isActive ? PowerOff : Power;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
      title={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <Icon className="size-3" />
    </Button>
  );
}
