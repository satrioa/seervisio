/**
 * Service workflow server actions.
 */
"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, requireBranchAccess, requireActiveStoreSession, handleActionError, OperationalGuardError, type ActionResult } from "./action-helper";
import { hasPermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
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
  callRecordServicePayment,
  callRecordServicePaymentFinanceEntries,
  callCalculateServicePaymentSummary,
  getBranchPaymentMethods,
} from "@/repositories/payment.repository";
import { createServerSupabase } from "@/lib/supabase/server";
import { sendOperationalNotification } from "@/server/notifications/notification.service";

/* ─── Update Service Status ─── */

const UI_STATUS_TO_DB: Record<string, string> = {
  masuk: "INTAKE",
  diagnosa: "DIAGNOSIS",
  menunggu_persetujuan: "WAITING_APPROVAL",
  perbaikan: "REPAIRING",
  qc: "QC",
  selesai: "DONE",
  cancelled: "CANCELLED",
};

export interface UpdateServiceStatusInput {
  brandSlug: string;
  serviceId: string;
  nextStatus: string;
  targetColumn?: string;
  note?: string;
  reason?: string;
}

export async function updateServiceStatusAction(
  input: UpdateServiceStatusInput
): Promise<ActionResult<{
  fromStatus: string;
  toStatus: string;
  dbFromStatus: string;
  dbToStatus: string;
  serviceId: string;
}>> {
  try {
    const session = await getSessionData(input.brandSlug);

    console.log("[service:update-status] input", {
      serviceId: input.serviceId,
      nextStatus: input.nextStatus,
      note: input.note,
    });
    console.log("[service:update-status] session", {
      profileId: session.profileId,
      role: session.role,
      brandId: session.brandId,
      defaultBranchId: session.defaultBranchId,
      canAccessAllBranches: session.canAccessAllBranches,
    });

    requireActionPermission(session.role, "service.update_status");

    // Lookup by id + brand_id (not branch_id — branch_id is for access check only)
    const supabase = await createServerSupabase();
    console.log("[service:update-status] lookup filters", {
      id: input.serviceId,
      brandId: session.brandId,
      deletedAt: null,
      note: "Not filtering by activeBranchId here",
    });
    const { data: service, error: lookupError } = await (supabase as any)
      .from("services")
      .select("id, brand_id, branch_id, current_status, service_number, deleted_at")
      .eq("id", input.serviceId)
      .eq("brand_id", session.brandId)
      .is("deleted_at", null)
      .maybeSingle();

    if (lookupError) throw lookupError;

    console.log("[service:update-status] lookup result", {
      found: Boolean(service),
      serviceId: service?.id,
      serviceBrandId: service?.brand_id,
      serviceBranchId: service?.branch_id,
      currentStatus: service?.current_status,
      deletedAt: service?.deleted_at,
    });

    if (!service) {
      return errorResult("Servis tidak ditemukan atau bukan milik brand ini.");
    }

    requireBranchAccess(session, service.branch_id, "updateServiceStatusAction");

    await requireActiveStoreSession(supabase, session.brandId, service.branch_id);

    const currentStatus = normalizeServiceStatus(service.current_status);
    const nextStatus = normalizeServiceStatus(input.nextStatus);
    const userRole = session.role as unknown as ServiceWorkflowRole;

    const validation = validateServiceStatusTransition({
      currentStatus,
      nextStatus,
      role: userRole,
      reason: input.reason,
    });

    if (!validation.allowed) {
      return errorResult(validation.reason ?? "Transisi status tidak valid.");
    }

    const dbNextStatus =
      (input.targetColumn && UI_STATUS_TO_DB[input.targetColumn])
        ? UI_STATUS_TO_DB[input.targetColumn]
        : toDbStatus(nextStatus);

    console.log("[service:update-status] transition", {
      serviceId: input.serviceId,
      currentDbStatus: service.current_status,
      inputToStatus: input.nextStatus,
      targetDbStatus: dbNextStatus,
      isSame: service.current_status === dbNextStatus,
    });

    // Same-status check: compare DB canonical statuses
    if (service.current_status === dbNextStatus) {
      return errorResult("Status servis sudah sama.");
    }

    if ((nextStatus as unknown as string) === "DIAMBIL") {
      return errorResult("Diambil bukan status servis. Gunakan verifikasi pengambilan unit.");
    }

    // ── Direct update (replaces RPC `transition_service_status`) ──
    const timestampColumns: Record<string, string> = {
      INTAKE: "intake_at",
      DIAGNOSIS: "diagnosis_at",
      WAITING_APPROVAL: "waiting_approval_at",
      REPAIRING: "repairing_at",
      QC: "qc_at",
      DONE: "done_at",
      CANCELLED: "cancelled_at",
    };

    const updateData: Record<string, unknown> = {
      current_status: dbNextStatus,
      previous_status: service.current_status,
      updated_by: session.profileId,
      updated_at: new Date().toISOString(),
    };

    const tsCol = timestampColumns[dbNextStatus];
    if (tsCol) {
      updateData[tsCol] = new Date().toISOString();
    }

    if (dbNextStatus === "CANCELLED") {
      updateData.cancel_reason = input.note ?? input.reason ?? null;
    }

    // ── Diagnostic: log actual Supabase auth user ──
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log("[service:update-status] supabase auth user", {
      authUserId: authData.user?.id,
      authEmail: authData.user?.email,
      authError,
    });

    const { data: dbActor, error: dbActorError } = await (supabase as any)
      .from("profiles")
      .select(`
        id,
        auth_user_id,
        email,
        name,
        is_active,
        user_brand_memberships (
          id,
          brand_id,
          role,
          is_active
        )
      `)
      .eq("auth_user_id", authData.user?.id)
      .maybeSingle();
    console.log("[service:update-status] db actor by auth uid", {
      dbActor,
      dbActorError,
    });

    // ── Diagnostic: can we SELECT the row using this client? ──
    const { data: canSeeServiceBeforeUpdate, error: canSeeError } = await (supabase as any)
      .from("services")
      .select("id, brand_id, branch_id, current_status")
      .eq("id", service.id)
      .eq("brand_id", session.brandId)
      .maybeSingle();
    console.log("[service:update-status] can see before update", {
      canSeeServiceBeforeUpdate,
      canSeeError,
    });

    console.log("[service:update-status] update filters", {
      id: service.id,
      brandId: session.brandId,
      deletedAtIsNull: true,
      serviceBranchId: service.branch_id,
      previousStatus: service.current_status,
      targetDbStatus: dbNextStatus,
      note: "No concurrency guard, no activeBranchId filter",
    });

    const { data: updatedService, error: updateError } = await (supabase as any)
      .from("services")
      .update(updateData)
      .eq("id", service.id)
      .eq("brand_id", session.brandId)
      .is("deleted_at", null)
      .select("id, brand_id, branch_id, current_status, updated_at")
      .maybeSingle();

    console.log("[service:update-status] update result", {
      hasData: Boolean(updatedService),
      error: updateError,
      updatedStatus: updatedService?.current_status,
    });

    if (updateError) {
      console.error("[service:update-status] db update failed", updateError);
      return errorResult("Gagal memperbarui status servis.");
    }

    if (!updatedService) {
      console.error("[service:update-status] db update affected 0 rows", {
        serviceId: service.id,
        brandId: session.brandId,
        serviceBranchId: service.branch_id,
        previousStatus: service.current_status,
        targetDbStatus: dbNextStatus,
        note: "RLS or concurrency guard blocked the update",
      });
      return errorResult("Status servis gagal tersimpan. Coba lagi atau hubungi admin.");
    }

    // Verify the DB row was actually updated
    if (updatedService.current_status !== dbNextStatus) {
      console.error("[service:update-status] db verification failed", {
        expected: dbNextStatus,
        actual: updatedService.current_status,
      });
      return errorResult("Status servis gagal tersimpan ke database.");
    }

    // Optional fresh select to confirm persistence
    const { data: freshService, error: freshError } = await (supabase as any)
      .from("services")
      .select("id, current_status, updated_at")
      .eq("id", service.id)
      .eq("brand_id", session.brandId)
      .maybeSingle();

    console.log("[service:update-status] fresh db status", {
      serviceId: service.id,
      expected: dbNextStatus,
      actual: freshService?.current_status,
      freshError,
    });

    // Insert status history
    await addServiceTimelineEntry({
      brand_id: service.brand_id,
      branch_id: service.branch_id,
      service_id: service.id,
      from_status: service.current_status,
      to_status: dbNextStatus,
      reason: input.note ?? input.reason ?? null,
      changed_by: session.profileId,
    });

    // ── End direct update ──

    /* Notify SERVICE_STATUS_CHANGED for every transition */
    try {
      let statusCustomerName = service.customer?.name ?? "";
      if (!statusCustomerName && service.customer_id) {
        const { data: cust } = await (supabase as any)
          .from("customers")
          .select("name")
          .eq("id", service.customer_id)
          .maybeSingle();
        statusCustomerName = cust?.name ?? "";
      }
      await sendOperationalNotification({
        brandId: service.brand_id,
        branchId: service.branch_id,
        eventType: "SERVICE_STATUS_CHANGED",
        actorProfileId: session.profileId,
        payload: {
          serviceNumber: service.service_number,
          customerName: statusCustomerName,
          fromStatus: service.current_status ?? "",
          toStatus: dbNextStatus ?? "",
          deviceType: service.device_type ?? "",
          deviceBrand: service.device_brand ?? "",
          deviceModel: service.device_model ?? "",
        },
      });
    } catch (notifErr: any) {
      console.warn("[updateServiceStatusAction] SERVICE_STATUS_CHANGED notification error:", notifErr.message);
    }

    if (dbNextStatus === "DONE") {
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

      try {
        const { data: svc } = await (supabase as any)
          .from("services")
          .select("customer_id, device_type, device_brand, device_model")
          .eq("id", service.id)
          .single();
        let customerName = "";
        if (svc?.customer_id) {
          const { data: cust } = await (supabase as any)
            .from("customers")
            .select("name")
            .eq("id", svc.customer_id)
            .maybeSingle();
          customerName = cust?.name ?? "";
        }
        console.log("[notification:event] SERVICE_COMPLETED triggered", {
          serviceNumber: service.service_number,
          brandId: service.brand_id,
        });
        await sendOperationalNotification({
          brandId: service.brand_id,
          branchId: service.branch_id,
          eventType: "SERVICE_COMPLETED",
          actorProfileId: session.profileId,
          payload: {
            serviceNumber: service.service_number,
            customerName,
            deviceType: svc?.device_type ?? "",
            deviceBrand: svc?.device_brand ?? "",
            deviceModel: svc?.device_model ?? "",
          },
        });
      } catch (notifErr: any) {
        console.warn("[notification:error] SERVICE_COMPLETED failed:", notifErr.message);
      }
    }

    await addAuditLog({
      brand_id: service.brand_id,
      action: "SERVICE_STATUS_UPDATED",
      target_type: "service",
      target_id: service.id,
      target_label: service.service_number,
      actor_id: session.profileId,
      description: `Status diubah: ${service.current_status} → ${dbNextStatus}`,
      details: { from_status: service.current_status, to_status: dbNextStatus, reason: input.note ?? null },
    });

    return successResult({
      fromStatus: currentStatus,
      toStatus: nextStatus,
      dbFromStatus: service.current_status,
      dbToStatus: freshService?.current_status ?? dbNextStatus,
      serviceId: service.id,
    });
  } catch (err: any) {
    console.error("[updateServiceStatusAction]", err);
    return handleActionError(err, "Gagal mengubah status servis.");
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
    requireActionPermission(session.role, "service.delete");
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");
    requireBranchAccess(session, service.branch_id, "cancelServiceAction");

    await requireActiveStoreSession(createServerSupabase(), session.brandId, service.branch_id);

    const currentStatus = normalizeServiceStatus(service.current_status);
    const userRole = session.role as unknown as ServiceWorkflowRole;
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
      target_type: "service",
      target_id: service.id,
      target_label: service.service_number,
      actor_id: session.profileId,
      description: `Servis dibatalkan: ${input.reason}`,
      details: { reason: input.reason, return_stock: input.returnStock, previous_status: service.current_status },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[cancelServiceAction]", err);
    return handleActionError(err, "Gagal membatalkan servis.");
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
    requireActionPermission(session.role, "service.reopen");
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");
    requireBranchAccess(session, service.branch_id, "reopenServiceAction");

    await requireActiveStoreSession(createServerSupabase(), session.brandId, service.branch_id);

    const currentStatus = normalizeServiceStatus(service.current_status);
    const userRole = session.role as unknown as ServiceWorkflowRole;

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
      target_type: "service",
      target_id: service.id,
      target_label: service.service_number,
      actor_id: session.profileId,
      description: `Servis dibuka ulang: ${input.reason}`,
      details: { reason: input.reason, reopened_from: service.current_status, reopened_to: targetStatus },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[reopenServiceAction]", err);
    return handleActionError(err, "Gagal membuka ulang servis.");
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
    serializedUnitId?: string | null;
  }[];
  note?: string;
}

