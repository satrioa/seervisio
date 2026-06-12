/**
 * Service CRUD server actions.
 */
"use server";

import { getSessionData, successResult, errorResult, type ActionResult } from "./action-helper";
import { fromDbStatus } from "@/domain/service/service-workflow";
import {
  getServicesByBranch,
  getServiceById,
  insertService,
  addServiceTimelineEntry,
  addAuditLog,
} from "@/repositories/service.repository";
import { findOrCreateCustomer } from "@/repositories/customer.repository";
import { callGenerateServiceNumber, callRecordServicePayment, callRecordServicePaymentFinanceEntries, getServicePayments, callCalculateServicePaymentSummary } from "@/repositories/payment.repository";
import { getServiceSparepartUsages } from "@/repositories/inventory.repository";
import { getServiceStatusHistory } from "@/repositories/service.repository";
import type { ServiceRecord, ServiceStatus, SparepartItem, PaymentItem, TimelineEntry, ServicePaymentSummary } from "@/components/services/service-data";

/* ─── List Services ─── */

export interface ListServicesInput {
  brandSlug: string;
  branchId?: string;
  status?: string;
}

export async function listServicesAction(
  input: ListServicesInput
): Promise<ActionResult<ServiceRecord[]>> {
  try {
    const session = await getSessionData(input.brandSlug);
    const branchId = input.branchId ?? session.defaultBranchId;
    if (!branchId) {
      return errorResult("Branch tidak ditemukan.");
    }

    const rows = await getServicesByBranch(branchId);

    const services: ServiceRecord[] = rows.map((row: any) => ({
      id: row.service_number,
      customerId: row.customer_id ?? undefined,
      deviceType: row.device_type ?? "",
      deviceBrand: row.device_brand ?? "",
      deviceModel: row.device_model ?? "",
      serialNumber: row.device_serial_number ?? undefined,
      customerName: row.customer?.name ?? "Unknown",
      customerPhone: row.customer?.phone ?? "",
      customerAddress: row.customer?.address ?? undefined,
      issue: row.reported_issue,
      diagnosis: row.diagnosis_result ?? undefined,
      status: fromDbStatus(row.current_status).toLowerCase() as any,
      technician: row.technician?.full_name ?? undefined,
      branch: branchId,
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
      estimatedCompletion: undefined,
      spareparts: [],
      payments: [],
      timeline: [],
      notes: [],
      deviceIcon: "Smartphone" as any,
      pickedUpAt: row.picked_up_at ?? undefined,
      pickupName: row.pickup_name ?? undefined,
      pickupPhone: row.pickup_phone ?? undefined,
      pickupRelation: row.pickup_relation ?? undefined,
      pickupNote: row.pickup_note ?? undefined,
      pickedUpBy: row.picked_up_by_profile_id ?? undefined,
    }));
    
    return successResult(services);
  } catch (err: any) {
    console.error("[listServicesAction]", err);
    return errorResult(err.message ?? "Gagal memuat daftar servis.");
  }
}

/* ─── Get Service Detail ─── */

