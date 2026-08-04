"use client";

import { Package } from "lucide-react";
import { SquareArrowOutUpRightIcon } from "@animateicons/react/lucide";

import { cn } from "@/lib/utils";
import type { OverviewPickupQueueItem } from "@/server/actions/service.actions";

interface PickupQueueCardProps {
  item: OverviewPickupQueueItem;
  onOpen: (serviceId: string) => void;
  className?: string;
}

export function PickupQueueCard({ item, onOpen, className }: PickupQueueCardProps) {
  return (
    <div
      className={cn(
        "group relative flex w-[280px] shrink-0 cursor-pointer flex-col gap-2 rounded-xl border bg-card p-3.5 pr-10 transition-all hover:-translate-y-0.5 hover:border-muted-foreground/20 hover:shadow-sm",
        className,
      )}
      onClick={() => onOpen(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(item.id); }}
    >
      <div className="pointer-events-none absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground group-hover:opacity-100">
        <SquareArrowOutUpRightIcon size={16} isAnimated color="currentColor" />
      </div>

      <div className="flex items-center gap-2">
        <Package className="size-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
        <span className="truncate text-[11px] font-semibold text-foreground">
          Ready Pickup
        </span>
      </div>

      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-[10px] font-medium text-muted-foreground">
          {item.serviceNumber}
        </p>
        <p className="truncate text-xs font-semibold text-foreground">
          {item.deviceName}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          Customer: {item.customerName}
        </p>
        <p className="truncate text-[10px] text-muted-foreground/70">
          {item.daysSinceReady === 0
            ? "Ready today"
            : `Ready for ${item.daysSinceReady} day${item.daysSinceReady > 1 ? "s" : ""}`}
        </p>
      </div>
    </div>
  );
}
