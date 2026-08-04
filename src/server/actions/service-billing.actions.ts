"use server";

import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  requireBranchAccess,
  type ActionResult,
} from "./action-helper";
import {
  getServiceBillingItems,
  saveServiceBillingItems,
} from "@/repositories/service-billing.repository";
import { addServiceTimelineEntry, addAuditLog } from "@/repositories/service.repository";
import { getServiceById } from "@/repositories/service.repository";
import type { ServiceBillingItem, ServiceBillingData } from "@/server/domain/service-billing.types";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export async function getServiceBillingAction(
  brandSlug: string,
  serviceId: string,
): Promise<ActionResult<ServiceBillingData>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "service.view");

    const data = await getServiceBillingItems(serviceId);
    return successResult(data);
  } catch (err: any) {
    console.error("[getServiceBillingAction]", err);
    return errorResult(err.message ?? "Gagal memuat data tagihan.");
  }
}

export type BillingItemInput = {
  type: "SERVICE_FEE" | "ADDITIONAL";
  description: string;
  amount: number;
};

export async function saveServiceBillingAction(
  brandSlug: string,
  serviceId: string,
  items: BillingItemInput[],
): Promise<ActionResult<ServiceBillingData>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, PERMISSIONS.SERVICE_BILLING_SET);

    // Validate service exists and not cancelled
    const service = await getServiceById(serviceId);
    if (!service) return errorResult("Servis tidak ditemukan.");
    if (service.current_status === "CANCELLED") {
      return errorResult("Tidak bisa mengatur tagihan untuk servis yang sudah dibatalkan.");
    }

    if (service.branch_id) {
      requireBranchAccess(session, service.branch_id, "saveServiceBillingAction");
    }

    // Validate no completed payments exist
    const supabase = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient();
    const { count: paymentCount } = await (supabase as any)
      .from("service_payments")
      .select("id", { count: "exact", head: true })
      .eq("service_id", serviceId)
      .in("payment_status", ["COMPLETED", "PAID", "SUCCESS"]);

    if ((paymentCount ?? 0) > 0) {
      return errorResult("Tidak bisa mengubah tagihan karena sudah ada pembayaran.");
    }

    // Validate items
    if (items.length === 0) {
      return errorResult("Minimal 1 item tagihan diperlukan.");
    }

    for (const item of items) {
      if (!item.description || item.description.trim() === "") {
        return errorResult("Deskripsi item tidak boleh kosong.");
      }
      if (item.amount < 0) {
        return errorResult("Nominal item tidak boleh negatif.");
      }
    }

    if (items.every((i) => i.amount <= 0)) {
      return errorResult("Minimal 1 item dengan nominal > 0 diperlukan.");
    }

    // Save billing items
    const data = await saveServiceBillingItems(
      serviceId,
      session.brandId,
      items.map((item) => ({
        type: item.type,
        description: item.description,
        amount: item.amount,
        sortOrder: 0,
      })),
    );

    // Add timeline entry
    await addServiceTimelineEntry({
      service_id: serviceId,
      brand_id: session.brandId,
      branch_id: service.branch_id,
      from_status: service.current_status,
      to_status: service.current_status,
      reason: `Tagihan diatur: ${data.totalBill.toLocaleString("id-ID")}`,
      metadata: { event_type: "BILLING_SET" },
      changed_by: session.profileId,
    });

    // Add audit log
    await addAuditLog({
      brand_id: session.brandId,
      branch_id: service.branch_id,
      actor_id: session.profileId,
      action: "SERVICE_BILLING_SET",
      target_type: "service",
      target_id: serviceId,
      details: { items, totalBill: data.totalBill },
    });

    return successResult(data);
  } catch (err: any) {
    console.error("[saveServiceBillingAction]", err);
    return errorResult(err.message ?? "Gagal menyimpan tagihan.");
  }
}
