"use client";

import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Plus, Search, Wallet, Banknote,
  Edit, CircleDollarSign, History, ShieldCheck,
  AlertTriangle, Loader2, RefreshCw, BadgeCheck,
  Globe, Store as StoreIcon, CreditCard, LayoutGrid, LayoutList, Trash2,
} from "lucide-react";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  listPaymentAccountsAction,
  createPaymentAccountAction,
  updatePaymentAccountAction,
  deletePaymentAccountAction,
  adjustPaymentAccountBalanceAction,
  getPaymentAccountMovementsAction,
  repairBranchCashAccountAction,
  getPaymentMdrTotalAction,
  type PaymentAccountRow,
  type MovementRow,
} from "@/server/actions/payment-account.actions";

import { PaymentAccountCard } from "@/components/finance/payment-accounts/payment-account-card";

/* ── Formatting Helpers ── */

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatCurrencyCompact(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return formatCurrency(n);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try { return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return value; }
}

/* ── Method Config ── */

const METHOD_CONFIG: Record<string, { label: string; color: string }> = {
  QRIS: { label: "QRIS", color: "purple" },
  TRANSFER: { label: "Transfer", color: "blue" },
  DEBIT: { label: "Debit", color: "amber" },
  EWALLET: { label: "E-Wallet", color: "cyan" },
};

