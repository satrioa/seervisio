"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { Clock, Infinity, Star } from "lucide-react";
import type { License } from "@/types/license";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trial: "secondary",
  expired: "destructive",
  pending: "secondary",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  expired: "Expired",
  pending: "Pending",
  cancelled: "Cancelled",
};

function daysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function durationLabel(license: License): string {
  if (!license.billing_duration_enabled) return "Lifetime";
  if (license.billing_duration_type === "month") return `${license.billing_duration_value} Month`;
  if (license.billing_duration_type === "year") return `${license.billing_duration_value} Year`;
  return "";
}

interface ActiveLicensesSectionProps {
  licenses: License[];
}

export function ActiveLicensesSection({ licenses }: ActiveLicensesSectionProps) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">Active Licenses</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Currently active licenses across all brands
        </p>
      </div>

      {licenses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No active licenses
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {licenses.map((license) => {
            const remaining = daysRemaining(license.expires_at);
            const isUrgent = remaining !== null && remaining <= 7;
            const isLifetime = !license.billing_duration_enabled;

            return (
              <div
                key={license.id}
                className="relative rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {license.is_trial && (
                  <div className="absolute -top-2.5 right-4">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Star className="size-3" />
                      Trial
                    </Badge>
                  </div>
                )}

                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{license.brand_name ?? `Brand #${license.brand_id}`}</p>
                    <p className="text-sm text-muted-foreground">{license.package_name}</p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[license.status] ?? "outline"}>
                    {STATUS_LABELS[license.status] ?? license.status}
                  </Badge>
                </div>

                <div className="mb-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{durationLabel(license)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span className="font-mono text-xs">
                      {format(new Date(license.started_at), "d MMM yyyy", { locale: id })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-mono text-xs">
                      {license.expires_at
                        ? format(new Date(license.expires_at), "d MMM yyyy", { locale: id })
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {isLifetime ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Infinity className="size-4" />
                      No expiry
                    </span>
                  ) : remaining !== null ? (
                    <span className={isUrgent ? "flex items-center gap-1 text-destructive" : "flex items-center gap-1 text-muted-foreground"}>
                      <Clock className="size-4" />
                      {remaining} {remaining === 1 ? "day" : "days"} remaining
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
