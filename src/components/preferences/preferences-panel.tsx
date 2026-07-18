"use client";

import { Paintbrush, Monitor, Sun, Moon, Type, Layout } from "lucide-react";

import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { THEME_MODE_VALUES, THEME_PRESET_OPTIONS } from "@/lib/preferences/theme";
import { fontOptions } from "@/lib/fonts/registry";
import { cn } from "@/lib/utils";

const modeIcons: Record<string, React.ReactNode> = {
  light: <Sun className="size-3.5" />,
  dark: <Moon className="size-3.5" />,
  system: <Monitor className="size-3.5" />,
};

export function PreferencesPanel() {
  const values = usePreferencesStore((s) => s.values);
  const setPreference = usePreferencesStore((s) => s.setPreference);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          aria-label="Appearance settings"
        >
          <Paintbrush className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 p-4"
      >
        <div className="space-y-5">
          {/* Theme Mode */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Theme
            </p>
            <div className="flex gap-1">
              {THEME_MODE_VALUES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreference("theme_mode", mode)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                    values.theme_mode === mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {modeIcons[mode]}
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Preset */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Preset
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {THEME_PRESET_OPTIONS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setPreference("theme_preset", preset.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                    values.theme_preset === preset.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{
                      background:
                        values.theme_mode === "dark" || (values.theme_mode === "system" && document.documentElement.classList.contains("dark"))
                          ? preset.primary.dark
                          : preset.primary.light,
                    }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Type className="mr-1 inline size-3" />
              Font
            </p>
            <select
              value={values.font}
              onChange={(e) => setPreference("font", e.target.value as typeof values.font)}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {fontOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
