/**
 * Money formatting utilities.
 * All amounts are stored as INTEGER (in smallest unit — rupiah).
 */

/**
 * Format an amount as IDR currency string.
 * Example: 15000 → "Rp15.000"
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format amount without "Rp" prefix for display in tables.
 */
export function formatIDRShort(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate MDR fee for a given amount and payment method.
 * Mirrors backend constants:
 * - QRIS: 0.3% if amount > 500000, else flat Rp1.500
 * - TRANSFER, CASH, ED: MDR = 0
 */
export function calculateMDR(
  amount: number,
  paymentMethodCode: string
): number {
  if (paymentMethodCode === "QRIS") {
    const FLAT_MDR = 1500;
    const PERCENTAGE_MDR_RATE = 0.003; // 0.3%
    const THRESHOLD = 500000;
    return amount > THRESHOLD
      ? Math.round(amount * PERCENTAGE_MDR_RATE)
      : FLAT_MDR;
  }
  return 0;
}