export async function addServiceSparepartAction(
  input: AddSparepartInput
): Promise<ActionResult<{ usageIds: string[] }>> {
  try {
    const session = await getSessionData(input.brandSlug);
    requireActionPermission(session.role, "service.add_sparepart");
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");
    requireBranchAccess(session, service.branch_id, "addServiceSparepartAction");

    await requireActiveStoreSession(createServerSupabase(), session.brandId, service.branch_id);

    const currentStatus = normalizeServiceStatus(service.current_status);
    if (currentStatus !== "PERBAIKAN" && currentStatus !== "QC") {
      return errorResult("Sparepart hanya dapat ditambahkan saat status Perbaikan atau QC.");
    }

    const usageIds: string[] = [];
    let totalSparepartCost = 0;
    const itemNames: string[] = [];

    for (const item of input.items) {
      const { createServerSupabase } = await import("@/lib/supabase/server");
      const supabase = await createServerSupabase();

      // Handle serialized unit validation
      if (item.serializedUnitId) {
        const { data: serializedUnit } = await (supabase as any)
          .from("inventory_serialized_units")
          .select("id, status, inventory_item_id, branch_id")
          .eq("id", item.serializedUnitId)
          .maybeSingle();

        if (!serializedUnit) return errorResult("Unit serial tidak ditemukan.");
        if (serializedUnit.status !== "READY_STOCK") {
          return errorResult(`Unit serial tidak tersedia (status: ${serializedUnit.status}).`);
        }
        if (serializedUnit.branch_id !== service.branch_id) {
          return errorResult("Unit serial berada di cabang berbeda.");
        }
      } else {
        // Quantity item: validate stock
        const { data: stockRow } = await (supabase as any)
          .from("branch_inventory_stocks")
          .select("current_stock, item:inventory_items(selling_price, name)")
          .eq("branch_id", service.branch_id)
          .eq("item_id", item.inventoryItemId)
          .maybeSingle();

        if (!stockRow) return errorResult("Stok sparepart tidak ditemukan.");
        if (stockRow.current_stock < item.quantity) {
          return errorResult(`Stok sparepart tidak mencukupi. Tersedia: ${stockRow.current_stock}`);
        }
        if (stockRow.item?.name) itemNames.push(stockRow.item.name);
      }

      const sellingPrice = item.sellingPrice ?? 0;
      totalSparepartCost += item.quantity * sellingPrice;
      try {
        const usageId = await callAddServiceSparepartUsage(
          service.id,
          item.inventoryItemId,
          item.quantity,
          item.unitCost ?? null,
          sellingPrice,
          session.profileId,
          input.note ?? null,
          item.serializedUnitId ?? null
        );
        usageIds.push(usageId);
      } catch (rpcErr: any) {
        return errorResult(rpcErr.message ?? "Gagal menambahkan sparepart.");
      }
    }

    const itemSummary = itemNames.length > 0 ? itemNames.slice(0, 3).join(", ") + (itemNames.length > 3 ? "..." : "") : `${input.items.length} item`;

    await addServiceTimelineEntry({
      brand_id: service.brand_id,
      branch_id: service.branch_id,
      service_id: service.id,
      from_status: null,
      to_status: service.current_status,
      reason: `Sparepart ditambahkan: ${itemSummary} — Rp ${totalSparepartCost.toLocaleString("id-ID")}`,
      metadata: { items: input.items as any, usage_ids: usageIds, total_sparepart_cost: totalSparepartCost },
      changed_by: session.profileId,
    });

    await addAuditLog({
      brand_id: service.brand_id,
      action: "SERVICE_SPAREPART_ADDED",
      target_type: "service",
      target_id: service.id,
      target_label: service.service_number,
      actor_id: session.profileId,
      description: `Sparepart ditambahkan: ${itemSummary} — Rp ${totalSparepartCost.toLocaleString("id-ID")}`,
      details: {
        items: input.items as any,
        usage_ids: usageIds,
        note: input.note,
        total_sparepart_cost: totalSparepartCost,
      },
    });

    return successResult({ usageIds });
  } catch (err: any) {
    console.error("[addServiceSparepartAction]", err);
    return handleActionError(err, "Gagal menambahkan sparepart.");
  }
}

