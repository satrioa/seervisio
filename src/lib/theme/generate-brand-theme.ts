/**
 * generate-brand-theme.ts
 *
 * Converts a primary color (hex or HSL) into a full set of CSS tokens
 * matching the shadcn HSL variable format used in globals.css.
 *
 * Token format: "hue saturation% lightness%"  (e.g. "221.2 83.2% 53.3%")
 *
 * This is a mockup utility. Replace with OKLCH-based generation later.
 */

/* ─── Types ─── */

export interface HslTuple {
  h: number;
  s: number;
  l: number;
}

export type ThemeTokens = Record<string, string>;

export type ThemeMode = "light" | "dark";

/* ─── Hex → RGB → HSL ─── */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace(/^#/, "").trim();
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number): HslTuple {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function parseHslString(input: string): HslTuple | null {
  const trimmed = input.trim();

  const hslMatch = trimmed.match(
    /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i
  );
  if (hslMatch) {
    return {
      h: parseFloat(hslMatch[1]),
      s: parseFloat(hslMatch[2]),
      l: parseFloat(hslMatch[3]),
    };
  }

  const bareMatch = trimmed.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (bareMatch) {
    return {
      h: parseFloat(bareMatch[1]),
      s: parseFloat(bareMatch[2]),
      l: parseFloat(bareMatch[3]),
    };
  }

  return null;
}

export function parseColor(input: string): HslTuple {
  const hsl = parseHslString(input);
  if (hsl) return hsl;

  const rgb = hexToRgb(input);
  if (rgb) return rgbToHsl(rgb.r, rgb.g, rgb.b);

  return { h: 221.2, s: 83.2, l: 53.3 };
}

/* ─── Formatting ─── */

export function hslToCssVar(hsl: HslTuple, decimals = 1): string {
  const h = hsl.h.toFixed(decimals);
  const s = hsl.s.toFixed(decimals);
  const l = hsl.l.toFixed(decimals);
  return `${h} ${s}% ${l}%`;
}

export function hslToCssFunc(hsl: HslTuple, decimals = 1): string {
  return `hsl(${hsl.h.toFixed(decimals)}, ${hsl.s.toFixed(decimals)}%, ${hsl.l.toFixed(decimals)}%)`;
}

export function hslToHex(hsl: HslTuple): string {
  const { h, s, l } = hsl;
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/* ─── Color Manipulation ─── */

function setLightness(hsl: HslTuple, l: number): HslTuple {
  return { ...hsl, l: Math.max(0, Math.min(100, l)) };
}

/* ─── Token Generation ─── */

function generateChartColors(primary: HslTuple, isLight: boolean): HslTuple[] {
  const base = primary.h;
  const sat = isLight ? 80 : 75;
  const lightL = isLight ? 55 : 60;
  const darkL = isLight ? 40 : 45;

  return [
    { h: base, s: sat, l: lightL },
    { h: (base + 40) % 360, s: 93, l: isLight ? 30 : 40 },
    { h: (base + 80) % 360, s: 94, l: isLight ? 44 : 55 },
    { h: (base + 200) % 360, s: 81, l: isLight ? 56 : 65 },
    { h: (base + 240) % 360, s: 82, l: isLight ? 52 : 60 },
  ];
}

export function generateBrandTheme(
  primaryColor: string,
  mode: ThemeMode
): ThemeTokens {
  const primary = parseColor(primaryColor);
  const isLight = mode === "light";

  const p = (hsl: HslTuple) => hslToCssVar(hsl);

  const bgL = isLight ? 100 : 4.9;
  const fgL = isLight ? 4.9 : 98;
  const cardL = isLight ? 100 : 4.9;
  const mutedL = isLight ? 96.1 : 17.5;
  const mutedFgL = isLight ? 46.9 : 65.1;
  const borderL = isLight ? 91.4 : 17.5;
  const secondaryL = isLight ? 96.1 : 17.5;
  const secondaryFgL = isLight ? 11.2 : 98;
  const accentL = isLight ? 96.1 : 17.5;
  const accentFgL = isLight ? 47.4 : 98;
  const popoverL = isLight ? 100 : 4.9;
  const popoverFgL = isLight ? 4.9 : 98;

  const bgSat = 0;
  const fgSat = isLight ? 84 : 0;
  const lowSat = isLight ? 30 : 32;
  const secondarySat = isLight ? 40 : 32;

  const chartColors = generateChartColors(primary, isLight);

  const tokens: ThemeTokens = {
    background: p({ h: primary.h, s: bgSat, l: bgL }),
    foreground: p({ h: primary.h, s: fgSat, l: fgL }),
    card: p({ h: primary.h, s: bgSat, l: cardL }),
    "card-foreground": p({ h: primary.h, s: fgSat, l: fgL }),
    popover: p({ h: primary.h, s: bgSat, l: popoverL }),
    "popover-foreground": p({ h: primary.h, s: fgSat, l: popoverFgL }),
    primary: p(primary),
    "primary-foreground": isLight
      ? p(setLightness(primary, 98))
      : p(setLightness(primary, 11.2)),
    secondary: p({ h: primary.h, s: secondarySat, l: secondaryL }),
    "secondary-foreground": p({ h: primary.h, s: 40, l: secondaryFgL }),
    muted: p({ h: primary.h, s: lowSat, l: mutedL }),
    "muted-foreground": p({ h: primary.h, s: 16, l: mutedFgL }),
    accent: p({ h: (primary.h + 30) % 360, s: 40, l: accentL }),
    "accent-foreground": p({ h: (primary.h + 30) % 360, s: 40, l: accentFgL }),
    destructive: p({ h: 0, s: isLight ? 84.2 : 62.8, l: isLight ? 60.2 : 30.6 }),
    "destructive-foreground": p({ h: 210, s: 40, l: isLight ? 98 : 98 }),
    border: p({ h: primary.h, s: lowSat, l: borderL }),
    input: p({ h: primary.h, s: lowSat, l: borderL }),
    ring: p(primary),
    "sidebar-background": p({ h: primary.h, s: 11, l: isLight ? 94.7 : 10 }),
    "sidebar-foreground": p({ h: primary.h, s: 8, l: isLight ? 26.1 : 95.9 }),
    "sidebar-primary": p(setLightness(primary, isLight ? 10 : 48)),
    "sidebar-primary-foreground": p(setLightness(primary, isLight ? 98 : 100)),
    "sidebar-accent": p({ h: primary.h, s: 9, l: isLight ? 84 : 15.9 }),
    "sidebar-accent-foreground": p({ h: primary.h, s: 8, l: isLight ? 10 : 95.9 }),
    "sidebar-border": p({ h: primary.h, s: 13, l: isLight ? 91 : 15.9 }),
    "sidebar-ring": p(primary),
    "chart-1": p(chartColors[0]),
    "chart-2": p(chartColors[1]),
    "chart-3": p(chartColors[2]),
    "chart-4": p(chartColors[3]),
    "chart-5": p(chartColors[4]),
  };

  return tokens;
}

export const DEFAULT_PRIMARY_COLOR = "#F59E0B";

export function generateAccentColor(primaryColor: string): string {
  const hsl = parseColor(primaryColor);
  const accentHue = (hsl.h + 30) % 360;
  return hslToHex({ h: accentHue, s: hsl.s, l: hsl.l });
}
