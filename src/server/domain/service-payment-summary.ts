import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { PaymentItem, ServicePaymentRecord, ServicePaymentRecordType, ServicePaymentStatus } from "@/components/services/service-data";

export interface ServicePaymentSummaryResult {
  totalCharged: number;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: ServicePaymentStatus;
  payments: PaymentItem[];
  paymentRecords: ServicePaymentRecord[];
}

/**
 * Fetch payment summaries for multiple service IDs using service_payments table.
 * Uses gross_amount (customer paid) — MDR does not reduce customer paid amount.
 * Only COMPLETED/PAID/SUCCESS payments are included.
 */
export async function getServicesPaymentSummary(
  serviceIds: string[],
  chargesMap: Record<string, number>,
): Promise<Record<string, ServicePaymentSummaryResult>> {
  if (serviceIds.length === 0) return {};

  const supabase = createServiceRoleSupabaseClient();

  const { data: rows, error } = await (supabase as any)
    .from("service_payments")
    .select(`
      id,
      service_id,
      gross_amount,
      net_amount,
      mdr_amount,
      payment_status,
      paid_at,
      created_at,
      notes,
      payment_method:payment_methods(id, name, type),
      payment_account:payment_accounts(id, account_name, type)
    `)
    .in("service_id", serviceIds)
    .in("payment_status", ["COMPLETED", "PAID", "SUCCESS"])
    .order("paid_at", { ascending: true });

  if (error) {
    console.error("[service-payment-summary] query error:", error);
    return {};
  }

  if (!rows || rows.length === 0) {
    console.warn("[service-payment-summary] no payments found for serviceIds:", serviceIds.length, serviceIds.slice(0, 3), "...");
    return {};
  }

  const grouped: Record<string, any[]> = {};
  for (const row of rows) {
    const sid = row.service_id;
    if (!grouped[sid]) grouped[sid] = [];
    grouped[sid].push(row);
  }

  const result: Record<string, ServicePaymentSummaryResult> = {};

  for (const sid of serviceIds) {
    const payments = grouped[sid] || [];
    const totalCharged = chargesMap[sid] ?? 0;
    const totalPaid = payments.reduce(
      (sum: number, p: any) => sum + Number(p.gross_amount ?? 0),
      0,
    );
    const remainingBalance = Math.max(0, totalCharged - totalPaid);

    let paymentStatus: ServicePaymentStatus = "UNPAID";
    if (totalPaid <= 0) paymentStatus = "UNPAID";
    else if (totalPaid < totalCharged) paymentStatus = "PARTIAL";
    else paymentStatus = "PAID";

    const mappedPayments: PaymentItem[] = payments.map((p: any) => ({
      id: p.id,
      type: resolvePaymentTypeFromMeta(p.metadata),
      amount: Number(p.gross_amount) || 0,
      method: p.payment_method?.name ?? "",
      date: p.paid_at ?? p.created_at,
      note: p.notes ?? undefined,
    }));

    const mappedRecords: ServicePaymentRecord[] = payments.map((p: any) => ({
      id: p.id,
      serviceId: sid,
      paymentType: resolvePaymentRecordTypeFromMeta(p.metadata),
      amount: Number(p.gross_amount) || 0,
      method: p.payment_method?.name ?? "",
      methodType: p.payment_method?.type ?? "",
      accountName: p.payment_account?.account_name ?? "",
      status: "SUCCEEDED" as const,
      paidAt: p.paid_at ?? p.created_at,
      note: p.notes ?? undefined,
    }));

    result[sid] = {
      totalCharged,
      totalPaid,
      remainingBalance,
      paymentStatus,
      payments: mappedPayments,
      paymentRecords: mappedRecords,
    };
  }

  return result;
}

export async function getServicePaymentSummary(
  serviceId: string,
  totalCharged: number,
): Promise<ServicePaymentSummaryResult> {
  const result = await getServicesPaymentSummary(
    [serviceId],
    { [serviceId]: totalCharged },
  );
  return result[serviceId] ?? {
    totalCharged,
    totalPaid: 0,
    remainingBalance: totalCharged,
    paymentStatus: "UNPAID" as ServicePaymentStatus,
    payments: [],
    paymentRecords: [],
  };
}

function resolvePaymentTypeFromMeta(metadata?: Record<string, unknown> | null): PaymentItem["type"] {
  const meta = metadata ?? {};
  if (meta.payment_type === "DOWN_PAYMENT" || meta.is_dp === true) return "dp";
  if (meta.payment_type === "FINAL_PAYMENT") return "full";
  return "partial";
}

function resolvePaymentRecordTypeFromMeta(metadata?: Record<string, unknown> | null): ServicePaymentRecordType {
  const meta = metadata ?? {};
  if (meta.payment_type === "DOWN_PAYMENT" || meta.is_dp === true) return "DOWN_PAYMENT";
  if (meta.payment_type === "FINAL_PAYMENT") return "FINAL_PAYMENT";
  if (meta.payment_type === "PARTIAL_PAYMENT") return "PARTIAL_PAYMENT";
  return "FINAL_PAYMENT";
}
