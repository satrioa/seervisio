import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export interface PortalServiceData {
  id: string;
  trackingToken: string;
  serviceNumber: string;
  customerName: string;
  deviceType: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  deviceImei: string | null;
  deviceSerialNumber: string | null;
  reportedIssue: string;
  diagnosisResult: string | null;
  solutionNotes: string | null;
  currentStatus: string;
  estimatedCost: number;
  finalCost: number;
  intakeAt: string;
  estimatedCompletion: string | null;
  doneAt: string | null;
  warrantyUntil: string | null;
  branchName: string | null;
  technicianName: string | null;
  spareparts: {
    name: string;
    qty: number;
    price: number;
    totalPrice: number;
  }[];
  statusTimeline: { status: string; timestamp: string | null }[];
}

export interface PortalPaymentData {
  paymentNumber: string;
  grossAmount: number;
  netAmount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  paidAt: string | null;
  notes: string | null;
}

export interface PortalPaymentSummary {
  totalBill: number;
  totalPaid: number;
  remaining: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
}

export interface PortalPublicNote {
  note: string;
  createdAt: string | null;
}

export interface PortalBrandData {
  id: number;
  name: string;
  slug: string;
  settings: {
    storeName: string | null;
    tagline: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    accentColor: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    whatsappNumber: string | null;
    businessHours: Record<string, any> | null;
    themePrimaryColor: string | null;
    themeAccentColor: string | null;
    themeMode: string | null;
    invoiceFooter: string | null;
    receiptFooter: string | null;
  } | null;
}

export interface PortalFaqData {
  id: string;
  question: string;
  answer: string;
}

export async function getServiceByTrackingToken(token: string): Promise<PortalServiceData | null> {
  const adminDb = createServiceRoleSupabaseClient() as any;

  const { data: service, error } = await adminDb
    .from("services")
    .select(`
      id, tracking_token, service_number, current_status,
      device_type, device_brand, device_model, device_imei, device_serial_number,
      reported_issue, diagnosis_result, solution_notes,
      estimated_cost, final_cost,
      intake_at, done_at, warranty_until,
      assigned_technician_id, branch_id, customer_id
    `)
    .eq("tracking_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !service) return null;

  const [branchRes, techRes, customerRes, sparepartRes, timelineRes] = await Promise.all([
    service.branch_id
      ? adminDb.from("branches").select("name").eq("id", service.branch_id).maybeSingle()
      : { data: null },
    service.assigned_technician_id
      ? adminDb.from("profiles").select("name").eq("id", service.assigned_technician_id).maybeSingle()
      : { data: null },
    service.customer_id
      ? adminDb.from("customers").select("name, phone").eq("id", service.customer_id).maybeSingle()
      : { data: null },
    adminDb
      .from("service_sparepart_usages")
      .select("sparepart_name, quantity, price, total_price")
      .eq("service_id", service.id),
    adminDb
      .from("service_status_history")
      .select("status, created_at")
      .eq("service_id", service.id)
      .order("created_at", { ascending: true }),
  ]);

  const branchName = branchRes?.data?.name ?? null;
  const techName = techRes?.data?.name ?? null;
  const customer = customerRes?.data ?? null;

  const spareparts = (sparepartRes?.data ?? []).map((sp: any) => ({
    name: sp.sparepart_name ?? "-",
    qty: Number(sp.quantity) || 1,
    price: Number(sp.price) || 0,
    totalPrice: Number(sp.total_price) || 0,
  }));

  const statusTimeline = (timelineRes?.data ?? []).map((entry: any) => ({
    status: entry.status,
    timestamp: entry.created_at,
  }));

  return {
    id: service.id,
    trackingToken: service.tracking_token,
    serviceNumber: service.service_number,
    customerName: customer?.name ?? "-",
    deviceType: service.device_type,
    deviceBrand: service.device_brand,
    deviceModel: service.device_model,
    deviceImei: service.device_imei,
    deviceSerialNumber: service.device_serial_number,
    reportedIssue: service.reported_issue,
    diagnosisResult: service.diagnosis_result,
    solutionNotes: service.solution_notes,
    currentStatus: service.current_status,
    estimatedCost: Number(service.estimated_cost),
    finalCost: Number(service.final_cost),
    intakeAt: service.intake_at,
    estimatedCompletion: null,
    doneAt: service.done_at,
    warrantyUntil: service.warranty_until,
    branchName,
    technicianName: techName,
    spareparts,
    statusTimeline,
  };
}

export async function getServicePayments(serviceId: string): Promise<{
  payments: PortalPaymentData[];
  summary: PortalPaymentSummary;
}> {
  const adminDb = createServiceRoleSupabaseClient() as any;

  const { data: paymentRecords } = await adminDb
    .from("service_payments")
    .select("payment_number, gross_amount, net_amount, payment_method_id, payment_status, paid_at, notes")
    .eq("service_id", serviceId)
    .eq("payment_status", "SUCCEEDED")
    .order("paid_at", { ascending: true });

  const paymentMethodIds = [
    ...new Set((paymentRecords ?? []).map((p: any) => p.payment_method_id).filter(Boolean)),
  ];

  let paymentMethodMap: Record<string, string> = {};
  if (paymentMethodIds.length > 0) {
    const { data: methods } = await adminDb
      .from("payment_methods")
      .select("id, name")
      .in("id", paymentMethodIds);
    paymentMethodMap = Object.fromEntries((methods ?? []).map((m: any) => [m.id, m.name]));
  }

  const payments: PortalPaymentData[] = (paymentRecords ?? []).map((p: any) => ({
    paymentNumber: p.payment_number,
    grossAmount: Number(p.gross_amount) || 0,
    netAmount: Number(p.net_amount) || 0,
    paymentMethod: paymentMethodMap[p.payment_method_id] ?? null,
    paymentStatus: p.payment_status,
    paidAt: p.paid_at,
    notes: p.notes,
  }));

  const totalPaid = payments.reduce((sum, p) => sum + p.grossAmount, 0);

  return {
    payments,
    summary: { totalBill: 0, totalPaid, remaining: 0, status: "UNPAID" },
  };
}

export async function getServicePaymentSummary(serviceId: string): Promise<PortalPaymentSummary> {
  const adminDb = createServiceRoleSupabaseClient() as any;

  const { data: svc } = await adminDb
    .from("services")
    .select("estimated_cost, final_cost")
    .eq("id", serviceId)
    .maybeSingle();

  const totalBill = Number(svc?.final_cost || svc?.estimated_cost || 0);

  const { data: payments } = await adminDb
    .from("service_payments")
    .select("gross_amount")
    .eq("service_id", serviceId)
    .eq("payment_status", "SUCCEEDED");

  const totalPaid = (payments ?? []).reduce((sum: number, p: any) => sum + Number(p.gross_amount), 0);

  let status: "PAID" | "PARTIAL" | "UNPAID";
  if (totalBill <= 0 && totalPaid <= 0) {
    status = "UNPAID";
  } else if (totalPaid >= totalBill) {
    status = "PAID";
  } else if (totalPaid > 0) {
    status = "PARTIAL";
  } else {
    status = "UNPAID";
  }

  return {
    totalBill,
    totalPaid,
    remaining: Math.max(0, totalBill - totalPaid),
    status,
  };
}

export async function getBrandData(brandId: number): Promise<PortalBrandData | null> {
  const adminDb = createServiceRoleSupabaseClient() as any;

  const [brandRes, settingsRes] = await Promise.all([
    adminDb.from("brands").select("id, name, slug").eq("id", brandId).maybeSingle(),
    adminDb.from("brand_settings").select("*").eq("brand_id", brandId).maybeSingle(),
  ]);

  const brand = brandRes?.data;
  if (!brand) return null;

  const s = settingsRes?.data ?? null;

  return {
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
}

export async function getBrandFaqs(brandId: number): Promise<PortalFaqData[]> {
  const adminDb = createServiceRoleSupabaseClient() as any;

  const { data } = await adminDb
    .from("brand_faqs")
    .select("id, question, answer")
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (data ?? []).map((faq: any) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
  }));
}

