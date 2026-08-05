/**
 * Service CRUD server actions.
 */
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionData, successResult, errorResult, requireActionPermission, requireBranchAccess, requireActiveStoreSession, handleActionError, type ActionResult } from "./action-helper";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { fromDbStatus } from "@/domain/service/service-workflow";
import {
  getServicesByBranch,
  getServicesByBrand,
  getServiceById,
  insertService,
  updateServiceTechnician,
  addServiceTimelineEntry,
  addAuditLog,
} from "@/repositories/service.repository";
import { findOrCreateCustomer } from "@/repositories/customer.repository";
import { callGenerateServiceNumber, callRecordServicePayment, getServicePayments, callCalculateServicePaymentSummary } from "@/repositories/payment.repository";
import { getServiceSparepartUsages } from "@/repositories/inventory.repository";
import { getServiceStatusHistory } from "@/repositories/service.repository";
import type { ServiceRecord, ServiceStatus, SparepartItem, PaymentItem, ServicePaymentRecord, ServicePaymentRecordType, TimelineEntry, TimelineEvent, TimelineEventType, ServicePaymentSummary } from "@/components/services/service-data";
import { mapDbStatusToUI, SERVICE_STATUS_LABELS, getDeviceIconKey, type ServiceDbStatus, type ServiceUiStatus } from "@/lib/services/service-status";
import { getServicesPaymentSummary } from "@/server/domain/service-payment-summary";
import { sendOperationalNotification } from "@/server/notifications/notification.service";
import { insertBrandNotification } from "@/server/repositories/notification.repository";
import { ROLES } from "@/lib/permissions/roles";

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

    const services: ServiceRecord[] = (data ?? []).map(mapServiceRowToUiItem);

    // Post-fetch technician profiles for any services with assigned_technician_id
    // but no technicianName (handles missing FK constraint gracefully)
    const technicianIds = [...new Set(
      services
        .filter((s) => s.assignedTechnicianId && !s.technicianName)
        .map((s) => s.assignedTechnicianId!)
    )];

    if (technicianIds.length > 0) {
      const adminDb = createServiceRoleSupabaseClient();
      const { data: techProfiles } = await (adminDb as any)
        .from("profiles")
        .select("id, name")
        .in("id", technicianIds);

      const profileMap = new Map<string, string>(
        (techProfiles ?? []).map((p: any) => [p.id as string, p.name ?? "Teknisi tidak ditemukan"])
      );
      for (const s of services) {
        if (s.assignedTechnicianId && !s.technicianName) {
          const name = profileMap.get(s.assignedTechnicianId);
          if (name) {
            s.technicianName = name;
            s.technician = name;
          }
        }
      }
    }

    console.log("[services/list technicians]", services.map((s) => ({
      service_number: s.serviceNumber,
      assigned_technician_id: s.assignedTechnicianId,
      technicianName: s.technicianName,
    })));

    const serviceIds = services.map((s) => s.id);
    const chargesMap: Record<string, number> = {};
    for (const s of services) {
      chargesMap[s.id] = Number(s.finalCost || s.estimatedCost || 0);
    }
    const paymentSummaries = await getServicesPaymentSummary(serviceIds, chargesMap);
    for (const s of services) {
      const summary = paymentSummaries[s.id];
      s.payments = summary?.payments ?? [];
      (s as any).__paymentRecords = summary?.paymentRecords ?? [];
      const totalCharged = chargesMap[s.id] ?? 0;
      s.paymentSummary = {
        totalCharged,
        totalPaid: summary?.totalPaid ?? 0,
        remainingBalance: summary?.remainingBalance ?? totalCharged,
        dpAmount: 0,
        paymentStatus: summary?.paymentStatus ?? "UNPAID",
      };
    }

    console.log("[services/list-payment-summary]", services.map(s => ({
      serviceNumber: s.serviceNumber,
      paymentState: s.paymentSummary?.paymentStatus,
      totalPaid: s.paymentSummary?.totalPaid,
      remainingAmount: s.paymentSummary?.remainingBalance,
      paymentsCount: s.payments?.length ?? 0,
    })));

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
    activityEvents: [],
    notes: [],
    pickedUpAt: row.picked_up_at ?? undefined,
    pickupName: row.pickup_name ?? undefined,
    pickupPhone: row.pickup_phone ?? undefined,
    pickupRelation: row.pickup_relation ?? undefined,
    pickupNote: row.pickup_note ?? undefined,
    pickedUpBy: row.picked_up_by_profile_id ?? undefined,
  };
}

/* ─── Overview V2 Types ─── */

export interface OverviewActionRequiredItem {
  id: string;
  serviceNumber: string;
  deviceName: string;
  customerName: string;
  priorityLabel: string;
  priorityScore: number;
  technicianName: string | null;
  doneAt?: string;
}

