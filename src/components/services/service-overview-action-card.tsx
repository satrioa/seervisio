"use client";

import { AlertTriangle, UserX, Clock, ClipboardCheck, CreditCard } from "lucide-react";
import { SquareArrowOutUpRightIcon } from "@animateicons/react/lucide";

import { cn } from "@/lib/utils";
import type { OverviewActionRequiredItem } from "@/server/actions/service.actions";

const PRIORITY_CONFIG: Record<
  string,
  { icon: typeof AlertTriangle; iconClass: string; label: string }
> = {
  "Pickup Overdue": {
    icon: AlertTriangle,
    iconClass: "text-red-500 dark:text-red-400",
    label: "Pickup Overdue",
  },
  "Waiting Technician": {
    icon: UserX,
    iconClass: "text-amber-500 dark:text-amber-400",
    label: "Waiting Technician",
  },
  "Waiting Approval": {
    icon: Clock,
    iconClass: "text-yellow-500 dark:text-yellow-400",
    label: "Waiting Approval",
  },
  "QC Overdue": {
    icon: ClipboardCheck,
    iconClass: "text-blue-500 dark:text-blue-400",
    label: "QC Overdue",
  },
  "Payment Pending": {
    icon: CreditCard,
    iconClass: "text-muted-foreground",
    label: "Payment Pending",
  },
};

interface ActionRequiredCardProps {
  item: OverviewActionRequiredItem;
  onOpen: (serviceId: string) => void;
  className?: string;
}

export function ActionRequiredCard({ item, onOpen, className }: ActionRequiredCardProps) {
  const config = PRIORITY_CONFIG[item.priorityLabel] ?? {
    icon: AlertTriangle,
    iconClass: "text-muted-foreground",
    label: item.priorityLabel,
  };
  const Icon = config.icon;

  const detailLine = item.doneAt
    ? `Ready ${Math.floor((Date.now() - new Date(item.doneAt).getTime()) / (1000 * 60 * 60 * 24))} days ago`
    : item.priorityLabel === "Waiting Technician"
      ? "No technician assigned"
      : null;

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
        <Icon className={`size-4 shrink-0 ${config.iconClass}`} />
        <span className="truncate text-[11px] font-semibold text-foreground">
          {config.label}
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
        {detailLine && (
          <p className="truncate text-[10px] text-muted-foreground/70">
            {detailLine}
          </p>
        )}
      </div>
    </div>
  );
}
