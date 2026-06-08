/**
 * Money formatting utilities for IDR currency.
 */

export function formatCurrencyIDR(amount: number | string | null | undefined): string {
  const value = toNumberSafe(amount);
  if (value === 0) return "Rp 0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseMoneyInput(input: string | number): number {
  if (typeof input === "number") return input;

  const cleaned = input
    .replace(/[^0-9,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function toNumberSafe(value: unknown): number {
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}
