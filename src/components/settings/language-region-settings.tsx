"use client";

import * as React from "react";
import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Clock, Calendar, Loader2, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getUserPreferencesAction,
  updateUserPreferencesAction,
  type UserPreferencesData,
} from "@/server/actions/account-settings.actions";
import { useParams } from "next/navigation";

const LANGUAGES = [
  { value: "id", label: "🇮🇩 Bahasa Indonesia" },
  { value: "en", label: "🇺🇸 English" },
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

export function LanguageRegionSettings() {
  const params = useParams();
  const brandSlug = params?.brandSlug as string;

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [prefs, setPrefs] = React.useState<UserPreferencesData>({
    language: "id",
    theme: "system",
    timezone: "Asia/Jakarta",
    sidebarCollapsed: false,
    dateFormat: "DD/MM/YYYY",
  });

  React.useEffect(() => {
    if (!brandSlug) return;
    getUserPreferencesAction(brandSlug).then((result) => {
      if (result.success) {
        setPrefs(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [brandSlug]);

  const handleSave = useCallback(async () => {
    if (!brandSlug) return;
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
  }, [brandSlug, prefs]);

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
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Globe className="size-4" />
          Language & Region
        </CardTitle>
        <CardDescription className="text-xs">
          Sesuaikan bahasa, zona waktu, dan format tanggal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="lang-language" className="text-xs font-medium">
            <Globe className="mr-1.5 inline size-3.5" />
            Language
          </Label>
          <Select
            value={prefs.language}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, language: value }))}
          >
            <SelectTrigger id="lang-language" className="h-9 text-xs">
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
          <p className="text-[11px] text-muted-foreground">
            Pilih bahasa yang digunakan di aplikasi
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lang-timezone" className="text-xs font-medium">
            <Clock className="mr-1.5 inline size-3.5" />
            Timezone
          </Label>
          <Select
            value={prefs.timezone}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, timezone: value }))}
          >
            <SelectTrigger id="lang-timezone" className="h-9 text-xs">
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
          <p className="text-[11px] text-muted-foreground">
            Zona waktu untuk menampilkan tanggal dan waktu
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lang-dateformat" className="text-xs font-medium">
            <Calendar className="mr-1.5 inline size-3.5" />
            Date Format
          </Label>
          <Select
            value={prefs.dateFormat}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, dateFormat: value }))}
          >
            <SelectTrigger id="lang-dateformat" className="h-9 text-xs">
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
          <p className="text-[11px] text-muted-foreground">
            Format tampilan tanggal di seluruh aplikasi
          </p>
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
            {saving ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