export async function getBrandTestimonials(brandId: number, limit = 5): Promise<
  { customerName: string; rating: number; comment: string | null; createdAt: string }[]
> {
  const adminDb = createServiceRoleSupabaseClient() as any;

  const { data } = await adminDb
    .from("testimonials")
    .select("customer_name, rating, comment, created_at")
    .eq("brand_id", brandId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((t: any) => ({
    customerName: t.customer_name,
    rating: t.rating,
    comment: t.comment,
    createdAt: t.created_at,
  }));
}

export async function getPublicServiceNotes(serviceId: string): Promise<PortalPublicNote[]> {
  const adminDb = createServiceRoleSupabaseClient() as any;

  const { data } = await adminDb
    .from("service_notes")
    .select("content, created_at")
    .eq("service_id", serviceId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  return (data ?? []).map((n: any) => ({
    note: n.content,
    createdAt: n.created_at,
  }));
}

export async function insertTestimonial(
  brandId: number,
  serviceId: string,
  customerName: string,
  rating: number,
  comment?: string,
): Promise<boolean> {
  const adminDb = createServiceRoleSupabaseClient() as any;

  const { error } = await adminDb.from("testimonials").insert({
    brand_id: brandId,
    service_id: serviceId,
    customer_name: customerName,
    rating,
    comment: comment ?? null,
    is_approved: false,
  });

  return !error;
}

export async function getServiceBrandId(token: string): Promise<number | null> {
  const adminDb = createServiceRoleSupabaseClient() as any;

  const { data } = await adminDb
    .from("services")
    .select("brand_id")
    .eq("tracking_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  return data?.brand_id ?? null;
}
