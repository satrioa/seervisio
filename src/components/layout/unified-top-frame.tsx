"use client";

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { SeervisDynamicIsland } from "@/components/layout/seervis-dynamic-island";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";

interface UnifiedTopFrameProps {
  brandLogoUrl: string | null;
  brandName: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  userName?: string;
  onOpenShift?: () => void;
}

const FRAME_HEIGHT = 72;
const GOOEY_ID = "top-frame-gooey";

export function UnifiedTopFrame({
  brandLogoUrl,
  brandName,
  theme,
  onToggleTheme,
  userName,
  onOpenShift,
}: UnifiedTopFrameProps) {
  return (
    <>
      <svg className="pointer-events-none absolute size-0" aria-hidden="true">
        <defs>
          <filter id={GOOEY_ID} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" mode="normal" />
          </filter>
        </defs>
      </svg>

      <div
        className="fixed left-0 right-0 top-0 z-50 overflow-visible"
        style={{ height: FRAME_HEIGHT }}
      >
        {/* Frame background */}
        <div className="absolute inset-0 bg-[#050505]" />

        {/* Gooey layer — frame bottom strip + island connection */}
        <div className="absolute inset-0 overflow-visible">
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ filter: `url(#${GOOEY_ID})`, maxWidth: 371 }}
          >
            <div className="pointer-events-none h-3 w-full bg-[#050505]" />
            <div className="-mt-[1px] pointer-events-auto">
              <SeervisDynamicIsland
                userName={userName}
                onOpenShift={onOpenShift}
              />
            </div>
          </div>
        </div>

        {/* Content layer (sharp, on top) */}
        <div className="pointer-events-none absolute inset-0 z-10 flex h-full items-center px-4">
          <div className="flex shrink-0 items-center gap-2.5 pointer-events-auto">
            <SidebarTrigger className="text-white/60 hover:text-white" />
            <div className="flex items-center gap-2">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt={brandName}
                  className="size-7 rounded-md object-cover"
                />
              ) : (
                <div className="flex size-7 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold text-white">
                  {brandName.charAt(0)}
                </div>
              )}
              <span className="hidden text-sm font-semibold text-white/90 md:inline">
                {brandName}
              </span>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex shrink-0 items-center gap-1 pointer-events-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-white/40 hover:bg-white/10 hover:text-white"
              onClick={onToggleTheme}
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
            <NotificationPopover />
          </div>
        </div>
      </div>

      <div style={{ height: FRAME_HEIGHT }} />
    </>
  );
}
