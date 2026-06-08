/**
 * MDR (Merchant Discount Rate) calculation rules.
 * These mirror the backend logic in calculate_service_payment_mdr()
 * and calculate_pos_mdr() from migrations 007 and 009.
 *
 * Source of truth: Backend functions. This is a client/domain helper
 * for preview purposes only.
 */

export const QRIS_MDR_THRESHOLD = 500_000;

export type PaymentMethodType = "CASH" | "QRIS" | "TRANSFER" | "DEBIT" | "CREDIT" | "EWALLET";

/**
 * Calculate MDR fee for a given payment method type and amount.
 *
 * Rules:
 * - CASH, TRANSFER → MDR always 0
 * - QRIS → 0 if amount <= 500,000, otherwise amount * mdrPercentage / 100
 * - Others → amount * mdrPercentage / 100
 */
export function calculateMdrFee(
  methodType: PaymentMethodType,
  amount: number,
  mdrPercentage: number = 0
): number {
  if (methodType === "CASH" || methodType === "TRANSFER") {
    return 0;
  }

  if (methodType === "QRIS") {
    if (amount <= QRIS_MDR_THRESHOLD) {
      return 0;
    }
    return roundMoney((amount * mdrPercentage) / 100);
  }

  return roundMoney((amount * mdrPercentage) / 100);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
