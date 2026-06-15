"use client";

import * as React from "react";
import { useCallback, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Store, Wallet, Banknote, Building2, Smartphone, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Link as LinkIcon, Unlink,
} from "lucide-react";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import {
  listBranchPaymentMethodsAction,
  linkPaymentMethodAccountAction,
  togglePaymentMethodActiveAction,
  ensureSystemPaymentMethodsAction,
  listCompatibleAccountsAction,
  repairBranchCashMethodAction,
  updateMethodMdrAction,
  type BranchPaymentMethodRow,
} from "@/server/actions/payment-method.actions";

/* ── Constants ── */

const METHOD_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; color: string; description: string }> = {
  CASH: { label: "Cash", icon: Wallet, color: "green", description: "Pembayaran tunai di kas cabang" },
  QRIS: { label: "QRIS", icon: Smartphone, color: "purple", description: "Pembayaran QRIS" },
  TRANSFER: { label: "Transfer", icon: Building2, color: "blue", description: "Transfer bank" },
  DEBIT: { label: "Debit", icon: Banknote, color: "amber", description: "Pembayaran kartu debit / EDC" },
  EWALLET: { label: "E-Wallet", icon: Wallet, color: "cyan", description: "Pembayaran e-wallet" },
};

const colorClasses: Record<string, { bg: string; text: string; border: string; light: string }> = {
  green: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800", light: "bg-green-50/50 dark:bg-green-950/20" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", light: "bg-purple-50/50 dark:bg-purple-950/20" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800", light: "bg-blue-50/50 dark:bg-blue-950/20" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", light: "bg-amber-50/50 dark:bg-amber-950/20" },
  cyan: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-800", light: "bg-cyan-50/50 dark:bg-cyan-950/20" },
};

/* ── Page ── */

