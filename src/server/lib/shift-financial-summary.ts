import { getShiftById, getShiftMovements } from "@/repositories/store-shift.repository";
import type { PaymentBreakdownItem, TransactionItem } from "@/server/actions/store-shift.actions";

export interface ShiftFinancialSummary {
  openingCash: number;
  cashSales: number;
  serviceCashPayments: number;
  cashIn: number;
  cashOut: number;
  refunds: number;
  expectedCash: number;
  totalIncome: number;
  totalExpense: number;
  paymentBreakdown: PaymentBreakdownItem[];
  transactions: TransactionItem[];
}

function resolveAccountTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CASH: "Cash Tunai",
    BANK: "Transfer",
    QRIS: "QRIS",
    E_WALLET: "E-Wallet",
    DEBIT: "Debit",
    CREDIT: "Kredit",
    UNKNOWN: "Lainnya",
  };
  return map[type] || type;
}

function resolveMovementTypeLabel(type: string): string {
  const map: Record<string, string> = {
    OPENING_BALANCE: "Saldo Awal",
    BALANCE_ADJUSTMENT: "Penyesuaian Saldo",
    SERVICE_PAYMENT: "Pembayaran Service",
    POS_PAYMENT: "Penjualan POS",
    OTHER_INCOME: "Pendapatan Lain",
    OPERATING_EXPENSE: "Biaya Operasional",
    STOCK_PURCHASE: "Pembelian Stok",
    STOCK_PURCHASE_PAYMENT: "Pembayaran Stok",
    TRANSFER_IN: "Transfer Masuk",
    TRANSFER_OUT: "Transfer Keluar",
    BANK_FEE: "Biaya Bank",
    QRIS_SETTLEMENT: "Settlement QRIS",
    SERVICE_REFUND: "Refund Service",
    POS_REFUND: "Refund POS",
    CASH_IN: "Kas Masuk",
    CASH_OUT: "Kas Keluar",
  };
  return map[type] || type;
}

/** Pure function: compute expected cash from its breakdown components.
 *  No database dependency — usable anywhere. */
export function calculateExpectedCash(params: {
  openingCash: number;
  cashSales: number;
  serviceCashPayments: number;
  cashIn: number;
  cashOut: number;
  refunds: number;
}): {
  expectedCash: number;
  totalReceived: number;
} {
  const totalReceived = params.openingCash + params.cashSales + params.serviceCashPayments + params.cashIn;
  const expectedCash = totalReceived - params.cashOut - params.refunds;
  return { expectedCash, totalReceived };
}

const POS_TYPES = new Set(["POS_PAYMENT"]);
const SERVICE_TYPES = new Set(["SERVICE_PAYMENT"]);
const REFUND_TYPES = new Set(["SERVICE_REFUND", "POS_REFUND"]);

export async function getShiftFinancialSummary(
  supabase: any,
  shiftId: string,
): Promise<ShiftFinancialSummary> {
  const shift = await getShiftById(supabase, shiftId);

  if (!shift) {
    return {
      openingCash: 0,
      cashSales: 0,
      serviceCashPayments: 0,
      cashIn: 0,
      cashOut: 0,
      refunds: 0,
      expectedCash: 0,
      totalIncome: 0,
      totalExpense: 0,
      paymentBreakdown: [],
      transactions: [],
    };
  }

  const movements = await getShiftMovements(
    supabase,
    shift.branchId,
    shift.openedAt,
    shift.closedAt,
  );

  const accountIds = [...new Set(movements.map((m: any) => m.payment_account_id).filter(Boolean))];

  let accounts: any[] = [];
  if (accountIds.length > 0) {
    const { data: accData } = await supabase
      .from("payment_accounts")
      .select("id, type, account_name")
      .in("id", accountIds);
    accounts = accData || [];
  }

  const accountMap = new Map<string, { type: string; name: string }>();
  for (const acc of accounts) {
    accountMap.set(acc.id, { type: acc.type, name: acc.account_name });
  }

  let cashSales = 0;
  let serviceCashPayments = 0;
  let cashIn = 0;
  let cashOut = 0;
  let refunds = 0;

  const typeMap = new Map<string, { total: number; count: number }>();
  const typeLabelMap = new Map<string, string>();

  for (const m of movements as any[]) {
    const amount = Number(m.amount);
    const accInfo = accountMap.get(m.payment_account_id);
    const typeKey = accInfo?.type || "UNKNOWN";
    const label = typeLabelMap.get(typeKey) || resolveAccountTypeLabel(typeKey);
    if (!typeLabelMap.has(typeKey)) typeLabelMap.set(typeKey, label);

    const entry = typeMap.get(typeKey) || { total: 0, count: 0 };
    entry.total += amount;
    entry.count++;
    typeMap.set(typeKey, entry);

    if (accInfo?.type === "CASH") {
      if (POS_TYPES.has(m.movement_type) && m.direction === "IN") {
        cashSales += amount;
      } else if (SERVICE_TYPES.has(m.movement_type) && m.direction === "IN") {
        serviceCashPayments += amount;
      } else if (REFUND_TYPES.has(m.movement_type)) {
        refunds += amount;
      } else if (m.movement_type === "OTHER_INCOME" && m.direction === "IN") {
        cashIn += amount;
      } else if (m.movement_type === "CASH_IN") {
        cashIn += amount;
      } else if (m.movement_type === "CASH_OUT") {
        cashOut += amount;
      }
    }
  }

  const totalIncome = cashSales + serviceCashPayments + cashIn;
  const totalExpense = cashOut + refunds;
  const expectedCash = shift.openingCash + cashSales + serviceCashPayments + cashIn - cashOut - refunds;

  const paymentBreakdown = Array.from(typeMap.entries()).map(([typeKey, val]) => ({
    methodName: typeLabelMap.get(typeKey) || typeKey,
    methodType: typeKey,
    total: val.total,
    count: val.count,
  }));

  const transactions = (movements as any[]).map((m: any) => ({
    accountName: accountMap.get(m.payment_account_id)?.name,
    accountType: accountMap.get(m.payment_account_id)?.type,
    id: m.id,
    type: resolveMovementTypeLabel(m.movement_type),
    description: m.description || resolveMovementTypeLabel(m.movement_type),
    movementType: m.movement_type,
    direction: m.direction,
    amount: Number(m.amount),
    createdAt: m.created_at,
    referenceType: m.reference_type,
    referenceId: m.reference_id,
  }));

  return {
    openingCash: shift.openingCash,
    cashSales,
    serviceCashPayments,
    cashIn,
    cashOut,
    refunds,
    expectedCash,
    totalIncome,
    totalExpense,
    paymentBreakdown,
    transactions,
  };
}
