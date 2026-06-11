"use client";

import * as React from "react";
import {
  Bell,
  CreditCard,
  Home,
  Search,
  Settings,
  Users,
  Wrench,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ThemeTokens, ThemeMode } from "@/lib/theme/generate-brand-theme";

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

interface ThemePreviewPanelProps {
  tokens: ThemeTokens;
  mode: ThemeMode;
}

export function ThemePreviewPanel({ tokens, mode }: ThemePreviewPanelProps) {
  const cssVars = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, value] of Object.entries(tokens)) {
      // Convert "h s% l%" to CSS custom property value
      // shadcn uses `hsl(var(--xxx))` in Tailwind config
      // For preview we use --xxx directly with the HSL value
      const cssKey = `--${key}`;
      vars[cssKey] = value;
    }
    return vars as React.CSSProperties;
  }, [tokens]);

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          Live Preview
        </CardTitle>
        <CardDescription className="text-xs">
          UI samples with generated theme colors
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Preview container with applied tokens */}
        <div
          className="flex flex-col gap-5 rounded-xl border p-4"
          style={{
            ...cssVars,
            backgroundColor: `hsl(${tokens.background})`,
            borderColor: `hsl(${tokens.border})`,
          }}
        >
          {/* ─── Text sample ─── */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-sm font-semibold"
              style={{ color: `hsl(${tokens.foreground})` }}
            >
              Seervis V2
            </span>
            <span
              className="text-xs"
              style={{ color: `hsl(${tokens["muted-foreground"]})` }}
            >
              Repair Shop Management System
            </span>
          </div>

          <Separator style={{ backgroundColor: `hsl(${tokens.border})` }} />

          {/* ─── Button variants ─── */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: `hsl(${tokens["muted-foreground"]})` }}
            >
              Buttons
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Primary */}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition-colors"
                style={{
                  backgroundColor: `hsl(${tokens.primary})`,
                  color: `hsl(${tokens["primary-foreground"]})`,
                }}
              >
                Primary
              </button>
              {/* Secondary */}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition-colors"
                style={{
                  backgroundColor: `hsl(${tokens.secondary})`,
                  color: `hsl(${tokens["secondary-foreground"]})`,
                }}
              >
                Secondary
              </button>
              {/* Outline */}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: `hsl(${tokens.border})`,
                  color: `hsl(${tokens.foreground})`,
                }}
              >
                Outline
              </button>
              {/* Destructive */}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors"
                style={{
                  backgroundColor: `hsl(${tokens.destructive})`,
                }}
              >
                Delete
              </button>
            </div>
          </div>

          <Separator style={{ backgroundColor: `hsl(${tokens.border})` }} />

          {/* ─── Badges ─── */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: `hsl(${tokens["muted-foreground"]})` }}
            >
              Badges
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `hsl(${tokens.primary})`,
                  color: `hsl(${tokens["primary-foreground"]})`,
                }}
              >
                Active
              </span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `hsl(${tokens.secondary})`,
                  color: `hsl(${tokens["secondary-foreground"]})`,
                }}
              >
                Pending
              </span>
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{
                  borderColor: `hsl(${tokens.border})`,
                  color: `hsl(${tokens.foreground})`,
                }}
              >
                Draft
              </span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `hsl(${tokens.destructive})`,
                  color: `hsl(${tokens["destructive-foreground"]})`,
                }}
              >
                Error
              </span>
            </div>
          </div>

          <Separator style={{ backgroundColor: `hsl(${tokens.border})` }} />

          {/* ─── Card surface ─── */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: `hsl(${tokens["muted-foreground"]})` }}
            >
              Card Surface
            </span>
            <div
              className="flex flex-col gap-2 rounded-lg border p-3"
              style={{
                backgroundColor: `hsl(${tokens.card})`,
                borderColor: `hsl(${tokens.border})`,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex size-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: `hsl(${tokens.primary})` }}
                >
                  <Wrench className="size-4" style={{ color: `hsl(${tokens["primary-foreground"]})` }} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span
                    className="text-xs font-medium"
                    style={{ color: `hsl(${tokens.foreground})` }}
                  >
                    Service iPhone 11
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: `hsl(${tokens["muted-foreground"]})` }}
                  >
                    Status: In Progress
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator style={{ backgroundColor: `hsl(${tokens.border})` }} />

          {/* ─── Sidebar mini preview ─── */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: `hsl(${tokens["muted-foreground"]})` }}
            >
              Sidebar Navigation
            </span>
            <div
              className="flex flex-col gap-0.5 rounded-lg border p-2"
              style={{
                backgroundColor: `hsl(${tokens["sidebar-background"]})`,
                borderColor: `hsl(${tokens["sidebar-border"]})`,
              }}
            >
              {[
                { icon: Home, label: "Dashboard", active: true },
                { icon: Users, label: "Customers", active: false },
                { icon: Wrench, label: "Services", active: false },
                { icon: Settings, label: "Settings", active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
                  style={{
                    backgroundColor: item.active
                      ? `hsl(${tokens["sidebar-accent"]})`
                      : "transparent",
                    color: item.active
                      ? `hsl(${tokens["sidebar-accent-foreground"]})`
                      : `hsl(${tokens["sidebar-foreground"]})`,
                  }}
                >
                  <item.icon className="size-3.5 shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator style={{ backgroundColor: `hsl(${tokens.border})` }} />

          {/* ─── Dynamic Island mini ─── */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: `hsl(${tokens["muted-foreground"]})` }}
            >
              Dynamic Island
            </span>
            <div
              className="mx-auto flex h-7 w-32 items-center justify-center gap-1.5 rounded-full px-3"
              style={{
                backgroundColor: `hsl(${tokens.foreground})`,
              }}
            >
              <Bell className="size-3" style={{ color: `hsl(${tokens.background})` }} />
              <span
                className="text-[9px] font-medium"
                style={{ color: `hsl(${tokens.background})` }}
              >
                Shift Active
              </span>
            </div>
          </div>

          <Separator style={{ backgroundColor: `hsl(${tokens.border})` }} />

          {/* ─── Chart colors ─── */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: `hsl(${tokens["muted-foreground"]})` }}
            >
              Chart Colors
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => {
                const chartKey = `chart-${i}` as keyof ThemeTokens;
                return (
                  <div
                    key={i}
                    className="h-8 flex-1 rounded-md"
                    style={{
                      backgroundColor: `hsl(${tokens[chartKey]})`,
                    }}
                    title={`Chart ${i}`}
                  />
                );
              })}
            </div>
          </div>

          <Separator style={{ backgroundColor: `hsl(${tokens.border})` }} />

          {/* ─── Alert sample ─── */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: `hsl(${tokens["muted-foreground"]})` }}
            >
              Alert
            </span>
            <div
              className="flex items-start gap-2 rounded-lg border p-2.5"
              style={{
                backgroundColor: `hsl(${tokens.destructive})`,
                borderColor: `hsl(${tokens.destructive})`,
              }}
            >
              <div
                className="flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `hsl(${tokens["destructive-foreground"]})` }}
              >
                <span
                  className="text-[10px] font-bold"
                  style={{ color: `hsl(${tokens.destructive})` }}
                >
                  !
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-xs font-medium"
                  style={{ color: `hsl(${tokens["destructive-foreground"]})` }}
                >
                  Kesalahan Terdeteksi
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: `hsl(${tokens["destructive-foreground"]})` }}
                >
                  Terjadi kesalahan saat memproses permintaan.
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