export interface OverviewPickupQueueItem {
  id: string;
  serviceNumber: string;
  deviceName: string;
  customerName: string;
  doneAt: string;
  daysSinceReady: number;
}

export interface OverviewV2Data {
  totalMasuk: number;
  dalamPerbaikan: number;
  qc: number;
  selesaiHariIni: number;
  actionRequired: OverviewActionRequiredItem[];
  pickupQueue: OverviewPickupQueueItem[];
  trend14Days: Array<{ date: string; masuk: number; selesai: number }>;
}

/* ─── Service Overview V2 (with Action Required + Pickup Queue) ─── */

export async function getServiceOverviewV2Action(
  brandSlug: string,
  branchId?: string | null,
): Promise<ActionResult<OverviewV2Data>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "service.view");

    const requestedBranchId = branchId === "ALL_BRANCHES" ? null : (branchId ?? null);
    let resolvedBranchId = requestedBranchId;

    if (resolvedBranchId) {
      requireBranchAccess(session, resolvedBranchId, "getServiceOverviewV2Action");
    } else if (!session.canAccessAllBranches) {
      resolvedBranchId = session.defaultBranchId;
      if (!resolvedBranchId) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
      requireBranchAccess(session, resolvedBranchId, "getServiceOverviewV2Action");
    }

    const supabase = await createServerSupabase();

    const baseSelect = `
      id,
      brand_id,
      branch_id,
      service_number,
      device_type,
      device_brand,
      device_model,
      reported_issue,
      current_status,
      assigned_technician_id,
      estimated_cost,
      final_cost,
      intake_at,
      created_at,
      done_at,
      qc_at,
      updated_at,
      picked_up_at,
      pickup_name,
      pickup_phone,
      deleted_at,
      customers:customers!services_customer_id_fkey(id, name, phone),
      branches:branches!services_branch_id_fkey(id, name),
      assigned_technician:profiles!services_assigned_technician_id_fkey(id, name)
    `;

    let query = (supabase as any)
      .from("services")
      .select(baseSelect)
      .eq("brand_id", session.brandId)
      .is("deleted_at", null)
      .neq("current_status", "CANCELLED");

    if (resolvedBranchId) query = query.eq("branch_id", resolvedBranchId);

    const { data: rows, error } = await query;
    if (error) throw error;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // ── KPI Counts ──
    const totalMasuk = rows.filter((r: any) => r.current_status === "INTAKE").length;
    const dalamPerbaikan = rows.filter(
      (r: any) =>
        r.current_status === "DIAGNOSIS" ||
        r.current_status === "REPAIRING" ||
        r.current_status === "WAITING_APPROVAL",
    ).length;
    const qc = rows.filter((r: any) => r.current_status === "QC").length;
    const selesaiHariIni = rows.filter(
      (r: any) =>
        r.current_status === "DONE" &&
        (r.done_at ?? r.updated_at ?? "").startsWith(today),
    ).length;

    // ── Action Required Scoring ──
    const actionRequired: OverviewActionRequiredItem[] = [];

    const getDaysSince = (dateStr: string): number =>
      Math.floor((now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));

    for (const r of rows) {
      let score = 0;
      let label = "";

      const customer = Array.isArray(r.customers) ? r.customers[0] : r.customers;
      const deviceName =
        [r.device_brand, r.device_model].filter(Boolean).join(" ") ||
        r.device_type ||
        "-";
      const customerName = customer?.name ?? customer?.phone ?? "Tanpa nama";

      // Pickup Overdue (>3 days since done, not picked up)
      if (r.current_status === "DONE" && !r.picked_up_at && r.done_at) {
        const days = getDaysSince(r.done_at);
        if (days >= 3) {
          score = 100;
          label = "Pickup Overdue";
          actionRequired.push({
            id: r.id,
            serviceNumber: r.service_number,
            deviceName,
            customerName,
            priorityLabel: label,
            priorityScore: score,
            technicianName: null,
            doneAt: r.done_at,
          });
          continue;
        }
      }

      // Waiting Technician
      if (!r.assigned_technician_id &&
          r.current_status !== "DONE" &&
          r.current_status !== "CANCELLED") {
        score = 90;
        label = "Waiting Technician";
        actionRequired.push({
          id: r.id,
          serviceNumber: r.service_number,
          deviceName,
          customerName,
          priorityLabel: label,
          priorityScore: score,
          technicianName: null,
        });
        continue;
      }

      // Waiting Customer Approval
      if (r.current_status === "WAITING_APPROVAL") {
        score = 80;
        label = "Waiting Approval";
        actionRequired.push({
          id: r.id,
          serviceNumber: r.service_number,
          deviceName,
          customerName,
          priorityLabel: label,
          priorityScore: score,
          technicianName: null,
        });
        continue;
      }

      // QC Overdue (>2 days in QC)
      if (r.current_status === "QC" && r.qc_at) {
        const days = getDaysSince(r.qc_at);
        if (days >= 2) {
          score = 60;
          label = "QC Overdue";
          actionRequired.push({
            id: r.id,
            serviceNumber: r.service_number,
            deviceName,
            customerName,
            priorityLabel: label,
            priorityScore: score,
            technicianName: null,
          });
          continue;
        }
      }

      // Payment Pending
      if (r.current_status !== "DONE" && r.current_status !== "CANCELLED") {
        const cost = Number(r.final_cost || r.estimated_cost || 0);
        if (cost > 0) {
          actionRequired.push({
            id: r.id,
            serviceNumber: r.service_number,
            deviceName,
            customerName,
            priorityLabel: "Payment Pending",
            priorityScore: 50,
            technicianName: null,
          });
          continue;
        }
      }
    }

    // Sort by score descending, take top 5
    actionRequired.sort((a, b) => b.priorityScore - a.priorityScore);

    // ── Pickup Queue ──
    const pickupQueue: OverviewPickupQueueItem[] = rows
      .filter((r: any) => r.current_status === "DONE" && !r.picked_up_at && r.done_at)
      .sort((a: any, b: any) => new Date(a.done_at).getTime() - new Date(b.done_at).getTime())
      .slice(0, 5)
      .map((r: any) => {
        const customer = Array.isArray(r.customers) ? r.customers[0] : r.customers;
        const deviceName =
          [r.device_brand, r.device_model].filter(Boolean).join(" ") ||
          r.device_type ||
          "-";
        return {
          id: r.id,
          serviceNumber: r.service_number,
          deviceName,
          customerName: customer?.name ?? customer?.phone ?? "Tanpa nama",
          doneAt: r.done_at,
          daysSinceReady: getDaysSince(r.done_at),
        };
      });

    // ── Trend: last 14 days ──
    const trendMap = new Map<string, { date: string; masuk: number; selesai: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap.set(key, { date: key, masuk: 0, selesai: 0 });
    }

    for (const r of rows) {
      const createdDay = (r.created_at ?? "").slice(0, 10);
      const doneDay = r.current_status === "DONE"
        ? (r.done_at ?? r.updated_at ?? "").slice(0, 10)
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
      actionRequired: actionRequired.slice(0, 5),
      pickupQueue,
      trend14Days: Array.from(trendMap.values()),
    });
  } catch (err: any) {
    console.error("[getServiceOverviewV2Action]", err);
    return errorResult(err.message ?? "Gagal memuat overview servis.");
  }
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
    
    // Parallelize: get service + create supabase client
    const [row, supabase] = await Promise.all([
      getServiceById(serviceId),
      createServerSupabase(),
    ]);
    if (!row) return errorResult("Servis tidak ditemukan.");
    
    // Fetch all relations + payment summary in parallel
    const [payments, spareparts, v4Spareparts, timeline, paymentSummaryResult] = await Promise.all([
      getServicePayments(serviceId),
      getServiceSparepartUsages(serviceId),
      (supabase as any)
        .from("inv_sparepart_usage")
        .select("*")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: true }),
      getServiceStatusHistory(serviceId),
      callCalculateServicePaymentSummary(serviceId).catch(() => null),
    ]);
    console.log("[TRACE:Action] getServiceDetailAction timeline raw length:", timeline?.length ?? 0, "for serviceId:", serviceId);

    // Map payment summary
    let paymentSummary: ServicePaymentSummary | null = null;
    if (paymentSummaryResult) {
      paymentSummary = {
        totalCharged: Number(paymentSummaryResult.cost) || 0,
        totalPaid: Number(paymentSummaryResult.total_paid) || 0,
        remainingBalance: Number(paymentSummaryResult.remaining_balance) || 0,
        dpAmount: 0,
        paymentStatus: (paymentSummaryResult.payment_state as ServicePaymentSummary["paymentStatus"]) || "UNPAID",
      };
    }
    
    // 4. Map payments to UI PaymentItem[]
    const mappedPayments: PaymentItem[] = payments.map((p: any) => ({
      id: p.id,
      type: resolvePaymentType(p.metadata),
      amount: Number(p.gross_amount) || 0,
      method: p.payment_method?.name ?? "",
      date: p.paid_at ?? p.created_at,
      note: p.notes ?? undefined,
    }));
    const mappedPaymentRecords: ServicePaymentRecord[] = payments.map((p: any) => ({
      id: p.id,
      serviceId: row.id,
      paymentType: resolveServicePaymentRecordType(p.metadata),
      amount: Number(p.gross_amount) || 0,
      method: p.payment_method?.name ?? "",
      methodType: p.payment_method?.type ?? "",
      accountName: p.payment_account?.account_name ?? "",
      status: "SUCCEEDED" as const,
      paidAt: p.paid_at ?? p.created_at,
      note: p.notes ?? undefined,
    }));

    // 5. Map spareparts to UI SparepartItem[] with snapshots
    const mappedSpareparts: SparepartItem[] = spareparts.map((s: any) => {
      const qty = Number(s.quantity_used ?? s.quantity ?? 1);
      const price = Number(s.selling_price_snapshot ?? s.selling_price ?? 0);
      const su = s.serialized_unit;
      return {
        id: s.id,
        name: s.item_name_snapshot ?? s.item?.name ?? "Unknown",
        qty,
        price,
        totalPrice: qty * price,
        type: "sparepart",
        itemNameSnapshot: s.item_name_snapshot ?? null,
        variantSnapshot: s.variant_snapshot ?? null,
        skuSnapshot: s.sku_snapshot ?? null,
        barcodeSnapshot: s.barcode_snapshot ?? null,
        serializedUnitId: s.serialized_unit_id ?? null,
        imeiSnapshot: s.imei_snapshot ?? null,
        serialNumberSnapshot: s.serial_number_snapshot ?? null,
        batteryHealthSnapshot: s.battery_health_snapshot != null ? Number(s.battery_health_snapshot) : null,
        conditionGradeSnapshot: s.condition_grade_snapshot ?? null,
        conditionNotesSnapshot: s.condition_notes_snapshot ?? null,
        unitSnapshot: s.unit_snapshot ?? null,
        unitCostSnapshot: s.unit_cost_snapshot != null ? Number(s.unit_cost_snapshot) : null,
        sellingPriceSnapshot: s.selling_price_snapshot != null ? Number(s.selling_price_snapshot) : null,
        totalCostSnapshot: s.total_cost_snapshot != null ? Number(s.total_cost_snapshot) : null,
        totalPriceSnapshot: s.total_price_snapshot != null ? Number(s.total_price_snapshot) : null,
        isReturned: s.is_returned ?? false,
        serializedUnit: su ? {
          id: su.id,
          imei: su.imei ?? null,
          serialNumber: su.serial_number ?? null,
          batteryHealth: su.battery_health != null ? Number(su.battery_health) : null,
          conditionGrade: su.condition_grade ?? null,
          conditionNotes: [su.physical_condition_notes, su.functional_condition_notes].filter(Boolean).join("; ") || null,
          status: su.status,
        } : null,
      };
    });

    // 5b. Map V4 sparepart usage records and merge
    const v4Data = (v4Spareparts as any)?.data ?? [];
    const mappedV4Spareparts: SparepartItem[] = v4Data.map((u: any) => {
      const qty = Number(u.quantity ?? 1);
      const price = Number(u.selling_price_snapshot ?? 0);
      const variantName = u.variant_name_snapshot ? ` (${u.variant_name_snapshot})` : "";
      return {
        id: u.id,
        name: `${u.item_name_snapshot ?? "Unknown"}${variantName}`,
        qty,
        price,
        totalPrice: qty * price,
        type: "sparepart",
        itemNameSnapshot: u.item_name_snapshot ?? null,
        variantSnapshot: u.attributes_snapshot ?? null,
        sellingPriceSnapshot: price || null,
        unitCostSnapshot: u.cost_price_snapshot != null ? Number(u.cost_price_snapshot) : null,
      };
    });

    const allSpareparts = [...mappedSpareparts, ...mappedV4Spareparts];
    
    // 6. Map timeline to UI TimelineEntry[] and activity events
    const mappedTimeline: TimelineEntry[] = timeline.map((t: any) => ({
      id: t.id,
      status: fromDbStatus(t.to_status),
      fromStatus: t.from_status ? fromDbStatus(t.from_status) : undefined,
      toStatus: fromDbStatus(t.to_status),
      timestamp: t.changed_at ?? t.created_at,
      note: t.reason ?? undefined,
      changedBy: t.changed_by_profile?.name ?? undefined,
    }));
    console.log("[TRACE:Action] mappedTimeline length:", mappedTimeline.length, "sample:", mappedTimeline[0]?.status ?? "N/A");

    const activityEvents: TimelineEvent[] = timeline.map((t: any) => mapTimelineRowToEvent(t)).reverse();

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
      spareparts: allSpareparts,
      payments: mappedPayments,
      timeline: mappedTimeline,
      activityEvents,
      notes: [],
      pickedUpAt: row.picked_up_at ?? undefined,
      pickupName: row.pickup_name ?? undefined,
      pickupPhone: row.pickup_phone ?? undefined,
      pickupRelation: row.pickup_relation ?? undefined,
      pickupNote: row.pickup_note ?? undefined,
      pickedUpBy: row.picked_up_by_profile_id ?? undefined,
    };
    (service as any).__paymentRecords = mappedPaymentRecords;
    service.paymentSummary = paymentSummary ?? {
      totalCharged: 0,
      totalPaid: 0,
      remainingBalance: 0,
      dpAmount: 0,
      paymentStatus: "UNPAID",
    };

    // Post-fetch technician name if FK join returned null (RLS on profiles)
    if (service.assignedTechnicianId && !service.technicianName) {
      const adminDb = createServiceRoleSupabaseClient();
      const { data: techProfile } = await (adminDb as any)
        .from("profiles")
        .select("name")
        .eq("id", service.assignedTechnicianId)
        .maybeSingle();
      if (techProfile?.name) {
        service.technicianName = techProfile.name;
        service.technician = techProfile.name;
      }
    }

    return successResult(service);
  } catch (err: any) {
    console.error("[getServiceDetailAction]", err);
    return errorResult(err.message ?? "Gagal memuat detail servis.");
  }
}

