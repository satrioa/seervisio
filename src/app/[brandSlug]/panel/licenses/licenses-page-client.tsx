"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Infinity, Star, CalendarX, ExternalLink, Package, Receipt } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-header";
import type { License, LicenseOrder } from "@/types/license";
import {
  getDisplayStatus,
  getStatusBadge,
  isLifetimeLicense,
  type DisplayStatus,
} from "@/lib/customer-journey/license-status";
import {
  showsRenewalPreference,
  RENEWAL_PREFERENCE_COPY,
  LIFETIME_OVERVIEW,
} from "@/lib/billing/billing-helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Map spec display status -> shadcn badge variant (per §6.4 tones).
const BADGE_VARIANTS: Record<DisplayStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  trial: "secondary",
  lifetime: "secondary",
  waiting_approval: "secondary",
  payment_rejected: "destructive",
  expiring_soon: "secondary",
  expired: "destructive",
  suspended: "destructive",
  none: "outline",
};

const ORDER_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "secondary",
  waiting_verification: "default",
  paid: "outline",
  rejected: "destructive",
  expired: "destructive",
  cancelled: "secondary",
};

const ORDER_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  waiting_verification: "Waiting Verification",
  paid: "Paid",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function daysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function durationLabel(license: License): string {
  if (!license.billing_duration_enabled) return "Lifetime";
  if (license.billing_duration_type === "month") return `${license.billing_duration_value} Bulan`;
  if (license.billing_duration_type === "year") return `${license.billing_duration_value} Tahun`;
  return "";
}

interface LicensesPageClientProps {
  brandSlug: string;
  activeLicense: License | null;
  pastLicenses: License[];
  orders: LicenseOrder[];
  pendingOrder?: LicenseOrder | null;
  onCancelDowngrade?: () => void;
}

