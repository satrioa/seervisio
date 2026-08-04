"use client";

import * as React from "react";
import {
  type LucideIcon,
  Inbox,
  RefreshCw,
  User,
  UserX,
  Receipt,
  Wallet,
  Wrench,
  FileText,
  MessageSquare,
  Camera,
  Phone,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  PackageCheck,
  RotateCcw,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import type { TimelineEvent, TimelineEventType } from "@/components/services/service-data";
import { formatActivityTime } from "@/lib/date";

const EVENT_ICON: Record<TimelineEventType, LucideIcon> = {
  SERVICE_CREATED: Inbox,
  STATUS_CHANGED: RefreshCw,
  TECHNICIAN_ASSIGNED: User,
  TECHNICIAN_UNASSIGNED: UserX,
  DIAGNOSIS_UPDATED: FileText,
  ESTIMATION_CREATED: DollarSign,
  ESTIMATION_UPDATED: DollarSign,
  SPAREPART_ADDED: Wrench,
  SPAREPART_REMOVED: Wrench,
  PAYMENT_CREATED: Receipt,
  PAYMENT_RECEIVED: Wallet,
  NOTE_ADDED: MessageSquare,
  PHOTO_ADDED: Camera,
  CUSTOMER_CONTACTED: Phone,
  QC_STARTED: ClipboardCheck,
  QC_PASSED: CheckCircle,
  QC_FAILED: AlertTriangle,
  READY_FOR_PICKUP: PackageCheck,
  SERVICE_PICKED_UP: CheckCircle,
  SERVICE_CANCELLED: XCircle,
  BILLING_SET: Receipt,
  SERVICE_REOPENED: RotateCcw,
};

function getEventIcon(eventType: TimelineEventType): LucideIcon {
  return EVENT_ICON[eventType] ?? RefreshCw;
}

const EVENT_COLORS: Record<TimelineEventType, string> = {
  SERVICE_CREATED: "text-blue-600 dark:text-blue-400",
  STATUS_CHANGED: "text-purple-600 dark:text-purple-400",
  TECHNICIAN_ASSIGNED: "text-cyan-600 dark:text-cyan-400",
  TECHNICIAN_UNASSIGNED: "text-orange-600 dark:text-orange-400",
  DIAGNOSIS_UPDATED: "text-violet-600 dark:text-violet-400",
  ESTIMATION_CREATED: "text-emerald-600 dark:text-emerald-400",
  ESTIMATION_UPDATED: "text-emerald-600 dark:text-emerald-400",
  SPAREPART_ADDED: "text-amber-600 dark:text-amber-400",
  SPAREPART_REMOVED: "text-red-600 dark:text-red-400",
  PAYMENT_CREATED: "text-sky-600 dark:text-sky-400",
  PAYMENT_RECEIVED: "text-emerald-600 dark:text-emerald-400",
  NOTE_ADDED: "text-zinc-600 dark:text-zinc-400",
  PHOTO_ADDED: "text-pink-600 dark:text-pink-400",
  CUSTOMER_CONTACTED: "text-indigo-600 dark:text-indigo-400",
  QC_STARTED: "text-cyan-600 dark:text-cyan-400",
  QC_PASSED: "text-emerald-600 dark:text-emerald-400",
  QC_FAILED: "text-red-600 dark:text-red-400",
  READY_FOR_PICKUP: "text-green-600 dark:text-green-400",
  SERVICE_PICKED_UP: "text-teal-600 dark:text-teal-400",
  SERVICE_CANCELLED: "text-red-600 dark:text-red-400",
  BILLING_SET: "text-sky-600 dark:text-sky-400",
  SERVICE_REOPENED: "text-blue-600 dark:text-blue-400",
};

function getDotColor(eventType: TimelineEventType): string {
  const map: Record<string, string> = {
    SERVICE_CREATED: "bg-blue-500",
    STATUS_CHANGED: "bg-purple-500",
    TECHNICIAN_ASSIGNED: "bg-cyan-500",
    TECHNICIAN_UNASSIGNED: "bg-orange-500",
    DIAGNOSIS_UPDATED: "bg-violet-500",
    ESTIMATION_CREATED: "bg-emerald-500",
    ESTIMATION_UPDATED: "bg-emerald-500",
    SPAREPART_ADDED: "bg-amber-500",
    SPAREPART_REMOVED: "bg-red-500",
    PAYMENT_CREATED: "bg-sky-500",
    PAYMENT_RECEIVED: "bg-emerald-500",
    NOTE_ADDED: "bg-zinc-400",
    PHOTO_ADDED: "bg-pink-500",
    CUSTOMER_CONTACTED: "bg-indigo-500",
    QC_STARTED: "bg-cyan-500",
    QC_PASSED: "bg-emerald-500",
    QC_FAILED: "bg-red-500",
    READY_FOR_PICKUP: "bg-green-500",
    SERVICE_PICKED_UP: "bg-teal-500",
    SERVICE_CANCELLED: "bg-red-500",
    BILLING_SET: "bg-sky-500",
    SERVICE_REOPENED: "bg-blue-500",
  };
  return map[eventType] ?? "bg-zinc-300 dark:bg-zinc-600";
}

function getDateGroupLabel(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() === startOfToday.getTime()) return "Hari Ini";
  if (startOfDay.getTime() === startOfYesterday.getTime()) return "Kemarin";

  const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
  const sameYear = date.getFullYear() === now.getFullYear();
  const label = fmt.format(date);
  return sameYear ? label : `${label} ${date.getFullYear()}`;
}

