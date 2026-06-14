/**
 * Service CRUD server actions.
 */
"use server";

import { getSessionData, successResult, errorResult, requireActionPermission, requireBranchAccess, type ActionResult } from "./action-helper";
import { createServerSupabase } from "@/lib/supabase/server";
import { fromDbStatus } from "@/domain/service/service-workflow";
import {
  getServicesByBranch,
  getServicesByBrand,
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
import { mapDbStatusToUI, resolveDeviceIcon } from "@/components/services/service-ui-mappers";

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
    requireActionPermission(session.role, "service.view");

    const branchId = input.branchId ?? session.defaultBranchId;
    let rows: any[];

    if (branchId) {
      requireBranchAccess(session, branchId, "listServicesAction");
      rows = await getServicesByBranch(branchId);
    } else if (session.canAccessAllBranches) {
      rows = await getServicesByBrand(session.brandId);
    } else {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    console.log("[services:list] filters", {
      brandId: session.brandId,
      branchId,
      role: session.role,
      canAccessAllBranches: session.canAccessAllBranches,
    });
    console.log("[services:list] result", {
      count: rows?.length ?? 0,
    });

    const services: ServiceRecord[] = rows.map((row: any) => {
      const uiStatus = mapDbStatusToUI(row.current_status);
      return {
      id: row.id,
      serviceNumber: row.service_number,
      customerId: row.customer_id ?? undefined,
      deviceType: row.device_type ?? "",
      deviceBrand: row.device_brand ?? "",
      deviceModel: row.device_model ?? "",
      serialNumber: row.device_serial_number ?? undefined,
      customerName: row.customer?.name ?? row.customer_name ?? "Tanpa nama",
      customerPhone: row.customer?.phone ?? "",
      customerAddress: row.customer?.address ?? undefined,
      issue: row.reported_issue,
      diagnosis: row.diagnosis_result ?? undefined,
      status: uiStatus,
      technician: row.technician?.full_name ?? undefined,
      branch: row.branch_id,
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
      estimatedCompletion: undefined,
      spareparts: [],
      payments: [],
      timeline: [],
      notes: [],
      deviceIcon: resolveDeviceIcon(row.device_type),
      pickedUpAt: row.picked_up_at ?? undefined,
      pickupName: row.pickup_name ?? undefined,
      pickupPhone: row.pickup_phone ?? undefined,
      pickupRelation: row.pickup_relation ?? undefined,
      pickupNote: row.pickup_note ?? undefined,
      pickedUpBy: row.picked_up_by_profile_id ?? undefined,
    }});

    console.log("[services:list] status mapping sample", services.slice(0, 10).map((item, i) => ({
      serviceNumber: item.serviceNumber,
      rawStatus: rows[i]?.current_status,
      uiStatus: item.status,
      statusLabel: item.status,
    })));
    console.log("[services:list] mapped count", services.length);

    return successResult(services);
  } catch (err: any) {
    console.error("[listServicesAction]", err);
    return errorResult(err.message ?? "Gagal memuat daftar servis.");
  }
}

/* ─── Service Overview & Trend ─── */

export async function getServiceOverviewAction(
  brandSlug: string,
): Promise<ActionResult<{
  totalMasuk: number;
  dalamPerbaikan: number;
  qc: number;
  selesaiHariIni: number;
  trend14Days: Array<{ date: string; masuk: number; selesai: number }>;
}>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "service.view");

    const rows = await getServicesByBrand(session.brandId);

    const today = new Date().toISOString().slice(0, 10);

    const totalMasuk = rows.filter((r: any) => r.current_status === "INTAKE").length;
    const dalamPerbaikan = rows.filter(
      (r: any) => r.current_status === "DIAGNOSIS" || r.current_status === "REPAIRING" || r.current_status === "WAITING_APPROVAL",
    ).length;
    const qc = rows.filter((r: any) => r.current_status === "QC").length;
    const selesaiHariIni = rows.filter(
      (r: any) => r.current_status === "DONE" && (r.done_at ?? r.updated_at ?? "").startsWith(today),
    ).length;

    // Trend: last 14 days
    const trendMap = new Map<string, { date: string; masuk: number; selesai: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap.set(key, { date: key, masuk: 0, selesai: 0 });
    }

    for (const row of rows) {
      const createdDay = (row.created_at ?? "").slice(0, 10);
      const doneDay = row.current_status === "DONE"
        ? (row.done_at ?? row.updated_at ?? "").slice(0, 10)
        : null;

      if (trendMap.has(createdDay)) {
        trendMap.get(createdDay)!.masuk += 1;
      }
      if (doneDay && trendMap.has(doneDay)) {
        trendMap.get(doneDay)!.selesai += 1;
      }
    }

    return successResult({
      totalMasuk,
      dalamPerbaikan,
      qc,
      selesaiHariIni,
      trend14Days: Array.from(trendMap.values()),
    });
  } catch (err: any) {
    console.error("[getServiceOverviewAction]", err);
    return errorResult(err.message ?? "Gagal memuat overview servis.");
  }
}

