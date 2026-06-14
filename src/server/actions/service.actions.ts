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
import { mapDbStatusToUI, SERVICE_STATUS_LABELS, getDeviceIconKey, type ServiceDbStatus, type ServiceUiStatus } from "@/lib/services/service-status";

/* ─── List Services ─── */

export interface ListServicesInput {
  brandSlug: string;
  branchId?: string | null;
  search?: string;
  status?: ServiceUiStatus | "all";
}

type ListServicesResult =
  | { ok: true; data: ServiceRecord[] }
  | { ok: false; error: string; code?: string };

export async function listServicesAction(
  input: ListServicesInput
): Promise<ListServicesResult> {
  try {
    const session = await getSessionData(input.brandSlug);
    requireActionPermission(session.role, "service.view");

    const requestedBranchId = input.branchId === "ALL_BRANCHES" ? null : (input.branchId ?? null);
    let resolvedBranchId = requestedBranchId;

    if (resolvedBranchId) {
      requireBranchAccess(session, resolvedBranchId, "listServicesAction");
    } else if (!session.canAccessAllBranches) {
      resolvedBranchId = session.defaultBranchId;
      if (!resolvedBranchId) {
        return { ok: false, error: "Anda tidak memiliki akses ke cabang ini." };
      }
      requireBranchAccess(session, resolvedBranchId, "listServicesAction");
    }

    const supabase = await createServerSupabase();
    const baseSelect = `
      id,
      brand_id,
      branch_id,
      customer_id,
      service_number,
      device_type,
      device_brand,
      device_model,
      device_imei,
      device_serial_number,
      reported_issue,
      diagnosis_result,
      current_status,
      assigned_technician_id,
      estimated_cost,
      final_cost,
      intake_at,
      created_at,
      updated_at,
      picked_up_at,
      pickup_name,
      pickup_phone,
      pickup_relation,
      pickup_note,
      deleted_at,
      customers:customers!services_customer_id_fkey (
        id,
        name,
        phone,
        address
      ),
      branches:branches!services_branch_id_fkey (
        id,
        name
      ),
      assigned_technician:profiles!services_assigned_technician_id_fkey (
        id,
        name
      )
    `;

    let query = (supabase as any)
      .from("services")
      .select(baseSelect)
      .eq("brand_id", session.brandId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (resolvedBranchId) query = query.eq("branch_id", resolvedBranchId);
    if (input.status && input.status !== "all") {
      const dbStatus = mapUiStatusToDb(input.status);
      if (dbStatus) query = query.eq("current_status", dbStatus);
    }
    if (input.search?.trim()) {
      const q = input.search.trim();
      query = query.or(`service_number.ilike.%${q}%,device_brand.ilike.%${q}%,device_model.ilike.%${q}%,reported_issue.ilike.%${q}%`);
    }

    let { data, error } = await query;

    if (error) {
      console.warn("[services:list] relation query failed, retrying services-only", error);
      let fallbackQuery = (supabase as any)
        .from("services")
        .select("id, brand_id, branch_id, customer_id, service_number, device_type, device_brand, device_model, device_imei, device_serial_number, reported_issue, diagnosis_result, current_status, assigned_technician_id, estimated_cost, final_cost, intake_at, created_at, updated_at, picked_up_at, pickup_name, pickup_phone, pickup_relation, pickup_note, deleted_at")
        .eq("brand_id", session.brandId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (resolvedBranchId) fallbackQuery = fallbackQuery.eq("branch_id", resolvedBranchId);
      if (input.status && input.status !== "all") {
        const dbStatus = mapUiStatusToDb(input.status);
        if (dbStatus) fallbackQuery = fallbackQuery.eq("current_status", dbStatus);
      }
      if (input.search?.trim()) {
        const q = input.search.trim();
        fallbackQuery = fallbackQuery.or(`service_number.ilike.%${q}%,device_brand.ilike.%${q}%,device_model.ilike.%${q}%,reported_issue.ilike.%${q}%`);
      }
      const fallback = await fallbackQuery;
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    const services = (data ?? []).map(mapServiceRowToUiItem);
    console.log("[services:mapper] sample", services[0]
      ? {
          serviceNumber: services[0].serviceNumber,
          customerName: services[0].customerName,
          branchName: services[0].branchName,
          estimatedCost: services[0].estimatedCost,
          finalCost: services[0].finalCost,
        }
      : null);

    console.log("[services:list] result", {
      brandId: session.brandId,
      requestedBranchId,
      resolvedBranchId,
      count: services.length,
      sample: services[0] ?? null,
    });
    console.log("[services:list] serializable check", {
      count: services.length,
      sampleKeys: Object.keys(services[0] ?? {}),
    });

    return { ok: true, data: services };
  } catch (err: any) {
    console.error("[listServicesAction]", err);
    return { ok: false, error: err.message ?? "Gagal memuat daftar servis." };
  }
}

function mapUiStatusToDb(status: ServiceUiStatus): ServiceDbStatus | null {
  const map: Record<ServiceUiStatus, ServiceDbStatus> = {
    masuk: "INTAKE",
    diagnosa: "DIAGNOSIS",
    menunggu_persetujuan: "WAITING_APPROVAL",
    perbaikan: "REPAIRING",
    qc: "QC",
    selesai: "DONE",
    cancelled: "CANCELLED",
  };
  return map[status] ?? null;
}

function mapServiceRowToUiItem(row: any): ServiceRecord {
  const status = mapDbStatusToUI(row.current_status);
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
  const assignedTechnician = Array.isArray(row.assigned_technician)
    ? row.assigned_technician[0]
    : row.assigned_technician;

  return {
    id: row.id,
    serviceNumber: row.service_number,
    rawStatus: (row.current_status ?? "INTAKE") as ServiceDbStatus,
    status,
    statusLabel: SERVICE_STATUS_LABELS[status],
    brandId: row.brand_id,
    branchId: row.branch_id,
    branchName: branch?.name ?? "Cabang tidak diketahui",
    customerId: row.customer_id ?? null,
    customerName: customer?.name ?? customer?.full_name ?? customer?.phone ?? "Tanpa nama",
    customerPhone: customer?.phone ?? "",
    customerAddress: customer?.address ?? undefined,
    deviceType: row.device_type ?? null,
    deviceBrand: row.device_brand ?? null,
    deviceModel: row.device_model ?? null,
    deviceIconKey: getDeviceIconKey(row.device_type, row.device_brand, row.device_model),
    deviceName:
      [row.device_brand, row.device_model].filter(Boolean).join(" ") ||
      row.device_type ||
      "-",
    issue: row.reported_issue ?? "",
    estimatedCost: Number(row.estimated_cost ?? 0),
    finalCost: Number(row.final_cost ?? 0),
    assignedTechnicianId: row.assigned_technician_id ?? null,
    technicianName: assignedTechnician?.name ?? assignedTechnician?.full_name ?? null,
    technician: assignedTechnician?.name ?? assignedTechnician?.full_name ?? undefined,
    branch: branch?.name ?? "Cabang tidak diketahui",
    intakeAt: row.intake_at ?? row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    serialNumber: row.device_serial_number ?? undefined,
    diagnosis: row.diagnosis_result ?? undefined,
    estimatedCompletion: undefined,
    spareparts: [],
    payments: [],
    timeline: [],
    notes: [],
    pickedUpAt: row.picked_up_at ?? undefined,
    pickupName: row.pickup_name ?? undefined,
    pickupPhone: row.pickup_phone ?? undefined,
    pickupRelation: row.pickup_relation ?? undefined,
    pickupNote: row.pickup_note ?? undefined,
    pickedUpBy: row.picked_up_by_profile_id ?? undefined,
  };
}

/* ─── Service Overview & Trend ─── */

export async function getServiceOverviewAction(
  brandSlug: string,
  branchId?: string | null,
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

    const requestedBranchId = branchId === "ALL_BRANCHES" ? null : (branchId ?? null);
    let resolvedBranchId = requestedBranchId;

    if (resolvedBranchId) {
      requireBranchAccess(session, resolvedBranchId, "getServiceOverviewAction");
    } else if (!session.canAccessAllBranches) {
      resolvedBranchId = session.defaultBranchId;
      if (!resolvedBranchId) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
      requireBranchAccess(session, resolvedBranchId, "getServiceOverviewAction");
    }

    console.log("[services:overview-action] input", {
      brandSlug,
      requestedBranchId,
      resolvedBranchId,
      canAccessAllBranches: session.canAccessAllBranches,
    });

    const rows = resolvedBranchId 
      ? await getServicesByBranch(resolvedBranchId)
      : await getServicesByBrand(session.brandId);

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
    const uiStatus = mapDbStatusToUI(row.current_status);
    const deviceName =
      [row.device_brand, row.device_model].filter(Boolean).join(" ") ||
      row.device_type ||
      "-";
    const service: ServiceRecord = {
      id: row.id,
      serviceNumber: row.service_number,
      rawStatus: (row.current_status ?? "INTAKE") as ServiceDbStatus,
      status: uiStatus,
      statusLabel: SERVICE_STATUS_LABELS[uiStatus],
      brandId: row.brand_id,
      branchId: row.branch_id,
      branchName: row.branch?.name ?? "Cabang tidak diketahui",
      customerId: row.customer_id ?? null,
      deviceType: row.device_type ?? null,
      deviceBrand: row.device_brand ?? null,
      deviceModel: row.device_model ?? null,
      deviceIconKey: getDeviceIconKey(row.device_type, row.device_brand, row.device_model),
      deviceName,
      serialNumber: row.device_serial_number ?? undefined,
      customerName: row.customer?.name ?? row.customer?.phone ?? "Tanpa nama",
      customerPhone: row.customer?.phone ?? "",
      customerAddress: row.customer?.address ?? undefined,
      issue: row.reported_issue,
      diagnosis: row.diagnosis_result ?? undefined,
      estimatedCost: Number(row.estimated_cost ?? 0),
      finalCost: Number(row.final_cost ?? 0),
      assignedTechnicianId: row.assigned_technician_id ?? null,
      technicianName: row.technician?.name ?? row.technician?.full_name ?? null,
      intakeAt: row.intake_at ?? row.created_at,
      technician: row.technician?.name ?? row.technician?.full_name ?? undefined,
      branch: row.branch?.name ?? "Cabang tidak diketahui",
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
      estimatedCompletion: undefined,
      spareparts: mappedSpareparts,
      payments: mappedPayments,
      timeline: mappedTimeline,
      notes: [],
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