interface ServiceActivityTimelineProps {
  events: TimelineEvent[];
}

function ServiceActivityTimelineImpl({ events }: ServiceActivityTimelineProps) {
  const safeEvents = events ?? [];

  if (safeEvents.length === 0) {
    return (
      <section aria-label="Activity timeline" className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-1.5">
          <Inbox className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Timeline
          </span>
        </div>
        <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
          <Inbox className="size-5 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Belum ada aktivitas servis.
          </p>
          <p className="max-w-[18rem] text-xs text-muted-foreground/70">
            Aktivitas akan muncul di sini seiring berjalannya proses servis.
          </p>
        </div>
      </section>
    );
  }

  const grouped: { label: string; events: TimelineEvent[] }[] = [];
  let currentGroup: { label: string; events: TimelineEvent[] } | null = null;

  for (const event of safeEvents) {
    const d = new Date(event.createdAt);
    const label = getDateGroupLabel(d);
    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, events: [] };
      grouped.push(currentGroup);
    }
    currentGroup.events.push(event);
  }

  return (
    <section aria-label="Activity timeline" className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <Inbox className="size-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Timeline
        </span>
      </div>
      <div className="mt-4 space-y-6">
        {grouped.map((group) => (
          <div key={group.label}>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </h3>
            <ol role="list" className="space-y-0">
              {group.events.map((event, idx) => {
                const isLast = idx === group.events.length - 1;
                const Icon = getEventIcon(event.eventType);
                const colorClass = EVENT_COLORS[event.eventType];
                const dotColor = getDotColor(event.eventType);
                const timeLabel = formatActivityTime(event.createdAt);

                return (
                  <li key={event.id} className="relative flex gap-3 pb-1">
                    <div className="flex flex-col items-center">
                      <span className={twMerge("flex size-6 shrink-0 items-center justify-center rounded-full bg-background", colorClass)}>
                        <Icon className="size-3" />
                      </span>
                      {!isLast && (
                        <span className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className={twMerge("min-w-0 flex-1 pb-4", isLast && "pb-0")}>
                      <div className="-mx-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/40">
                        <p className="text-xs font-medium text-foreground">
                          {event.title}
                        </p>
                        {event.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                            {event.description}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground/70">
                          <span>{timeLabel}</span>
                          {event.actor && event.actor !== "Sistem" && (
                            <>
                              <span aria-hidden className="opacity-40">•</span>
                              <span>oleh {event.actor}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

export const ServiceActivityTimeline = React.memo(ServiceActivityTimelineImpl);
