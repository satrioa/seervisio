"use client";

import * as React from "react";
import { getBrandThemeAction, type BrandThemeResult } from "@/server/actions/brand-theme.actions";
import { generateBrandTheme, type ThemeTokens } from "@/lib/theme/generate-brand-theme";

/* ─── Context ─── */

interface BrandThemeContextValue {
  mode: "light" | "dark";
  brandTokens: ThemeTokens | null;
  isThemeLoaded: boolean;
  toggleTheme: () => void;
}

const BrandThemeContext = React.createContext<BrandThemeContextValue>({
  mode: "light",
  brandTokens: null,
  isThemeLoaded: false,
  toggleTheme: () => {},
});

export function useBrandTheme() {
  return React.useContext(BrandThemeContext);
}

/* ─── Helpers ─── */

function applyCssVars(tokens: Record<string, string>, root: HTMLElement) {
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(`--${key}`, value);
  }
}

function removeCssVars(keys: string[], root: HTMLElement) {
  for (const key of keys) {
    root.style.removeProperty(`--${key}`);
  }
}

const THEME_TOKEN_KEYS = [
  "background", "foreground", "card", "card-foreground",
  "popover", "popover-foreground", "primary", "primary-foreground",
  "secondary", "secondary-foreground", "muted", "muted-foreground",
  "accent", "accent-foreground", "destructive", "destructive-foreground",
  "border", "input", "ring",
  "sidebar-background", "sidebar-foreground", "sidebar-primary",
  "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground",
  "sidebar-border", "sidebar-ring",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
];

/* ─── Provider ─── */

interface BrandThemeProviderProps {
  children: React.ReactNode;
  brandSlug: string;
}

export function BrandThemeProvider({ children, brandSlug }: BrandThemeProviderProps) {
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const [brandTokens, setBrandTokens] = React.useState<ThemeTokens | null>(null);
  const [isThemeLoaded, setIsThemeLoaded] = React.useState(false);
  const themeKey = `seervis-theme-${brandSlug}`;

  // Load theme from localStorage + Supabase on mount
  React.useEffect(() => {
    async function loadTheme() {
      try {
        // 1. Load saved mode from localStorage first (instant)
        const storedMode = window.localStorage.getItem(themeKey);
        const initialMode = storedMode === "dark" ? "dark" : "light";
        setMode(initialMode);
        document.documentElement.classList.toggle("dark", initialMode === "dark");

        // 2. Load brand theme from Supabase
        const result = await getBrandThemeAction(brandSlug);
        if (result.success && result.data) {
          const { primaryColor, mode: savedMode, tokens } = result.data;

          // Use saved mode or localStorage mode
          const effectiveMode = initialMode; // localStorage mode takes precedence

          if (tokens) {
            // Apply saved tokens
            applyCssVars(tokens, document.documentElement);
            setBrandTokens(tokens as ThemeTokens);
          } else {
            // Generate tokens from primary color
            const generated = generateBrandTheme(primaryColor, effectiveMode);
            applyCssVars(generated, document.documentElement);
            setBrandTokens(generated);
          }
        } else {
          // No theme saved — apply default Kasservice theme
          const defaultTokens = generateBrandTheme("#F59E0B", initialMode);
          applyCssVars(defaultTokens, document.documentElement);
          setBrandTokens(defaultTokens);
        }
      } catch {
        // Silent fallback: apply defaults
        const fallbackTokens = generateBrandTheme("#F59E0B", "light");
        applyCssVars(fallbackTokens, document.documentElement);
        setBrandTokens(fallbackTokens);
      } finally {
        setIsThemeLoaded(true);
      }
    }

    loadTheme();

    // Listen for theme updates from settings page
    const handleThemeUpdate = (e: CustomEvent) => {
      if (e.detail?.tokens) {
        applyCssVars(e.detail.tokens, document.documentElement);
        setBrandTokens(e.detail.tokens as ThemeTokens);
      }
      if (e.detail?.mode) {
        const newMode = e.detail.mode as "light" | "dark";
        setMode(newMode);
        document.documentElement.classList.toggle("dark", newMode === "dark");
        window.localStorage.setItem(themeKey, newMode);
      }
    };

    window.addEventListener("brand-theme-updated", handleThemeUpdate as EventListener);
    return () => {
      window.removeEventListener("brand-theme-updated", handleThemeUpdate as EventListener);
      // Clean up custom CSS variables on unmount
      removeCssVars(THEME_TOKEN_KEYS, document.documentElement);
    };
  }, [brandSlug, themeKey]);

  const toggleTheme = React.useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem(themeKey, next);
      return next;
    });
  }, [themeKey]);

  return (
    <BrandThemeContext.Provider
      value={{
        mode,
        brandTokens,
        isThemeLoaded,
        toggleTheme,
      }}
    >
      {children}
    </BrandThemeContext.Provider>
  );
}
