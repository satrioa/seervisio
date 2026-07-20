import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { LicenseOrder, License, LicensePackage } from "@/types/license";

function mapOrder(row: any): LicenseOrder {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    brand_id: row.brand_id,
    package_id: row.package_id,
    price: Number(row.price),
    unique_code: row.unique_code,
    total_amount: Number(row.total_amount),
    status: row.status,
    payment_deadline: row.payment_deadline,
    payment_method: row.payment_method,
    bank_name: row.bank_name,
    account_number: row.account_number,
    account_holder: row.account_holder,
    proof_url: row.proof_url,
    notes: row.notes,
    brand_info: row.brand_info,
    pic_name: row.pic_name,
    pic_phone: row.pic_phone,
    company_address: row.company_address,
    npwp: row.npwp,
    invoice_email: row.invoice_email,
    verified_by: row.verified_by,
    verified_at: row.verified_at,
    rejected_reason: row.rejected_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    package_name: row.packages?.name ?? row.package_name,
    package_slug: row.packages?.slug ?? row.package_slug,
    brand_name: row.brands?.name ?? row.brand_name,
    billing_duration_enabled: row.packages?.billing_duration_enabled,
    billing_duration_type: row.packages?.billing_duration_type,
    billing_duration_value: row.packages?.billing_duration_value,
  };
}

function mapLicense(row: any): License {
  return {
    id: row.id,
    brand_id: row.brand_id,
    package_id: row.package_id,
    order_id: row.order_id,
    license_payment_id: row.license_payment_id ?? null,
    status: row.status,
    started_at: row.started_at,
    expires_at: row.expires_at,
    is_trial: row.is_trial,
    renewal_preference: row.renewal_preference ?? null,
    suspended_reason: row.suspended_reason ?? null,
    suspended_by: row.suspended_by ?? null,
    suspended_at: row.suspended_at ?? null,
    downgrade_to_package_id: row.downgrade_to_package_id ?? null,
    downgrade_effective_at: row.downgrade_effective_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    package_name: row.packages?.name ?? row.package_name,
    package_slug: row.packages?.slug ?? row.package_slug,
    package_type: row.packages?.package_type ?? row.package_type,
    brand_name: row.brands?.name ?? row.brand_name,
    billing_duration_enabled: row.packages?.billing_duration_enabled,
    billing_duration_type: row.packages?.billing_duration_type,
    billing_duration_value: row.packages?.billing_duration_value,
    downgrade_to_package_name: row.downgrade_package?.name ?? row.downgrade_to_package_name,
  };
}

function mapPackage(row: any): LicensePackage {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    max_branches: row.max_branches,
    max_users: row.max_users,
    max_storage_mb: row.max_storage_mb,
    max_transactions: row.max_transactions,
    is_active: row.is_active,
    billing_duration_enabled: row.billing_duration_enabled ?? false,
    billing_duration_type: row.billing_duration_type ?? null,
    billing_duration_value: row.billing_duration_value ?? null,
    package_type: row.package_type ?? "subscription",
    is_default_trial: row.is_default_trial ?? false,
  };
}

/* ── Packages (public) ── */

export async function getActivePackages(): Promise<LicensePackage[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPackage);
}

export async function getPackageById(id: string): Promise<LicensePackage | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPackage(data) : null;
}

/* ── License Orders ── */

export async function createLicenseOrder(
  brandId: number,
  input: {
    package_id: string;
    price: number;
    unique_code: number;
    total_amount: number;
    invoice_number: string;
    pic_name: string;
    pic_phone: string;
    company_address: string;
    npwp?: string;
    invoice_email: string;
    notes?: string;
    brand_info: Record<string, unknown>;
  },
): Promise<LicenseOrder> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("license_orders")
    .insert({
      brand_id: brandId,
      package_id: input.package_id,
      price: input.price,
      unique_code: input.unique_code,
      total_amount: input.total_amount,
      invoice_number: input.invoice_number,
      pic_name: input.pic_name,
      pic_phone: input.pic_phone,
      company_address: input.company_address,
      npwp: input.npwp || null,
      invoice_email: input.invoice_email,
      notes: input.notes || null,
      brand_info: input.brand_info,
      status: "pending_payment",
    })
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .single();
  if (error) throw new Error(error.message);
  return mapOrder(data);
}

export async function getLicenseOrderById(id: string): Promise<LicenseOrder | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("license_orders")
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapOrder(data) : null;
}

export async function getLicenseOrderByInvoice(invoice: string): Promise<LicenseOrder | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("license_orders")
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .eq("invoice_number", invoice)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapOrder(data) : null;
}

