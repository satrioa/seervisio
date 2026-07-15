import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ───────────────────────── Section ───────────────────────── */

export function PlatformSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          {eyebrow && (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-platform">
              {eyebrow}
            </p>
          )}
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ───────────────────────── Grid ───────────────────────── */

export function PlatformDashboardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── Stat Card ───────────────────────── */

export function PlatformStatCard({
  label,
  value,
  icon: Icon,
  sublabel,
  accent = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  sublabel?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/60 bg-card/60 shadow-sm transition-all duration-200 hover:border-border hover:bg-card",
        accent && "border-platform/30 bg-platform/[0.04]",
        className,
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          {Icon && (
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-md",
                accent
                  ? "bg-platform/10 text-platform"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" />
            </span>
          )}
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </div>
        {sublabel && (
          <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Metric (inline) ───────────────────────── */

export function PlatformMetric({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="text-base font-semibold text-foreground tabular-nums">
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ───────────────────────── Chart Card ───────────────────────── */

export function PlatformChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col border-border/60 bg-card/60 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3.5 sm:px-5">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <CardContent className="flex-1 p-4 sm:p-5">{children}</CardContent>
    </Card>
  );
}

/* ───────────────────────── Activity List ───────────────────────── */

export function PlatformActivityList({
  items,
  emptyLabel = "No recent activity",
  emptyIcon: EmptyIcon,
}: {
  items: {
    id: string;
    title: string;
    meta?: React.ReactNode;
    time?: React.ReactNode;
    icon?: React.ReactNode;
  }[];
  emptyLabel?: string;
  emptyIcon?: React.ElementType;
}) {
  if (items.length === 0) {
    const Icon = EmptyIcon ?? React.Fragment;
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Icon className="size-5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground/70">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border/50">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-2.5">
          {item.icon && (
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {item.icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {item.title}
            </p>
            {item.meta && (
              <p className="truncate text-xs text-muted-foreground">
                {item.meta}
              </p>
            )}
          </div>
          {item.time && (
            <span className="shrink-0 text-[11px] text-muted-foreground/70">
              {item.time}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────── Empty State ───────────────────────── */

export function PlatformEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center">
      {Icon && <Icon className="size-6 text-muted-foreground/40" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}

/* ───────────────────────── Skeleton ───────────────────────── */

export function PlatformSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
