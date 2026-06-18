"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Clock, Bell, Settings2, Database, Save, Loader2, Check, AlertCircle,
  AlertTriangle, Wrench, Building2, Globe, ShieldCheck, Mail,
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

/* ── Data & Maintenance Tab ── */
function DataMaintenanceTab() {
  return (
    <div className="space-y-5">
      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-sm text-amber-800">Perhatian</AlertTitle>
        <AlertDescription className="text-xs text-amber-700">
          Fitur maintenance dapat memengaruhi laporan. Semua aktivitas akan dicatat di audit log.
        </AlertDescription>
      </Alert>

      <Card className="border-amber-100/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Tools Maintenance</CardTitle>
          <CardDescription className="text-xs">
            Alat bantu untuk pengelolaan data brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-amber-100/60">
            <div>
              <p className="text-sm font-medium">Historical Data Import</p>
              <p className="text-xs text-muted-foreground">Import data historis untuk bulan sebelumnya.</p>
            </div>
            <Button variant="outline" size="sm" disabled className="text-xs border-amber-200">
              <Database className="h-3.5 w-3.5 mr-1" />
              Siapkan Import
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-amber-100/60">
            <div>
              <p className="text-sm font-medium">Export Master Data</p>
              <p className="text-xs text-muted-foreground">Export data pelanggan, servis, inventori, dan akun pembayaran.</p>
            </div>
            <Button variant="outline" size="sm" disabled className="text-xs border-amber-200">
              <Database className="h-3.5 w-3.5 mr-1" />
              Export Data
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-amber-100/60">
            <div>
              <p className="text-sm font-medium">Recalculate Summary</p>
              <p className="text-xs text-muted-foreground">Hitung ulang ringkasan dashboard dari ledger dan mutasi.</p>
            </div>
            <Button variant="outline" size="sm" disabled className="text-xs border-amber-200">
              <RefreshCwIcon className="h-3.5 w-3.5 mr-1" />
              Recalculate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RefreshCwIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
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
