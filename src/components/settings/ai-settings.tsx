"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  Key,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  saveAiProviderSettingsAction,
  getAiProviderSettingsAction,
  testAiApiKeyAction,
  removeAiApiKeyAction,
  type AiSettingsData,
  type AiDashboardCache,
} from "@/server/actions/ai-insight.actions";
import type { AiProvider } from "@/lib/ai/llm-provider";

export function AiSettings() {
  const params = useParams();
  const brandSlug = params.brandSlug as string;

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [settings, setSettings] = React.useState<AiSettingsData | null>(null);

  const [provider, setProvider] = React.useState<AiProvider>("openai");
  const [apiKey, setApiKey] = React.useState("");
  const [showKey, setShowKey] = React.useState(false);
  const [hasExistingKey, setHasExistingKey] = React.useState(false);

  const [status, setStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testResult, setTestResult] = React.useState<{ valid: boolean; model?: string } | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const result = await getAiProviderSettingsAction(brandSlug);
        if (result.success && result.data) {
          setSettings(result.data);
          if (result.data.provider) {
            setProvider(result.data.provider);
          }
          if (result.data.hasApiKey) {
            setHasExistingKey(true);
            setApiKey("••••••••existing");
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [brandSlug]);

  const handleSave = async () => {
    if (apiKey === "••••••••existing" && hasExistingKey) {
      setStatus({ type: "success", message: "Tidak ada perubahan pada API key." });
      return;
    }

    setSaving(true);
    setStatus(null);
    setTestResult(null);

    try {
      const result = await saveAiProviderSettingsAction(brandSlug, { provider, apiKey });
      if (result.success) {
        setStatus({ type: "success", message: "Pengaturan AI berhasil disimpan." });
        setHasExistingKey(true);
        setApiKey("••••••••existing");
      } else {
        setStatus({ type: "error", message: result.error || "Gagal menyimpan." });
      }
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setStatus(null);

    try {
      const result = await testAiApiKeyAction(brandSlug);
      if (result.success && result.data) {
        setTestResult(result.data);
      } else {
        setStatus({ type: "error", message: "error" in result ? (result as any).error : "Gagal menguji koneksi." });
      }
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Hapus konfigurasi AI? Semua cache insight juga akan dihapus.")) return;

    setSaving(true);
    setStatus(null);

    try {
      const result = await removeAiApiKeyAction(brandSlug);
      if (result.success) {
        setSettings({ provider: null, hasApiKey: false });
        setHasExistingKey(false);
        setApiKey("");
        setProvider("openai");
        setStatus({ type: "success", message: "Konfigurasi AI berhasil dihapus." });
      } else {
        setStatus({ type: "error", message: result.error || "Gagal menghapus." });
      }
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateInsights = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const { generateAiInsightsAction } = await import("@/server/actions/ai-insight.actions");
      const result = await generateAiInsightsAction(brandSlug);
      if (result.success) {
        setStatus({ type: "success", message: "Insight berhasil diperbarui!" });
      } else {
        setStatus({ type: "error", message: result.error || "Gagal menghasilkan insight." });
      }
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Sparkles className="size-4.5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">AI & Insight Engine</h2>
            <p className="text-xs text-muted-foreground">Memuat pengaturan...</p>
          </div>
        </div>
        <Card className="shadow-xs">
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-start sm:items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
          <Sparkles className="size-4.5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold">AI & Insight Engine</h2>
          <p className="text-xs text-muted-foreground">
            Konfigurasi provider LLM untuk AI Command Center
          </p>
        </div>
      </div>

      {status && (
        <Alert variant={status.type === "error" ? "destructive" : "default"}>
          {status.type === "error" ? <XCircle className="size-4" /> : <CheckCircle className="size-4" />}
          <AlertTitle>{status.type === "error" ? "Gagal" : "Berhasil"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {/* Provider Selection */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">LLM Provider</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Pilih provider AI yang akan digunakan untuk menganalisis data bisnis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(v: AiProvider) => setProvider(v)}
              >
                <SelectTrigger id="ai-provider" className="h-9">
                  <SelectValue placeholder="Pilih provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="model-hint">Recommended Model</Label>
              <Input
                id="model-hint"
                value={provider === "openai" ? "gpt-4o-mini" : "openai/gpt-4o-mini"}
                readOnly
                className="h-9 bg-muted text-xs text-muted-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">API Key</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Masukkan API key dari provider yang dipilih. Key disimpan dengan aman.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                placeholder={
                  hasExistingKey
                    ? "API key tersimpan. Ketik key baru untuk mengganti."
                    : "sk-..."
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="h-9 pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {hasExistingKey && (
            <p className="text-[11px] text-muted-foreground">
              API key tersimpan. Input ulang untuk mengganti.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={handleSave}
              disabled={saving || !apiKey || apiKey === "••••••••existing"}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Simpan
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={handleTest}
              disabled={testing || !hasExistingKey}
            >
              {testing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle className="size-3.5" />
              )}
              Test Koneksi
            </Button>

            {hasExistingKey && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 hover:text-red-500"
                onClick={handleRemove}
                disabled={saving}
              >
                <Trash2 className="size-3.5" />
                Hapus Key
              </Button>
            )}
          </div>

          {testResult && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
              {testResult.valid ? (
                <>
                  <CheckCircle className="size-4 text-emerald-500" />
                  <span className="text-xs text-emerald-500">
                    Koneksi berhasil! Model: {testResult.model}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="size-4 text-red-500" />
                  <span className="text-xs text-red-500">Koneksi gagal. Periksa API key.</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Insights */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Generate Insights</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Hasilkan insight terbaru dari data bisnis menggunakan AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1.5 bg-emerald-500 text-xs font-medium text-white hover:bg-emerald-400"
              onClick={handleRegenerateInsights}
              disabled={saving || !hasExistingKey}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate Sekarang
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Proses ini akan menganalisis data 30 hari terakhir
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Info */}
      <div className="rounded-lg border border-dashed p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Bagaimana cara kerja AI Insight Engine?</p>
            <ul className="list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
              <li>Data bisnis 30 hari terakhir dikirim ke LLM untuk dianalisis</li>
              <li>Hasil analisis disimpan dalam cache selama 1 jam</li>
              <li>Dashboard AI membaca dari cache, bukan langsung ke LLM</li>
              <li>Klik &quot;Generate Sekarang&quot; untuk memperbarui insight kapan saja</li>
              <li>API key Anda tidak pernah dikirim ke frontend</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
