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
  // Snapshot columns
  item_name_snapshot?: string | null;
  variant_snapshot?: Record<string, any> | null;
  sku_snapshot?: string | null;
  barcode_snapshot?: string | null;
  serialized_unit_id?: string | null;
  imei_snapshot?: string | null;
  serial_number_snapshot?: string | null;
  battery_health_snapshot?: number | null;
  condition_grade_snapshot?: string | null;
  condition_notes_snapshot?: string | null;
  unit_snapshot?: string | null;
  unit_cost_snapshot?: number | null;
  selling_price_snapshot?: number | null;
  total_cost_snapshot?: number | null;
  total_price_snapshot?: number | null;
  is_returned?: boolean;
  serialized_unit?: {
    id: string;
    imei: string | null;
    serial_number: string | null;
    battery_health: number | null;
    condition_grade: string | null;
    status: string;
  } | null;
}

export function mapDbSparepartToUI(sp: DbSparepartUsageRow): SparepartItem {
  const qty = Number(sp.quantity_used ?? 1);
  const price = Number(sp.selling_price_snapshot ?? sp.selling_price ?? 0);
  const su = sp.serialized_unit;
  return {
    id: sp.id,
    name: sp.item_name_snapshot ?? sp.item?.name ?? "Unknown",
    qty,
    price,
    totalPrice: qty * price,
    type: "sparepart",
    itemNameSnapshot: sp.item_name_snapshot ?? null,
    variantSnapshot: sp.variant_snapshot ?? null,
    skuSnapshot: sp.sku_snapshot ?? null,
    barcodeSnapshot: sp.barcode_snapshot ?? null,
    serializedUnitId: sp.serialized_unit_id ?? null,
    imeiSnapshot: sp.imei_snapshot ?? null,
    serialNumberSnapshot: sp.serial_number_snapshot ?? null,
    batteryHealthSnapshot: sp.battery_health_snapshot != null ? Number(sp.battery_health_snapshot) : null,
    conditionGradeSnapshot: sp.condition_grade_snapshot ?? null,
    conditionNotesSnapshot: sp.condition_notes_snapshot ?? null,
    unitSnapshot: sp.unit_snapshot ?? null,
    unitCostSnapshot: sp.unit_cost_snapshot != null ? Number(sp.unit_cost_snapshot) : null,
    sellingPriceSnapshot: sp.selling_price_snapshot != null ? Number(sp.selling_price_snapshot) : null,
    totalCostSnapshot: sp.total_cost_snapshot != null ? Number(sp.total_cost_snapshot) : null,
    totalPriceSnapshot: sp.total_price_snapshot != null ? Number(sp.total_price_snapshot) : null,
    isReturned: sp.is_returned ?? false,
    serializedUnit: su ? {
      id: su.id,
      imei: su.imei ?? null,
      serialNumber: su.serial_number ?? null,
      batteryHealth: su.battery_health != null ? Number(su.battery_health) : null,
      conditionGrade: su.condition_grade ?? null,
      conditionNotes: null,
      status: su.status,
    } : null,
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