export async function getLicenseOrdersForBrand(brandId: number): Promise<LicenseOrder[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("license_orders")
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOrder);
}

export async function getAllLicenseOrders(): Promise<LicenseOrder[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("license_orders")
    .select("*, packages:package_id(name, slug, billing_duration_enabled, billing_duration_type, billing_duration_value), brands:brand_id(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOrder);
}

export async function updateLicenseOrderStatus(
  id: string,
  status: LicenseOrder["status"],
  extra?: { proof_url?: string; verified_by?: string; rejected_reason?: string },
): Promise<LicenseOrder> {
  const supabase = createServiceRoleSupabaseClient();
  const updateData: Record<string, unknown> = { status };
  if (extra?.proof_url) updateData.proof_url = extra.proof_url;
  if (extra?.verified_by) {
    updateData.verified_by = extra.verified_by;
    updateData.verified_at = new Date().toISOString();
  }
  if (extra?.rejected_reason) updateData.rejected_reason = extra.rejected_reason;

  const { data, error } = await (supabase as any)
    .from("license_orders")
    .update(updateData)
    .eq("id", id)
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .single();
  if (error) throw new Error(error.message);
  return mapOrder(data);
}

/* ── Licenses ── */

export async function getActiveLicenseForBrand(brandId: number): Promise<License | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("licenses")
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .eq("brand_id", brandId)
    .in("status", ["active", "trial"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLicense(data) : null;
}

// Return ANY license for this profile (regardless of status).
export async function getLicenseForProfile(profileId: string): Promise<License | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("licenses")
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLicense(data) : null;
}

// Return only the ACTIVE / TRIAL license for the profile.
export async function getActiveLicenseForProfile(profileId: string): Promise<License | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("licenses")
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .eq("profile_id", profileId)
    .in("status", ["active", "trial"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLicense(data) : null;
}

export async function getLicenseById(id: string): Promise<License | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("licenses")
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLicense(data) : null;
}

export async function getAllLicenses(): Promise<License[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("licenses")
    .select("*, packages:package_id(name, slug, billing_duration_enabled, billing_duration_type, billing_duration_value), brands:brand_id(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLicense);
}

export async function getLicensesForBrand(brandId: number): Promise<License[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("licenses")
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLicense);
}

export async function createLicense(
  brandId: number,
  packageId: string,
  orderId: string,
  expiresAt: string | null,
): Promise<License> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("licenses")
    .insert({
      brand_id: brandId,
      package_id: packageId,
      order_id: orderId,
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
      is_trial: false,
    })
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .single();
  if (error) throw new Error(error.message);
  return mapLicense(data);
}

export async function updateLicenseStatus(
  id: string,
  status: License["status"],
): Promise<License> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("licenses")
    .update({ status })
    .eq("id", id)
    .select("*, packages:package_id(name, slug), brands:brand_id(name)")
    .single();
  if (error) throw new Error(error.message);
  return mapLicense(data);
}

// Patch arbitrary license columns (renewal_preference, downgrade fields, suspend).
export async function updateLicenseFields(
  id: string,
  fields: Partial<{
    renewal_preference: License["renewal_preference"];
    downgrade_to_package_id: string | null;
    downgrade_effective_at: string | null;
    status: License["status"];
    suspended_reason: string | null;
    suspended_by: string | null;
    suspended_at: string | null;
  }>,
): Promise<License> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("licenses")
    .update(fields)
    .eq("id", id)
    .select("*, packages:package_id(name, slug, package_type), brands:brand_id(name)")
    .single();
  if (error) throw new Error(error.message);
  return mapLicense(data);
}

// Pending/awaiting-verification order for a brand (spec §5 duplicate guard).
export async function getPendingOrderForBrand(
  brandId: number,
): Promise<LicenseOrder | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("license_orders")
    .select("*, packages:package_id(name, slug), brands:brand_id(name)")
    .eq("brand_id", brandId)
    .in("status", ["pending_payment", "waiting_verification", "rejected"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapOrder(data) : null;
}

// Patch arbitrary license_order columns (used by replace-proof / cancel flows).
export async function updateLicenseOrderFields(
  id: string,
  fields: Record<string, unknown>,
): Promise<LicenseOrder> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("license_orders")
    .update(fields)
    .eq("id", id)
    .select("*, packages:package_id(name, slug), brands:brand_id(name)")
    .single();
  if (error) throw new Error(error.message);
  return mapOrder(data);
}

// The single active trial package flagged by admin (spec §1.1).
export async function getDefaultTrialPackage(): Promise<LicensePackage | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await (supabase as any)
    .from("packages")
    .select("*")
    .eq("is_default_trial", true)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPackage(data) : null;
}