export async function getServiceDetailAction(
  brandSlug: string,
  serviceId: string
): Promise<ActionResult<ServiceRecord>> {
  try {
    await getSessionData(brandSlug);
    
    // 1. Base service row with customer + technician
    const row = await getServiceById(serviceId);
    if (!row) return errorResult("Servis tidak ditemukan.");
    
    // 2. Fetch all relations in parallel
    const [payments, spareparts, timeline] = await Promise.all([
      getServicePayments(serviceId),
      getServiceSparepartUsages(serviceId),
      getServiceStatusHistory(serviceId),
    ]);

    // 3. Calculate payment summary
    let paymentSummary: ServicePaymentSummary | null = null;
    try {
      const summary = await callCalculateServicePaymentSummary(serviceId);
      if (summary) {
        paymentSummary = {
          totalCharged: Number(summary.total_charged) || 0,
          totalPaid: Number(summary.total_paid) || 0,
          remainingBalance: Number(summary.remaining_balance) || 0,
          dpAmount: Number(summary.dp_amount) || 0,
          paymentStatus: (summary.payment_status as ServicePaymentSummary["paymentStatus"]) || "UNPAID",
        };
      }
    } catch {
      // Payment summary is optional; continue without it
    }
    
    // 4. Map payments to UI PaymentItem[]
    const mappedPayments: PaymentItem[] = payments.map((p: any) => ({
      id: p.id,
      type: resolvePaymentType(p.metadata),
      amount: Number(p.net_amount) || 0,
      method: p.payment_method?.name ?? "",
      date: p.paid_at ?? p.created_at,
      note: p.notes ?? undefined,
    }));

    // 5. Map spareparts to UI SparepartItem[]
    const mappedSpareparts: SparepartItem[] = spareparts.map((s: any) => ({
      id: s.id,
      name: s.item?.name ?? "Unknown",
      qty: Number(s.quantity_used) || 1,
      price: Number(s.selling_price) || 0,
      totalPrice: (Number(s.quantity_used) || 1) * (Number(s.selling_price) || 0),
      type: "sparepart",
    }));
    
    // 6. Map timeline to UI TimelineEntry[]
    const mappedTimeline: TimelineEntry[] = timeline.map((t: any) => ({
      id: t.id,
      status: fromDbStatus(t.to_status),
      fromStatus: t.from_status ? fromDbStatus(t.from_status) : undefined,
      toStatus: fromDbStatus(t.to_status),
      timestamp: t.changed_at ?? t.created_at,
      note: t.reason ?? undefined,
      changedBy: t.changed_by_profile?.full_name ?? undefined,
    }));
    
    // 7. Map service row to ServiceRecord
    const status = fromDbStatus(row.current_status);
    const service: ServiceRecord = {
      id: row.service_number,
      customerId: row.customer_id ?? undefined,
      deviceType: row.device_type ?? "",
      deviceBrand: row.device_brand ?? "",
      deviceModel: row.device_model ?? "",
      serialNumber: row.device_serial_number ?? undefined,
      customerName: row.customer?.name ?? "Unknown",
      customerPhone: row.customer?.phone ?? "",
      customerAddress: row.customer?.address ?? undefined,
      issue: row.reported_issue,
      diagnosis: row.diagnosis_result ?? undefined,
      status: status.toLowerCase() as ServiceStatus,
      technician: row.technician?.full_name ?? undefined,
      branch: row.branch_id,
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
      estimatedCompletion: undefined,
      spareparts: mappedSpareparts,
      payments: mappedPayments,
      timeline: mappedTimeline,
      notes: [],
      deviceIcon: "Smartphone" as any,
      pickedUpAt: row.picked_up_at ?? undefined,
      pickupName: row.pickup_name ?? undefined,
      pickupPhone: row.pickup_phone ?? undefined,
      pickupRelation: row.pickup_relation ?? undefined,
      pickupNote: row.pickup_note ?? undefined,
      pickedUpBy: row.picked_up_by_profile_id ?? undefined,
    };
    
    return successResult(service);
  } catch (err: any) {
    console.error("[getServiceDetailAction]", err);
    return errorResult(err.message ?? "Gagal memuat detail servis.");
  }
}

/**
 * Map payment DB row to UI payment type based on metadata.
 */
function resolvePaymentType(metadata?: Record<string, unknown> | null): PaymentItem["type"] {
  const meta = metadata ?? {};
  if (meta.payment_type === "DOWN_PAYMENT" || meta.is_dp === true) return "dp";
  if (meta.payment_type === "FINAL_PAYMENT") return "full";
  return "partial";
}

/* ─── Create Service ─── */

export interface CreateServiceInput {
  brandSlug: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceColor?: string;
  deviceImei?: string;
  deviceSerialNumber?: string;
  reportedIssue: string;
  diagnosisResult?: string;
  estimatedCost?: number;
  branchId?: string;
  dpAmount?: number;
  dpPaymentMethodId?: string;
  dpPaymentAccountId?: string;
  dpNote?: string;
}

