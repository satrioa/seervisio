/**
 * POS domain types.
 */

export interface PosSaleInput {
  brandId: number;
  branchId: string;
  customerId?: string;
  paymentMethodId: string;
  items: PosLineItem[];
  discountAmount?: number;
  notes?: string;
}

export interface PosLineItem {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface PosSaleResult {
  posSaleId: string;
  saleNumber: string;
  grossAmount: number;
  discountAmount: number;
  customerPaidAmount: number;
  mdrAmount: number;
  netAmount: number;
  totalCogs: number;
  grossProfit: number;
}