/* ─── Get Payment Methods for Service Branch ─── */

export async function getServicePaymentMethodsAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<Array<{ id: string; name: string; type: string; mdrPercentage: number; mdrMinTransaction: number; accountName: string | null; accountBranchId: string | null }>>> {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.PAYMENT_METHOD_VIEW);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    const methods = await getBranchPaymentMethods(session.brandId, branchId);

    console.log("[service-payment/method-options/final]", {
      brandSlug,
      brandId: session.brandId,
      branchId,
      options: methods.map((m) => ({
        branchPaymentMethodId: m.branchPaymentMethodId,
        methodType: m.methodType,
        label: m.label,
        paymentAccountId: m.paymentAccountId,
        accountName: m.accountName,
        accountBranchId: m.accountBranchId,
        isGlobalAccount: m.accountBranchId === null,
      })),
    });

    return successResult(
      methods.map((m) => ({
        id: m.branchPaymentMethodId,
        name: m.label,
        type: m.methodType,
        mdrPercentage: m.mdrPercentage,
        mdrMinTransaction: m.mdrMinTransaction,
        accountName: m.accountName,
        accountBranchId: m.accountBranchId,
      })),
    );
  } catch (err: any) {
    console.error("[getServicePaymentMethodsAction]", err);
    return errorResult(err.message || "Gagal mengambil metode pembayaran.");
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/* ─── Receive Service Payment ─── */

export interface ReceivePaymentInput {
  brandSlug: string;
  serviceId: string;
  branchPaymentMethodId: string;
  amount: number;
  note?: string;
  paymentType?: "DOWN_PAYMENT" | "PARTIAL_PAYMENT" | "FINAL_PAYMENT";
}

export async function receiveServicePaymentAction(
  input: ReceivePaymentInput
): Promise<ActionResult<any>> {
  try {
    const session = await getSessionData(input.brandSlug);
    if (session.role === "TECHNICIAN") {
      return errorResult("Role Anda tidak memiliki akses untuk menerima pembayaran.");
    }
    requireActionPermission(session.role, PERMISSIONS.SERVICE_PAYMENT_CREATE);
    if (!isUuid(input.branchPaymentMethodId)) {
      return errorResult("Metode pembayaran tidak valid. Pilih ulang metode pembayaran.");
    }
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");
    requireBranchAccess(session, service.branch_id, "receiveServicePaymentAction");

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, service.branch_id);

    // Validate branch_payment_method belongs to service branch
    const { data: bpm, error: bpmErr } = await (supabase as any)
      .from("branch_payment_methods")
      .select("id, method_type, payment_account_id, is_active")
      .eq("id", input.branchPaymentMethodId)
      .eq("brand_id", session.brandId)
      .eq("branch_id", service.branch_id)
      .eq("is_active", true)
      .maybeSingle();

    if (bpmErr) {
      console.error("[service-payment/error]", { error: bpmErr, branchPaymentMethodId: input.branchPaymentMethodId });
      return errorResult("Gagal memvalidasi metode pembayaran.");
    }

    if (!bpm) {
      return errorResult("Metode pembayaran belum aktif atau belum terhubung untuk cabang servis ini.");
    }

    if (input.amount <= 0) return errorResult("Nominal pembayaran tidak valid.");

    const { data: summary } = await (supabase as any).rpc("calculate_service_payment_summary", { p_service_id: service.id });

    const totalPaid = Number(summary?.total_paid ?? 0);
    const totalBill = Number(summary?.total_charged ?? service.final_cost ?? service.estimated_cost ?? 0);
    const remaining = Number(summary?.remaining_balance ?? 0);

    console.log("[service-payment/summary]", {
      serviceId: input.serviceId,
      totalBill,
      totalPaid,
      remainingAmount: remaining,
      paymentStatus: summary?.payment_status ?? "UNPAID",
    });

    if (totalBill > 0 && remaining <= 0) {
      return errorResult("Servis ini sudah lunas.");
    }

    if (input.amount > remaining) {
      return errorResult("Nominal pembayaran melebihi sisa tagihan.");
    }

    console.log("[service-payment/submit]", {
      serviceId: input.serviceId,
      serviceBranchId: service.branch_id,
      branchPaymentMethodId: input.branchPaymentMethodId,
      amount: input.amount,
    });

    const paymentMeta: Record<string, unknown> = {
      payment_type: input.paymentType ?? "FINAL_PAYMENT",
      source: "service_payment",
      branch_payment_method_id: input.branchPaymentMethodId,
    };

    // Generate idempotency key to prevent duplicate on retry
    const idempotencyKey = `service:${service.id}:${input.branchPaymentMethodId}:${Date.now()}`;

    // The RPC validates branch_payment_methods, resolves global payment_methods.id,
    // and calculates MDR internally. We pass branch_payment_methods.id as
    // p_payment_method_id (legacy parameter name).
    const paymentResult = await callRecordServicePayment(
      service.id,
      input.branchPaymentMethodId,
      input.amount,
      session.profileId,
      input.note ?? null,
      paymentMeta,
      idempotencyKey,
      new Date().toISOString(),
    );

    console.log("[service-payment/after-success-refresh]", {
      serviceId: input.serviceId,
      paymentId: paymentResult?.service_payment_id,
      shouldRefresh: true,
    });

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
      target_type: "service_payment",
      target_id: paymentResult?.service_payment_id,
      target_label: paymentResult?.payment_number,
      actor_id: session.profileId,
      description: `Pembayaran diterima: ${paymentResult?.payment_number ?? ""}`,
      details: { service_id: service.id, amount: input.amount, payment_number: paymentResult?.payment_number, payment_type: input.paymentType },
    });

    try {
      console.log("[notification:event] PAYMENT_RECEIVED triggered", {
        serviceNumber: service.service_number,
        brandId: service.brand_id,
        amount: input.amount,
      });
      await sendOperationalNotification({
        brandId: service.brand_id,
        branchId: service.branch_id,
        eventType: "PAYMENT_RECEIVED",
        actorProfileId: session.profileId,
        payload: {
          serviceNumber: service.service_number,
          amount: input.amount,
          paymentType: input.paymentType,
        },
      });
    } catch (notifErr: any) {
      console.warn("[notification:error] PAYMENT_RECEIVED failed:", notifErr.message);
    }

    return successResult(paymentResult);
  } catch (err: any) {
    console.error("[receiveServicePaymentAction]", err);
    if (!(err instanceof OperationalGuardError) && err.message?.includes("exceeds")) {
      return errorResult("Nominal pembayaran melebihi sisa tagihan.");
    }
    return handleActionError(err, "Gagal menerima pembayaran.");
  }
}

