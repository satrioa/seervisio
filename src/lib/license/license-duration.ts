export type BillingDurationType = "month" | "year";

export interface LicensePackageBilling {
  billing_duration_enabled: boolean;
  billing_duration_type: BillingDurationType | null;
  billing_duration_value: number | null;
}

/**
 * Calculate license expiry date based on package billing duration.
 *
 * @param billing - Package billing duration configuration
 * @param startsAt - When the license starts (activation date)
 * @returns ISO date string for expires_at, or null for lifetime licenses
 */
export function calculateLicenseExpiry(
  billing: LicensePackageBilling,
  startsAt: Date,
): string | null {
  if (!billing.billing_duration_enabled) return null;
  if (!billing.billing_duration_type || !billing.billing_duration_value) return null;

  const date = new Date(startsAt);
  const value = billing.billing_duration_value;

  if (billing.billing_duration_type === "month") {
    date.setMonth(date.getMonth() + value);
  } else if (billing.billing_duration_type === "year") {
    date.setFullYear(date.getFullYear() + value);
  } else {
    throw new Error(`Invalid billing_duration_type: ${billing.billing_duration_type}`);
  }

  return date.toISOString();
}