/**
 * Map payment DB row to UI payment type based on metadata.
 */
function deriveEventType(t: any): TimelineEventType {
  const metaEventType = t.metadata?.event_type;
  if (metaEventType && typeof metaEventType === "string") return metaEventType as TimelineEventType;

  const reason = (t.reason ?? "") as string;
  const fromStatus = t.from_status as string | null;
  const toStatus = t.to_status as string;

  if (!fromStatus) {
    if (reason.startsWith("Servis baru")) return "SERVICE_CREATED";
    if (reason.startsWith("Teknisi dihapus")) return "TECHNICIAN_UNASSIGNED";
    if (reason.startsWith("Teknisi ditugaskan") || reason.startsWith("Teknisi berubah")) return "TECHNICIAN_ASSIGNED";
    if (reason.startsWith("DP diterima")) return "PAYMENT_CREATED";
    if (reason.startsWith("Sparepart")) return "SPAREPART_ADDED";
    if (reason.startsWith("Pembayaran")) return "PAYMENT_RECEIVED";
    if (reason.startsWith("Tagihan")) return "BILLING_SET";
    if (reason.startsWith("Unit diserahkan")) return "SERVICE_PICKED_UP";
  }

  if (fromStatus === "CANCELLED" && toStatus === "INTAKE") return "SERVICE_REOPENED";
  if (fromStatus && toStatus && fromStatus !== toStatus) return "STATUS_CHANGED";

  return "STATUS_CHANGED";
}

