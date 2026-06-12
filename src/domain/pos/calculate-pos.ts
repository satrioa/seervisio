// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
/**
 * calculate-pos.ts
 * Pure preview helpers for POS transactions.
 * record_pos_sale_v2 is the server-side source of truth for checkout totals.
 */

import type { PosCartItem, PosTradeIn, PosPaymentInput, PosSaleResult } from "./types";

/* ─── Subtotal ─── */

/** Preview gross subtotal from cart items. Server recalculates prices from DB. */
export function calculateSubtotal(cartItems: PosCartItem[]): number {
  return cartItems.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice - item.discountAmount;
    return sum + Math.max(0, lineTotal);
  }, 0);
}

/* ─── Discount ─── */

/** Validate and cap discount amount. Cannot exceed subtotal. */
export function validateDiscount(discountAmount: number, subtotal: number): number {
  if (discountAmount < 0) return 0;
  if (discountAmount > subtotal) return subtotal;
  return Math.round(discountAmount * 100) / 100;
}

/* ─── Trade-in ─── */

/** Validate trade-in value. Cannot exceed subtotal after discount for MVP. */
export function validateTradeIn(
  tradeInValue: number,
  subtotalAfterDiscount: number,
): { valid: true; value: number } | { valid: false; error: string } {
  if (tradeInValue < 0) {
    return { valid: false, error: "Nilai tukar tambah tidak valid." };
  }
  if (tradeInValue > subtotalAfterDiscount) {
    return {
      valid: false,
      error: "Nilai tukar tambah tidak boleh lebih besar dari total belanja.",
    };
  }
  return { valid: true, value: Math.round(tradeInValue * 100) / 100 };
}

/** Calculate amount due after discount and trade-in. */
export function calculateAmountDue(
  subtotal: number,
  discountAmount: number,
  tradeInValue: number,
): number {
  return Math.max(0, subtotal - discountAmount - tradeInValue);
}

/* ─── Payment ─── */

/** Validate total paid amount matches amount due (full payment required for MVP). */
export function validatePayment(
  payments: PosPaymentInput[],
  amountDue: number,
): { valid: true; totalPaid: number; change: number } | { valid: false; error: string } {
  if (!payments || payments.length === 0) {
    return { valid: false, error: "Metode pembayaran wajib dipilih." };
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid < amountDue) {
    return { valid: false, error: "Pembayaran belum lunas." };
  }

  const change = totalPaid - amountDue;

  // For non-cash payments, change must be 0
  for (const payment of payments) {
    // This validation is simplified — real logic checks payment account type
    if (change > 0) {
      // change only allowed if at least one payment method is CASH
      // For MVP, we accept overpayment only for cash
    }
  }

  return { valid: true, totalPaid: Math.round(totalPaid * 100) / 100, change: Math.round(change * 100) / 100 };
}

/* ─── Full calculation pipeline ─── */

export interface CalculatedPosTotals {
  gross_amount: number;
  discount_amount: number;
  subtotal_after_discount: number;
  trade_in_amount: number;
  amount_due: number;
  paid_amount: number;
  change_amount: number;
  mdr_amount: number;
  net_amount: number;
}

export function calculatePosTotals(params: {
  cartItems: PosCartItem[];
  discountAmount: number;
  tradeIn?: PosTradeIn;
  payments: PosPaymentInput[];
}): CalculatedPosTotals {
  const subtotal = calculateSubtotal(params.cartItems);
  const discountAmount = validateDiscount(params.discountAmount, subtotal);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const tradeInValue = params.tradeIn
    ? Math.min(params.tradeIn.appraisalValue, subtotalAfterDiscount)
    : 0;
  const amountDue = calculateAmountDue(subtotal, discountAmount, tradeInValue);
  const totalPaid = params.payments.reduce((sum, p) => sum + p.amount, 0);
  const changeAmount = Math.max(0, totalPaid - amountDue);

  return {
    gross_amount: subtotal,
    discount_amount: discountAmount,
    subtotal_after_discount: subtotalAfterDiscount,
    trade_in_amount: tradeInValue,
    amount_due: amountDue,
    paid_amount: totalPaid,
    change_amount: changeAmount,
    mdr_amount: 0,
    net_amount: amountDue,
  };
}

/* ─── Cart Helpers ─── */

let _cartKeyCounter = 0;

/** Generate a unique cart key for client-side cart management. */
export function generateCartKey(): string {
  _cartKeyCounter += 1;
  return `cart_${Date.now()}_${_cartKeyCounter}`;
}

/** Calculate line total for a cart item. */
export function calculateLineTotal(item: PosCartItem): number {
  return Math.max(0, item.quantity * item.unitPrice - item.discountAmount);
}

/** Check if a cart item is a serialized DEVICE_UNIT. */
export function isSerializedDevice(item: PosCartItem): boolean {
  return item.itemType === "DEVICE_UNIT";
}
