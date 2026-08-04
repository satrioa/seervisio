"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type {
  PortalServiceData,
  PortalBrandData,
  PortalPaymentData,
  PortalPaymentSummary,
} from "@/server/repositories/customer-portal.repository";
import { getServicePaymentSummary } from "@/server/repositories/customer-portal.repository";
import type { ReceiptSection } from "@/lib/receipt-sections";
import { migrateReceiptSections } from "@/lib/receipt-sections";

export interface ReceiptSettings {
  paperWidth: "58mm" | "80mm";
  showBarcode: boolean;
  showPrices: boolean;
}

export interface InvoiceData {
  service: PortalServiceData;
  brand: PortalBrandData;
  payments: PortalPaymentData[];
  paymentSummary: PortalPaymentSummary;
  receiptSettings: ReceiptSettings;
  sections: ReceiptSection[];
}

export async function getInvoiceDataAction(
  brandSlug: string,
  serviceId: string,
): Promise<{ success: true; data: InvoiceData } | { success: false; error: string }> {
  try {
    const adminDb = createServiceRoleSupabaseClient() as any;

    const { data: brand } = await adminDb
      .from("brands")
      .select("id, name, slug")
      .eq("slug", brandSlug)
      .maybeSingle();

    if (!brand) {
      return { success: false, error: "Brand tidak ditemukan." };
    }

    const { data: svc } = await adminDb
      .from("services")
      .select(`
        id, tracking_token, service_number, current_status, brand_id,
        device_type, device_brand, device_model, device_imei, device_serial_number,
        reported_issue, diagnosis_result, solution_notes,
        estimated_cost, final_cost,
        intake_at, done_at, warranty_until,
        assigned_technician_id, branch_id, customer_id
      `)
      .eq("id", serviceId)
      .eq("brand_id", brand.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!svc) {
      return { success: false, error: "Service tidak ditemukan." };
    }

    const [branchRes, techRes, customerRes, sparepartRes, settingsRes, paymentRes] = await Promise.all([
      svc.branch_id
        ? adminDb.from("branches").select("name").eq("id", svc.branch_id).maybeSingle()
        : { data: null },
      svc.assigned_technician_id
        ? adminDb.from("profiles").select("name").eq("id", svc.assigned_technician_id).maybeSingle()
        : { data: null },
      svc.customer_id
        ? adminDb.from("customers").select("name, phone").eq("id", svc.customer_id).maybeSingle()
        : { data: null },
      adminDb
        .from("service_sparepart_usages")
        .select("sparepart_name, quantity, price, total_price")
        .eq("service_id", svc.id),
      adminDb
        .from("brand_settings")
        .select("*")
        .eq("brand_id", brand.id)
        .maybeSingle(),
      adminDb
        .from("service_payments")
        .select("payment_number, gross_amount, net_amount, payment_method_id, payment_status, paid_at, notes")
        .eq("service_id", svc.id)
        .eq("payment_status", "COMPLETED")
        .order("paid_at", { ascending: true }),
    ]);

    const s = settingsRes?.data ?? null;
    const brandData: PortalBrandData = {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      settings: s
        ? {
            storeName: s.store_name ?? null,
            tagline: s.tagline ?? null,
            logoUrl: s.logo_url ?? null,
            faviconUrl: s.favicon_url ?? null,
            accentColor: s.accent_color ?? null,
            phone: s.phone ?? null,
            email: s.email ?? null,
            address: s.address ?? null,
            whatsappNumber: s.whatsapp_number ?? null,
            businessHours: s.business_hours ?? null,
            themePrimaryColor: s.theme_primary_color ?? null,
            themeAccentColor: s.theme_accent_color ?? null,
            themeMode: s.theme_mode ?? null,
            invoiceFooter: s.invoice_footer ?? null,
            receiptFooter: s.receipt_footer ?? null,
          }
        : null,
    };

    const paymentMethodIds = [
      ...new Set((paymentRes?.data ?? []).map((p: any) => p.payment_method_id).filter(Boolean)),
    ];

    let paymentMethodMap: Record<string, string> = {};
    if (paymentMethodIds.length > 0) {
      const { data: methods } = await adminDb
        .from("payment_methods")
        .select("id, name")
        .in("id", paymentMethodIds);
      paymentMethodMap = Object.fromEntries((methods ?? []).map((m: any) => [m.id, m.name]));
    }

    const payments: PortalPaymentData[] = (paymentRes?.data ?? []).map((p: any) => ({
      paymentNumber: p.payment_number,
      grossAmount: Number(p.gross_amount) || 0,
      netAmount: Number(p.net_amount) || 0,
      paymentMethod: paymentMethodMap[p.payment_method_id] ?? null,
      paymentStatus: p.payment_status,
      paidAt: p.paid_at,
      notes: p.notes,
    }));

    const paymentSummary = await getServicePaymentSummary(svc.id);

    const spareparts = (sparepartRes?.data ?? []).map((sp: any) => ({
      name: sp.sparepart_name ?? "-",
      qty: Number(sp.quantity) || 1,
      price: Number(sp.price) || 0,
      totalPrice: Number(sp.total_price) || 0,
    }));

    const service: PortalServiceData = {
      id: svc.id,
      trackingToken: svc.tracking_token,
      serviceNumber: svc.service_number,
      customerName: customerRes?.data?.name ?? "-",
      deviceType: svc.device_type,
      deviceBrand: svc.device_brand,
      deviceModel: svc.device_model,
      deviceImei: svc.device_imei,
      deviceSerialNumber: svc.device_serial_number,
      reportedIssue: svc.reported_issue,
      diagnosisResult: svc.diagnosis_result,
      solutionNotes: svc.solution_notes,
      currentStatus: svc.current_status,
      estimatedCost: Number(svc.estimated_cost),
      finalCost: Number(svc.final_cost),
      intakeAt: svc.intake_at,
      estimatedCompletion: null,
      doneAt: svc.done_at,
      warrantyUntil: svc.warranty_until,
      branchName: branchRes?.data?.name ?? null,
      technicianName: techRes?.data?.name ?? null,
      spareparts,
      statusTimeline: [],
    };

    const recMeta = (s?.metadata as any)?.receipt_settings ?? {};
    const receiptSettings: ReceiptSettings = {
      paperWidth: recMeta.paperWidth ?? "80mm",
      showBarcode: recMeta.showBarcode ?? true,
      showPrices: recMeta.showPrices ?? true,
    };

    const storedSections = (s?.metadata as any)?.receipt_sections ?? null;
    const sections: ReceiptSection[] = migrateReceiptSections(storedSections);

    return {
      success: true,
      data: { service, brand: brandData, payments, paymentSummary, receiptSettings, sections },
    };
  } catch (err: any) {
    console.error("[getInvoiceDataAction]", err);
    return { success: false, error: "Terjadi kesalahan. Silakan coba lagi." };
  }
}
