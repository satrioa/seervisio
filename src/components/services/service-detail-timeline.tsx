"use client";

import { Clock } from "lucide-react";
import type { TimelineEntry } from "@/components/services/service-data";
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineDot,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/ui/timeline";

interface ServiceTimelineProps {
  entries: TimelineEntry[];
}

export function ServiceTimeline({ entries }: ServiceTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</span>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-3">
            <Clock className="size-3.5 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground">No activity yet</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <Clock className="size-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</span>
      </div>
      <div className="mt-3">
        <Timeline>
          {entries.map((entry, i) => {
            const isLast = i === entries.length - 1;
            return (
              <TimelineItem key={entry.id || i}>
                <TimelineSeparator>
                  <TimelineDot />
                  {!isLast && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent className="pb-3">
                  <TimelineTitle className="text-xs font-medium">
                    {entry.status}
                  </TimelineTitle>
                  {entry.note && (
                    <TimelineDescription className="text-xs">
                      {entry.note}
                    </TimelineDescription>
                  )}
                  <TimelineDescription className="text-[10px]">
                    {entry.timestamp} — {entry.by || entry.changedBy}
                  </TimelineDescription>
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
      </div>
    </div>
  );
}
