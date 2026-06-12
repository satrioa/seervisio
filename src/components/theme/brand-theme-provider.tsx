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

const STYLE_ID = "brand-theme-tokens";

function injectBrandStyle(
  lightTokens: Record<string, string>,
  darkTokens: Record<string, string>
) {
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  const toCss = (tokens: Record<string, string>) =>
    Object.entries(tokens)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join("\n");

  styleEl.textContent = `/* Brand Theme Tokens */\n:root {\n${toCss(lightTokens)}\n}\n\n.dark {\n${toCss(darkTokens)}\n}`;
}

function removeBrandStyle() {
  const styleEl = document.getElementById(STYLE_ID);
  if (styleEl) styleEl.remove();
}

/* ─── Provider ─── */

interface BrandThemeProviderProps {
  children: React.ReactNode;
  brandSlug: string;
}

export function BrandThemeProvider({ children, brandSlug }: BrandThemeProviderProps) {
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const [brandTokens, setBrandTokens] = React.useState<ThemeTokens | null>(null);
  const [isThemeLoaded, setIsThemeLoaded] = React.useState(false);
  const primaryColorRef = React.useRef("#F59E0B");
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
          const { primaryColor } = result.data;
          primaryColorRef.current = primaryColor;

          // Generate tokens for BOTH light and dark modes
          const lightTokens = generateBrandTheme(primaryColor, "light");
          const darkTokens = generateBrandTheme(primaryColor, "dark");

          // Inject as a <style> tag with proper :root and .dark selectors
          injectBrandStyle(lightTokens, darkTokens);
          setBrandTokens(lightTokens);
        } else {
          // No theme saved — apply default Kasservice theme for both modes
          const lightTokens = generateBrandTheme("#F59E0B", "light");
          const darkTokens = generateBrandTheme("#F59E0B", "dark");
          injectBrandStyle(lightTokens, darkTokens);
          setBrandTokens(lightTokens);
        }
      } catch {
        // Silent fallback: apply defaults for both modes
        const lightTokens = generateBrandTheme("#F59E0B", "light");
        const darkTokens = generateBrandTheme("#F59E0B", "dark");
        injectBrandStyle(lightTokens, darkTokens);
        setBrandTokens(lightTokens);
      } finally {
        setIsThemeLoaded(true);
      }
    }

    loadTheme();

    // Listen for theme updates from settings page
    const handleThemeUpdate = (e: CustomEvent) => {
      if (e.detail?.tokens) {
        // Settings page saved tokens for one mode — need both modes
        // Use the stored primary color to generate the other mode
        const sourceTokens = e.detail.tokens as Record<string, string>;
        const sourceMode = (e.detail?.mode as "light" | "dark") ?? mode;
        
        // Re-generate both modes from the stored primary color
        // This ensures light and dark are consistent
        const pc = primaryColorRef.current;
        const lightTokens = generateBrandTheme(pc, "light");
        const darkTokens = generateBrandTheme(pc, "dark");
        injectBrandStyle(lightTokens, darkTokens);
        setBrandTokens(lightTokens);
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
      removeBrandStyle();
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