export default function PaymentMethodsPage() {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { activeBranchId, branches, activeBranchName } = useActiveBranch();

  const [methods, setMethods] = useState<BranchPaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);

  const [linkMethod, setLinkMethod] = useState<BranchPaymentMethodRow | null>(null);
  const [pendingActiveMethod, setPendingActiveMethod] = useState<BranchPaymentMethodRow | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expandedMdr, setExpandedMdr] = useState<string | null>(null);

  const resolvedBranchId = activeBranchId && activeBranchId !== "ALL_BRANCHES" ? activeBranchId : null;
  const displayBranchName = resolvedBranchId ? branches.find((b) => b.id === resolvedBranchId)?.name ?? activeBranchName : activeBranchName;

  const fetchMethods = useCallback(async () => {
    if (!resolvedBranchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await listBranchPaymentMethodsAction(brandSlug, resolvedBranchId);
    if (result.success) {
      setMethods(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug, resolvedBranchId]);

  useEffect(() => { void fetchMethods(); }, [fetchMethods]);

  const handleRepair = async () => {
    if (!resolvedBranchId) return;
    setRepairing(true);
    setSuccessMsg(null);
    const result = await ensureSystemPaymentMethodsAction(brandSlug, resolvedBranchId);
    if (result.success) {
      setSuccessMsg(`Berhasil: ${result.data.created} metode dibuat, ${result.data.linked} ditautkan.`);
      void fetchMethods();
    } else {
      setError(result.error);
    }
    setRepairing(false);
  };

  const handleToggleActive = async (method: BranchPaymentMethodRow, checked: boolean) => {
    if (method.methodCode === "CASH") return;

    if (checked) {
      if (!method.linkedAccountId) {
        setPendingActiveMethod(method);
        setLinkMethod(method);
        return;
      }
      const result = await togglePaymentMethodActiveAction(brandSlug, method.branchId, method.methodCode, true);
      if (result.success) {
        setMethods((prev) => prev.map((m) => m.methodCode === method.methodCode ? result.data : m));
      } else {
        setError(result.error);
      }
      return;
    }

    const result = await togglePaymentMethodActiveAction(brandSlug, method.branchId, method.methodCode, false);
    if (result.success) {
      setMethods((prev) => prev.map((m) => m.methodCode === method.methodCode ? result.data : m));
    } else {
      setError(result.error);
    }
  };

  const handleRepairCash = async (method: BranchPaymentMethodRow) => {
    const result = await repairBranchCashMethodAction(brandSlug, method.branchId);
    if (result.success) {
      setMethods((prev) => prev.map((m) => m.methodCode === "CASH" ? result.data : m));
    } else {
      setError(result.error);
    }
  };

  const handleSaveMdr = useCallback(async (methodCode: string, config: { enabled: boolean; ratePercent: number; fixedFee: number; minAmount: number }) => {
    const result = await updateMethodMdrAction(brandSlug, methodCode, config);
    if (result.success) {
      setExpandedMdr(null);
      void fetchMethods();
    } else {
      setError(result.error);
    }
  }, [brandSlug, fetchMethods]);

  const handleLinkClose = useCallback(() => {
    setLinkMethod(null);
    setPendingActiveMethod(null);
  }, []);

  const handleLinkSuccess = useCallback(() => {
    setPendingActiveMethod(null);
    void fetchMethods();
  }, [fetchMethods]);

  if (!resolvedBranchId) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Metode Pembayaran" breadcrumbs={[
          { label: "Beranda", href: `/${brandSlug}/panel/dashboard` },
          { label: "Metode Pembayaran" },
        ]} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Store className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Pilih cabang untuk melihat metode pembayaran.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Metode Pembayaran" breadcrumbs={[
        { label: "Beranda", href: `/${brandSlug}/panel/dashboard` },
        { label: "Metode Pembayaran" },
      ]} />
      <p className="text-sm text-muted-foreground -mt-4">Tautkan metode pembayaran sistem ke akun pembayaran cabang.</p>

      {displayBranchName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="size-4" />
          <span>{displayBranchName}</span>
        </div>
      )}

      {successMsg && (
        <Alert variant="default" className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="size-4 text-green-600" />
          <AlertTitle className="text-sm">Berhasil</AlertTitle>
          <AlertDescription className="text-xs">{successMsg}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleRepair} disabled={repairing} className="gap-2">
          {repairing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Perbaiki Default
        </Button>
      </div>

      {/* Method Cards */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {methods.map((method) => {
            const cfg = METHOD_CONFIG[method.methodType] || METHOD_CONFIG.CASH;
            const cc = colorClasses[cfg.color] || colorClasses.green;
            const Icon = cfg.icon;
            const isCash = method.methodCode === "CASH";
            const hasMdr = ["QRIS", "DEBIT", "EWALLET"].includes(method.methodCode);
            const isMdrOpen = expandedMdr === method.methodCode;

            return (
              <Card key={method.methodCode} className={`${cc.light}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${cc.bg}`}>
                        <Icon className={`size-5 ${cc.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{cfg.label}</span>
                          <Badge variant="secondary" className="text-[10px] h-5">Sistem</Badge>
                          {method.isActive || isCash ? (
                            <Badge className="text-[10px] h-5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Aktif</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-5">Nonaktif</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{cfg.description}</p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Akun:</span>
                          {method.linkedAccountName ? (
                            <span className="text-xs font-medium">{method.linkedAccountName}</span>
                          ) : isCash ? (
                            <span className="text-xs text-muted-foreground italic">Akun kas belum tersedia</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Belum ditautkan</span>
                          )}
                        </div>

                        {hasMdr && method.mdrEnabled && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">MDR: {method.mdrRatePercent}%</span>
                            {method.mdrMinAmount > 0 && (
                              <span className="text-[10px] text-muted-foreground">| Min: Rp {method.mdrMinAmount.toLocaleString("id-ID")}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isCash && (
                        <div className="flex items-center gap-2 mr-2">
                          <span className="text-xs text-muted-foreground">Aktif</span>
                          <Switch
                            checked={method.isActive}
                            onCheckedChange={(checked) => handleToggleActive(method, checked)}
                          />
                        </div>
                      )}

                      {isCash && !method.linkedAccountId ? (
                        <Button size="sm" variant="outline" onClick={() => handleRepairCash(method)} className="gap-2">
                          <RefreshCw className="size-3.5" />
                          Perbaiki Akun Kas
                        </Button>
                      ) : !isCash ? (
                        <div className="flex items-center gap-1">
                          {hasMdr && (
                            <Button size="sm" variant="ghost" onClick={() => setExpandedMdr(isMdrOpen ? null : method.methodCode)} className="gap-1">
                              MDR
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={method.linkedAccountName ? "outline" : "default"}
                            onClick={() => setLinkMethod(method)}
                            className="gap-2"
                          >
                            <LinkIcon className="size-3.5" />
                            {method.linkedAccountName ? "Ganti Akun" : "Hubungkan Akun"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isMdrOpen && (
                    <MdrSettingsForm
                      method={method}
                      onSave={(config) => handleSaveMdr(method.methodCode, config)}
                      onCancel={() => setExpandedMdr(null)}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Link Account Modal */}
      <LinkAccountModal
        method={linkMethod}
        activateAfterLink={!!pendingActiveMethod}
        onOpenChange={handleLinkClose}
        brandSlug={brandSlug}
        onLinked={handleLinkSuccess}
        onError={setError}
      />
    </div>
  );
}

/* ── Link Account Modal ── */

function LinkAccountModal({
  method, onOpenChange, brandSlug, onLinked, onError, activateAfterLink,
}: {
  method: BranchPaymentMethodRow | null;
  onOpenChange: (o: boolean) => void;
  brandSlug: string;
  onLinked: () => void;
  onError: (err: string) => void;
  activateAfterLink: boolean;
}) {
  const [accounts, setAccounts] = useState<{ id: string; accountName: string; type: string; bankName: string | null }[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!method) return;
    setLoading(true);
    setSelectedId(method.linkedAccountId ?? "");
    setIsActive(activateAfterLink ? true : method.isActive);
    listCompatibleAccountsAction(brandSlug, method.branchId, method.methodCode).then((result) => {
      if (result.success) {
        setAccounts(result.data);
      }
      setLoading(false);
    });
  }, [method, brandSlug, activateAfterLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) return;
    setError(null);

    if (isActive && !selectedId) {
      setError("Pilih akun pembayaran atau nonaktifkan metode.");
      return;
    }

    setSubmitting(true);
    const result = await linkPaymentMethodAccountAction(brandSlug, {
      branchId: method.branchId,
      methodCode: method.methodCode,
      paymentAccountId: selectedId,
      isActive,
    });
    setSubmitting(false);

    if (result.success) {
      onOpenChange(false);
      onLinked();
    } else {
      setError(result.error);
    }
  };

  const isAlreadyLinked = !!method?.linkedAccountId;

  return (
    <Dialog open={!!method} onOpenChange={(o) => { if (!o && !submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base">{isAlreadyLinked ? "Ganti Akun Pembayaran" : "Tautkan Akun Pembayaran"}</DialogTitle>
          <DialogDescription className="text-xs">
            {method?.label} — {method?.branchName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {loading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">Belum ada akun yang sesuai.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Buat akun pembayaran terlebih dahulu di menu Akun Pembayaran.
              </p>
              <Button type="button" size="sm" variant="outline" className="mt-3 gap-2" onClick={() => onOpenChange(false)}>
                <Wallet className="size-3.5" />
                Buat Akun Pembayaran
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Akun Pembayaran</Label>
                <Select value={selectedId || "PLACEHOLDER"} onValueChange={(v) => { if (v !== "PLACEHOLDER") setSelectedId(v); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.accountName}{a.bankName ? ` (${a.bankName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Aktif</Label>
                  <p className="text-xs text-muted-foreground">Aktifkan metode untuk cabang ini</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>Batal</Button>
            <Button type="submit" size="sm" disabled={submitting || accounts.length === 0} className="gap-2">
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── MDR Settings Form ── */

function MdrSettingsForm({
  method, onSave, onCancel,
}: {
  method: BranchPaymentMethodRow;
  onSave: (config: { enabled: boolean; ratePercent: number; fixedFee: number; minAmount: number }) => void;
  onCancel: () => void;
}) {
  const [enabled, setEnabled] = useState(method.mdrEnabled);
  const [ratePercent, setRatePercent] = useState(String(method.mdrRatePercent));
  const [fixedFee, setFixedFee] = useState(String(method.mdrFixedFee));
  const [minAmount, setMinAmount] = useState(String(method.mdrMinAmount));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave({
      enabled,
      ratePercent: Number(ratePercent.replace(",", ".")) || 0,
      fixedFee: Number(fixedFee.replace(/[^0-9]/g, "")) || 0,
      minAmount: Number(minAmount.replace(/[^0-9]/g, "")) || 0,
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Konfigurasi MDR</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Aktifkan MDR</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {enabled && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Persentase (%)</Label>
            <Input
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
              placeholder="0.7"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Biaya tetap</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Rp</span>
              <Input
                value={fixedFee}
                onChange={(e) => setFixedFee(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="h-8 text-xs pl-7"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Min. transaksi</Label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Rp</span>
              <Input
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="h-8 text-xs pl-7"
              />
            </div>
          </div>
        </div>
      )}

      {enabled && method.mdrMinAmount > 0 && (
        <div className="rounded bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground">
          Contoh: transaksi Rp 100.000 dengan MDR {method.mdrRatePercent}% = potongan Rp {Math.round(100000 * method.mdrRatePercent / 100).toLocaleString("id-ID")}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Batal</Button>
        <Button type="submit" size="sm" disabled={saving}>Simpan MDR</Button>
      </div>
    </form>
  );
}