function buildEventDescription(eventType: TimelineEventType, t: any): string {
  const reason = (t.reason ?? "") as string;
  const meta = t.metadata ?? {};

  switch (eventType) {
    case "SERVICE_CREATED":
      return "Servis baru dibuat.";
    case "TECHNICIAN_ASSIGNED": {
      const name = reason.replace(/^Teknisi (ditugaskan|berubah):\s*/, "").replace(/\s*→.*$/, "").trim();
      return name ? `${name} ditugaskan sebagai teknisi.` : "Teknisi ditugaskan.";
    }
    case "TECHNICIAN_UNASSIGNED":
      return "Teknisi dihapus dari servis.";
    case "PAYMENT_CREATED": {
      const amount = meta.amount ? Number(meta.amount) : 0;
      return amount > 0 ? `Tagihan sebesar Rp${amount.toLocaleString("id-ID")} dibuat.` : reason || "Tagihan dibuat.";
    }
    case "PAYMENT_RECEIVED": {
      const amount = meta.amount ? Number(meta.amount) : 0;
      return amount > 0 ? `Pembayaran Rp${amount.toLocaleString("id-ID")} diterima.` : reason || "Pembayaran diterima.";
    }
    case "SPAREPART_ADDED":
      return reason || "Sparepart ditambahkan.";
    case "BILLING_SET":
      return reason || "Tagihan diperbarui.";
    case "SERVICE_PICKED_UP":
      return reason || "Perangkat telah diserahkan kepada pelanggan.";
    case "SERVICE_REOPENED":
      return "Servis dibuka kembali.";
    case "STATUS_CHANGED":
      return "Status servis berubah.";
    case "SERVICE_CANCELLED":
      return "Servis dibatalkan.";
    default:
      return reason || "Aktivitas servis.";
  }
}

