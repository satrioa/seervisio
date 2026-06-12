/**
 * Service workflow server actions.
 */
"use server";

import { getSessionData, successResult, errorResult, type ActionResult } from "./action-helper";
import {
  normalizeServiceStatus,
  validateServiceStatusTransition,
  validateCancelService,
  validateReopenService,
  toDbStatus,
  type ServiceWorkflowRole,
} from "@/domain/service/service-workflow";
import {
  getServiceById,
  addServiceTimelineEntry,
  addAuditLog,
} from "@/repositories/service.repository";
import { getServiceSparepartUsages } from "@/repositories/inventory.repository";
import {
  callReturnServiceSparepartUsage,
  callTransitionServiceStatus,
  callRecordServicePaymentFinanceEntries,
  callCalculateServicePaymentSummary,
} from "@/repositories/payment.repository";

/* ─── Update Service Status ─── */

export interface UpdateServiceStatusInput {
  brandSlug: string;
  serviceId: string;
  nextStatus: string;
  note?: string;
  reason?: string;
}

export async function updateServiceStatusAction(
  input: UpdateServiceStatusInput
): Promise<ActionResult<{ fromStatus: string; toStatus: string }>> {
  try {
    const session = await getSessionData(input.brandSlug);
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");

    const currentStatus = normalizeServiceStatus(service.current_status);
    const nextStatus = normalizeServiceStatus(input.nextStatus);
    const userRole = session.roles[0] as ServiceWorkflowRole;

    const validation = validateServiceStatusTransition({
      currentStatus,
      nextStatus,
      role: userRole,
      reason: input.reason,
    });

    if (!validation.allowed) {
      return errorResult(validation.reason ?? "Transisi status tidak valid.");
    }

    const dbNextStatus = toDbStatus(nextStatus);
if ((nextStatus as unknown as string) === "DIAMBIL") {
  return errorResult("Diambil bukan status servis. Gunakan verifikasi pengambilan unit.");
}
    await callTransitionServiceStatus(
      service.id,
      dbNextStatus,
      session.profileId,
      input.note ?? input.reason ?? null
    );

    if (dbNextStatus === "DONE") {
      const { createServerSupabase } = await import("@/lib/supabase/server");
      const supabase = await createServerSupabase();
      const { data: payments } = await (supabase as any)
        .from("service_payments")
        .select("id")
        .eq("service_id", service.id)
        .eq("payment_status", "COMPLETED");
      if (payments) {
        for (const payment of payments) {
          try {
            await callRecordServicePaymentFinanceEntries(payment.id, session.profileId);
          } catch (finErr: any) {
            console.warn("[updateServiceStatusAction] Finance entry failed:", finErr.message);
          }
        }
      }
    }

    await addAuditLog({
      brand_id: service.brand_id,
      action: "SERVICE_STATUS_UPDATED",
      entity_type: "service",
      entity_id: service.id,
      actor_id: session.profileId,
      metadata: { from_status: service.current_status, to_status: dbNextStatus, reason: input.note ?? null },
    });

    return successResult({ fromStatus: currentStatus, toStatus: nextStatus });
  } catch (err: any) {
    console.error("[updateServiceStatusAction]", err);
    if (err.message?.includes("Invalid status transition")) {
      return errorResult("Status servis harus berpindah secara berurutan.");
    }
    return errorResult(err.message ?? "Gagal mengubah status servis.");
  }
}

/* ─── Cancel Service ─── */

export interface CancelServiceInput {
  brandSlug: string;
  serviceId: string;
  reason: string;
  returnStock: boolean;
}

