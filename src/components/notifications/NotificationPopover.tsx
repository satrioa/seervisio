"use client";

import * as React from "react";
import { Bell, Check, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import {
  getBrandNotificationsAction,
  getBrandUnreadCountAction,
  markBrandNotificationReadAction,
  markBrandAllNotificationsReadAction,
  type BrandNotificationItem,
} from "@/server/actions/brand-notification.actions";
import { NotificationCard } from "./NotificationCard";
import { NotificationEmpty } from "./NotificationEmpty";

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "system", label: "System" },
  { value: "activity", label: "Activity" },
  { value: "customer", label: "Customer" },
];

interface NotificationPopoverProps {
  brandSlug: string;
  brandId: number;
}

export function NotificationPopover({ brandSlug, brandId }: NotificationPopoverProps) {
  const [tab, setTab] = React.useState("all");
  const [items, setItems] = React.useState<BrandNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [notifRes, countRes] = await Promise.all([
      getBrandNotificationsAction(brandSlug, 50, undefined, tab !== "all" ? tab : undefined),
      getBrandUnreadCountAction(brandSlug),
    ]);
    if (notifRes.success) {
      setItems(notifRes.data);
    }
    if (countRes.success) {
      setUnreadCount(countRes.data);
    }
    setLoading(false);
  }, [brandSlug, tab]);

  // Load unread count on mount (for badge) and when brand changes
  React.useEffect(() => {
    getBrandUnreadCountAction(brandSlug).then((res) => {
      if (res.success) setUnreadCount(res.data);
    });
  }, [brandSlug]);

  // Load full notification list when popover opens or tab changes
  React.useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  // Realtime subscription — reconnect when brand changes
  React.useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications-${brandSlug}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `brand_id=eq.${brandId}`,
        } as any,
        async () => {
          // Always reload unread count for badge update
          const countRes = await getBrandUnreadCountAction(brandSlug);
          if (countRes.success) {
            setUnreadCount(countRes.data);
          }
          // If popover is open, reload full list
          setOpen((currentOpen) => {
            if (currentOpen) {
              getBrandNotificationsAction(brandSlug, 50).then((res) => {
                if (res.success) setItems(res.data);
              });
            }
            return currentOpen;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandSlug, brandId]);

  const filtered = React.useMemo(() => {
    switch (tab) {
      case "unread":
        return items.filter((n) => n.status === "unread");
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

  const handleMarkAllRead = async () => {
    const res = await markBrandAllNotificationsReadAction(brandSlug);
    if (res.success) {
      setItems((prev) => prev.map((n) => ({ ...n, status: "read" })));
      setUnreadCount(0);
    }
  };

  const handleMarkRead = async (id: string) => {
    const res = await markBrandNotificationReadAction(brandSlug, id);
    if (res.success) {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const displayCount = React.useMemo(
    () => items.filter((n) => n.status === "unread").length,
    [items],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative size-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {displayCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {displayCount > 9 ? "9+" : displayCount}
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
            {displayCount > 0 && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {displayCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {displayCount > 0 && (
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
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
            <a href={`/${brandSlug}/panel/notifications`}>View all notifications</a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Grouping utility ── */

interface GroupedItem {
  label: string;
  items: BrandNotificationItem[];
}

function groupNotifications(items: BrandNotificationItem[]): GroupedItem[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: GroupedItem[] = [];

  const todayItems = items.filter((n) => new Date(n.created_at) >= today);
  if (todayItems.length) groups.push({ label: "Today", items: todayItems });

  const yesterdayItems = items.filter(
    (n) => new Date(n.created_at) >= yesterday && new Date(n.created_at) < today,
  );
  if (yesterdayItems.length) groups.push({ label: "Yesterday", items: yesterdayItems });

  const earlierItems = items.filter((n) => new Date(n.created_at) < yesterday);
  if (earlierItems.length) groups.push({ label: "Earlier", items: earlierItems });

  return groups;
}
