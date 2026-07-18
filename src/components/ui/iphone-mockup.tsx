import type React from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";

import { cn } from "@/lib/utils";

interface IphoneMockupProps {
  children: React.ReactNode;
  className?: string;
}

export function IphoneMockup({ children, className }: IphoneMockupProps) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/19.5] w-full max-w-[360px] rounded-[3rem] border border-white/15 bg-zinc-950 p-2 shadow-2xl shadow-black/50",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-1 rounded-[2.65rem] border border-white/10" />
      <div className="absolute left-1/2 top-3 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black shadow-inner" />
      <div className="relative h-full overflow-hidden rounded-[2.35rem] bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between px-8 pt-1 text-[11px] font-semibold text-zinc-400">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <Signal className="size-3.5" />
            <Wifi className="size-3.5" />
            <BatteryFull className="size-4" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
