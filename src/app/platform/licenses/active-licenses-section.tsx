"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { Clock, Infinity, Star, Ban } from "lucide-react";
import type { License } from "@/types/license";
import { suspendLicenseAction, unsuspendLicenseAction } from "@/server/actions/license.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trial: "secondary",
  expired: "destructive",
  pending: "secondary",
  cancelled: "destructive",
  suspended: "destructive",
  waiting_approval: "secondary",
  payment_rejected: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  expired: "Expired",
  pending: "Pending",
  cancelled: "Cancelled",
  suspended: "Suspended",
  waiting_approval: "Waiting Approval",
  payment_rejected: "Payment Rejected",
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
  const [suspendTarget, setSuspendTarget] = React.useState<License | null>(null);
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSuspend() {
    if (!suspendTarget || !reason.trim()) return;
    setSaving(true);
    const res = await suspendLicenseAction(suspendTarget.id, reason.trim());
    setSaving(false);
    if (res.success) {
      setSuspendTarget(null);
      setReason("");
    }
  }

  async function handleUnsuspend(license: License) {
    setSaving(true);
    await unsuspendLicenseAction(license.id);
    setSaving(false);
  }

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
            const canSuspend = license.status === "active" || license.status === "trial";

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
                  {license.status === "suspended" && license.suspended_reason && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Reason</span>
                      <span className="text-xs text-destructive">{license.suspended_reason}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
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
                  {canSuspend && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setReason("");
                        setSuspendTarget(license);
                      }}
                    >
                      <Ban className="size-3.5" />
                      Suspend
                    </Button>
                  )}
                  {license.status === "suspended" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnsuspend(license)}
                      disabled={saving}
                    >
                      Unsuspend
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!suspendTarget} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Suspend License</DialogTitle>
            <DialogDescription>
              {suspendTarget?.brand_name ?? `Brand #${suspendTarget?.brand_id}`} — {suspendTarget?.package_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="suspend-reason" className="text-xs">
              Alasan Suspend (wajib)
            </Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Masukkan alasan penangguhan..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSuspendTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSuspend}
              disabled={saving || !reason.trim()}
            >
              {saving ? "Menyimpan..." : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
