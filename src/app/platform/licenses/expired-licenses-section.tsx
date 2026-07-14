"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarX } from "lucide-react";
import type { License } from "@/types/license";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  expired: "destructive",
  cancelled: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  expired: "Expired",
  cancelled: "Cancelled",
};

function durationLabel(license: License): string {
  if (!license.billing_duration_enabled) return "Lifetime";
  if (license.billing_duration_type === "month") return `${license.billing_duration_value} Month`;
  if (license.billing_duration_type === "year") return `${license.billing_duration_value} Year`;
  return "";
}

interface ExpiredLicensesSectionProps {
  licenses: License[];
}

export function ExpiredLicensesSection({ licenses }: ExpiredLicensesSectionProps) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">Expired Licenses</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Licenses that have expired or been cancelled
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {licenses.map((license) => (
          <div
            key={license.id}
            className="relative rounded-xl border bg-card/50 p-5 shadow-sm opacity-80 transition-opacity hover:opacity-100"
          >
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
                <span>{durationLabel(license)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started</span>
                <span className="font-mono text-xs">
                  {format(new Date(license.started_at), "d MMM yyyy", { locale: id })}
                </span>
              </div>
              {license.expires_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expired</span>
                  <span className="font-mono text-xs">
                    {format(new Date(license.expires_at), "d MMM yyyy", { locale: id })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarX className="size-4" />
              <span>No longer active</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
