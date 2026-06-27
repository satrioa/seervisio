"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export type TrackedServiceData = {
  id: string;
  trackingToken: string | null;
  serviceNumber: string;
  customerName: string;
  customerPhone: string | null;
  deviceType: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  deviceImei: string | null;
  reportedIssue: string;
  diagnosisResult: string | null;
  currentStatus: string;
  estimatedCost: number;
  finalCost: number;
  intakeAt: string;
  estimatedCompletion: string | null;
  branchName: string | null;
  technicianName: string | null;
  spareparts: {
    name: string;
    qty: number;
    price: number;
    totalPrice: number;
  }[];
  statusTimeline: { status: string; timestamp: string | null }[];
};

export async function trackServiceAction(
  brandSlug: string,
  query: { invoice?: string; phone?: string },
): Promise<{ success: true; data: TrackedServiceData[] } | { success: false; error: string }> {
  try {
    if (!query.invoice && !query.phone) {
      return { success: false, error: "Masukkan nomor invoice atau nomor WhatsApp." };
    }

    const adminDb = createServiceRoleSupabaseClient() as any;

    const { data: brand } = await adminDb
      .from("brands")
      .select("id, name")
      .eq("slug", brandSlug)
      .maybeSingle();

    if (!brand) {
      return { success: false, error: "Brand tidak ditemukan." };
    }

    let serviceQuery = adminDb
      .from("services")
      .select(`
        id, tracking_token, service_number, current_status, device_type, device_brand, device_model,
        device_imei, reported_issue, diagnosis_result, estimated_cost, final_cost,
        intake_at, done_at, cancelled_at,
        assigned_technician_id,
        branch_id,
        customer_id
      `)
      .eq("brand_id", brand.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (query.invoice) {
      serviceQuery = serviceQuery.ilike("service_number", `%${query.invoice}%`);
    }

    if (query.phone) {
      const { data: customers } = await adminDb
        .from("customers")
        .select("id")
        .eq("brand_id", brand.id)
        .ilike("phone", `%${query.phone}%`);

      const customerIds = (customers ?? []).map((c: any) => c.id);

      if (customerIds.length > 0) {
        serviceQuery = serviceQuery.in("customer_id", customerIds);
      } else if (!query.invoice) {
        return { success: false, error: "Tidak ditemukan perbaikan dengan nomor tersebut." };
      }
    }

    const { data: services, error } = await serviceQuery;

    if (error) {
      console.error("[trackServiceAction] query error:", error);
      return { success: false, error: "Gagal mencari data." };
    }

    if (!services || services.length === 0) {
      return { success: false, error: "Tidak ditemukan perbaikan dengan nomor tersebut." };
    }

    const branchIds = [...new Set(services.map((s: any) => s.branch_id))];
    const technicianIds = [...new Set(services.map((s: any) => s.assigned_technician_id).filter(Boolean))];
    const customerIds = [...new Set(services.map((s: any) => s.customer_id).filter(Boolean))];

    const [[branches, techs, customers], sparepartMap, statusTimelineMap] = await Promise.all([
      Promise.all([
        branchIds.length > 0
          ? adminDb.from("branches").select("id, name").in("id", branchIds)
          : { data: [] },
        technicianIds.length > 0
          ? adminDb.from("profiles").select("id, name").in("id", technicianIds)
          : { data: [] },
        customerIds.length > 0
          ? adminDb.from("customers").select("id, name, phone").in("id", customerIds)
          : { data: [] },
      ]) as any,
      (async () => {
        const serviceIds = services.map((s: any) => s.id);
        const { data: sp } = await adminDb
          .from("service_spareparts")
          .select("service_id, name, qty, price, total_price")
          .in("service_id", serviceIds);
        const map: Record<string, any[]> = {};
        for (const item of sp ?? []) {
          if (!map[item.service_id]) map[item.service_id] = [];
          map[item.service_id].push({
            name: item.name,
            qty: item.qty,
            price: item.price,
            totalPrice: item.total_price,
          });
        }
        return map;
      })(),
      (async () => {
        const serviceIds = services.map((s: any) => s.id);
        const { data: timeline } = await adminDb
          .from("service_status_history")
          .select("service_id, status, created_at")
          .in("service_id", serviceIds)
          .order("created_at", { ascending: true });
        const map: Record<string, { status: string; timestamp: string | null }[]> = {};
        for (const entry of timeline ?? []) {
          if (!map[entry.service_id]) map[entry.service_id] = [];
          map[entry.service_id].push({
            status: entry.status,
            timestamp: entry.created_at,
          });
        }
        return map;
      })(),
    ]);

    const branchMap = Object.fromEntries((branches?.data ?? []).map((b: any) => [b.id, b.name]));
    const techMap = Object.fromEntries((techs?.data ?? []).map((t: any) => [t.id, t.name]));
    const customerMap = Object.fromEntries(
      (customers?.data ?? []).map((c: any) => [c.id, { name: c.name, phone: c.phone }]),
    );

    const results: TrackedServiceData[] = services.map((svc: any) => {
      const cust = customerMap[svc.customer_id] || { name: "-", phone: null };

      const buildTimeline: { status: string; timestamp: string | null }[] = [];
      const statusFields: Record<string, string> = {
        INTAKE: "intake_at",
        DIAGNOSIS: "diagnosis_at",
        WAITING_APPROVAL: "waiting_approval_at",
        REPAIRING: "repairing_at",
        QC: "qc_at",
        DONE: "done_at",
        CANCELLED: "cancelled_at",
      };

      for (const [status, field] of Object.entries(statusFields)) {
        if (svc[field]) {
          buildTimeline.push({ status, timestamp: svc[field] });
        }
      }

      const timelineFromHistory = statusTimelineMap[svc.id] || [];
      if (timelineFromHistory.length > 0) {
        const merged = [...buildTimeline];
        for (const entry of timelineFromHistory) {
          if (!merged.some((m) => m.status === entry.status && m.timestamp === entry.timestamp)) {
            merged.push(entry);
          }
        }
        merged.sort(
          (a, b) =>
            new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime(),
        );
      }

      return {
        id: svc.id,
        trackingToken: svc.tracking_token,
        serviceNumber: svc.service_number,
        customerName: cust.name,
        customerPhone: cust.phone,
        deviceType: svc.device_type,
        deviceBrand: svc.device_brand,
        deviceModel: svc.device_model,
        deviceImei: svc.device_imei,
        reportedIssue: svc.reported_issue,
        diagnosisResult: svc.diagnosis_result,
        currentStatus: svc.current_status,
        estimatedCost: Number(svc.estimated_cost),
        finalCost: Number(svc.final_cost),
        intakeAt: svc.intake_at,
        estimatedCompletion: null,
        branchName: branchMap[svc.branch_id] || null,
        technicianName: techMap[svc.assigned_technician_id] || null,
        spareparts: sparepartMap[svc.id] || [],
        statusTimeline: timelineFromHistory.length > 0 ? timelineFromHistory : buildTimeline,
      };
    });

    return { success: true, data: results };
  } catch (err: any) {
    console.error("[trackServiceAction]", err);
    return { success: false, error: "Terjadi kesalahan. Silakan coba lagi." };
  }
}
