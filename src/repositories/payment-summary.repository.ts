import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { ServicePaymentStatus } from "@/components/services/service-data";

export interface PaymentSummaryResult {
  totalCharged: number;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: ServicePaymentStatus;
  paymentCount: number;
  lastPaymentAt: string | null;
}

/**
 * Fetch payment summary for a single service.
 *
 * Uses the `calculate_service_payment_summary` RPC as the canonical source.
 * RPC returns: { cost, total_paid, remaining_balance, overpaid_amount, payment_state }
 * This function maps field names to the UI-friendly ServicePaymentSummary shape.
 *
 * Uses service-role admin client so it works from any server context,
 * including public tracking pages.
 */
export async function getServicePaymentSummary(
  serviceId: string,
): Promise<PaymentSummaryResult> {
  const supabase = createServiceRoleSupabaseClient() as any;

  const { data, error } = await supabase
    .rpc("calculate_service_payment_summary", { p_service_id: serviceId });

  if (error) {
    console.error("[payment-summary.repository] RPC error:", error);
    return emptySummary();
  }

  if (!data) return emptySummary();

  const { data: paymentRows } = await supabase
    .from("service_payments")
    .select("paid_at")
    .eq("service_id", serviceId)
    .eq("payment_status", "COMPLETED")
    .order("paid_at", { ascending: false })
    .limit(1);

  const paymentCount = paymentRows?.length ?? 0;
  const lastPaymentAt = paymentRows?.[0]?.paid_at ?? null;

  return {
    totalCharged: Number(data.cost) || 0,
    totalPaid: Number(data.total_paid) || 0,
    remainingBalance: Number(data.remaining_balance) || 0,
    paymentStatus: mapPaymentState(data.payment_state) ?? "UNPAID",
    paymentCount,
    lastPaymentAt,
  };
}

/**
 * Batch version: fetch payment summaries for multiple service IDs.
 * Keys are service IDs, values are PaymentSummaryResult.
 */
export async function getServicesPaymentSummary(
  serviceIds: string[],
): Promise<Record<string, PaymentSummaryResult>> {
  if (serviceIds.length === 0) return {};

  const results: Record<string, PaymentSummaryResult> = {};
  await Promise.all(
    serviceIds.map(async (id) => {
      results[id] = await getServicePaymentSummary(id);
    }),
  );
  return results;
}

function mapPaymentState(state: string | null | undefined): ServicePaymentStatus {
  switch (state) {
    case "UNPAID": return "UNPAID";
    case "PARTIAL": return "PARTIAL";
    case "PAID": return "PAID";
    case "OVERPAID": return "OVERPAID";
    default: return "UNPAID";
  }
}

function emptySummary(): PaymentSummaryResult {
  return {
    totalCharged: 0,
    totalPaid: 0,
    remainingBalance: 0,
    paymentStatus: "UNPAID",
    paymentCount: 0,
    lastPaymentAt: null,
  };
}