export async function cancelServiceAction(
  input: CancelServiceInput
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(input.brandSlug);
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");

    const currentStatus = normalizeServiceStatus(service.current_status);
    const userRole = session.roles[0] as ServiceWorkflowRole;
    const sparepartUsages = await getServiceSparepartUsages(service.id);
    const hasUsedSpareparts = sparepartUsages.length > 0;

    const validation = validateCancelService({
      currentStatus,
      role: userRole,
      reason: input.reason,
      hasUsedSpareparts,
      returnStockConfirmed: hasUsedSpareparts ? input.returnStock : undefined,
    });

    if (!validation.allowed) {
      return errorResult(validation.reason ?? "Pembatalan tidak valid.");
    }

    await callTransitionServiceStatus(service.id, "CANCELLED", session.profileId, input.reason);

    if (hasUsedSpareparts && input.returnStock) {
      for (const usage of sparepartUsages) {
        if (!usage.is_returned && usage.inventory_movement_id) {
          try {
            await callReturnServiceSparepartUsage(usage.id, session.profileId, "Cancel service: " + input.reason);
          } catch (retErr: any) {
            console.warn("[cancelServiceAction] Failed to return usage:", retErr.message);
          }
        }
      }
    }

    await addAuditLog({
      brand_id: service.brand_id,
      action: "SERVICE_CANCELLED",
      entity_type: "service",
      entity_id: service.id,
      actor_id: session.profileId,
      metadata: { reason: input.reason, return_stock: input.returnStock, previous_status: service.current_status },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[cancelServiceAction]", err);
    return errorResult(err.message ?? "Gagal membatalkan servis.");
  }
}

/* ─── Reopen Service ─── */

export interface ReopenServiceInput {
  brandSlug: string;
  serviceId: string;
  reason: string;
}

export async function reopenServiceAction(
  input: ReopenServiceInput
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(input.brandSlug);
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");

    const currentStatus = normalizeServiceStatus(service.current_status);
    const userRole = session.roles[0] as ServiceWorkflowRole;

    const validation = validateReopenService({ currentStatus, role: userRole, reason: input.reason });
    if (!validation.allowed) {
      return errorResult(validation.reason ?? "Tidak dapat membuka ulang servis.");
    }

    const targetStatus = service.previous_status ?? "QC";
    const normalizedTarget = normalizeServiceStatus(targetStatus);

    await callTransitionServiceStatus(service.id, toDbStatus(normalizedTarget), session.profileId, "Reopen: " + input.reason);

    await addAuditLog({
      brand_id: service.brand_id,
      action: "SERVICE_REOPENED",
      entity_type: "service",
      entity_id: service.id,
      actor_id: session.profileId,
      metadata: { reason: input.reason, reopened_from: service.current_status, reopened_to: targetStatus },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[reopenServiceAction]", err);
    return errorResult(err.message ?? "Gagal membuka ulang servis.");
  }
}

/* ─── Add Sparepart ─── */

import { callAddServiceSparepartUsage } from "@/repositories/payment.repository";

export interface AddSparepartInput {
  brandSlug: string;
  serviceId: string;
  items: {
    inventoryItemId: string;
    quantity: number;
    unitCost?: number;
    sellingPrice?: number;
  }[];
  note?: string;
}

export async function addServiceSparepartAction(
  input: AddSparepartInput
): Promise<ActionResult<{ usageIds: string[] }>> {
  try {
    const session = await getSessionData(input.brandSlug);
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");

    const currentStatus = normalizeServiceStatus(service.current_status);
    if (currentStatus !== "PERBAIKAN" && currentStatus !== "QC") {
      return errorResult("Sparepart hanya dapat ditambahkan saat status Perbaikan atau QC.");
    }

    const usageIds: string[] = [];
    for (const item of input.items) {
      const { createServerSupabase } = await import("@/lib/supabase/server");
      const supabase = await createServerSupabase();
      const { data: stockRow } = await (supabase as any)
        .from("branch_inventory_stocks")
        .select("current_stock, item:inventory_items(selling_price)")
        .eq("branch_id", service.branch_id)
        .eq("item_id", item.inventoryItemId)
        .maybeSingle();

      if (!stockRow) return errorResult("Stok sparepart tidak ditemukan.");
      if (stockRow.current_stock < item.quantity) {
        return errorResult(`Stok sparepart tidak mencukupi. Tersedia: ${stockRow.current_stock}`);
      }

      const sellingPrice = item.sellingPrice ?? stockRow.item?.selling_price ?? 0;
      try {
        const usageId = await callAddServiceSparepartUsage(
          service.id,
          item.inventoryItemId,
          item.quantity,
          item.unitCost ?? null,
          sellingPrice,
          session.profileId,
          input.note ?? null
        );
        usageIds.push(usageId);
      } catch (rpcErr: any) {
        return errorResult(rpcErr.message ?? "Gagal menambahkan sparepart.");
      }
    }

    await addServiceTimelineEntry({
      brand_id: service.brand_id,
      branch_id: service.branch_id,
      service_id: service.id,
      from_status: null,
      to_status: service.current_status,
      reason: `Sparepart ditambahkan: ${input.items.length} item`,
      metadata: { items: input.items as any, usage_ids: usageIds },
      changed_by: session.profileId,
    });

    await addAuditLog({
      brand_id: service.brand_id,
      action: "SERVICE_SPAREPART_ADDED",
      entity_type: "service",
      entity_id: service.id,
      actor_id: session.profileId,
      metadata: { items: input.items as any, usage_ids: usageIds, note: input.note },
    });

    return successResult({ usageIds });
  } catch (err: any) {
    console.error("[addServiceSparepartAction]", err);
    return errorResult(err.message ?? "Gagal menambahkan sparepart.");
  }
}

/* ─── Receive Service Payment ─── */

import { callRecordServicePayment } from "@/repositories/payment.repository";

export interface ReceivePaymentInput {
  brandSlug: string;
  serviceId: string;
  paymentMethodId: string;
  amount: number;
  note?: string;
  paymentType?: "DOWN_PAYMENT" | "PARTIAL_PAYMENT" | "FINAL_PAYMENT";
}

export async function receiveServicePaymentAction(
  input: ReceivePaymentInput
): Promise<ActionResult<any>> {
  try {
    const session = await getSessionData(input.brandSlug);
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");
    if (input.amount <= 0) return errorResult("Nominal pembayaran tidak valid.");

    const { createServerSupabase } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabase();
    const { data: summary } = await (supabase as any).rpc("calculate_service_payment_summary", { p_service_id: service.id });

    if (summary) {
      const remaining = summary.remaining_balance ?? 0;
      if (input.amount > remaining) return errorResult("Nominal pembayaran melebihi sisa tagihan.");
    }

    const paymentMeta: Record<string, unknown> = {
      payment_type: input.paymentType ?? "FINAL_PAYMENT",
      source: "service_payment",
    };

    const paymentResult = await callRecordServicePayment(
      service.id,
      input.paymentMethodId,
      input.amount,
      session.profileId,
      input.note ?? null,
      paymentMeta
    );

    if (paymentResult?.service_payment_id) {
      try {
        await callRecordServicePaymentFinanceEntries(paymentResult.service_payment_id, session.profileId);
      } catch (finErr: any) {
        console.warn("[receiveServicePaymentAction] Finance entry failed:", finErr.message);
      }
    }

    await addServiceTimelineEntry({
      brand_id: service.brand_id,
      branch_id: service.branch_id,
      service_id: service.id,
      from_status: null,
      to_status: service.current_status,
      reason: `Pembayaran diterima: ${paymentResult?.payment_number ?? ""}`,
      metadata: { amount: input.amount, payment_number: paymentResult?.payment_number, payment_type: input.paymentType },
      changed_by: session.profileId,
    });

    await addAuditLog({
      brand_id: service.brand_id,
      action: "SERVICE_PAYMENT_RECEIVED",
      entity_type: "service_payment",
      entity_id: paymentResult?.service_payment_id,
      actor_id: session.profileId,
      metadata: { service_id: service.id, amount: input.amount, payment_number: paymentResult?.payment_number, payment_type: input.paymentType },
    });

    return successResult(paymentResult);
  } catch (err: any) {
    console.error("[receiveServicePaymentAction]", err);
    if (err.message?.includes("exceeds")) return errorResult("Nominal pembayaran melebihi sisa tagihan.");
    return errorResult(err.message ?? "Gagal menerima pembayaran.");
  }
}

/* ─── Verify Service Pickup ─── */

export interface VerifyPickupInput {
  brandSlug: string;
  serviceId: string;
  pickupName: string;
  pickupPhone?: string;
  pickupRelation: string;
  pickupNote?: string;
  checklist: {
    unitChecked: boolean;
    paymentConfirmed: boolean;
    customerAcceptedCondition: boolean;
  };
}

export async function verifyServicePickupAction(
  input: VerifyPickupInput
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(input.brandSlug);
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");

    // 1. Validate service is SELESAI (DONE) and not already picked up
    if (service.current_status !== "DONE") {
      return errorResult("Servis belum selesai. Hanya unit selesai yang dapat diambil.");
    }
    if (service.picked_up_at) {
      return errorResult("Unit sudah diambil sebelumnya.");
    }

    // 2. Role validation: TECHNICIAN not allowed
    const role = session.roles[0] as string;
    if (role === "TECHNICIAN") {
      return errorResult("Teknisi tidak dapat memverifikasi pengambilan unit.");
    }
    const allowedRoles = ["MASTER_ADMIN", "ADMIN", "FRONTLINER"];
    if (!allowedRoles.includes(role)) {
      return errorResult("Role Anda tidak memiliki akses untuk verifikasi pengambilan.");
    }

    // 3. Validate required fields
    if (!input.pickupName?.trim()) {
      return errorResult("Nama pengambil wajib diisi.");
    }
    if (!input.pickupRelation?.trim()) {
      return errorResult("Relasi pengambil wajib diisi.");
    }

    // 4. Validate checklist all true
    const { unitChecked, paymentConfirmed, customerAcceptedCondition } = input.checklist;
    if (!unitChecked || !paymentConfirmed || !customerAcceptedCondition) {
      return errorResult("Semua checklist harus dicentang.");
    }

    // 5. Validate payment is PAID
    const { data: summary } = await callCalculateServicePaymentSummary(service.id);
    if (!summary) return errorResult("Tidak dapat menghitung status pembayaran.");
    const totalCharged = Number(summary.total_charged) || 0;
    const totalPaid = Number(summary.total_paid) || 0;
    if (totalPaid < totalCharged) {
      return errorResult("Pelunasan diperlukan sebelum unit diserahkan.");
    }

    // 6. Update pickup fields - use dynamic import to avoid circular deps
    const { createServerSupabase } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabase();
    const { error: updateError } = await (supabase as any)
      .from("services")
      .update({
        picked_up_at: new Date().toISOString(),
        picked_up_by_profile_id: session.profileId,
        pickup_name: input.pickupName.trim(),
        pickup_phone: input.pickupPhone?.trim() || null,
        pickup_relation: input.pickupRelation.trim(),
        pickup_note: input.pickupNote?.trim() || null,
      })
      .eq("id", service.id);

    if (updateError) throw updateError;

    // 7. Create timeline entry
    await addServiceTimelineEntry({
      brand_id: service.brand_id,
      branch_id: service.branch_id,
      service_id: service.id,
      from_status: null,
      to_status: service.current_status,
      reason: `Unit diserahkan kepada ${input.pickupName.trim()}`,
      metadata: {
        pickup_name: input.pickupName.trim(),
        pickup_relation: input.pickupRelation.trim(),
        pickup_phone: input.pickupPhone?.trim() || null,
        verified_by: session.profileId,
      },
      changed_by: session.profileId,
    });

    // 8. Create audit log entry
    await addAuditLog({
      brand_id: service.brand_id,
      action: "SERVICE_PICKUP_VERIFIED",
      entity_type: "service",
      entity_id: service.id,
      actor_id: session.profileId,
      metadata: {
        pickup_name: input.pickupName.trim(),
        pickup_relation: input.pickupRelation.trim(),
        pickup_phone: input.pickupPhone?.trim() || null,
        service_status: service.current_status,
      },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[verifyServicePickupAction]", err);
    return errorResult(err.message ?? "Gagal memverifikasi pengambilan unit.");
  }
}