export function LicensesPageClient({
  brandSlug,
  activeLicense,
  pastLicenses,
  orders,
  pendingOrder,
  onCancelDowngrade,
}: LicensesPageClientProps) {
  const [selectedOrder, setSelectedOrder] = React.useState<LicenseOrder | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="License Center"
        breadcrumbs={[
          { label: "License Center" },
        ]}
      />

      {/* Pending order banner (§5): hides upgrade/buy/renew CTAs */}
      {pendingOrder && (
        <section>
          <div className="rounded-2xl border border-amber-300 bg-amber-500/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Payment Waiting Approval
                </p>
                <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-400/80">
                  Pesanan {pendingOrder.invoice_number} sedang diverifikasi. Anda tidak dapat membeli, upgrade, atau renew paket lain hingga selesai.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/${brandSlug}/pricing`}>View Payment</a>
                </Button>
                {pendingOrder.status === "rejected" && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/${brandSlug}/pricing`}>Replace Proof</a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Active License Card */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Active License</h2>
        {activeLicense ? (
          <ActiveLicenseCard
            license={activeLicense}
            brandSlug={brandSlug}
            onCancelDowngrade={onCancelDowngrade}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Package className="size-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">No Active License</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a package to activate your brand
                </p>
              </div>
              <Button asChild>
                <a href={`/${brandSlug}/pricing`}>View Packages</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Order History */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Order History</h2>
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No orders yet
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className="w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {order.invoice_number}
                      </span>
                      <Badge variant={ORDER_VARIANTS[order.status] ?? "outline"}>
                        {ORDER_LABELS[order.status] ?? order.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <span className="font-medium">{order.package_name}</span>
                      <span className="text-muted-foreground">&middot;</span>
                      <span className="font-mono font-medium">{formatPrice(order.total_amount)}</span>
                      <span className="text-muted-foreground">&middot;</span>
                      <span className="text-muted-foreground">
                        {format(new Date(order.created_at), "d MMM yyyy", { locale: id })}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Past Licenses */}
      {pastLicenses.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Past Licenses</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pastLicenses.map((license) => (
              <div
                key={license.id}
                className="rounded-xl border bg-card/50 p-5 shadow-sm opacity-80 transition-opacity hover:opacity-100"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{license.package_name}</p>
                  </div>
                  <Badge variant={BADGE_VARIANTS[getDisplayStatus(license)] ?? "outline"}>
                    {getStatusBadge(getDisplayStatus(license)).label}
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
        </section>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>{selectedOrder?.invoice_number}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Package</span>
                  <p className="font-medium">{selectedOrder.package_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total</span>
                  <p className="font-mono font-medium">{formatPrice(selectedOrder.total_amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={ORDER_VARIANTS[selectedOrder.status] ?? "outline"}>
                    {ORDER_LABELS[selectedOrder.status] ?? selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {format(new Date(selectedOrder.created_at), "d MMM yyyy HH:mm", { locale: id })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">PIC</span>
                  <p className="font-medium">{selectedOrder.pic_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment</span>
                  <p className="font-medium">{selectedOrder.payment_method || "—"}</p>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="mt-1 rounded-lg bg-muted p-3 text-sm">{selectedOrder.notes}</p>
                </div>
              )}
              {selectedOrder.rejected_reason && (
                <div>
                  <span className="text-sm text-destructive">Rejection Reason</span>
                  <p className="mt-1 rounded-lg bg-destructive/10 p-3 text-sm">{selectedOrder.rejected_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActiveLicenseCard({
  license,
  brandSlug,
  onScheduleDowngrade,
  onCancelDowngrade,
}: {
  license: License;
  brandSlug: string;
  onScheduleDowngrade?: () => void;
  onCancelDowngrade?: () => void;
}) {
  const remaining = daysRemaining(license.expires_at);
  const isUrgent = remaining !== null && remaining <= 7;
  const isLifetime = isLifetimeLicense(license);
  const displayStatus = getDisplayStatus(license);
  const badge = getStatusBadge(displayStatus);
  const showRenewal = showsRenewalPreference(license.billing_duration_type ?? "")
    && license.renewal_preference != null;
  const renewalCopy = license.renewal_preference
    ? RENEWAL_PREFERENCE_COPY[license.renewal_preference]
    : null;
  const downgradeScheduled = license.downgrade_to_package_id != null;

  return (
    <Card className="relative overflow-hidden">
      {license.is_trial && (
        <div className="absolute right-4 top-4">
          <Badge variant="secondary" className="gap-1">
            <Star className="size-3" />
            Trial
          </Badge>
        </div>
      )}

      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold">{license.package_name}</h3>
              <Badge variant={BADGE_VARIANTS[displayStatus] ?? "outline"}>
                {badge.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isLifetime ? LIFETIME_OVERVIEW.access : durationLabel(license)}
            </p>
          </div>

          {!downgradeScheduled && license.status === "active" && !isLifetime && (
            <Button variant="outline" asChild>
              <a href={`/${brandSlug}/pricing`}>Upgrade</a>
            </Button>
          )}
        </div>

        {/* Renewal preference (subscription only) */}
        {showRenewal && renewalCopy && (
          <div className="mt-4 rounded-lg bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Renewal Preference: </span>
            <span className="font-medium">{renewalCopy.label}</span>
          </div>
        )}

        {/* Downgrade scheduled badge (§3.2) */}
        {downgradeScheduled && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock className="size-4" />
              <span>
                Downgrade scheduled → {license.downgrade_to_package_name ?? "paket baru"}, berlaku{" "}
                {format(new Date(license.downgrade_effective_at ?? ""), "d MMM yyyy", { locale: id })}
              </span>
            </div>
            {onCancelDowngrade && (
              <Button size="sm" variant="ghost" onClick={onCancelDowngrade}>
                Cancel
              </Button>
            )}
          </div>
        )}

        {/* Suspended reason (§6.4) */}
        {displayStatus === "suspended" && license.suspended_reason && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {license.suspended_reason}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <span className="text-xs text-muted-foreground">Started</span>
            <p className="mt-0.5 font-mono text-sm">
              {format(new Date(license.started_at), "d MMM yyyy", { locale: id })}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">
              {isLifetime ? LIFETIME_OVERVIEW.expiration : "Expires"}
            </span>
            <p className="mt-0.5 font-mono text-sm">
              {isLifetime
                ? LIFETIME_OVERVIEW.expiration
                : license.expires_at
                  ? format(new Date(license.expires_at), "d MMM yyyy", { locale: id })
                  : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">
              {isLifetime ? LIFETIME_OVERVIEW.billing : "Remaining"}
            </span>
            <p className={`mt-0.5 flex items-center gap-1 text-sm font-medium ${isUrgent ? "text-destructive" : ""}`}>
              {isLifetime ? (
                <><Infinity className="size-4" /> {LIFETIME_OVERVIEW.expiration}</>
              ) : remaining !== null ? (
                <><Clock className="size-4" /> {remaining} {remaining === 1 ? "day" : "days"}</>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
