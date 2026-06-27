"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Clock, Bell, Settings2, Database, Save, Loader2, Check, AlertCircle,
  AlertTriangle, Wrench, Building2, Globe, ShieldCheck, Mail,
  Download, RefreshCw, RotateCcw, XCircle, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  getBrandSettingsAction, saveBrandSettingsAction, sendTestEmailAction,
  type OperationalHoursInput, type NotificationSettingsInput,
  type NotificationEventConfig, type WorkflowRulesInput,
  type BrandSettingsResponse,
} from "@/server/actions/brand-settings.actions";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ROLES } from "@/lib/permissions/roles";
import {
  clearCacheAction, exportBrandConfigAction, exportUsersAction,
  exportCustomersAction, exportServicesAction, exportInventoryAction,
  exportFinanceAction, exportFullBackupAction,
  getRecordCountsAction, previewBackupAction, importBackupAction,
  resetDemoDataAction, deleteAllDataAction, factoryResetAction,
} from "@/server/actions/data-maintenance.actions";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Senin", tuesday: "Selasa", wednesday: "Rabu",
  thursday: "Kamis", friday: "Jumat", saturday: "Sabtu", sunday: "Minggu",
};

const ROLES_OPTIONS = [
  { value: "MASTER_ADMIN", label: "Master Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "FRONTLINER", label: "Frontliner" },
  { value: "TECHNICIAN", label: "Teknisi" },
];

const FREQ_OPTIONS = [
  { value: "realtime", label: "Realtime" },
  { value: "daily_summary", label: "Ringkasan Harian" },
];

const NOTIF_EVENTS: { key: string; label: string }[] = [
  { key: "SERVICE_CREATED", label: "Servis baru dibuat" },
  { key: "SERVICE_STATUS_CHANGED", label: "Status servis berubah" },
  { key: "TECHNICIAN_ASSIGNED", label: "Teknisi ditugaskan" },
  { key: "SERVICE_COMPLETED", label: "Servis selesai" },
  { key: "PAYMENT_RECEIVED", label: "Pembayaran diterima" },
  { key: "POS_TRANSACTION_CREATED", label: "Transaksi POS dibuat" },
  { key: "OPEN_SHIFT", label: "Buka toko" },
  { key: "CLOSE_SHIFT", label: "Tutup toko" },
  { key: "CASH_DIFFERENCE_DETECTED", label: "Selisih kas terdeteksi" },
  { key: "LOW_STOCK", label: "Stok menipis" },
  { key: "ACCOUNT_CHANGED", label: "Perubahan akun/user" },
];

const DEFAULT_EVENT_CONFIG: NotificationEventConfig = {
  enabled: false,
  roles: ["MASTER_ADMIN", "ADMIN"],
  emails: [],
  frequency: "realtime",
};

function defaultOperationalHours(): OperationalHoursInput {
  const branches: Record<string, any> = {};
  return {
    timezone: "Asia/Jakarta",
    branches,
    shiftTolerance: { openMinutes: 15, closeMinutes: 15 },
    markOutsideAs: "warning",
  };
}

function defaultNotificationSettings(): NotificationSettingsInput {
  const events: Record<string, NotificationEventConfig> = {};
  NOTIF_EVENTS.forEach((ev) => {
    events[ev.key] = { ...DEFAULT_EVENT_CONFIG };
  });
  return { emailEnabled: true, events };
}

function defaultWorkflowRules(): WorkflowRulesInput {
  return {
    requireTechnicianBeforeDiagnosis: true,
    requirePaidBeforePickup: true,
    allowPartialPayment: true,
    allowReopenService: false,
    defaultWarrantyDays: 30,
    defaultMdrMinTransaction: 500,
    defaultLowStockThreshold: 3,
  };
}

function daySchedule(oh: OperationalHoursInput, branchId: string, day: string) {
  return oh.branches[branchId]?.[day] ?? { isOpen: true, open: "08:00", close: "17:00" };
}

/* ── Operational Hours Tab ── */
function OperationalHoursTab({
  data, onSave, saving,
}: {
  data: OperationalHoursInput;
  onSave: (d: OperationalHoursInput) => void;
  saving: boolean;
}) {
  const { branches } = useActiveBranch();
  const [selectedBranch, setSelectedBranch] = useState("**ALL_BRANCHES**");
  const [form, setForm] = useState<OperationalHoursInput>(data);

  useEffect(() => { setForm(data); }, [data]);

  const activeBranchId = selectedBranch !== "**ALL_BRANCHES**" ? selectedBranch : null;

  function updateDay(day: string, field: string, value: any) {
    setForm((prev) => {
      const bId = activeBranchId ?? "__DEFAULT__";
      const branch: Record<string, any> = { ...(prev.branches[bId] ?? {}) };
      branch[day] = { ...(branch[day] ?? { isOpen: true, open: "08:00", close: "17:00" }), [field]: value };
      return { ...prev, branches: { ...prev.branches, [bId]: branch } };
    });
  }

  function getDayVal(day: string, field: string) {
    const bId = activeBranchId ?? "__DEFAULT__";
    const branch = (form.branches as Record<string, any>)[bId];
    return branch?.[day]?.[field];
  }

  function getBranchIds(): string[] {
    if (activeBranchId) return [activeBranchId];
    return (branches ?? []).map((b: any) => b.id);
  }

  function isDayOpen(day: string) {
    const v = getDayVal(day, "isOpen");
    return v === undefined ? true : v;
  }

  return (
    <div className="space-y-5">
      <Card className="border-amber-100/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-orange-500" />
            Zona Waktu & Preferensi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Zona Waktu</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm((p) => ({ ...p, timezone: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                  <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                  <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Toleransi Buka (menit)</Label>
              <Input
                type="number"
                className="h-9 text-sm"
                value={form.shiftTolerance.openMinutes}
                onChange={(e) => setForm((p) => ({ ...p, shiftTolerance: { ...p.shiftTolerance, openMinutes: Number(e.target.value) } }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Toleransi Tutup (menit)</Label>
              <Input
                type="number"
                className="h-9 text-sm"
                value={form.shiftTolerance.closeMinutes}
                onChange={(e) => setForm((p) => ({ ...p, shiftTolerance: { ...p.shiftTolerance, closeMinutes: Number(e.target.value) } }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.markOutsideAs === "warning"}
              onCheckedChange={(v) => setForm((p) => ({ ...p, markOutsideAs: v ? "warning" : "error" }))}
            />
            <Label className="text-xs cursor-pointer">Tandai aktivitas di luar jam operasional</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-100/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-orange-500" />
            Jadwal Operasional
          </CardTitle>
          <CardDescription className="text-xs">
            Atur jam buka dan tutup per cabang
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Pilih Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="**ALL_BRANCHES**">Semua Cabang</SelectItem>
                {(branches ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-3 py-2 border-b border-amber-50 last:border-0">
                <div className="w-20 shrink-0">
                  <Label className="text-sm font-medium">{DAY_LABELS[day]}</Label>
                </div>
                <Switch
                  checked={isDayOpen(day)}
                  onCheckedChange={(v) => updateDay(day, "isOpen", v)}
                />
                {isDayOpen(day) && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="time"
                        className="h-8 w-24 text-xs"
                        value={getDayVal(day, "open") ?? "08:00"}
                        onChange={(e) => updateDay(day, "open", e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground">s/d</span>
                      <Input
                        type="time"
                        className="h-8 w-24 text-xs"
                        value={getDayVal(day, "close") ?? "17:00"}
                        onChange={(e) => updateDay(day, "close", e.target.value)}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">|</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="time"
                        className="h-8 w-20 text-xs"
                        placeholder="Istirahat"
                        value={getDayVal(day, "breakStart") ?? ""}
                        onChange={(e) => updateDay(day, "breakStart", e.target.value || undefined)}
                      />
                      <span className="text-xs text-muted-foreground">s/d</span>
                      <Input
                        type="time"
                        className="h-8 w-20 text-xs"
                        placeholder="Selesai"
                        value={getDayVal(day, "breakEnd") ?? ""}
                        onChange={(e) => updateDay(day, "breakEnd", e.target.value || undefined)}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Simpan Jam Operasional
        </Button>
      </div>
    </div>
  );
}

/* ── Notifications Tab ── */
function NotificationsTab({
  data, onSave, saving, brandSlug,
}: {
  data: NotificationSettingsInput;
  onSave: (d: NotificationSettingsInput) => void;
  saving: boolean;
  brandSlug: string;
}) {
  const [form, setForm] = useState<NotificationSettingsInput>(data);
  const [extraEmails, setExtraEmails] = useState<Record<string, string>>({});
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { setForm(data); }, [data]);

  function toggleEvent(key: string, enabled: boolean) {
    setForm((prev) => ({
      ...prev,
      events: { ...prev.events, [key]: { ...prev.events[key], enabled } },
    }));
  }

  function setEventRoles(key: string, role: string) {
    setForm((prev) => {
      const ev = prev.events[key];
      const has = ev.roles.includes(role);
      const roles = has ? ev.roles.filter((r) => r !== role) : [...ev.roles, role];
      return { ...prev, events: { ...prev.events, [key]: { ...ev, roles } } };
    });
  }

  function setEventFreq(key: string, freq: "realtime" | "daily_summary") {
    setForm((prev) => ({
      ...prev,
      events: { ...prev.events, [key]: { ...prev.events[key], frequency: freq } },
    }));
  }

  function addEmail(key: string) {
    const email = extraEmails[key]?.trim();
    if (!email) return;
    setForm((prev) => {
      const ev = prev.events[key];
      if (ev.emails.includes(email)) return prev;
      return { ...prev, events: { ...prev.events, [key]: { ...ev, emails: [...ev.emails, email] } } };
    });
    setExtraEmails((p) => ({ ...p, [key]: "" }));
  }

  function removeEmail(key: string, email: string) {
    setForm((prev) => {
      const ev = prev.events[key];
      return { ...prev, events: { ...prev.events, [key]: { ...ev, emails: ev.emails.filter((e) => e !== email) } } };
    });
  }

  return (
    <div className="space-y-5">
      <Card className="border-amber-100/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-500" />
            Pengaturan Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.emailEnabled}
              onCheckedChange={(v) => setForm((p) => ({ ...p, emailEnabled: v }))}
            />
            <Label className="text-xs cursor-pointer">Aktifkan notifikasi email</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-100/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Event Notifikasi</CardTitle>
          <CardDescription className="text-xs">
            Aktifkan event dan pilih penerima notifikasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {NOTIF_EVENTS.map((ev) => {
            const cfg = form.events[ev.key];
            if (!cfg) return null;
            return (
              <div key={ev.key} className="rounded-lg border border-amber-100/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={cfg.enabled} onCheckedChange={(v) => toggleEvent(ev.key, v)} />
                    <Label className="text-sm font-medium cursor-pointer">{ev.label}</Label>
                  </div>
                  <Select value={cfg.frequency} onValueChange={(v: any) => setEventFreq(ev.key, v)}>
                    <SelectTrigger className="w-[130px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQ_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {cfg.enabled && (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {ROLES_OPTIONS.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setEventRoles(ev.key, role.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                            cfg.roles.includes(role.value)
                              ? "bg-orange-100 border-orange-300 text-orange-800"
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        className="h-7 text-xs flex-1"
                        value={extraEmails[ev.key] ?? ""}
                        onChange={(e) => setExtraEmails((p) => ({ ...p, [ev.key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(ev.key); } }}
                      />
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addEmail(ev.key)}>
                        Tambah
                      </Button>
                    </div>
                    {cfg.emails.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {cfg.emails.map((email) => (
                          <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-800">
                            {email}
                            <button type="button" onClick={() => removeEmail(ev.key, email)} className="text-amber-400 hover:text-amber-600">&times;</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Simpan Pengaturan Notifikasi
        </Button>
      </div>

      <Card className="border-amber-100/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4 text-orange-500" />
            Kirim Test Email
          </CardTitle>
          <CardDescription className="text-xs">
            Uji konfigurasi notifikasi email dengan mengirim email test.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"} className={testResult.success ? "bg-green-50 border-green-200" : ""}>
              {testResult.success ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle className="text-sm">{testResult.success ? "Berhasil" : "Gagal"}</AlertTitle>
              <AlertDescription className="text-xs">{testResult.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Email penerima (kosongkan untuk menggunakan email akun Anda)</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                className="h-9 text-xs"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={async () => {
                setTestResult(null);
                setTestSending(true);
                try {
                  const res = await sendTestEmailAction(brandSlug, testEmail.trim() || undefined);
                  setTestResult({
                    success: res.success,
                    message: res.success ? "Email test berhasil dikirim." : (res.error ?? "Gagal mengirim email test."),
                  });
                } catch (err: any) {
                  setTestResult({ success: false, message: err.message ?? "Gagal mengirim email test." });
                }
                setTestSending(false);
              }}
              disabled={testSending}
              size="sm"
            >
              {testSending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />}
              Kirim Test Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Workflow Rules Tab ── */
function WorkflowRulesTab({
  data, onSave, saving,
}: {
  data: WorkflowRulesInput;
  onSave: (d: WorkflowRulesInput) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<WorkflowRulesInput>(data);

  useEffect(() => { setForm(data); }, [data]);

  return (
    <div className="space-y-5">
      <Card className="border-amber-100/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-orange-500" />
            Aturan Operasional
          </CardTitle>
          <CardDescription className="text-xs">
            Konfigurasi aturan workflow untuk operasional brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-amber-50">
            <div>
              <Label className="text-sm font-medium cursor-pointer">Wajib tugaskan teknisi sebelum Diagnosa</Label>
              <p className="text-xs text-muted-foreground">Teknisi harus ditentukan sebelum service masuk tahap diagnosa</p>
            </div>
            <Switch checked={form.requireTechnicianBeforeDiagnosis} onCheckedChange={(v) => setForm((p) => ({ ...p, requireTechnicianBeforeDiagnosis: v }))} />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-amber-50">
            <div>
              <Label className="text-sm font-medium cursor-pointer">Barang hanya bisa diambil jika pembayaran lunas</Label>
              <p className="text-xs text-muted-foreground">Cegah pengambilan servis sebelum pembayaran selesai</p>
            </div>
            <Switch checked={form.requirePaidBeforePickup} onCheckedChange={(v) => setForm((p) => ({ ...p, requirePaidBeforePickup: v }))} />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-amber-50">
            <div>
              <Label className="text-sm font-medium cursor-pointer">Izinkan pembayaran parsial</Label>
              <p className="text-xs text-muted-foreground">Pelanggan dapat membayar sebagian di awal</p>
            </div>
            <Switch checked={form.allowPartialPayment} onCheckedChange={(v) => setForm((p) => ({ ...p, allowPartialPayment: v }))} />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-amber-50">
            <div>
              <Label className="text-sm font-medium cursor-pointer">Izinkan buka ulang servis selesai</Label>
              <p className="text-xs text-muted-foreground">Servis dengan status selesai dapat dibuka ulang</p>
            </div>
            <Switch checked={form.allowReopenService} onCheckedChange={(v) => setForm((p) => ({ ...p, allowReopenService: v }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Default garansi servis (hari)</Label>
              <Input
                type="number"
                className="h-9 text-sm"
                value={form.defaultWarrantyDays}
                onChange={(e) => setForm((p) => ({ ...p, defaultWarrantyDays: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minimal transaksi kena MDR</Label>
              <Input
                type="number"
                className="h-9 text-sm"
                value={form.defaultMdrMinTransaction}
                onChange={(e) => setForm((p) => ({ ...p, defaultMdrMinTransaction: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default batas stok menipis</Label>
              <Input
                type="number"
                className="h-9 text-sm"
                value={form.defaultLowStockThreshold}
                onChange={(e) => setForm((p) => ({ ...p, defaultLowStockThreshold: Number(e.target.value) }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Simpan Aturan Workflow
        </Button>
      </div>
    </div>
  );
}

/* ── Confirmation Dialog ── */

function ConfirmDialog({
  open, title, description, confirmLabel, confirmVariant,
  confirmText, onConfirm, onCancel, busy,
}: {
  open: boolean; title: string; description: string;
  confirmLabel: string; confirmVariant?: "default" | "destructive";
  confirmText?: string; onConfirm: () => void; onCancel: () => void; busy: boolean;
}) {
  const [typed, setTyped] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-4">{description}</p>
        {confirmText && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-1">
              Ketik <span className="font-mono font-bold text-foreground">{confirmText}</span> untuk konfirmasi:
            </p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmText} className="h-9 text-xs" />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>Batal</Button>
          <Button variant={confirmVariant ?? "destructive"} size="sm" onClick={onConfirm} disabled={busy || (confirmText ? typed !== confirmText : false)}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Data & Maintenance Tab ── */
function DataMaintenanceTab() {
  const params = useParams<{ brandSlug: string }>();
  const brandSlug = params?.brandSlug ?? "";
  const { userRole } = useActiveBranch();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [recordCounts, setRecordCounts] = useState<Record<string, number> | null>(null);
  const [backupPreview, setBackupPreview] = useState<{ files: any[]; totalRecords: number; zipBase64: string } | null>(null);
  const [importResult, setImportResult] = useState<{ imported: Record<string, number>; errors: string[] } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    type: "reset-demo" | "delete-all" | "factory-reset";
    step: number;
  } | null>(null);

  const isMasterAdmin = userRole === ROLES.MASTER_ADMIN || userRole === ROLES.PLATFORM_OWNER;
  const canExport = isMasterAdmin || userRole === ROLES.ADMIN;

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadBase64Zip(base64: string, filename: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    downloadBlob(new Blob([bytes], { type: "application/zip" }), filename);
  }

  async function loadRecordCounts() {
    setBusyAction("load-counts");
    try {
      const res = await getRecordCountsAction(brandSlug);
      if (res.success) setRecordCounts(res.data as any);
    } catch {}
    setBusyAction(null);
  }

  React.useEffect(() => { loadRecordCounts(); }, []);

  async function handleExportCSV(type: string, actionFn: (slug: string) => Promise<any>, filename: string) {
    setBusyAction(`export-${type}`);
    try {
      const res = await actionFn(brandSlug);
      if (!res.success) { showToast("error", res.error!); return; }
      downloadBlob(new Blob([res.data], { type: "text/csv;charset=utf-8;" }), `${filename}-${brandSlug}-${Date.now()}.csv`);
      showToast("success", `Export ${type} berhasil.`);
    } catch (err: any) {
      showToast("error", err.message ?? `Gagal export ${type}.`);
    }
    setBusyAction(null);
  }

  async function handleExportJSON() {
    setBusyAction("export-config");
    try {
      const res = await exportBrandConfigAction(brandSlug);
      if (!res.success) { showToast("error", res.error!); return; }
      downloadBlob(new Blob([res.data], { type: "application/json" }), `brand-config-${brandSlug}-${Date.now()}.json`);
      showToast("success", "Export konfigurasi berhasil.");
    } catch (err: any) {
      showToast("error", err.message ?? "Gagal export konfigurasi.");
    }
    setBusyAction(null);
  }

  async function handleExportFullBackup() {
    setBusyAction("export-backup");
    try {
      const res = await exportFullBackupAction(brandSlug);
      if (!res.success) { showToast("error", res.error!); return; }
      downloadBase64Zip(res.data, `full-backup-${brandSlug}-${Date.now()}.zip`);
      showToast("success", "Backup lengkap berhasil diekspor.");
    } catch (err: any) {
      showToast("error", err.message ?? "Gagal export backup.");
    }
    setBusyAction(null);
  }

  async function handleClearCache() {
    setBusyAction("clear-cache");
    try {
      const res = await clearCacheAction(brandSlug);
      if (res.success) showToast("success", "Cache berhasil dibersihkan.");
      else showToast("error", res.error ?? "Gagal membersihkan cache.");
    } catch (err: any) {
      showToast("error", err.message ?? "Gagal membersihkan cache.");
    }
    setBusyAction(null);
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupPreview(null);
    setImportResult(null);
    setBusyAction("preview");
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const res = await previewBackupAction(brandSlug, base64);
      if (!res.success) { showToast("error", res.error!); return; }
      setBackupPreview({ files: res.data.files, totalRecords: res.data.totalRecords, zipBase64: base64 });
    } catch (err: any) {
      showToast("error", err.message ?? "Gagal membaca file backup.");
    }
    setBusyAction(null);
    e.target.value = "";
  }

  async function handleRestoreImport() {
    if (!backupPreview) return;
    setBusyAction("import");
    try {
      const res = await importBackupAction(brandSlug, backupPreview.zipBase64, false);
      if (!res.success) { showToast("error", res.error!); return; }
      setImportResult(res.data);
      setBackupPreview(null);
      if (res.data.errors.length > 0) {
        showToast("error", `Import selesai dengan ${res.data.errors.length} error.`);
      } else {
        showToast("success", "Import backup berhasil.");
      }
      loadRecordCounts();
    } catch (err: any) {
      showToast("error", err.message ?? "Gagal mengimpor backup.");
    }
    setBusyAction(null);
  }

  async function handleResetDemoData() {
    if (!confirmState || confirmState.step < 2) return;
    setBusyAction("reset-demo");
    try {
      const res = await resetDemoDataAction(brandSlug);
      if (!res.success) { showToast("error", res.error!); return; }
      showToast("success", `Data demo direset. ${Object.values(res.data).reduce((a, b) => a + b, 0)} record dihapus.`);
      setConfirmState(null);
      loadRecordCounts();
    } catch (err: any) {
      showToast("error", err.message ?? "Gagal mereset data demo.");
    }
    setBusyAction(null);
  }

  async function handleDeleteAllData() {
    if (!confirmState || confirmState.step < 3) return;
    setBusyAction("delete-all");
    try {
      const res = await deleteAllDataAction(brandSlug);
      if (!res.success) { showToast("error", res.error!); return; }
      showToast("success", `Semua data dihapus. ${Object.values(res.data).reduce((a, b) => a + b, 0)} record dihapus.`);
      setConfirmState(null);
      loadRecordCounts();
    } catch (err: any) {
      showToast("error", err.message ?? "Gagal menghapus semua data.");
    }
    setBusyAction(null);
  }

  async function handleFactoryReset() {
    if (!confirmState || confirmState.step < 2) return;
    setBusyAction("factory-reset");
    try {
      const res = await factoryResetAction(brandSlug);
      if (!res.success) { showToast("error", res.error!); return; }
      showToast("success", `Factory reset selesai. ${Object.values(res.data).reduce((a, b) => a + b, 0)} record dihapus.`);
      setConfirmState(null);
      loadRecordCounts();
    } catch (err: any) {
      showToast("error", err.message ?? "Gagal melakukan factory reset.");
    }
    setBusyAction(null);
  }

  const confirmDialog = confirmState && (
    <ConfirmDialog
      open={true}
      title={
        confirmState.type === "reset-demo" ? "Reset Demo Data" :
        confirmState.type === "delete-all" ? "Delete All Data" :
        "Factory Reset"
      }
      description={
        confirmState.type === "reset-demo" ? "Tindakan ini akan menghapus semua data pelanggan, servis, inventaris, dan pembayaran. Data pengguna, cabang, dan pengaturan brand tidak akan terpengaruh." :
        confirmState.type === "delete-all" ? "PERINGATAN: Tindakan ini akan menghapus SEMUA data operasional brand termasuk pelanggan, servis, inventaris, pembayaran, dan catatan keuangan. Tindakan ini tidak dapat dibatalkan!" :
        "PERINGATAN: Tindakan ini akan mengembalikan brand ke pengaturan awal pabrik. Semua data operasional, konfigurasi workflow, dan pengaturan tampilan akan dihapus. Data pemilik, subscription, dan brand record akan tetap ada."
      }
      confirmLabel={
        confirmState.type === "reset-demo" ? (confirmState.step >= 2 ? "Reset Data Demo" : "Lanjut") :
        confirmState.type === "delete-all" ? (confirmState.step >= 3 ? "Delete All Data" : "Lanjut") :
        (confirmState.step >= 2 ? "Factory Reset" : "Lanjut")
      }
      confirmVariant="destructive"
      confirmText={
        confirmState.type === "reset-demo" && confirmState.step >= 2 ? "RESET DEMO DATA" :
        confirmState.type === "delete-all" && confirmState.step >= 2 ? brandSlug :
        confirmState.type === "delete-all" && confirmState.step >= 3 ? "DELETE ALL DATA" :
        confirmState.type === "factory-reset" && confirmState.step >= 2 ? "FACTORY RESET" :
        undefined
      }
      onConfirm={() => {
        if (confirmState.type === "reset-demo") {
          if (confirmState.step < 2) setConfirmState({ ...confirmState, step: 2 });
          else handleResetDemoData();
        } else if (confirmState.type === "delete-all") {
          if (confirmState.step < 3) setConfirmState({ ...confirmState, step: confirmState.step + 1 });
          else handleDeleteAllData();
        } else if (confirmState.type === "factory-reset") {
          if (confirmState.step < 2) setConfirmState({ ...confirmState, step: 2 });
          else handleFactoryReset();
        }
      }}
      onCancel={() => setConfirmState(null)}
      busy={Boolean(busyAction)}
    />
  );

  const estCounts = recordCounts ? (Object.values(recordCounts).reduce((a, b) => a + b, 0)) : 0;

  return (
    <div className="space-y-6">
      {confirmDialog}

      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-sm text-amber-800">Perhatian</AlertTitle>
        <AlertDescription className="text-xs text-amber-700">
          Fitur maintenance dapat memengaruhi laporan. Semua aktivitas akan dicatat di audit log.
          {recordCounts && <span className="block mt-1">Estimasi total record: <strong>{estCounts.toLocaleString()}</strong></span>}
        </AlertDescription>
      </Alert>

      {!isMasterAdmin && (
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-sm text-blue-800">Mode Terbatas</AlertTitle>
          <AlertDescription className="text-xs text-blue-700">
            {canExport ? "Anda hanya dapat mengekspor data." : "Anda tidak memiliki akses ke fitur ini. Hubungi Master Admin."}
          </AlertDescription>
        </Alert>
      )}

      {toast && (
        <Alert variant={toast.type === "success" ? "default" : "destructive"} className={toast.type === "success" ? "bg-green-50 border-green-200" : ""}>
          {toast.type === "success" ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle className="text-sm">{toast.type === "success" ? "Berhasil" : "Gagal"}</AlertTitle>
          <AlertDescription className="text-xs">{toast.message}</AlertDescription>
        </Alert>
      )}

      {/* ═══════ 1. BACKUP & EXPORT ═══════ */}
      <Card className="border-emerald-100/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-500" />
            Backup &amp; Export
          </CardTitle>
          <CardDescription className="text-xs">
            Ekspor data brand untuk cadangan atau migrasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Clear Cache */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
                Clear Cache
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Membersihkan cache aplikasi (revalidate path &amp; tag).</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs" disabled={!canExport || busyAction === "clear-cache"} onClick={handleClearCache}>
              {busyAction === "clear-cache" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Clear Cache
            </Button>
          </div>

          {/* Export Brand Config */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 text-blue-500" />
                Export Brand Config
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Brand, settings, targets, payment methods &mdash; JSON.</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs" disabled={!canExport || busyAction === "export-config"} onClick={handleExportJSON}>
              {busyAction === "export-config" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
              Export JSON
            </Button>
          </div>

          {/* CSV Exports Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { key: "users", label: "Users", action: exportUsersAction, file: "users" },
              { key: "customers", label: "Customers", action: exportCustomersAction, file: "customers" },
              { key: "services", label: "Services", action: exportServicesAction, file: "services" },
              { key: "inventory", label: "Inventory", action: exportInventoryAction, file: "inventory" },
              { key: "finance", label: "Finance", action: exportFinanceAction, file: "finance" },
            ].map(({ key, label, action, file }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border gap-2">
                <span className="text-xs font-medium">{label}</span>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" disabled={!canExport || busyAction === `export-${key}`} onClick={() => handleExportCSV(key, action, file)}>
                  {busyAction === `export-${key}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  CSV
                </Button>
              </div>
            ))}
          </div>

          {/* Full Backup */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-emerald-200/50 bg-emerald-50/30">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                Full Operational Backup
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">ZIP</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customers, services, payments, inventory, movements, branches, users, accounts, methods, settings.
                {recordCounts && <span className="block text-emerald-600">~{estCounts.toLocaleString()} total records</span>}
              </p>
            </div>
            <Button variant="default" size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" disabled={!isMasterAdmin || busyAction === "export-backup"} onClick={handleExportFullBackup}>
              {busyAction === "export-backup" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
              {busyAction === "export-backup" ? "Mengekspor..." : "Export ZIP"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══════ 2. RECOVERY & RESTORE ═══════ */}
      <Card className="border-blue-100/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-blue-500" />
            Recovery &amp; Restore
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium ml-1">BETA</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Pulihkan data dari file backup yang telah diekspor sebelumnya
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Import Backup */}
          <div className="p-4 rounded-lg border">
            <p className="text-sm font-medium mb-1">Import Backup</p>
            <p className="text-xs text-muted-foreground mb-3">Upload file ZIP hasil export untuk mengembalikan data brand.</p>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-xs text-muted-foreground hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
              <input type="file" accept=".zip" className="hidden" onChange={handleFileImport} disabled={!isMasterAdmin || busyAction === "preview" || busyAction === "import"} />
              {busyAction === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busyAction === "preview" ? "Membaca file..." : "Pilih file ZIP"}
            </label>

            {backupPreview && (
              <div className="mt-3 space-y-2 rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-semibold">Preview Backup ({backupPreview.totalRecords} total records)</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {backupPreview.files.map((f) => (
                    <div key={f.name} className="flex items-center justify-between text-[10px]">
                      <span className={f.valid ? "" : "text-red-500"}>{f.name}</span>
                      <span className={f.valid ? "text-muted-foreground" : "text-red-500"}>
                        {f.valid ? `${f.recordCount} records` : f.error ?? "Invalid"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setBackupPreview(null)}>Batal</Button>
                  <Button variant="default" size="sm" className="text-xs" disabled={busyAction === "import"} onClick={handleRestoreImport}>
                    {busyAction === "import" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                    {busyAction === "import" ? "Merestorasi..." : "Restore Backup"}
                  </Button>
                </div>
              </div>
            )}

            {importResult && (
              <div className="mt-3 space-y-1 rounded-lg border bg-green-50/30 p-3">
                <p className="text-xs font-semibold text-green-700">Hasil Import</p>
                {Object.entries(importResult.imported).filter(([, v]) => v > 0).map(([table, count]) => (
                  <div key={table} className="flex justify-between text-[10px]">
                    <span>{table}</span>
                    <span className="text-muted-foreground">{count} records</span>
                  </div>
                ))}
                {importResult.errors.length > 0 && (
                  <div className="mt-1 text-[10px] text-red-500">
                    {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Backup History */}
          <div className="p-4 rounded-lg border border-dashed">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Backup History</p>
                <p className="text-xs text-muted-foreground">Riwayat backup yang telah diekspor tercatat di audit log.</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Audit Log</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════ 3. DANGEROUS ZONE ═══════ */}
      <Card className="border-red-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Dangerous Zone
          </CardTitle>
          <CardDescription className="text-xs text-red-600/70">
            Tindakan di bawah ini bersifat destruktif dan tidak dapat dibatalkan. Harap berhati-hati.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Reset Demo Data */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-red-200/50 bg-red-50/20">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5 text-red-700">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                Reset Demo Data
              </p>
              <p className="text-xs text-red-600/70 mt-0.5">
                Hapus data demo: pelanggan, servis, inventaris, pembayaran.
                {recordCounts && <span className="block">~{recordCounts.customers + recordCounts.services + recordCounts.servicePayments + recordCounts.inventoryItems + recordCounts.inventoryMovements + recordCounts.serviceSparepartUsages} record akan terpengaruh</span>}
                <span className="block">Data pengguna, cabang, dan pengaturan brand AMAN.</span>
              </p>
            </div>
            <Button variant="outline" size="sm" className="text-xs border-red-300 text-red-600 hover:bg-red-50" disabled={!isMasterAdmin || Boolean(busyAction)} onClick={() => setConfirmState({ type: "reset-demo", step: 1 })}>
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>

          {/* Delete All Data */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-red-300 bg-red-50/30">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5 text-red-700">
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                Delete All Data
              </p>
              <p className="text-xs text-red-600/70 mt-0.5">
                Hapus SEMUA data operasional brand.
                {recordCounts && <span className="block">~{estCounts.toLocaleString()} record akan terpengaruh</span>}
                <span className="block">Triple confirmation required. Tindakan permanen!</span>
              </p>
            </div>
            <Button variant="destructive" size="sm" className="text-xs" disabled={!isMasterAdmin || Boolean(busyAction)} onClick={() => setConfirmState({ type: "delete-all", step: 1 })}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete All
            </Button>
          </div>

          {/* Factory Reset */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-red-400/50 bg-red-100/20">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5 text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                Factory Reset
              </p>
              <p className="text-xs text-red-600/70 mt-0.5">
                Kembalikan brand ke pengaturan awal pabrik.
                {recordCounts && <span className="block">~{estCounts.toLocaleString()} record akan dihapus</span>}
                <span className="block">Data pemilik, subscription, dan brand record tetap ada.</span>
              </p>
            </div>
            <Button variant="destructive" size="sm" className="text-xs" disabled={!isMasterAdmin || Boolean(busyAction)} onClick={() => setConfirmState({ type: "factory-reset", step: 1 })}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Factory Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Skeleton ── */
function PageSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full max-w-md" />
      <Card className="border-amber-100/60 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main Component ── */
export function SystemSettings() {
  const params = useParams<{ brandSlug: string }>();
  const brandSlug = params?.brandSlug ?? "";
  const { userRole } = useActiveBranch();

  const isMasterAdmin = userRole === ROLES.MASTER_ADMIN || userRole === ROLES.PLATFORM_OWNER;
  const canView = can(userRole as any, PERMISSIONS.SETTINGS_MANAGE);

  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const [businessHours, setBusinessHours] = useState<OperationalHoursInput>(defaultOperationalHours());
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsInput>(defaultNotificationSettings());
  const [workflowRules, setWorkflowRules] = useState<WorkflowRulesInput>(defaultWorkflowRules());

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!brandSlug) return;
    setLoading(true);
    try {
      const result = await getBrandSettingsAction(brandSlug);
      if (result.success) {
        if (result.data.businessHours) setBusinessHours(result.data.businessHours);
        if (result.data.notificationSettings) setNotificationSettings(result.data.notificationSettings);
        if (result.data.workflowRules) setWorkflowRules(result.data.workflowRules);
      }
    } catch (err: any) {
      console.error("Failed to load brand settings:", err);
    }
    setLoading(false);
  }, [brandSlug]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSave(section: "operational_hours" | "notification_settings" | "workflow_rules", data: any) {
    if (!isMasterAdmin) return;
    setSavingSection(section);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const result = await saveBrandSettingsAction(brandSlug, section, data);
      if (result.success) {
        setSaveSuccess("Pengaturan berhasil disimpan.");
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        setSaveError(result.error ?? "Gagal menyimpan pengaturan.");
      }
    } catch (err: any) {
      setSaveError(err.message ?? "Gagal menyimpan pengaturan.");
    }
    setSavingSection(null);
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki izin untuk melihat halaman ini.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Settings2 className="size-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">System Settings</h2>
          <p className="text-xs text-muted-foreground">
            Atur jam operasional, notifikasi, dan aturan workflow untuk operasional brand.
          </p>
        </div>
      </div>

      {!isMasterAdmin && (
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-sm text-blue-800">Mode Baca Saja</AlertTitle>
          <AlertDescription className="text-xs text-blue-700">
            Anda dapat melihat pengaturan. Hanya Master Admin yang dapat menyimpan perubahan.
          </AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-sm text-green-800">Berhasil</AlertTitle>
          <AlertDescription className="text-xs text-green-700">{saveSuccess}</AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <PageSkeleton />
      ) : (
        <Tabs defaultValue="operational-hours" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto border-b bg-transparent p-0 mb-4">
            <TabsTrigger value="operational-hours" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 pb-2 px-3 text-xs data-[state=active]:text-orange-700 data-[state=active]:shadow-none">
              <Clock className="mr-1.5 size-3.5" />
              Operational Hours
            </TabsTrigger>
            <TabsTrigger value="notifications" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 pb-2 px-3 text-xs data-[state=active]:text-orange-700 data-[state=active]:shadow-none">
              <Bell className="mr-1.5 size-3.5" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="workflow-rules" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 pb-2 px-3 text-xs data-[state=active]:text-orange-700 data-[state=active]:shadow-none">
              <Settings2 className="mr-1.5 size-3.5" />
              Workflow Rules
            </TabsTrigger>
            <TabsTrigger value="data-maintenance" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 pb-2 px-3 text-xs data-[state=active]:text-orange-700 data-[state=active]:shadow-none">
              <Database className="mr-1.5 size-3.5" />
              Data &amp; Maintenance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="operational-hours">
            <OperationalHoursTab
              data={businessHours}
              onSave={(d) => handleSave("operational_hours", d)}
              saving={savingSection === "operational_hours"}
            />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab
              data={notificationSettings}
              onSave={(d) => handleSave("notification_settings", d)}
              saving={savingSection === "notification_settings"}
              brandSlug={brandSlug}
            />
          </TabsContent>

          <TabsContent value="workflow-rules">
            <WorkflowRulesTab
              data={workflowRules}
              onSave={(d) => handleSave("workflow_rules", d)}
              saving={savingSection === "workflow_rules"}
            />
          </TabsContent>

          <TabsContent value="data-maintenance">
            <DataMaintenanceTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
