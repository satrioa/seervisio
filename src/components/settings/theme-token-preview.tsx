"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { ThemeTokens } from "@/lib/theme/generate-brand-theme";

/* ─── Token display config ─── */

interface TokenEntry {
  key: string;
  label: string;
  category: "base" | "semantic" | "sidebar" | "chart";
}

const TOKEN_DEFINITIONS: TokenEntry[] = [
  // Base
  { key: "background", label: "Background", category: "base" },
  { key: "foreground", label: "Foreground", category: "base" },
  { key: "card", label: "Card", category: "base" },
  { key: "card-foreground", label: "Card Foreground", category: "base" },
  { key: "popover", label: "Popover", category: "base" },
  { key: "popover-foreground", label: "Popover Foreground", category: "base" },

  // Semantic
  { key: "primary", label: "Primary", category: "semantic" },
  { key: "primary-foreground", label: "Primary Foreground", category: "semantic" },
  { key: "secondary", label: "Secondary", category: "semantic" },
  { key: "secondary-foreground", label: "Secondary Foreground", category: "semantic" },
  { key: "accent", label: "Accent", category: "semantic" },
  { key: "accent-foreground", label: "Accent Foreground", category: "semantic" },
  { key: "muted", label: "Muted", category: "semantic" },
  { key: "muted-foreground", label: "Muted Foreground", category: "semantic" },
  { key: "destructive", label: "Destructive", category: "semantic" },
  { key: "destructive-foreground", label: "Destructive Foreground", category: "semantic" },
  { key: "border", label: "Border", category: "semantic" },
  { key: "ring", label: "Ring", category: "semantic" },

  // Sidebar
  { key: "sidebar-background", label: "Sidebar", category: "sidebar" },
  { key: "sidebar-foreground", label: "Sidebar Foreground", category: "sidebar" },
  { key: "sidebar-primary", label: "Sidebar Primary", category: "sidebar" },
  { key: "sidebar-accent", label: "Sidebar Accent", category: "sidebar" },
  { key: "sidebar-border", label: "Sidebar Border", category: "sidebar" },

  // Chart
  { key: "chart-1", label: "Chart 1", category: "chart" },
  { key: "chart-2", label: "Chart 2", category: "chart" },
  { key: "chart-3", label: "Chart 3", category: "chart" },
  { key: "chart-4", label: "Chart 4", category: "chart" },
  { key: "chart-5", label: "Chart 5", category: "chart" },
];

const CATEGORY_LABELS: Record<string, string> = {
  base: "Base",
  semantic: "Semantic",
  sidebar: "Sidebar",
  chart: "Chart",
};

const CATEGORY_ORDER = ["base", "semantic", "sidebar", "chart"] as const;

/* ─── Helpers ─── */

function hslToHexFromVar(cssVar: string): string {
  // cssVar is "h s% l%" e.g. "221.2 83.2% 53.3%"
  // We need to build hsl() and create an offscreen element to compute hex
  // For simplicity, directly return the hsl value since we can't compute hex without DOM
  return `hsl(${cssVar.replace(/(\S+)\s+(\S+)%\s+(\S+)%/, "$1, $2%, $3%")})`;
}

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

interface ThemeTokenPreviewProps {
  tokens: ThemeTokens;
}

export function ThemeTokenPreview({ tokens }: ThemeTokenPreviewProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = React.useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(`--${key}: ${value};`);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // silent fail
    }
  }, []);

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Generated Color Tokens
        </CardTitle>
        <CardDescription className="text-xs">
          CSS variables generated from your brand color
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <TooltipProvider>
          {CATEGORY_ORDER.map((cat) => {
            const catTokens = TOKEN_DEFINITIONS.filter((t) => t.category === cat);
            const hasAny = catTokens.some((t) => tokens[t.key]);
            if (!hasAny) return null;

            return (
              <div key={cat} className="flex flex-col gap-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABELS[cat]}
                </h4>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {catTokens.map((def) => {
                    const value = tokens[def.key];
                    if (!value) return null;
                    const isCopied = copiedKey === def.key;

                    return (
                      <div
                        key={def.key}
                        className="flex items-center gap-2 rounded-md border border-border/50 bg-card p-1.5 transition-colors hover:border-border"
                      >
                        {/* Color swatch */}
                        <div
                          className="size-6 shrink-0 rounded-md border border-border/30"
                          style={{
                            backgroundColor: `hsl(${value})`,
                          }}
                        />
                        {/* Label + value */}
                        <div className="flex min-w-0 flex-1 flex-col gap-0">
                          <span className="truncate text-[10px] font-medium text-foreground">
                            {def.label}
                          </span>
                          <span className="truncate text-[8px] text-muted-foreground">
                            {value}
                          </span>
                        </div>
                        {/* Copy button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(def.key, value)}
                              className="size-5"
                              aria-label={`Copy ${def.key}`}
                            >
                              {isCopied ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3 text-muted-foreground" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px]">
                            Copy variable
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
