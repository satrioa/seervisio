"use client";

import type { Notification } from "./types";

const ICON_MAP: Record<string, string> = {
  wrench: "\u2692",
  wallet: "\u{1F4B0}",
  store: "\u{1F3EA}",
  package: "\u{1F4E6}",
  sparkles: "\u2728",
  user: "\u{1F464}",
  alert: "\u26A0",
  clock: "\u{1F552}",
  check: "\u2705",
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

interface NotificationCardProps {
  item: Notification;
  onMarkRead?: (id: string) => void;
}

export function NotificationCard({ item, onMarkRead }: NotificationCardProps) {
  const Tag = item.href ? "a" : "div";

  return (
    <Tag
      href={item.href ?? "#"}
      className={`group flex items-start gap-3 px-4 py-3 transition-colors ${
        item.read
          ? "hover:bg-accent/50"
          : "bg-primary/[0.03] hover:bg-primary/[0.06]"
      }`}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-sm">
        {ICON_MAP[item.icon] ?? "\u{1F514}"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-xs leading-tight ${
              item.read ? "text-foreground" : "font-medium text-foreground"
            }`}
          >
            {item.title}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="whitespace-nowrap text-[10px] text-muted-foreground/50">
              {timeAgo(item.timestamp)}
            </span>
            {!item.read && (
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            )}
          </div>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
          {item.description}
        </p>
      </div>
    </Tag>
  );
}
