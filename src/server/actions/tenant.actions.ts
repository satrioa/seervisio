"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getTenantsList, type TenantRow } from "@/server/repositories/platform.repository";
import {
  successResult,
  errorResult,
  type ActionResult,
} from "./action-helper";
import { ROLES } from "@/lib/permissions/roles";
import { calculateLicenseExpiry } from "@/lib/license/license-duration";

export interface CreateTenantInput {
  brandName: string;
  brandSlug: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone?: string;
  planSlug: string;
  password: string;
}

async function requirePlatformOwner() {
  const authResult = await getCurrentUser();
  if (!authResult.user) {
    throw new Error("Unauthorized");
  }
  const isPlatformOwner = authResult.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER
  );
  if (!isPlatformOwner) {
    throw new Error("Akses ditolak. Hanya Platform Owner yang dapat mengakses panel ini.");
  }
}

export async function createTenantAction(
  input: CreateTenantInput,
): Promise<ActionResult<{ brandId: number; brandSlug: string }>> {
  try {
    await requirePlatformOwner();

    const supabase = createServiceRoleSupabaseClient();

    // 1. Get package for plan limits
    const { data: pkg } = await (supabase as any)
      .from("packages")
      .select("*")
      .eq("slug", input.planSlug)
      .maybeSingle();

    if (!pkg) throw new Error(`Package "${input.planSlug}" not found.`);

    // 2. Create auth user
    const { data: authData, error: authError } = await (supabase as any).auth.admin.createUser({
      email: input.ownerEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.ownerName, auth_created_by_admin: true },
    });

    if (authError) throw new Error(`Auth user creation failed: ${authError.message}`);
    const authUserId = authData.user.id;

    // 3. Create profile
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        email: input.ownerEmail,
        name: input.ownerName,
        is_active: true,
      })
      .select("id")
      .single();

    if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`);

    // 4. Create brand
    const { data: brand, error: brandError } = await (supabase as any)
      .from("brands")
      .insert({
        name: input.brandName,
        slug: input.brandSlug,
        status: "active",
        owner_name: input.ownerName,
        owner_email: input.ownerEmail,
        owner_phone: input.ownerPhone ?? null,
      })
      .select("id")
      .single();

    if (brandError) throw new Error(`Brand creation failed: ${brandError.message}`);
    const brandId = brand.id;

    // 5. Create brand_settings
    await (supabase as any)
      .from("brand_settings")
      .insert({
        brand_id: brandId,
        store_name: input.brandName,
      });

    // 6. Create license with proper expiry based on package billing
    const now = new Date();
    const expiresAt = calculateLicenseExpiry(
      {
        billing_duration_enabled: pkg.billing_duration_enabled ?? true,
        billing_duration_type: pkg.billing_duration_type ?? null,
        billing_duration_value: pkg.billing_duration_value ?? null,
      },
      now,
    );

    await (supabase as any)
      .from("licenses")
      .insert({
        brand_id: brandId,
        package_id: pkg.id,
        status: "active",
        started_at: now.toISOString(),
        expires_at: expiresAt,
        is_trial: false,
      });

    // 7. Create user_brand_membership as MASTER_ADMIN
    await (supabase as any)
      .from("user_brand_memberships")
      .insert({
        profile_id: profile.id,
        brand_id: brandId,
        role: "MASTER_ADMIN",
        is_active: true,
      });

    // 8. Log audit
    await (supabase as any)
      .from("audit_logs")
      .insert({
        brand_id: brandId,
        action: "BRAND_CREATED",
        description: `Brand "${input.brandName}" created by platform owner`,
        actor_name: "Platform Owner",
        metadata: { created_by: "platform_owner", plan: input.planSlug },
      });

    return successResult({ brandId, brandSlug: input.brandSlug });
  } catch (err: any) {
    console.error("[Tenant] createTenantAction:", err.message);
    return errorResult(err.message || "Failed to create tenant.");
  }
}

export async function getTenantsListAction(): Promise<ActionResult<TenantRow[]>> {
  try {
    await requirePlatformOwner();
    const data = await getTenantsList();
    return successResult(data);
  } catch (err: any) {
    console.error("[Tenant] getTenantsListAction:", err.message);
    return errorResult(err.message || "Gagal memuat daftar tenant.");
  }
}

export async function suspendTenantAction(
  brandId: number,
): Promise<ActionResult<{ brandId: number }>> {
  try {
    await requirePlatformOwner();

    const supabase = createServiceRoleSupabaseClient();

    const { error: brandError } = await supabase
      .from("brands")
      .update({ status: "suspended" })
      .eq("id", brandId);

    if (brandError) throw new Error(brandError.message);

    const { error: subError } = await (supabase as any)
      .from("licenses")
      .update({ status: "expired" })
      .eq("brand_id", brandId);

    if (subError) throw new Error(subError.message);

    return successResult({ brandId });
  } catch (err: any) {
    console.error("[Tenant] suspendTenantAction:", err.message);
    return errorResult(err.message || "Gagal menonaktifkan tenant.");
  }
}

export async function activateTenantAction(
  brandId: number,
): Promise<ActionResult<{ brandId: number }>> {
  try {
    await requirePlatformOwner();

    const supabase = createServiceRoleSupabaseClient();

    const { error: brandError } = await supabase
      .from("brands")
      .update({ status: "active" })
      .eq("id", brandId);

    if (brandError) throw new Error(brandError.message);

    const { error: subError } = await (supabase as any)
      .from("licenses")
      .update({ status: "active" })
      .eq("brand_id", brandId);

    if (subError) throw new Error(subError.message);

    return successResult({ brandId });
  } catch (err: any) {
    console.error("[Tenant] activateTenantAction:", err.message);
    return errorResult(err.message || "Gagal mengaktifkan tenant.");
  }
}
