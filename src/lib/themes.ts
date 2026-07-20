import type { ThemeName } from "@/contexts/theme-context";

/**
 * Returns inline styles for the billingSDK dialogs. Kept minimal — the app
 * relies on Tailwind CSS variables, so we only surface a neutral surface.
 */
export function getThemeStyles(
  _theme: ThemeName,
  _darkMode: boolean,
): React.CSSProperties {
  return {
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    borderColor: "hsl(var(--border))",
  };
}
