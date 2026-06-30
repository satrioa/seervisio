"use client";

import * as React from "react";
import { Bell, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCard } from "./NotificationCard";
import { NotificationEmpty } from "./NotificationEmpty";
import {
  groupNotifications,
  type Notification,
  MOCK_NOTIFICATIONS,
} from "./types";

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "system", label: "System" },
  { value: "activity", label: "Activity" },
  { value: "customer", label: "Customer" },
];

export function NotificationPopover() {
  const [tab, setTab] = React.useState("all");
  const [items, setItems] = React.useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = React.useMemo(
    () => items.filter((n) => !n.read).length,
    [items],
  );

  const filtered = React.useMemo(() => {
    switch (tab) {
      case "unread":
        return items.filter((n) => !n.read);
      case "system":
        return items.filter((n) => n.category === "system");
      case "activity":
        return items.filter((n) => n.category === "activity");
      case "customer":
        return items.filter((n) => n.category === "customer");
      default:
        return items;
    }
  }, [items, tab]);

  const groups = React.useMemo(() => groupNotifications(filtered), [filtered]);

  const handleMarkAllRead = React.useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleMarkRead = React.useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  return (
    <Popover>
      <PopoverTrigger
        className="relative size-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[400px] border-border/60 bg-card p-0 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
              >
                <Check className="size-3" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label="Notification settings"
            >
              <Settings className="size-3.5" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="px-3 pt-2"
        >
          <TabsList className="h-8 w-full gap-1 rounded-lg bg-transparent p-0">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="h-7 flex-1 rounded-md px-0 text-[11px] font-medium data-[state=active]:bg-accent data-[state=active]:shadow-none"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Body */}
        <div className="max-h-[380px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <NotificationEmpty />
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className="px-4 pb-0.5 pt-3">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    {group.label}
                  </span>
                </div>
                {group.items.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <Separator />
        <div className="px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            asChild
          >
            <a href="/panel/notifications">View all notifications</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