const colorClasses: Record<string, string> = {
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

/* ── Page ── */

export default function PaymentAccountsPage() {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId, branches } = useActiveBranch();

  const [accounts, setAccounts] = useState<PaymentAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scopeFilter, setScopeFilter] = useState<"ALL" | "GLOBAL" | "BRANCH">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState<PaymentAccountRow | null>(null);
  const [adjustAccount, setAdjustAccount] = useState<PaymentAccountRow | null>(null);
  const [movementAccount, setMovementAccount] = useState<PaymentAccountRow | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<PaymentAccountRow | null>(null);

  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("seervis:payment-accounts:view-mode");
    if (stored === "card" || stored === "table") setViewMode(stored);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem("seervis:payment-accounts:view-mode", viewMode);
  }, [viewMode, isMounted]);

  const resolvedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES" ? activeBranchId : null;

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listPaymentAccountsAction(
      brandSlug,
      resolvedBranchId,
      search || null,
      scopeFilter,
    );
    if (result.success) {
      let filtered = result.data;
      if (statusFilter === "ACTIVE") filtered = filtered.filter((a) => a.isActive);
      else if (statusFilter === "INACTIVE") filtered = filtered.filter((a) => !a.isActive);
      setAccounts(filtered);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug, resolvedBranchId, scopeFilter, statusFilter, search]);

  useEffect(() => { void fetchAccounts(); }, [fetchAccounts]);

  const [mdrTotal, setMdrTotal] = useState(0);

  useEffect(() => {
    if (!brandSlug) return;
    getPaymentMdrTotalAction(
      brandSlug,
      resolvedBranchId,
    ).then((r) => { if (r.success) setMdrTotal(r.data); });
  }, [brandSlug, resolvedBranchId]);

  const cashTotal = accounts.filter((a) => a.type === "CASH" && a.isActive).reduce((s, a) => s + a.currentBalance, 0);
  const nonCashTotal = accounts.filter((a) => a.type !== "CASH" && a.isActive).reduce((s, a) => s + a.currentBalance, 0);
  const totalBalance = cashTotal + nonCashTotal;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader title="Akun Pembayaran"
        breadcrumbs={[{ label: "Beranda", href: `/${brandSlug}/panel/dashboard` }, { label: "Akun Pembayaran" }]} />
      <p className="text-sm text-muted-foreground -mt-4">Kelola akun kas dan rekening penampung pembayaran.</p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as typeof scopeFilter)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Semua Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua</SelectItem>
            <SelectItem value="GLOBAL">Global</SelectItem>
            <SelectItem value="BRANCH">Cabang</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="INACTIVE">Nonaktif</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari akun..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="ml-auto">
          <TabsList className="h-9">
            <TabsTrigger value="card" className="gap-1.5 text-xs">
              <LayoutGrid className="size-3.5" />
              Card
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 text-xs">
              <LayoutList className="size-3.5" />
              Table
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="size-4" />
          Tambah Akun
        </Button>
      </div>

      {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Total Saldo</span>
            <span className="text-xl font-semibold">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(totalBalance)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Kas Tunai</span>
            <span className="text-xl font-semibold">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(cashTotal)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Non Tunai</span>
            <span className="text-xl font-semibold">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(nonCashTotal)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Total Potongan MDR</span>
            <span className="text-xl font-semibold text-red-600">{loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(mdrTotal)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Cards / Table View */}
      {viewMode === "card" ? (
        loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <div className="space-y-3 bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-lg" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-28" />
                  </div>
                  <div className="flex justify-end gap-1 border-t p-2">
                    <Skeleton className="size-8 rounded-md" />
                    <Skeleton className="size-8 rounded-md" />
                    <Skeleton className="size-8 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Wallet className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Belum ada akun pembayaran.</p>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="size-3.5" />
                Tambah Akun
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((acc) => (
              <PaymentAccountCard
                key={acc.id}
                account={acc}
                onEdit={setEditAccount}
                onAdjustBalance={setAdjustAccount}
                onViewMovements={setMovementAccount}
                onDelete={setDeleteAccount}
              />
            ))}
          </div>
        )
      ) : (
        /* ── Table View ── */
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Wallet className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Belum ada akun pembayaran.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Akun</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Bank / Provider</TableHead>
                    <TableHead>Nomor / Identifier</TableHead>
                    <TableHead>Metode Tertaut</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => {
                    const isGlobal = !acc.branchId;
                    const linkedMethods = acc.linkedMethods ?? [];
                    return (
                      <TableRow key={acc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{acc.accountName}</span>
                            {acc.isSystemAccount && (
                              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                                <ShieldCheck className="size-3" />
                                Sistem
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="inline-flex items-center gap-1">
                            {isGlobal ? <><Globe className="size-3" />Semua Cabang</> : <><StoreIcon className="size-3" />{acc.branchName || "Cabang"}</>}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{acc.bankName || "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{acc.accountNumber || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {linkedMethods.length > 0 ? (
                              linkedMethods.slice(0, 3).map((m, i) => {
                                const cfg = METHOD_CONFIG[m.methodType];
                                if (!cfg) return null;
                                const cls = colorClasses[cfg.color] || "";
                                return (
                                  <span key={i} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
                                    {cfg.label}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                            {linkedMethods.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{linkedMethods.length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatCurrency(acc.currentBalance)}</TableCell>
                        <TableCell>
                          {!acc.isActive ? (
                            <Badge variant="secondary" className="text-[10px]">Nonaktif</Badge>
                          ) : acc.isDefaultReceivingAccount ? (
                            <Badge variant="default" className="text-[10px] gap-1">
                              <BadgeCheck className="size-3" />
                              Default
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-green-600">Aktif</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => setEditAccount(acc)}>
                                <Edit className="size-3.5 mr-2" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAdjustAccount(acc)}>
                                <CircleDollarSign className="size-3.5 mr-2" />Penyesuaian
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setMovementAccount(acc)}>
                                <History className="size-3.5 mr-2" />Mutasi
                              </DropdownMenuItem>
                              {!acc.isSystemAccount && !acc.isCashAccount ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                                    onClick={() => setDeleteAccount(acc)}
                                  >
                                    <Trash2 className="size-3.5 mr-2" />Hapus Akun
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Repair Cash Account */}
      {resolvedBranchId && !accounts.find((a) => a.type === "CASH" && a.isCashAccount) && (
        <RepairCashCard brandSlug={brandSlug} branchId={resolvedBranchId} onRepaired={fetchAccounts} />
      )}

      {/* Modals */}
      <CreateAccountModal
        open={showCreate}
        onOpenChange={setShowCreate}
        brandSlug={brandSlug}
        branches={branches}
        onCreated={fetchAccounts}
      />

      <EditAccountModal
        account={editAccount}
        onOpenChange={(o) => { if (!o) setEditAccount(null); }}
        brandSlug={brandSlug}
        onUpdated={fetchAccounts}
      />

      <AdjustBalanceModal
        account={adjustAccount}
        onOpenChange={(o) => { if (!o) setAdjustAccount(null); }}
        brandSlug={brandSlug}
        onAdjusted={fetchAccounts}
      />

      <MovementHistoryModal
        account={movementAccount}
        onOpenChange={(o) => { if (!o) setMovementAccount(null); }}
        brandSlug={brandSlug}
      />

      <DeleteAccountDialog
        account={deleteAccount}
        onOpenChange={(o) => { if (!o) setDeleteAccount(null); }}
        brandSlug={brandSlug}
        onDeleted={fetchAccounts}
      />
    </div>
  );
}

/* ── Delete Account Dialog ── */

function DeleteAccountDialog({
  account, onOpenChange, brandSlug, onDeleted,
}: {
  account: PaymentAccountRow | null;
  onOpenChange: (o: boolean) => void;
  brandSlug: string;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) setError(null);
  }, [account]);

  const handleDelete = async () => {
    if (!account) return;
    setSubmitting(true);
    setError(null);
    const result = await deletePaymentAccountAction(brandSlug, account.id);
    setSubmitting(false);

    if (result.success) {
      onOpenChange(false);
      onDeleted();
    } else {
      setError(result.error);
    }
  };

  return (
    <Dialog open={!!account} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base">Hapus Akun Pembayaran</DialogTitle>
          <DialogDescription className="text-xs">
            Aksi ini akan menghapus akun pembayaran yang dibuat manual.
          </DialogDescription>
        </DialogHeader>

        {account ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-medium text-foreground">{account.accountName}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {account.branchName || "Global"} · Saldo {formatCurrency(account.currentBalance)}
            </div>
          </div>
        ) : null}

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Hapus Akun
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Repair Missing Cash Account Card ── */

function RepairCashCard({ brandSlug, branchId, onRepaired }: { brandSlug: string; branchId: string; onRepaired: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRepair = async () => {
    setLoading(true);
    setError(null);
    const result = await repairBranchCashAccountAction(brandSlug, branchId);
    if (result.success) {
      onRepaired();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium">Akun kas tunai belum tersedia</p>
            <p className="text-xs text-muted-foreground">Buat akun kas tunai sistem untuk cabang ini.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <Button size="sm" onClick={handleRepair} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Perbaiki
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Create Account Modal ── */

function CreateAccountModal({
  open, onOpenChange, brandSlug, branches, onCreated,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  brandSlug: string; branches: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const { userRole } = useActiveBranch();
  const [scope, setScope] = useState<"BRANCH" | "GLOBAL">("BRANCH");
  const [branchId, setBranchId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMasterAdmin = userRole === "MASTER_ADMIN";

  useEffect(() => {
    if (!isMasterAdmin) setScope("BRANCH");
  }, [isMasterAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (scope === "BRANCH" && !branchId) { setError("Cabang wajib dipilih."); return; }
    if (!accountName.trim()) { setError("Nama akun wajib diisi."); return; }

    setSubmitting(true);
    const result = await createPaymentAccountAction(brandSlug, {
      branchId: scope === "BRANCH" ? branchId : "",
      accountName: accountName.trim(),
      bankName: bankName || null, accountNumber: accountNumber || null,
      accountHolderName: accountHolderName || null,
      initialBalance: Number(initialBalance.replace(/[^0-9]/g, "")) || 0,
      scope,
    });
    setSubmitting(false);

    if (result.success) {
      setScope("BRANCH"); setBranchId(""); setAccountName(""); setBankName("");
      setAccountNumber(""); setAccountHolderName(""); setInitialBalance("");
      onOpenChange(false);
      onCreated();
    } else {
      setError(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">Tambah Akun Pembayaran</DialogTitle>
          <DialogDescription className="text-xs">Isi detail akun pembayaran baru.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scope — only Master Admin can create global accounts */}
          <div className="space-y-1.5">
            <Label>Lingkup Akun</Label>
            {isMasterAdmin ? (
              <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRANCH">Cabang Tertentu</SelectItem>
                  <SelectItem value="GLOBAL">Semua Cabang</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Cabang Tertentu
                <p className="mt-0.5 text-[10px]">Hanya Master Admin yang dapat membuat akun global.</p>
              </div>
            )}
          </div>

          {/* Branch — only shown for branch-specific scope */}
          {scope === "BRANCH" && (
            <div className="space-y-1.5">
              <Label>Cabang</Label>
              <Select value={branchId || "PLACEHOLDER"} onValueChange={(v) => { if (v !== "PLACEHOLDER") setBranchId(v); }}>
                <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Nama Akun</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Nama akun" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Pemilik Akun</Label>
              <Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} placeholder="Nama pemilik" />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Rekening</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Nomor rekening (opsional)" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Atas Nama</Label>
              <Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} placeholder="Nama pemilik (opsional)" />
            </div>
            <div className="space-y-1.5">
              <Label>Saldo Awal</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input value={initialBalance} onChange={(e) => setInitialBalance(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" className="pl-9" />
              </div>
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>Batal</Button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Edit Account Modal ── */

function EditAccountModal({
  account, onOpenChange, brandSlug, onUpdated,
}: {
  account: PaymentAccountRow | null;
  onOpenChange: (o: boolean) => void;
  brandSlug: string;
  onUpdated: () => void;
}) {
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCashAccount = account?.isCashAccount ?? false;

  useEffect(() => {
    if (account) {
      setAccountName(account.accountName);
      setBankName(account.bankName ?? "");
      setAccountNumber(account.accountNumber ?? "");
      setAccountHolderName(account.accountHolderName ?? "");
      setIsActive(account.isActive);
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setError(null);
    if (!accountName.trim()) { setError("Nama akun wajib diisi."); return; }

    setSubmitting(true);
    const result = await updatePaymentAccountAction(brandSlug, {
      accountId: account.id,
      accountName: accountName.trim(),
      bankName: bankName || null,
      accountNumber: accountNumber || null,
      accountHolderName: accountHolderName || null,
      isActive,
    });
    setSubmitting(false);

    if (result.success) {
      onOpenChange(false);
      onUpdated();
    } else {
      setError(result.error);
    }
  };

  return (
    <Dialog open={!!account} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Akun Pembayaran</DialogTitle>
          <DialogDescription className="text-xs">{account?.accountName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isCashAccount && (
            <div className="rounded-md border border-muted bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Akun Kas Tunai Sistem Cabang
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nama Akun</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          </div>

          {!isCashAccount ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Bank / Provider</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nomor Akun</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Atas Nama</Label>
                <Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
              </div>
            </>
          ) : null}

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>Batal</Button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Adjust Balance Modal ── */

function AdjustBalanceModal({
  account, onOpenChange, brandSlug, onAdjusted,
}: {
  account: PaymentAccountRow | null;
  onOpenChange: (o: boolean) => void;
  brandSlug: string;
  onAdjusted: () => void;
}) {
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setError(null);
    const num = Number(amount.replace(/[^0-9]/g, "")) || 0;
    if (num <= 0) { setError("Jumlah harus lebih dari 0."); return; }
    if (!reason.trim()) { setError("Alasan penyesuaian wajib diisi."); return; }

    setSubmitting(true);
    const result = await adjustPaymentAccountBalanceAction(brandSlug, {
      accountId: account.id, direction, amount: num, reason: reason.trim(),
    });
    setSubmitting(false);

    if (result.success) {
      setAmount(""); setReason("");
      onOpenChange(false);
      onAdjusted();
    } else {
      setError(result.error);
    }
  };

  const num = Number(amount.replace(/[^0-9]/g, "")) || 0;
  const newBalance = account ? account.currentBalance + (direction === "IN" ? num : -num) : 0;

  return (
    <Dialog open={!!account} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base">Penyesuaian Saldo</DialogTitle>
          <DialogDescription className="text-xs">{account?.accountName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo saat ini</span>
              <span className="font-semibold">{formatCurrency(account?.currentBalance ?? 0)}</span>
            </div>
            {num > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Saldo setelah</span>
                <span className="font-semibold">{formatCurrency(newBalance)}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Tipe Penyesuaian</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as "IN" | "OUT")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">Tambah Saldo</SelectItem>
                <SelectItem value="OUT">Kurangi Saldo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Jumlah</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" className="pl-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Alasan <span className="text-red-500">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan penyesuaian saldo" rows={2} />
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>Batal</Button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Movement History Modal ── */

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  OPENING_BALANCE: "Saldo Awal",
  BALANCE_ADJUSTMENT: "Penyesuaian Saldo",
  SERVICE_PAYMENT: "Pembayaran Servis",
  POS_PAYMENT: "Penjualan POS",
  OTHER_INCOME: "Pendapatan Lain",
  OPERATING_EXPENSE: "Pengeluaran Operasional",
  STOCK_PURCHASE: "Belanja Stok",
  STOCK_PURCHASE_PAYMENT: "Pembayaran Stok",
  TRANSFER_IN: "Transfer Masuk",
  TRANSFER_OUT: "Transfer Keluar",
  BANK_FEE: "Biaya Bank",
  QRIS_SETTLEMENT: "Settlement QRIS",
  SERVICE_REFUND: "Refund Servis",
  POS_REFUND: "Refund POS",
};

function MovementHistoryModal({
  account, onOpenChange, brandSlug,
}: {
  account: PaymentAccountRow | null;
  onOpenChange: (o: boolean) => void;
  brandSlug: string;
}) {
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    getPaymentAccountMovementsAction(brandSlug, account.id).then((result) => {
      if (result.success) setMovements(result.data);
      setLoading(false);
    });
  }, [account, brandSlug]);

  return (
    <Dialog open={!!account} onOpenChange={(o) => { if (!o) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-base">Mutasi Akun</DialogTitle>
          <DialogDescription className="text-xs">{account?.accountName} — Saldo: {formatCurrency(account?.currentBalance ?? 0)}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : movements.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Belum ada mutasi.</div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Tanggal</th>
                  <th className="pb-2 pr-4">Tipe</th>
                  <th className="pb-2 pr-4 text-right">Jumlah</th>
                  <th className="pb-2 pr-4 text-right">Saldo</th>
                  <th className="pb-2">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-xs whitespace-nowrap">{formatDate(m.createdAt)}</td>
                    <td className="py-2 pr-4 text-xs">{MOVEMENT_TYPE_LABELS[m.movementType] || m.movementType}</td>
                    <td className={`py-2 pr-4 text-xs text-right font-medium ${m.direction === "IN" ? "text-green-600" : "text-red-600"}`}>
                      {m.direction === "IN" ? "+" : "-"}{formatCurrency(m.amount)}
                    </td>
                    <td className="py-2 pr-4 text-xs text-right">{formatCurrency(m.afterBalance)}</td>
                    <td className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">{m.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