/* ─── Get Service Payment Panel Data ─── */
/* Direct query from service_payments so the panel always has fresh data. */

export interface PaymentPanelPaymentRow {
  id: string;
  paymentNumber: string;
  paymentStatus: string;
  grossAmount: number;
  mdrAmount: number;
  netAmount: number;
  paidAt: string | null;
  createdAt: string;
  notes: string | null;
  methodType: string | null;
  accountName: string | null;
}

export async function getServicePaymentPanelDataAction(
  brandSlug: string,
  serviceId: string,
): Promise<ActionResult<{
  totalPaid: number;
  totalBill: number;
  remainingAmount: number;
  paymentState: string;
  payments: PaymentPanelPaymentRow[];
}>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "service.view");

    const supabase = await createServerSupabase();

    // 1. Get service cost
    const { data: serviceRow } = await (supabase as any)
      .from("services")
      .select("id, final_cost, estimated_cost")
      .eq("id", serviceId)
      .is("deleted_at", null)
      .single();
    if (!serviceRow) return errorResult("Servis tidak ditemukan.");
    const totalBill = Number(serviceRow.final_cost ?? serviceRow.estimated_cost ?? 0);

    // 2. Get COMPLETED/PAID/SUCCESS payments directly
    const { data: paymentRows, error: payErr } = await (supabase as any)
      .from("service_payments")
      .select(`
        id,
        payment_number,
        payment_status,
        gross_amount,
        mdr_amount,
        net_amount,
        paid_at,
        created_at,
        notes,
        branch_payment_method_id,
        payment_method_id,
        payment_account_id
      `)
      .eq("service_id", serviceId)
      .in("payment_status", ["COMPLETED", "PAID", "SUCCESS"])
      .order("paid_at", { ascending: true })
      .order("created_at", { ascending: true });

    if (payErr) {
      console.error("[getServicePaymentPanelDataAction] query error:", payErr);
      return errorResult("Gagal memuat data pembayaran.");
    }

    const rows = paymentRows ?? [];
    const totalPaid = rows.reduce((sum: number, r: any) => sum + Number(r.gross_amount ?? 0), 0);
    const remainingAmount = Math.max(0, totalBill - totalPaid);

    let paymentState = "UNPAID";
    if (totalPaid <= 0) paymentState = "UNPAID";
    else if (totalPaid < totalBill) paymentState = "PARTIAL";
    else paymentState = "PAID";

    // 3. Optionally resolve method labels in a separate fetch
    const bpmIds = [...new Set(rows.map((r: any) => r.branch_payment_method_id).filter(Boolean))];
    const bpmMap: Record<string, { method_type: string }> = {};
    if (bpmIds.length > 0) {
      const { data: bpmRows } = await (supabase as any)
        .from("branch_payment_methods")
        .select("id, method_type")
        .in("id", bpmIds);
      if (bpmRows) {
        for (const b of bpmRows) bpmMap[b.id] = { method_type: b.method_type };
      }
    }

    const paIds = [...new Set(rows.map((r: any) => r.payment_account_id).filter(Boolean))];
    const paMap: Record<string, { name: string }> = {};
    if (paIds.length > 0) {
      const { data: paRows } = await (supabase as any)
        .from("payment_accounts")
        .select("id, name")
        .in("id", paIds);
      if (paRows) {
        for (const a of paRows) paMap[a.id] = { name: a.name };
      }
    }

    const payments: PaymentPanelPaymentRow[] = rows.map((r: any) => ({
      id: r.id,
      paymentNumber: r.payment_number,
      paymentStatus: r.payment_status,
      grossAmount: Number(r.gross_amount ?? 0),
      mdrAmount: Number(r.mdr_amount ?? 0),
      netAmount: Number(r.net_amount ?? 0),
      paidAt: r.paid_at,
      createdAt: r.created_at,
      notes: r.notes,
      methodType: bpmMap[r.branch_payment_method_id]?.method_type ?? null,
      accountName: paMap[r.payment_account_id]?.name ?? null,
    }));

    console.log("[getServicePaymentPanelDataAction/summary]", {
      serviceId,
      totalBill,
      totalPaid,
      remainingAmount,
      paymentState,
      payments: payments.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        status: p.paymentStatus,
        grossAmount: p.grossAmount,
        paidAt: p.paidAt,
      })),
    });

    return successResult({ totalPaid, totalBill, remainingAmount, paymentState, payments });
  } catch (err: any) {
    console.error("[getServicePaymentPanelDataAction]", err);
    return errorResult(err.message ?? "Gagal memuat data pembayaran.");
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
    requireActionPermission(session.role, "service.verify_pickup");
    const service = await getServiceById(input.serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");
    requireBranchAccess(session, service.branch_id, "verifyServicePickupAction");

    const guardSupabase = await createServerSupabase();
    await requireActiveStoreSession(guardSupabase, session.brandId, service.branch_id);

    // 1. Validate service is SELESAI (DONE) and not already picked up
    if (service.current_status !== "DONE") {
      return errorResult("Servis belum selesai. Hanya unit selesai yang dapat diambil.");
    }
    if (service.picked_up_at) {
      return errorResult("Unit sudah diambil sebelumnya.");
    }

    // 2. Role validation: TECHNICIAN not allowed
    if (!hasPermission(session.role, "service.verify_pickup")) {
      return errorResult("Role Anda tidak memiliki akses untuk verifikasi pengambilan unit.");
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

    // 6. Update pickup fields
    const { error: updateError } = await (guardSupabase as any)
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
      target_type: "service",
      target_id: service.id,
      target_label: service.service_number,
      actor_id: session.profileId,
      description: `Unit diserahkan kepada ${input.pickupName.trim()}`,
      details: {
        pickup_name: input.pickupName.trim(),
        pickup_relation: input.pickupRelation.trim(),
        pickup_phone: input.pickupPhone?.trim() || null,
        service_status: service.current_status,
      },
    });

    return successResult(undefined);
  } catch (err: any) {
    console.error("[verifyServicePickupAction]", err);
    return handleActionError(err, "Gagal memverifikasi pengambilan unit.");
  }
}