function mapTimelineRowToEvent(t: any): TimelineEvent {
  const eventType = deriveEventType(t);
  const actor = t.changed_by_profile?.name ?? t.changed_by ?? "Sistem";
  const createdAt = t.changed_at ?? t.created_at ?? new Date().toISOString();
  const fromLabel = t.from_status ? fromDbStatus(t.from_status) : null;
  const toLabel = t.to_status ? fromDbStatus(t.to_status) : null;
  const reason = (t.reason ?? "") as string;

  let title: string;
  let description: string;

  switch (eventType) {
    case "SERVICE_CREATED":
      title = "Servis dibuat";
      description = buildEventDescription(eventType, t);
      break;
    case "STATUS_CHANGED":
      title = "Status berubah";
      description = fromLabel && toLabel && fromLabel !== toLabel
        ? `${fromLabel} → ${toLabel}`
        : buildEventDescription(eventType, t);
      break;
    case "TECHNICIAN_ASSIGNED":
      title = "Teknisi ditugaskan";
      description = buildEventDescription(eventType, t);
      break;
    case "TECHNICIAN_UNASSIGNED":
      title = "Teknisi dihapus";
      description = "Teknisi dihapus dari servis.";
      break;
    case "PAYMENT_CREATED":
      title = "Tagihan dibuat";
      description = buildEventDescription(eventType, t);
      break;
    case "PAYMENT_RECEIVED":
      title = "Pembayaran diterima";
      description = buildEventDescription(eventType, t);
      break;
    case "SPAREPART_ADDED":
      title = "Sparepart ditambahkan";
      description = buildEventDescription(eventType, t);
      break;
    case "SPAREPART_REMOVED":
      title = "Sparepart dihapus";
      description = "Sparepart dihapus dari servis.";
      break;
    case "BILLING_SET":
      title = "Tagihan diperbarui";
      description = buildEventDescription(eventType, t);
      break;
    case "SERVICE_PICKED_UP":
      title = "Perangkat diambil";
      description = buildEventDescription(eventType, t);
      break;
    case "SERVICE_REOPENED":
      title = "Servis dibuka kembali";
      description = "Servis dibuka kembali untuk diproses.";
      break;
    case "SERVICE_CANCELLED":
      title = "Servis dibatalkan";
      description = reason || "Servis dibatalkan.";
      break;
    default:
      title = "Aktivitas";
      description = t.reason || "Aktivitas servis.";
  }

  return {
    id: t.id,
    eventType,
    title,
    description,
    actor,
    createdAt,
    metadata: t.metadata ?? {},
  };
}

