export interface PaymentSummaryRow {
  id: string;
  paymentNumber: string;
  paymentStatus: string;
  grossAmount: number;
  mdrAmount: number;
  netAmount: number;
  paidAt: string | null;
  createdAt: string;
  methodType: string | null;
  accountName: string | null;
}

export interface ServicePaymentSummaryResult {
  totalBill: number;
  totalPaid: number;
  remainingAmount: number;
  paymentState: "UNPAID" | "PARTIAL" | "PAID" | "OVERPAID";
  successfulPayments: PaymentSummaryRow[];
}

export function buildServicePaymentSummary(
  finalCost: number | string | null | undefined,
  estimatedCost: number | string | null | undefined,
  payments: {
    payment_status?: string;
    gross_amount?: number;
    id?: string;
    payment_number?: string;
    mdr_amount?: number;
    net_amount?: number;
    paid_at?: string | null;
    created_at?: string;
    branch_payment_method_id?: string;
    payment_account_id?: string;
  }[],
): ServicePaymentSummaryResult {
  const totalBill = Number(finalCost ?? estimatedCost ?? 0);

  const successful = payments.filter(
    (p) =>
      p.payment_status === "COMPLETED" ||
      p.payment_status === "PAID" ||
      p.payment_status === "SUCCESS",
  );

  const totalPaid = successful.reduce(
    (sum, p) => sum + Number(p.gross_amount ?? 0),
    0,
  );

  const remainingAmount = Math.max(0, totalBill - totalPaid);

  let paymentState: ServicePaymentSummaryResult["paymentState"] = "UNPAID";
  if (totalPaid <= 0) paymentState = "UNPAID";
  else if (remainingAmount > 0) paymentState = "PARTIAL";
  else if (totalBill > 0) paymentState = "PAID";
  else paymentState = "UNPAID";

  const successfulPayments: PaymentSummaryRow[] = successful.map((p) => ({
    id: p.id ?? "",
    paymentNumber: p.payment_number ?? "",
    paymentStatus: p.payment_status ?? "",
    grossAmount: Number(p.gross_amount ?? 0),
    mdrAmount: Number(p.mdr_amount ?? 0),
    netAmount: Number(p.net_amount ?? 0),
    paidAt: p.paid_at ?? null,
    createdAt: p.created_at ?? new Date().toISOString(),
    methodType: null,
    accountName: null,
  }));

  return { totalBill, totalPaid, remainingAmount, paymentState, successfulPayments };
}
