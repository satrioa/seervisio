/**
 * service-ui-mappers.ts
 * Maps DB response types from server actions to UI view model types.
 */

import type {
  ServiceRecord,
  SparepartItem,
  PaymentItem,
  TimelineEntry,
  ServicePaymentSummary,
} from "./service-data";
import { fromDbStatus } from "@/domain/service/service-workflow";
import { mapDbStatusToUI as mapCanonicalDbStatusToUI } from "@/lib/services/service-status";

/* ─── Payment Mapping ─── */

export interface DbPaymentRow {
  id: string;
  payment_method?: { id: string; name: string; type: string } | null;
  payment_account?: { id: string; name: string; account_type: string } | null;
  gross_amount: number;
  mdr_amount: number;
  net_amount: number;
  paid_at: string;
  created_at: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export function mapDbPaymentToUI(payment: DbPaymentRow): PaymentItem {
  return {
    id: payment.id,
    type: resolvePaymentType(payment.metadata),
    amount: Number(payment.net_amount) || 0,
    method: payment.payment_method?.name ?? "",
    date: payment.paid_at ?? payment.created_at,
    note: payment.notes ?? undefined,
  };
}

function resolvePaymentType(
  metadata?: Record<string, unknown> | null
): PaymentItem["type"] {
  const meta = metadata ?? {};
  if (meta.payment_type === "DOWN_PAYMENT" || meta.is_dp === true) return "dp";
  if (meta.payment_type === "FINAL_PAYMENT") return "full";
  return "partial";
}

export function mapDbPaymentsToUI(payments: DbPaymentRow[]): PaymentItem[] {
  return payments.map(mapDbPaymentToUI);
}

/* ─── Sparepart Mapping ─── */

export interface DbSparepartUsageRow {
  id: string;
  item?: { id: string; name: string; type: string } | null;
  quantity_used: number;
  unit_cost: number | null;
  selling_price: number | null;
  created_at: string;
}

export function mapDbSparepartToUI(sp: DbSparepartUsageRow): SparepartItem {
  const qty = Number(sp.quantity_used) || 1;
  const price = Number(sp.selling_price) || 0;
  return {
    id: sp.id,
    name: sp.item?.name ?? "Unknown",
    qty,
    price,
    totalPrice: qty * price,
    type: "sparepart",
  };
}

export function mapDbSparepartsToUI(
  spareparts: DbSparepartUsageRow[]
): SparepartItem[] {
  return spareparts.map(mapDbSparepartToUI);
}

/* ─── Timeline Mapping ─── */

export interface DbTimelineRow {
  id: string;
  from_status: string | null;
  to_status: string;
  reason?: string | null;
  changed_at: string;
  created_at: string;
  changed_by_profile?: { id: string; full_name: string } | null;
}

export function mapDbTimelineToUI(entry: DbTimelineRow): TimelineEntry {
  return {
    id: entry.id,
    status: fromDbStatus(entry.to_status),
    fromStatus: entry.from_status ? fromDbStatus(entry.from_status) : undefined,
    toStatus: fromDbStatus(entry.to_status),
    timestamp: entry.changed_at ?? entry.created_at,
    note: entry.reason ?? undefined,
    changedBy: entry.changed_by_profile?.full_name ?? undefined,
  };
}

export function mapDbTimelinesToUI(
  entries: DbTimelineRow[]
): TimelineEntry[] {
  return entries.map(mapDbTimelineToUI);
}

/* ─── Payment Summary Mapping ─── */

export function mapPaymentSummary(
  summary: any | null | undefined
): ServicePaymentSummary | null {
  if (!summary) return null;
  return {
    totalCharged: Number(summary.total_charged) || 0,
    totalPaid: Number(summary.total_paid) || 0,
    remainingBalance: Number(summary.remaining_balance) || 0,
    dpAmount: Number(summary.dp_amount) || 0,
    paymentStatus:
      (summary.payment_status as ServicePaymentSummary["paymentStatus"]) ??
      "unpaid",
  };
}

/* ─── Status Mapping ─── */

export function mapDbStatusToUI(dbStatus: string) {
  return mapCanonicalDbStatusToUI(dbStatus);
}