/* ─── Get Service Detail ─── */

export async function getServiceDetailAction(
  brandSlug: string,
  serviceId: string
): Promise<ActionResult<ServiceRecord>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "service.view");
    
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
      id: row.id,
      serviceNumber: row.service_number,
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
      status: mapDbStatusToUI(row.current_status),
      technician: row.technician?.full_name ?? undefined,
      branch: row.branch_id,
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
      estimatedCompletion: undefined,
      spareparts: mappedSpareparts,
      payments: mappedPayments,
      timeline: mappedTimeline,
      notes: [],
      deviceIcon: resolveDeviceIcon(row.device_type),
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
    requireActionPermission(session.role, "service.create");

    const brandId = session.brandId;
    const branchId = input.branchId ?? session.defaultBranchId;

    console.log("[service:create] input", {
      branchId,
      brandId: session.brandId,
      role: session.role,
      defaultBranchId: session.defaultBranchId,
      canAccessAllBranches: session.canAccessAllBranches,
    });

    if (!branchId) return errorResult("Pilih cabang servis terlebih dahulu.");

    // Validate branch exists within current brand
    const supabase = await createServerSupabase();
    const { data: branch } = await (supabase as any)
      .from("branches")
      .select("id, brand_id, name")
      .eq("id", branchId)
      .eq("brand_id", brandId)
      .maybeSingle();

    console.log("[service:create] branch lookup", { branchId, brandId });
    console.log("[service:create] branch result", {
      found: Boolean(branch),
      branchName: branch?.name,
      branchBrandId: branch?.brand_id,
    });

    if (!branch) return errorResult("Cabang tidak ditemukan atau bukan milik brand ini.");
    requireBranchAccess(session, branchId, "createServiceAction");
    if (!input.customerName?.trim()) return errorResult("Nama customer wajib diisi.");
    if (!input.reportedIssue?.trim()) return errorResult("Keluhan wajib diisi.");

    const customer = await findOrCreateCustomer({
      brand_id: brandId,
      name: input.customerName.trim(),
      phone: input.customerPhone?.trim() || null,
      address: input.customerAddress?.trim() || null,
    });

    const serviceNumber = await callGenerateServiceNumber(brandId);

    console.log("[service:create] generated service number", { serviceNumber });

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

    try {
      await addAuditLog({
        brand_id: brandId,
        action: "SERVICE_CREATED",
        target_type: "service",
        target_id: service.id,
        target_label: serviceNumber,
        actor_id: session.profileId,
        description: `Membuat servis ${serviceNumber}`,
        details: {
          service_number: serviceNumber,
          branch_id: branchId,
          customer_id: customer.id,
          device_type: input.deviceType?.trim(),
          device_brand: input.deviceBrand?.trim(),
          device_model: input.deviceModel?.trim(),
        },
      });
    } catch (auditErr: any) {
      console.warn("[service:create] failed to write audit log", auditErr);
    }

    if (input.dpAmount && input.dpAmount > 0 && input.dpPaymentMethodId) {
      // TECHNICIAN cannot receive payment
      if (session.role === "TECHNICIAN") {
        return errorResult("Role Anda tidak memiliki akses untuk menerima pembayaran.");
      }

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

      try {
        await addAuditLog({
          brand_id: brandId,
          action: "SERVICE_DP_RECEIVED",
          target_type: "service_payment",
          target_id: paymentResult?.service_payment_id,
          target_label: paymentResult?.payment_number,
          actor_id: session.profileId,
          description: `DP diterima: ${paymentResult?.payment_number ?? ""}`,
          details: {
            service_id: service.id,
            service_number: serviceNumber,
            amount: input.dpAmount,
            payment_number: paymentResult?.payment_number,
          },
        });
      } catch (auditErr: any) {
        console.warn("[service:create] failed to write DP audit log", auditErr);
      }
    }

    return successResult({ serviceId: service.id, serviceNumber });
  } catch (err: any) {
    console.error("[createServiceAction]", err);
    return errorResult(err.message ?? "Gagal membuat servis.");
  }
}

/* ─── Session Role ─── */

export async function getSessionRoleAction(
  brandSlug: string,
): Promise<ActionResult<{ role: string }>> {
  try {
    const session = await getSessionData(brandSlug);
    return successResult({ role: session.role });
  } catch (err: any) {
    return errorResult(err.message ?? "Unauthorized");
  }
}
