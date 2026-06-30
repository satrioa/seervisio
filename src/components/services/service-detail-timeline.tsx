"use client";

import { Clock } from "lucide-react";
import type { TimelineEntry } from "@/components/services/service-data";

interface ServiceTimelineProps {
  entries: TimelineEntry[];
}

export function ServiceTimeline({ entries }: ServiceTimelineProps) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <Clock className="size-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</span>
      </div>
      <div className="mt-3">
        {entries.length > 0 ? (
          <div className="space-y-0">
            {entries.map((entry, i) => {
              const isLast = i === entries.length - 1;
              return (
                <div key={entry.id || i} className="relative flex gap-3 pb-3 pl-4 last:pb-0">
                  {!isLast && <div className="absolute bottom-0 left-[5px] top-[14px] w-px bg-border" />}
                  <div className="mt-1 size-2 shrink-0 rounded-full border-2 border-primary bg-background" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{entry.status}</p>
                    {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                    <p className="text-[10px] text-muted-foreground">{entry.timestamp} — {entry.by || entry.changedBy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-3">
            <Clock className="size-3.5 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground">No activity yet</span>
          </div>
        )}
      </div>
    </div>
  );
}
