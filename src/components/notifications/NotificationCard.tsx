"use client";

import type { BrandNotificationItem } from "@/server/actions/brand-notification.actions";

const SEVERITY_ICONS: Record<string, string> = {
  info: "\u2139",
  warning: "\u26A0",
  critical: "\u203C",
  activity: "\u{1F4C8}",
  system: "\u2699",
  customer: "\u{1F464}",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

interface NotificationCardProps {
  item: BrandNotificationItem;
  onMarkRead?: (id: string) => void;
}

export function NotificationCard({ item, onMarkRead }: NotificationCardProps) {
  const isUnread = item.status === "unread";

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 transition-colors ${
        isUnread
          ? "bg-primary/[0.03] hover:bg-primary/[0.06]"
          : "hover:bg-accent/50"
      }`}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-sm">
        {SEVERITY_ICONS[item.category] ?? SEVERITY_ICONS[item.severity] ?? "\u{1F514}"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-xs leading-tight ${
              isUnread ? "font-medium text-foreground" : "text-foreground"
            }`}
          >
            {item.title}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="whitespace-nowrap text-[10px] text-muted-foreground/50">
              {timeAgo(item.created_at)}
            </span>
            {isUnread && (
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            )}
          </div>
        </div>
        {item.description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}
