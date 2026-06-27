"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { Bell, Check, X, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getNotificationsAction,
  getUnreadCountAction,
  markReadAction,
  markAllReadAction,
  deleteNotificationAction,
  generateNotificationsAction,
} from "@/server/actions/notification.actions";
import type { NotificationRow } from "@/server/repositories/notification.repository";

const SEVERITY_ICONS: Record<string, string> = {
  info: "i",
  warning: "!",
  critical: "!!",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  subscription: "Subscription",
  platform: "Platform",
  system: "System",
  billing: "Billing",
  security: "Security",
  tenant: "Tenant",
};

interface NotificationCenterProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NotificationCenter({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [generating, setGenerating] = useState(false);

  const isOpen = controlledOpen ?? open;
  const setIsOpen = setControlledOpen ?? setOpen;

  const loadData = useCallback(async () => {
    setLoading(true);
    const [notifRes, countRes] = await Promise.all([
      getNotificationsAction(categoryFilter !== "all" ? categoryFilter : undefined),
      getUnreadCountAction(),
    ]);
    if (notifRes.success) {
      setNotifications(notifRes.data);
    }
    if (countRes.success) {
      setUnreadCount(countRes.data);
    }
    setLoading(false);
  }, [categoryFilter]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleMarkRead = async (id: string) => {
    await markReadAction(id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: "read" } : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllReadAction();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: "read" })),
    );
    setUnreadCount(0);
  };

  const handleDelete = async (id: string) => {
    await deleteNotificationAction(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await generateNotificationsAction();
    await loadData();
    setGenerating(false);
  };

  const filtered = categoryFilter === "all"
    ? notifications
    : notifications.filter((n) => n.category === categoryFilter);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-platform text-[9px] font-bold text-platform-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[400px] border-border/60 bg-card p-0 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notifications
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 text-[10px]"
              >
                {unreadCount} new
              </Badge>
            )}
          </DropdownMenuLabel>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleGenerate}
              disabled={generating}
              title="Check for new notifications"
            >
              <RefreshCw className={cn("size-3.5", generating && "animate-spin")} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-border/60 px-3 py-1.5">
          <Filter className="size-3 text-muted-foreground" />
          {["all", "subscription", "platform", "tenant", "system", "security"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                  categoryFilter === cat
                    ? "bg-platform text-platform-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat] ?? cat}
              </button>
            ),
          )}
        </div>

        <DropdownMenuGroup className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="mb-2 size-8 text-muted-foreground/40" />
              <p className="text-xs font-medium text-muted-foreground">
                No notifications
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                Click refresh to check for new notifications
              </p>
            </div>
          ) : (
            filtered.slice(0, 20).map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "group relative border-b border-border/30 px-4 py-3 transition-colors hover:bg-sidebar-accent/50",
                  notification.status === "unread" && "bg-platform/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex size-4 shrink-0 items-center justify-center rounded border text-[8px] font-bold",
                          SEVERITY_COLORS[notification.severity] ?? SEVERITY_COLORS.info,
                        )}
                      >
                        {SEVERITY_ICONS[notification.severity] ?? "i"}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {CATEGORY_LABELS[notification.category] ?? notification.category}
                      </span>
                      {notification.status === "unread" && (
                        <span className="size-1.5 rounded-full bg-platform" />
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-tight",
                        notification.status === "unread"
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.description && (
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground/70 line-clamp-2">
                        {notification.description}
                      </p>
                    )}
                    <p className="mt-1 text-[9px] text-muted-foreground/50">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {notification.status === "unread" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => handleMarkRead(notification.id)}
                        title="Mark as read"
                      >
                        <Check className="size-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => handleDelete(notification.id)}
                      title="Delete"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </DropdownMenuGroup>

        {unreadCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={handleMarkAllRead}
              >
                <Check className="mr-1.5 size-3.5" />
                Mark all as read
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}
