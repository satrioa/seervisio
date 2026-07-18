"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Palette,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  Save,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  generateBrandTheme,
  generateAccentColor,
  DEFAULT_PRIMARY_COLOR,
  type ThemeTokens,
} from "@/lib/theme/generate-brand-theme";
import {
  getBrandThemeAction,
  saveBrandThemeAction,
} from "@/server/actions/brand-theme.actions";
import { ThemeTokenPreview } from "@/components/settings/theme-token-preview";
import { ThemePreviewPanel } from "@/components/settings/theme-preview-panel";

/* ─── Theme mode options ─── */

type ThemeModeOption = "light" | "dark";

const MODE_OPTIONS: { value: ThemeModeOption; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export function BrandThemeSettings() {
  const params = useParams<{ brandSlug: string }>();
  const brandSlug = params?.brandSlug ?? "";

  const [mode, setMode] = React.useState<ThemeModeOption>("light");
  const [primaryColor, setPrimaryColor] = React.useState(DEFAULT_PRIMARY_COLOR);
  const [accentColor, setAccentColor] = React.useState(
    () => generateAccentColor(DEFAULT_PRIMARY_COLOR)
  );
  const [tokens, setTokens] = React.useState<ThemeTokens>(() =>
    generateBrandTheme(DEFAULT_PRIMARY_COLOR, "light")
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showGeneratedFeedback, setShowGeneratedFeedback] = React.useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Load saved theme from Supabase on mount
  React.useEffect(() => {
    async function loadTheme() {
      if (!brandSlug) {
        setIsLoading(false);
        return;
      }
      try {
        const result = await getBrandThemeAction(brandSlug);
        if (result.success && result.data) {
          const { primaryColor: savedPrimary, accentColor: savedAccent, mode: savedMode, tokens: savedTokens } = result.data;
          setPrimaryColor(savedPrimary);
          setAccentColor(savedAccent ?? generateAccentColor(savedPrimary));
          setMode(savedMode);
          if (savedTokens) {
            setTokens(savedTokens as ThemeTokens);
          } else {
            const generated = generateBrandTheme(savedPrimary, savedMode);
            setTokens(generated);
          }
        } else {
          // No saved theme — use defaults matching the current mode
          const defaultTokens = generateBrandTheme(DEFAULT_PRIMARY_COLOR, "light");
          setTokens(defaultTokens);
        }
      } catch {
        // Silent fallback
        const fallback = generateBrandTheme(DEFAULT_PRIMARY_COLOR, "light");
        setTokens(fallback);
      } finally {
        setIsLoading(false);
      }
    }
    loadTheme();
  }, [brandSlug]);

  // Effective mode (just the mode state since we don't have "system" anymore)
  const effectiveMode = mode as ThemeModeOption;

  const handlePrimaryChange = React.useCallback((color: string) => {
    setPrimaryColor(color);
    const newAccent = generateAccentColor(color);
    setAccentColor(newAccent);
  }, []);

  const handleGeneratePalette = React.useCallback(() => {
    const newTokens = generateBrandTheme(primaryColor, effectiveMode);
    setTokens(newTokens);
    setShowGeneratedFeedback(true);
    setTimeout(() => setShowGeneratedFeedback(false), 2000);
  }, [primaryColor, effectiveMode]);

  const handleResetDefault = React.useCallback(() => {
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setAccentColor(generateAccentColor(DEFAULT_PRIMARY_COLOR));
    const defaultTokens = generateBrandTheme(DEFAULT_PRIMARY_COLOR, effectiveMode);
    setTokens(defaultTokens);
  }, [effectiveMode]);

  const handleSave = React.useCallback(async () => {
    if (!brandSlug || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await saveBrandThemeAction(brandSlug, {
        primaryColor,
        accentColor,
        mode: effectiveMode,
        tokens,
      });

      if (result.success) {
        setShowSavedFeedback(true);
        setSaveError(null);
        setTimeout(() => setShowSavedFeedback(false), 2500);

        // Dispatch custom event so BrandThemeProvider re-applies CSS vars globally
        window.dispatchEvent(
          new CustomEvent("brand-theme-updated", {
            detail: { tokens, mode: effectiveMode, primaryColor },
          })
        );
      } else {
        setSaveError(result.error ?? "Gagal menyimpan tema");
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan"
      );
    } finally {
      setIsSaving(false);
    }
  }, [brandSlug, primaryColor, accentColor, effectiveMode, tokens, isSaving]);

  // Regenerate tokens when mode changes (if no custom theme loaded yet)
  React.useEffect(() => {
    if (!isLoading) {
      const newTokens = generateBrandTheme(primaryColor, effectiveMode);
      setTokens(newTokens);
    }
  }, [effectiveMode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Palette className="size-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-foreground">
            Appearance &amp; Brand Theme
          </h2>
          <p className="text-xs text-muted-foreground">
            Customize the look and feel of your brand&apos;s interface
          </p>
        </div>
      </div>

      <Separator />

      {/* 2-column layout on desktop */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_360px]">
        {/* ══ LEFT: Controls ══ */}
        <div className="flex flex-col gap-6">
          {/* ── Section 1: Theme Mode ── */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Theme Mode</CardTitle>
              <CardDescription className="text-xs">
                Pilih tema terang atau gelap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {MODE_OPTIONS.map((opt) => {
                  const isActive = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all"
                      style={{
                        backgroundColor: isActive
                          ? `hsl(${tokens.primary})`
                          : "transparent",
                        color: isActive
                          ? `hsl(${tokens["primary-foreground"]})`
                          : undefined,
                        borderColor: isActive
                          ? `hsl(${tokens.primary})`
                          : undefined,
                      }}
                    >
                      <opt.icon className="size-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Section 2: Brand Color ── */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Brand Color</CardTitle>
              <CardDescription className="text-xs">
                Pilih warna utama dan aksen untuk tema brand Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Primary Color */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-medium text-foreground">
                    Primary Color
                  </Label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <ColorPicker
                      color={primaryColor}
                      onChange={handlePrimaryChange}
                    />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-5 rounded border"
                        style={{
                          backgroundColor: primaryColor,
                        }}
                      />
                      <span className="text-xs font-mono text-foreground">
                        {primaryColor}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Warna utama brand Anda
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Accent Color */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-foreground">
                  Accent Color
                </Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <ColorPicker
                    color={accentColor}
                    onChange={setAccentColor}
                  />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-5 rounded border"
                        style={{
                          backgroundColor: accentColor,
                        }}
                      />
                      <span className="text-xs font-mono text-foreground">
                        {accentColor}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Warna aksen (auto-generated dari primary)
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Generate Button */}
              <div className="flex flex-col gap-1.5">
                <Button
                  onClick={handleGeneratePalette}
                  className="w-full gap-2 text-xs"
                  style={{
                    backgroundColor: `hsl(${tokens.primary})`,
                    color: `hsl(${tokens["primary-foreground"]})`,
                  }}
                >
                  {showGeneratedFeedback ? (
                    <Check className="size-4" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {showGeneratedFeedback
                    ? "Palette Generated!"
                    : "Generate Harmonized Palette"}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">
                  Menghasilkan palet warna yang harmonis dari warna utama
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t px-6 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefault}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="size-3.5" />
                Reset Default
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5 text-xs"
                style={{
                  backgroundColor: `hsl(${tokens.primary})`,
                  color: `hsl(${tokens["primary-foreground"]})`,
                }}
              >
                {isSaving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : showSavedFeedback ? (
                  <Check className="size-3.5" />
                ) : (
                  <Save className="size-3.5" />
                )}
                {isSaving
                  ? "Menyimpan..."
                  : showSavedFeedback
                    ? "Tersimpan!"
                    : "Save Theme"}
              </Button>
            </CardFooter>
          </Card>

          {/* Save error */}
          {saveError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
              <AlertCircle className="size-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{saveError}</p>
            </div>
          )}

          {/* ── Section 3: Generated Tokens ── */}
          <ThemeTokenPreview tokens={tokens} />
        </div>

        {/* ══ RIGHT: Live Preview ══ */}
        <div className="flex flex-col gap-6">
          <ThemePreviewPanel tokens={tokens} mode={effectiveMode} />
        </div>
      </div>
    </div>
  );
}
