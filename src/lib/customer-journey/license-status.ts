// src/lib/customer-journey/license-status.ts
//
// Pure logic for deriving license state from a DB "licenses" row and for
// gating dashboard access. Works on the REFACTORED model where a license
// is owned by a profile (brand_id nullable until the Welcome Wizard creates
// the brand). The middleware uses `isDashboardAllowed` to decide whether
// a customer may reach the panel.

export type LicenseStatusValue =
  | "trial"
  | "active"
  | "expired"
  | "cancelled"
  | "pending"
  | "waiting_approval"
  | "payment_rejected"
  | "suspended";

export interface LicenseRow {
  id: string;
  brand_id: number | null;
  profile_id?: string | null;
  package_id: string;
  status: LicenseStatusValue;
  started_at: string;
  expires_at: string | null;
  is_trial: boolean;
  package_type?: "subscription" | "lifetime" | "trial";
}

// Number of days before expiry at which the account is "Expiring Soon" (spec §6.4, H-30).
export const EXPIRING_SOON_DAYS = 30;

// Displayable account status per spec §6.4. This is the *derived* status shown
// to the user, which may differ from the raw DB status (e.g. an "active" row
// past its H-30 window becomes "expiring_soon"; a lifetime "active" becomes
// "lifetime").
export type DisplayStatus =
  | "trial"
  | "active"
  | "waiting_approval"
  | "payment_rejected"
  | "expiring_soon"
  | "expired"
  | "suspended"
  | "lifetime"
  | "none";

export interface StatusBadge {
  label: string;
  // Tailwind-friendly semantic tone; mapped to concrete classes in the UI layer.
  tone: "teal" | "green" | "amber" | "red" | "red-dark" | "purple" | "muted";
}

const STATUS_BADGES: Record<DisplayStatus, StatusBadge> = {
  trial: { label: "Trial", tone: "teal" },
  active: { label: "Active", tone: "green" },
  waiting_approval: { label: "Waiting Approval", tone: "amber" },
  payment_rejected: { label: "Payment Rejected", tone: "red" },
  expiring_soon: { label: "Expiring Soon", tone: "amber" },
  expired: { label: "Expired", tone: "red" },
  suspended: { label: "Suspended", tone: "red-dark" },
  lifetime: { label: "Lifetime", tone: "purple" },
  none: { label: "No Subscription", tone: "muted" },
};

export function getStatusBadge(status: DisplayStatus): StatusBadge {
  return STATUS_BADGES[status];
}

// Is this a lifetime license? Lifetime = no expiry AND package_type lifetime
// (or, defensively, an active license with no expires_at that isn't a trial).
export function isLifetimeLicense(license: LicenseRow | null): boolean {
  if (!license) return false;
  if (license.package_type === "lifetime") return true;
  return license.status === "active" && !license.is_trial && license.expires_at === null;
}

// Derive the user-facing display status from a raw license row (spec §6.4).
export function getDisplayStatus(license: LicenseRow | null): DisplayStatus {
  if (!license) return "none";

  switch (license.status) {
    case "suspended":
      return "suspended";
    case "payment_rejected":
      return "payment_rejected";
    case "waiting_approval":
    case "pending":
      return "waiting_approval";
    case "cancelled":
      return "none";
    case "expired":
      return "expired";
    case "trial": {
      const { isExpired } = computeExpiry(license.expires_at);
      return isExpired ? "expired" : "trial";
    }
    case "active": {
      if (isLifetimeLicense(license)) return "lifetime";
      const { isExpired, daysRemaining } = computeExpiry(license.expires_at);
      if (isExpired) return "expired";
      if (daysRemaining !== null && daysRemaining <= EXPIRING_SOON_DAYS) {
        return "expiring_soon";
      }
      return "active";
    }
    default:
      return "none";
  }
}

function computeExpiry(expiresAt: string | null): {
  isExpired: boolean;
  daysRemaining: number | null;
} {
  if (!expiresAt) return { isExpired: false, daysRemaining: null };
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return {
    isExpired: diffMs <= 0,
    daysRemaining: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
  };
}

export interface LicenseState {
  exists: boolean;
  status: LicenseStatusValue | "none";
  isActive: boolean; // active OR trial (trial is usable but time-boxed)
  isExpired: boolean; // past expires_at
  daysRemaining: number | null; // null for lifetime / no expiry
}

export function getLicenseState(license: LicenseRow | null): LicenseState {
  if (!license) {
    return {
      exists: false,
      status: "none",
      isActive: false,
      isExpired: false,
      daysRemaining: null,
    };
  }

  const usable = license.status === "active" || license.status === "trial";
  let isExpired = false;
  let daysRemaining: number | null = null;

  if (license.expires_at) {
    const diffMs = new Date(license.expires_at).getTime() - Date.now();
    isExpired = diffMs <= 0;
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  // A row flagged active/trial but past its expiry is effectively expired.
  const effectiveActive = usable && !isExpired;

  return {
    exists: true,
    status: license.status,
    isActive: effectiveActive,
    isExpired,
    daysRemaining,
  };
}

// Spec rule: "Never allow access to dashboard without an active license."
// Dashboard here means operational panel access. A brand that already exists
// (legacy tenants) is treated as licensed via its existing license/subscription.
export function isDashboardAllowed(license: LicenseRow | null): boolean {
  return getLicenseState(license).isActive;
}

// Combined gate used by middleware: a customer reaches the dashboard only
// when the license is active AND onboarding has been completed.
export function canEnterOperational(
  license: LicenseRow | null,
  onboardingComplete: boolean,
): boolean {
  return getLicenseState(license).isActive && onboardingComplete;
}
