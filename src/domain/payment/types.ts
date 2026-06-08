/**
 * Payment domain types.
 */

import type { PaymentMethodType } from "../payment/calculate-mdr";

export interface ServicePaymentRecord {
  serviceId: string;
  paymentMethodId: string;
  amount: number;
  notes?: string;
}

export interface PaymentResult {
  servicePaymentId: string;
  paymentNumber: string;
  grossAmount: number;
  mdrAmount: number;
  netAmount: number;
  status: string;
}

export interface PosPaymentRecord {
  brandId: number;
  branchId: string;
  customerId?: string;
  paymentMethodId: string;
  items: PosSaleItem[];
  discountAmount?: number;
  notes?: string;
}

export interface PosSaleItem {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export { type PaymentMethodType };
