"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { PortalServiceData, PortalBrandData, PortalPaymentData, PortalPaymentSummary } from "@/server/repositories/customer-portal.repository";
import type { ReceiptSection } from "@/lib/receipt-sections";
import { migrateReceiptSections } from "@/lib/receipt-sections";
import type { ReceiptSettings, InvoiceData } from "./invoice-data.actions";

export async function getPosReceiptDataAction(
  brandSlug: string,
  transactionId: string,
): Promise<{ success: true; data: InvoiceData } | { success: false; error: string }> {
  try {
    const adminDb = createServiceRoleSupabaseClient() as any;

    const { data: brand } = await adminDb
      .from("brands")
      .select("id, name, slug")
      .eq("slug", brandSlug)
      .maybeSingle();

    if (!brand) return { success: false, error: "Brand tidak ditemukan." };

    const { data: tx } = await adminDb
      .from("pos_transactions")
      .select(`
        id, transaction_number, status, created_at,
        subtotal_amount, discount_amount, service_fee_amount,
        total_amount, paid_amount, change_amount,
        payment_method_id, customer_id, branch_id, brand_id,
        created_by, notes
      `)
      .eq("id", transactionId)
      .eq("brand_id", brand.id)
      .maybeSingle();

    if (!tx) return { success: false, error: "Transaksi tidak ditemukan." };

    const [branchRes, customerRes, paymentMethodRes, itemsRes, createdByRes, settingsRes] = await Promise.all([
      tx.branch_id
        ? adminDb.from("branches").select("name").eq("id", tx.branch_id).maybeSingle()
        : { data: null },
      tx.customer_id
        ? adminDb.from("customers").select("name, phone").eq("id", tx.customer_id).maybeSingle()
        : { data: null },
      tx.payment_method_id
        ? adminDb.from("payment_methods").select("name").eq("id", tx.payment_method_id).maybeSingle()
        : { data: null },
      adminDb
        .from("pos_transaction_items")
        .select("item_name_snapshot, variant_name_snapshot, quantity, selling_price_snapshot, subtotal_amount")
        .eq("transaction_id", tx.id),
      tx.created_by
        ? adminDb.from("profiles").select("name").eq("id", tx.created_by).maybeSingle()
        : { data: null },
      adminDb
        .from("brand_settings")
        .select("*")
        .eq("brand_id", brand.id)
        .maybeSingle(),
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

    const paymentMethodName = paymentMethodRes?.data?.name ?? null;

    const payments: PortalPaymentData[] = [
      {
        paymentNumber: tx.transaction_number,
        grossAmount: Number(tx.total_amount) || 0,
        netAmount: Number(tx.total_amount) || 0,
        paymentMethod: paymentMethodName,
        paymentStatus: "COMPLETED",
        paidAt: tx.created_at,
        notes: tx.notes,
      },
    ];

    const paymentSummary: PortalPaymentSummary = {
      totalBill: Number(tx.total_amount) || 0,
      totalPaid: Number(tx.paid_amount) || 0,
      remaining: 0,
      status: "PAID",
    };

    const items = (itemsRes?.data ?? []).map((item: any) => ({
      name: [item.item_name_snapshot, item.variant_name_snapshot].filter(Boolean).join(" - "),
      qty: Number(item.quantity) || 1,
      price: Number(item.selling_price_snapshot) || 0,
      totalPrice: Number(item.subtotal_amount) || 0,
    }));

    const service: PortalServiceData = {
      id: tx.id,
      trackingToken: "",
      serviceNumber: tx.transaction_number,
      customerName: customerRes?.data?.name ?? "-",
      deviceType: null,
      deviceBrand: null,
      deviceModel: null,
      deviceImei: null,
      deviceSerialNumber: null,
      reportedIssue: "",
      diagnosisResult: null,
      solutionNotes: null,
      currentStatus: tx.status,
      estimatedCost: 0,
      finalCost: Number(tx.total_amount) || 0,
      intakeAt: tx.created_at,
      estimatedCompletion: null,
      doneAt: tx.created_at,
      warrantyUntil: null,
      branchName: branchRes?.data?.name ?? null,
      technicianName: createdByRes?.data?.name ?? null,
      spareparts: items,
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
    console.error("[getPosReceiptDataAction]", err);
    return { success: false, error: "Terjadi kesalahan. Silakan coba lagi." };
  }
}
