"use client";

import { Bell } from "lucide-react";

export function NotificationEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50">
        <Bell className="size-6 text-muted-foreground/40" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">
        No notifications
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground/60">
        Everything is up to date.
      </p>
    </div>
  );
}
