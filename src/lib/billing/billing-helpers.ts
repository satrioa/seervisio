export function getBillingLabel(billingCycle: string): string {
  switch (billingCycle) {
    case "monthly":
      return "Langganan Bulanan";
    case "yearly":
      return "Langganan Tahunan";
    case "lifetime":
      return "Lisensi Lifetime";
    default:
      return "Langganan Bulanan";
  }
}

export function getBillingLabelShort(billingCycle: string): string {
  switch (billingCycle) {
    case "monthly":
      return "Bulanan";
    case "yearly":
      return "Tahunan";
    case "lifetime":
      return "Lifetime";
    default:
      return "Bulanan";
  }
}

export function isLifetimeBilling(billingCycle: string): boolean {
  return billingCycle === "lifetime";
}

// Renewal Preference is only meaningful for recurring subscriptions
// (monthly / yearly). Hidden entirely for lifetime and trial (spec §2.1).
export function showsRenewalPreference(billingCycle: string): boolean {
  return billingCycle === "monthly" || billingCycle === "yearly";
}

// Honest copy for the two renewal options — both still require a manual
// transfer-upload; they differ only in who initiates (spec §2.1).
export const RENEWAL_PREFERENCE_COPY = {
  auto: {
    label: "Auto Renewal",
    recommended: true,
    description:
      "Subscription will automatically renew before expiration after payment is confirmed.",
  },
  manual: {
    label: "Manual Renewal",
    recommended: false,
    description:
      "Subscription will expire at the end of the billing period. You will need to renew manually.",
  },
} as const;

// Lifetime overview copy (spec §4.2 / §6.2) — must never show recurring
// billing language anywhere.
export const LIFETIME_OVERVIEW = {
  access: "Lifetime Access",
  expiration: "Never",
  billing: "No recurring billing",
} as const;