export async function createServiceAction(
  input: CreateServiceInput
): Promise<ActionResult<{ serviceId: string; serviceNumber: string }>> {
  try {
    const session = await getSessionData(input.brandSlug);
    const brandId = session.brandId;
    const branchId = input.branchId ?? session.defaultBranchId;

    if (!branchId) return errorResult("Branch tidak ditemukan.");
    if (!input.customerName?.trim()) return errorResult("Nama customer wajib diisi.");
    if (!input.reportedIssue?.trim()) return errorResult("Keluhan wajib diisi.");

    const customer = await findOrCreateCustomer({
      brand_id: brandId,
      name: input.customerName.trim(),
      phone: input.customerPhone?.trim() || null,
      address: input.customerAddress?.trim() || null,
    });

    const serviceNumber = await callGenerateServiceNumber(brandId);

    const service = await insertService({
      brand_id: brandId,
      branch_id: branchId,
      customer_id: customer.id,
      service_number: serviceNumber,
      device_type: input.deviceType?.trim() || null,
      device_brand: input.deviceBrand?.trim() || null,
      device_model: input.deviceModel?.trim() || null,
      device_color: input.deviceColor?.trim() || null,
      device_imei: input.deviceImei?.trim() || null,
      device_serial_number: input.deviceSerialNumber?.trim() || null,
      reported_issue: input.reportedIssue.trim(),
      diagnosis_result: input.diagnosisResult?.trim() || null,
      estimated_cost: input.estimatedCost ?? 0,
      created_by: session.profileId,
    });

    await addServiceTimelineEntry({
      brand_id: brandId,
      branch_id: branchId,
      service_id: service.id,
      from_status: null,
      to_status: "INTAKE",
      reason: "Servis baru dibuat",
      changed_by: session.profileId,
    });

    await addAuditLog({
      brand_id: brandId,
      action: "SERVICE_CREATED",
      entity_type: "service",
      entity_id: service.id,
      actor_id: session.profileId,
      metadata: { service_number: serviceNumber, customer_name: input.customerName },
    });

    if (input.dpAmount && input.dpAmount > 0 && input.dpPaymentMethodId) {
      if (input.estimatedCost && input.dpAmount > input.estimatedCost) {
        return errorResult("Nominal DP tidak boleh melebihi estimasi biaya.");
      }

      const paymentMeta: Record<string, unknown> = {
        payment_type: "DOWN_PAYMENT",
        is_dp: true,
        source: "create_service",
      };

      const paymentResult = await callRecordServicePayment(
        service.id,
        input.dpPaymentMethodId,
        input.dpAmount,
        session.profileId,
        input.dpNote ?? "DP pembuatan servis",
        paymentMeta
      );

      if (paymentResult?.service_payment_id) {
        try {
          await callRecordServicePaymentFinanceEntries(
            paymentResult.service_payment_id,
            session.profileId
          );
        } catch (finErr: any) {
          console.warn("[createServiceAction] Finance entry failed:", finErr.message);
        }
      }

      await addServiceTimelineEntry({
        brand_id: brandId,
        branch_id: branchId,
        service_id: service.id,
        from_status: null,
        to_status: "INTAKE",
        reason: `DP diterima: ${paymentResult?.payment_number ?? ""}`,
        metadata: { payment_type: "DOWN_PAYMENT", amount: input.dpAmount, payment_number: paymentResult?.payment_number },
        changed_by: session.profileId,
      });

      await addAuditLog({
        brand_id: brandId,
        action: "SERVICE_DP_RECEIVED",
        entity_type: "service_payment",
        entity_id: paymentResult?.service_payment_id,
        actor_id: session.profileId,
        metadata: { service_id: service.id, service_number: serviceNumber, amount: input.dpAmount, payment_number: paymentResult?.payment_number },
      });
    }

    return successResult({ serviceId: service.id, serviceNumber });
  } catch (err: any) {
    console.error("[createServiceAction]", err);
    return errorResult(err.message ?? "Gagal membuat servis.");
  }
}
