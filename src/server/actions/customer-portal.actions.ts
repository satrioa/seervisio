"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  getServiceByTrackingToken,
  getServicePayments,
  getServicePaymentSummary,
  getBrandData,
  getBrandFaqs,
  getPublicServiceNotes,
  insertTestimonial,
  getServiceBrandId,
} from "@/server/repositories/customer-portal.repository";
import type {
  PortalServiceData,
  PortalBrandData,
  PortalFaqData,
  PortalPaymentData,
  PortalPaymentSummary,
  PortalPublicNote,
} from "@/server/repositories/customer-portal.repository";

export interface PortalData {
  service: PortalServiceData;
  brand: PortalBrandData;
  payments: PortalPaymentData[];
  paymentSummary: PortalPaymentSummary;
  publicNotes: PortalPublicNote[];
  faqs: PortalFaqData[];
  totalPaid: number;
}

export async function getPortalDataAction(
  token: string,
): Promise<{ success: true; data: PortalData } | { success: false; error: string }> {
  try {
    const service = await getServiceByTrackingToken(token);
    if (!service) {
      return { success: false, error: "Tautan tidak valid atau perbaikan tidak ditemukan." };
    }

    const [brand, paymentResult, faqs, publicNotes] = await Promise.all([
      getBrandData(await getServiceBrandId(token) ?? 0),
      getServicePayments(service.id),
      getBrandFaqs(await getServiceBrandId(token) ?? 0),
      getPublicServiceNotes(service.id),
    ]);

    if (!brand) {
      return { success: false, error: "Data brand tidak ditemukan." };
    }

    const paymentSummary = await getServicePaymentSummary(service.id);

    const totalPaid = paymentResult.payments.reduce((s, p) => s + p.grossAmount, 0);

    return {
      success: true,
      data: {
        service,
        brand,
        payments: paymentResult.payments,
        paymentSummary,
        publicNotes,
        faqs,
        totalPaid,
      },
    };
  } catch (err: any) {
    console.error("[getPortalDataAction]", err);
    return { success: false, error: "Terjadi kesalahan. Silakan coba lagi." };
  }
}

export async function submitTestimonialAction(
  serviceId: string,
  brandId: number,
  customerName: string,
  rating: number,
  comment?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating harus antara 1-5." };
    }

    const ok = await insertTestimonial(brandId, serviceId, customerName, rating, comment);
    if (!ok) {
      return { success: false, error: "Gagal menyimpan testimonial." };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[submitTestimonialAction]", err);
    return { success: false, error: "Terjadi kesalahan." };
  }
}

export async function checkServiceExistsByTokenAction(
  token: string,
): Promise<boolean> {
  const adminDb = createServiceRoleSupabaseClient() as any;
  const { data } = await adminDb
    .from("services")
    .select("id")
    .eq("tracking_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  return !!data;
}

export async function checkTestimonialExistsAction(
  serviceId: string,
): Promise<boolean> {
  const adminDb = createServiceRoleSupabaseClient() as any;
  const { data } = await adminDb
    .from("testimonials")
    .select("id")
    .eq("service_id", serviceId)
    .maybeSingle();
  return !!data;
}

export async function getServiceTrackingTokenAction(
  serviceId: string,
): Promise<string | null> {
  const adminDb = createServiceRoleSupabaseClient() as any;
  const { data } = await adminDb
    .from("services")
    .select("tracking_token")
    .eq("id", serviceId)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.tracking_token ?? null;
}

export async function getServicePortalShareDataAction(
  serviceId: string,
): Promise<{
  trackingToken: string | null;
  brandName: string;
  brandSlug: string;
  whatsappNumber: string | null;
  customerPhone: string | null;
} | null> {
  try {
    const adminDb = createServiceRoleSupabaseClient() as any;

    const { data: svc } = await adminDb
      .from("services")
      .select("tracking_token, brand_id, customer_id")
      .eq("id", serviceId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!svc) return null;

    const brandId = svc.brand_id;

    const [brandRes, settingsRes] = await Promise.all([
      adminDb.from("brands").select("name, slug").eq("id", brandId).maybeSingle(),
      adminDb.from("brand_settings").select("whatsapp_number").eq("brand_id", brandId).maybeSingle(),
    ]);

    let customerPhone: string | null = null;
    if (svc.customer_id) {
      const { data: cust } = await adminDb
        .from("customers")
        .select("phone")
        .eq("id", svc.customer_id)
        .maybeSingle();
      customerPhone = cust?.phone ?? null;
    }

    return {
      trackingToken: svc.tracking_token,
      brandName: brandRes?.data?.name ?? "",
      brandSlug: brandRes?.data?.slug ?? "",
      whatsappNumber: settingsRes?.data?.whatsapp_number ?? null,
      customerPhone,
    };
  } catch {
    return null;
  }
}
