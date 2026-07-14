export interface TransactionItem {
  id: string;
  movementType: string;
  direction: string;
  description: string;
  amount: number;
  createdAt: string;
  accountName?: string;
  accountType?: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

export interface PaymentBreakdownItem {
  methodType: string;
  methodName: string;
  count: number;
  total: number;
}

export interface ShiftDetailPdfInput {
  shiftNumber: string;
  status: string;
  branchName?: string | null;
  openedAt: string;
  closedAt: string | null;
  openedByName: string | null;
  closedByName: string | null;
  openingCash: number;
  expectedClosingCash: number | null;
  countedClosingCash: number | null;
  cashDifference: number | null;
  report?: {
    expectedCash: number | null;
    cashInTotal: number;
    cashOutTotal: number;
    cashSales: number;
    serviceCashPayments: number;
    refunds: number;
    paymentBreakdown: PaymentBreakdownItem[];
    transactions: TransactionItem[];
  } | null;
}
