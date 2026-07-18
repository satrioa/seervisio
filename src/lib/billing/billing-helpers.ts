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
