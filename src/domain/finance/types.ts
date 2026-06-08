/**
 * Finance domain types.
 */

import type { FinanceEntryType, FinanceDirection } from "@/types/app";

export interface FinanceLedgerInput {
  brandId: number;
  branchId?: string;
  entryType: FinanceEntryType;
  direction: FinanceDirection;
  amount: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface DailyFinanceSummary {
  brandId: number;
  branchId?: string;
  ledgerDate: string;
  serviceRevenue: number;
  posRevenue: number;
  otherIncome: number;
  mdrExpense: number;
  operatingExpense: number;
  cogs: number;
  cashAdjustment: number;
  paymentRefund: number;
  netProfit: number;
}

export type { FinanceEntryType, FinanceDirection };
