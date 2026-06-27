"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Globe, Moon, Sun, Monitor, Clock, Calendar, Loader2, Check, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getUserPreferencesAction,
  updateUserPreferencesAction,
  type UserPreferencesData,
} from "@/server/actions/account-settings.actions";

interface Props {
  brandSlug: string;
}

const LANGUAGES = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
];

const THEMES = [
  { value: "system", label: "Sistem", icon: Monitor },
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
];

const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB (UTC+7)" },
  { value: "Asia/Makassar", label: "WITA (UTC+8)" },
  { value: "Asia/Jayapura", label: "WIT (UTC+9)" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

export function PreferencesTab({ brandSlug }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<UserPreferencesData>({
    language: "id",
    theme: "system",
    timezone: "Asia/Jakarta",
    sidebarCollapsed: false,
    dateFormat: "DD/MM/YYYY",
  });

  useEffect(() => {
    getUserPreferencesAction(brandSlug).then((result) => {
      if (result.success) {
        setPrefs(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [brandSlug]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateUserPreferencesAction(brandSlug, prefs);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="shadow-xs">
        <CardContent className="space-y-4 py-6">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Preferensi</CardTitle>
        <CardDescription className="text-xs">Sesuaikan pengalaman aplikasi sesuai keinginan Anda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="language" className="text-xs font-medium">
            <Globe className="mr-1.5 inline size-3.5" />
            Bahasa
          </Label>
          <Select
            value={prefs.language}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, language: value }))}
          >
            <SelectTrigger id="language" className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="text-xs">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">
            <Monitor className="mr-1.5 inline size-3.5" />
            Tema
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              return (
                <button
                  key={theme.value}
                  type="button"
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${
                    prefs.theme === theme.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setPrefs((prev) => ({ ...prev, theme: theme.value }))}
                >
                  <Icon className="size-5" />
                  {theme.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone" className="text-xs font-medium">
            <Clock className="mr-1.5 inline size-3.5" />
            Zona Waktu
          </Label>
          <Select
            value={prefs.timezone}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, timezone: value }))}
          >
            <SelectTrigger id="timezone" className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value} className="text-xs">
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFormat" className="text-xs font-medium">
            <Calendar className="mr-1.5 inline size-3.5" />
            Format Tanggal
          </Label>
          <Select
            value={prefs.dateFormat}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, dateFormat: value }))}
          >
            <SelectTrigger id="dateFormat" className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((fmt) => (
                <SelectItem key={fmt.value} value={fmt.value} className="text-xs">
                  {fmt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="sidebarCollapsed" className="text-xs font-medium">
              Sidebar Tertutup
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Tutup sidebar secara default
            </p>
          </div>
          <Switch
            id="sidebarCollapsed"
            checked={prefs.sidebarCollapsed}
            onCheckedChange={(checked) =>
              setPrefs((prev) => ({ ...prev, sidebarCollapsed: checked }))
            }
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            size="sm"
            className="gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4 text-emerald-400" />
            ) : (
              <Check className="size-4" />
            )}
            {saving ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan Preferensi"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