function resolvePaymentType(metadata?: Record<string, unknown> | null): PaymentItem["type"] {
  const meta = metadata ?? {};
  if (meta.payment_type === "DOWN_PAYMENT" || meta.is_dp === true) return "dp";
  if (meta.payment_type === "FINAL_PAYMENT") return "full";
  return "partial";
}

function resolveServicePaymentRecordType(metadata?: Record<string, unknown> | null): ServicePaymentRecordType {
  const meta = metadata ?? {};
  if (meta.payment_type === "DOWN_PAYMENT" || meta.is_dp === true) return "DOWN_PAYMENT";
  if (meta.payment_type === "FINAL_PAYMENT") return "FINAL_PAYMENT";
  if (meta.payment_type === "PARTIAL_PAYMENT") return "PARTIAL_PAYMENT";
  return "FINAL_PAYMENT";
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
  assignedTechnicianId?: string;
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

    // Non-master roles cannot choose branch — always force to their default branch
    let branchId: string | null;
    if (session.role !== ROLES.MASTER_ADMIN && session.role !== ROLES.PLATFORM_OWNER) {
      branchId = session.defaultBranchId;
      if (!branchId) return errorResult("Tidak ada cabang default. Hubungi admin.");
    } else {
      branchId = input.branchId ?? session.defaultBranchId;
    }

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

    await requireActiveStoreSession(supabase, session.brandId, branchId);

    if (!input.customerName?.trim()) return errorResult("Nama customer wajib diisi.");
    if (!input.reportedIssue?.trim()) return errorResult("Keluhan wajib diisi.");

    const customer = await findOrCreateCustomer({
      brand_id: brandId,
      name: input.customerName.trim(),
      phone: input.customerPhone?.trim() || null,
      address: input.customerAddress?.trim() || null,
    });

    /* Validate assigned technician if provided */
    let validatedTechnicianId: string | null | undefined = input.assignedTechnicianId;
    if (validatedTechnicianId) {
      const adminDb = createServiceRoleSupabaseClient();
      const { data: techMembership } = await (adminDb as any)
        .from("user_brand_memberships")
        .select("id, role, is_active")
        .eq("profile_id", validatedTechnicianId)
        .eq("brand_id", brandId)
        .eq("role", "TECHNICIAN")
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (!techMembership) {
        return errorResult("Teknisi tidak ditemukan atau tidak aktif di brand ini.");
      }

      const { data: branchAccess } = await (adminDb as any)
        .from("user_branch_access")
        .select("id")
        .eq("membership_id", techMembership.id)
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .maybeSingle();

      if (!branchAccess) {
        return errorResult("Teknisi tidak memiliki akses ke cabang yang dipilih.");
      }
    } else if (session.role === ROLES.TECHNICIAN) {
      validatedTechnicianId = session.profileId;
    }

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
      assigned_technician_id: validatedTechnicianId ?? null,
      created_by: session.profileId,
    });

    await addServiceTimelineEntry({
      brand_id: brandId,
      branch_id: branchId,
      service_id: service.id,
      from_status: null,
      to_status: "INTAKE",
      reason: "Servis baru dibuat",
      metadata: { event_type: "SERVICE_CREATED" },
      changed_by: session.profileId,
    });

    if (validatedTechnicianId) {
      const { data: techProfile } = await ((createServiceRoleSupabaseClient()) as any)
        .from("profiles")
        .select("name")
        .eq("id", validatedTechnicianId)
        .maybeSingle();

      await addServiceTimelineEntry({
        brand_id: brandId,
        branch_id: branchId,
        service_id: service.id,
        from_status: null,
        to_status: "INTAKE",
        reason: `Teknisi ditugaskan: ${techProfile?.name ?? "—"}`,
        metadata: { event_type: "TECHNICIAN_ASSIGNED" },
        changed_by: session.profileId,
      });
    }

    try {
      await addAuditLog({
        brand_id: brandId,
        branch_id: branchId,
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

    try {
      await sendOperationalNotification({
        brandId: brandId,
        branchId: branchId,
        eventType: "SERVICE_CREATED",
        actorProfileId: session.profileId,
        payload: {
          serviceNumber: serviceNumber,
          customerName: input.customerName?.trim() ?? "",
          deviceType: input.deviceType?.trim() ?? "",
          deviceBrand: input.deviceBrand?.trim() ?? "",
          deviceModel: input.deviceModel?.trim() ?? "",
        },
      });
      await insertBrandNotification(
        brandId,
        "Service Created",
        `${serviceNumber} — ${input.customerName?.trim() ?? ""} (${input.deviceBrand?.trim() ?? ""} ${input.deviceModel?.trim() ?? ""})`,
        "activity",
        "info",
      );
      console.log("[notification:event] SERVICE_CREATED triggered", {
        serviceNumber,
        brandId,
        branchId,
      });
    } catch (notifErr: any) {
      console.warn("[notification:error] SERVICE_CREATED failed:", notifErr.message);
    }

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

      if (paymentResult?.revenue_ledger_id) {
        console.log("[service:create] Finance entries created atomically with DP payment:", {
          servicePaymentId: paymentResult.service_payment_id,
          revenue_ledger_id: paymentResult.revenue_ledger_id,
          mdr_ledger_id: paymentResult.mdr_ledger_id,
        });
      }

      await addServiceTimelineEntry({
        brand_id: brandId,
        branch_id: branchId,
        service_id: service.id,
        from_status: null,
        to_status: "INTAKE",
        reason: `DP diterima: ${paymentResult?.payment_number ?? ""}`,
        metadata: { event_type: "PAYMENT_CREATED", payment_type: "DOWN_PAYMENT", amount: input.dpAmount, payment_number: paymentResult?.payment_number },
        changed_by: session.profileId,
      });

      try {
        await addAuditLog({
          brand_id: brandId,
          branch_id: branchId,
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

    // Cache revalidation
    revalidatePath(`/[brandSlug]/panel/services`);
    revalidatePath(`/[brandSlug]/panel/dashboard`);
    revalidateTag(`services:${brandId}`);

    return successResult({ serviceId: service.id, serviceNumber });
  } catch (err: any) {
    console.error("[createServiceAction]", err);
    return handleActionError(err, "Gagal membuat servis.");
  }
}

/* ─── List Technicians ─── */

export interface TechnicianOption {
  profileId: string;
  name: string;
}

export async function listTechniciansAction(
  brandSlug: string,
  branchId?: string,
): Promise<ActionResult<TechnicianOption[]>> {
  try {
    const session = await getSessionData(brandSlug);
    const adminDb = createServiceRoleSupabaseClient();

    let query = (adminDb as any)
      .from("user_brand_memberships")
      .select("id, profile_id, role, profiles!inner(id, name)")
      .eq("brand_id", session.brandId)
      .eq("role", "TECHNICIAN")
      .eq("is_active", true)
      .is("deleted_at", null);

    const { data: memberships, error: memErr } = await query;
    if (memErr) throw memErr;
    if (!memberships || memberships.length === 0) {
      console.log("[listTechniciansAction] no technicians found for brand", session.brandId);
      return successResult([]);
    }

    let profiles = memberships.map((m: any) => ({
      profileId: m.profile_id,
      name: m.profiles?.name ?? "—",
    }));

    let allowedMembershipIds = new Set<string>();
    if (branchId) {
      const membershipIds = memberships.map((m: any) => m.id);
      const { data: branchAccess } = await (adminDb as any)
        .from("user_branch_access")
        .select("membership_id")
        .in("membership_id", membershipIds)
        .eq("branch_id", branchId)
        .eq("is_active", true);

      allowedMembershipIds = new Set((branchAccess ?? []).map((ba: any) => ba.membership_id));
      profiles = profiles.filter((_: any, i: number) => allowedMembershipIds.has(memberships[i].id));
    }

    console.log("[assign-technician/options]", {
      brandId: session.brandId,
      serviceBranchId: branchId ?? null,
      totalTechnicians: memberships.length,
      technicians: memberships.map((m: any) => ({
        id: m.id,
        profileId: m.profile_id,
        name: m.profiles?.name ?? "—",
        role: m.role,
        hasBranchAccess: branchId ? allowedMembershipIds?.has(m.id) ?? false : true,
      })),
    });

    return successResult(profiles);
  } catch (err: any) {
    console.error("[listTechniciansAction]", err);
    return errorResult(err.message ?? "Gagal memuat daftar teknisi.");
  }
}

/* ─── Assign Technician ─── */

export async function assignServiceTechnicianAction(
  brandSlug: string,
  serviceId: string,
  technicianProfileId: string | null,
): Promise<ActionResult<{ technicianName: string | null }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "service.update");

    const adminDb = createServiceRoleSupabaseClient();

    const { data: service } = await (adminDb as any)
      .from("services")
      .select("id, service_number, brand_id, branch_id, assigned_technician_id, current_status, customer_id, device_type, device_brand, device_model")
      .eq("id", serviceId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!service) return errorResult("Servis tidak ditemukan.");
    if (service.brand_id !== session.brandId) return errorResult("Servis bukan milik brand ini.");

    await requireActiveStoreSession(adminDb as any, session.brandId, service.branch_id);

    if (technicianProfileId) {
      const { data: techMembership } = await (adminDb as any)
        .from("user_brand_memberships")
        .select("id, role, is_active")
        .eq("profile_id", technicianProfileId)
        .eq("brand_id", session.brandId)
        .eq("role", "TECHNICIAN")
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (!techMembership) {
        return errorResult("Teknisi tidak ditemukan atau tidak aktif di brand ini.");
      }

      const { data: branchAccess } = await (adminDb as any)
        .from("user_branch_access")
        .select("id")
        .eq("membership_id", techMembership.id)
        .eq("branch_id", service.branch_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!branchAccess) {
        return errorResult("Teknisi tidak memiliki akses ke cabang servis ini.");
      }
    }

    const oldTechnicianId = service.assigned_technician_id;
    await updateServiceTechnician(serviceId, technicianProfileId, session.profileId);

    const { data: techProfile } = technicianProfileId
      ? await (adminDb as any).from("profiles").select("name").eq("id", technicianProfileId).maybeSingle()
      : { data: null };

    const technicianName = techProfile?.name ?? null;

    const isUnassign = !technicianProfileId;
    const isChange = oldTechnicianId && oldTechnicianId !== technicianProfileId;

    let reason: string;
    let eventType: string = "TECHNICIAN_ASSIGNED";
    if (isUnassign) {
      reason = "Teknisi dihapus dari servis";
      eventType = "TECHNICIAN_UNASSIGNED";
    } else if (isChange) {
      const { data: oldProfile } = await (adminDb as any)
        .from("profiles")
        .select("name")
        .eq("id", oldTechnicianId)
        .maybeSingle();
      reason = `Teknisi berubah: ${oldProfile?.name ?? "—"} → ${technicianName}`;
    } else {
      reason = `Teknisi ditugaskan: ${technicianName}`;
    }

    await addServiceTimelineEntry({
      brand_id: session.brandId,
      branch_id: service.branch_id,
      service_id: serviceId,
      from_status: null,
      to_status: service.current_status ?? "INTAKE",
      reason,
      metadata: { event_type: eventType },
      changed_by: session.profileId,
    });

    try {
      await addAuditLog({
        brand_id: session.brandId,
        branch_id: service.branch_id,
        action: "SERVICE_TECHNICIAN_ASSIGNED",
        target_type: "service",
        target_id: serviceId,
        target_label: service.service_number,
        actor_id: session.profileId,
        description: reason,
        details: {
          service_id: serviceId,
          service_number: service.service_number,
          old_technician_id: oldTechnicianId,
          new_technician_id: technicianProfileId,
        },
      });
    } catch (auditErr: any) {
      console.warn("[assignServiceTechnicianAction] audit log failed", auditErr);
    }

    /* Notify TECHNICIAN_ASSIGNED */
    try {
      if (technicianProfileId) {
        let techCustName = "";
        if (service.customer_id) {
          const { data: cust } = await (adminDb as any)
            .from("customers")
            .select("name")
            .eq("id", service.customer_id)
            .maybeSingle();
          techCustName = cust?.name ?? "";
        }
        await sendOperationalNotification({
          brandId: session.brandId,
          branchId: service.branch_id,
          eventType: "TECHNICIAN_ASSIGNED",
          actorProfileId: session.profileId,
          payload: {
            serviceNumber: service.service_number,
            technicianName: technicianName ?? "",
            customerName: techCustName,
          },
        });
        if (technicianName) {
          await insertBrandNotification(
            session.brandId,
            "Technician Assigned",
            `${technicianName} assigned to ${service.service_number}`,
            "activity",
            "info",
          );
        }
      }
    } catch (notifErr: any) {
      console.warn("[assignServiceTechnicianAction] notification error:", notifErr.message);
    }

    return successResult({ technicianName });
  } catch (err: any) {
    console.error("[assignServiceTechnicianAction]", err);
    return handleActionError(err, "Gagal menugaskan teknisi.");
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
