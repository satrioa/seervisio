// src/lib/customer-journey/license-status.ts
//
// Pure logic for deriving license state from a DB "licenses" row and for
// gating dashboard access. Works on the REFACTORED model where a license
// is owned by a profile (brand_id nullable until the Welcome Wizard creates
// the brand). The middleware uses `isDashboardAllowed` to decide whether
// a customer may reach the panel.

export type LicenseStatusValue = "trial" | "active" | "expired" | "cancelled" | "pending";

export interface LicenseRow {
  id: string;
  brand_id: number | null;
  profile_id?: string | null;
  package_id: string;
  status: LicenseStatusValue;
  started_at: string;
  expires_at: string | null;
  is_trial: boolean;
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
