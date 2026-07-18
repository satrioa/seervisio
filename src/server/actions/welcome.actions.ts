"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getActiveLicenseForProfile } from "@/server/repositories/license.repository";
import { createBrand } from "@/repositories/brand.repository";

export interface CreateCustomerBrandResult {
  brandId: number;
  brandSlug: string;
  branchId: string;
  membershipId: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/**
 * Welcome Wizard step 1+2: create the BRAND for the customer (the brand
 * does not exist before this point), plus its first branch + default
 * cash account + MASTER_ADMIN membership, and back-fill the
 * profile-scoped license with the new brand_id.
 *
 * Uses the service-role client so it works before the user has a normal
 * brand-scoped session. The membership carries profile_id so the original
 * customer stays linked.
 */
export async function createCustomerBrandAction(profileId: string, ownerName: string, companyName: string): Promise<CreateCustomerBrandResult> {
  const adminDb = createServiceRoleSupabaseClient();

  // 1. Brand
  const brand = await createBrand(adminDb as any, {
    name: companyName,
    slug: slugify(companyName) || `brand-${Date.now()}`,
    status: "active",
    owner_name: ownerName,
    owner_email: "",
  });

  // 2. First branch (default)
  const { data: branch, error: branchErr } = await (adminDb as any)
    .from("branches")
    .insert({ brand_id: brand.id, name: "Main Branch", is_active: true })
    .select("id")
    .single();
  if (branchErr || !branch) throw new Error(branchErr?.message || "Gagal membuat cabang.");

  // 3. Default cash account for the branch
  try {
    await (adminDb as any).rpc("create_default_cash_account_for_branch", {
      p_brand_id: brand.id,
      p_branch_id: branch.id,
      p_branch_name: "Main Branch",
    });
  } catch (e) {
    console.warn("[onboarding] default cash account:", e);
  }

  // 4. MASTER_ADMIN membership (linked to the original customer profile)
  const { data: membership, error: memErr } = await (adminDb as any)
    .from("user_brand_memberships")
    .insert({
      profile_id: profileId,
      brand_id: brand.id,
      role: "MASTER_ADMIN",
      is_active: true,
    })
    .select("id")
    .single();
  if (memErr || !membership) throw new Error(memErr?.message || "Gagal membuat keanggotaan.");

  // 5. Branch access (default)
  await (adminDb as any)
    .from("user_branch_access")
    .insert({
      membership_id: membership.id,
      branch_id: branch.id,
      is_active: true,
      is_default: true,
    });

  // 6. Back-fill the license (profile-scoped) with the new brand
  await backfillLicenseBrandAction(profileId, brand.id);

  return {
    brandId: brand.id,
    brandSlug: brand.slug,
    branchId: branch.id,
    membershipId: membership.id,
  };
}

/**
 * Link the customer's profile-scoped license + any profile-scoped
 * license_payments to the freshly-created brand. Idempotent.
 */
export async function backfillLicenseBrandAction(profileId: string, brandId: number): Promise<void> {
  const adminDb = createServiceRoleSupabaseClient();

  const license = await getActiveLicenseForProfile(profileId);
  if (license && !license.brand_id) {
    await (adminDb as any)
      .from("licenses")
      .update({ brand_id: brandId })
      .eq("id", (license as any).id);
  }

  // Link every profile-scoped license_payment that has no brand yet to the
  // freshly-created brand. Without this, license_payments.brand_id stays NULL
  // forever (Finance/reporting can't attribute revenue to the tenant).
  await (adminDb as any)
    .from("license_payments")
    .update({ brand_id: brandId })
    .eq("profile_id", profileId)
    .is("brand_id", null);

  // Keep the legacy brand_subscriptions mirror in sync so downstream
  // limit enforcement (branches/users) works for the new brand.
  const { data: pkg } = await (adminDb as any)
    .from("licenses")
    .select("package_id, packages:package_id(max_branches, max_users)")
    .eq("id", (license as any)?.id ?? "")
    .maybeSingle();

  if (pkg) {
    await (adminDb as any)
      .from("brand_subscriptions")
      .upsert(
        {
          brand_id: brandId,
          plan: "starter",
          status: "active",
          started_at: new Date().toISOString(),
          package_id: pkg.package_id,
          max_branches: pkg.packages?.max_branches ?? 1,
          max_users: pkg.packages?.max_users ?? 5,
        },
        { onConflict: "brand_id" },
      );
  }
}

/**
 * Mark onboarding complete for the profile (gates the dashboard).
 */
export async function completeOnboardingAction(profileId: string): Promise<void> {
  const adminDb = createServiceRoleSupabaseClient();
  await (adminDb as any)
    .from("profiles")
    .update({ onboarding_completed: true, onboarding_current_step: 0 })
    .eq("id", profileId);
}

/**
 * Upload brand logo during onboarding.
 */
export async function uploadBrandLogoAction(
  brandId: number,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) return { error: "File tidak ditemukan." };

    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      return { error: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP." };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { error: "File terlalu besar. Maksimal 5MB." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const filePath = `${brandId}/logo-${Date.now()}.${ext}`;

    const adminDb = createServiceRoleSupabaseClient();
    const { error: uploadError } = await (adminDb as any).storage
      .from("brands")
      .upload(filePath, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return { error: "Gagal mengunggah logo." };

    const { data: publicUrlData } = (adminDb as any).storage
      .from("brands")
      .getPublicUrl(filePath);

    return { url: publicUrlData?.publicUrl ?? "" };
  } catch (err: any) {
    return { error: err.message || "Gagal mengunggah logo." };
  }
}

/**
 * Save brand profile during onboarding (name, logo, theme colors).
 */
export async function saveOnboardingBrandProfileAction(
  brandId: number,
  data: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
  },
): Promise<{ error?: string }> {
  try {
    const adminDb = createServiceRoleSupabaseClient();

    // Update brand name
    const { error: nameErr } = await (adminDb as any)
      .from("brands")
      .update({ name: data.name.trim() })
      .eq("id", brandId);
    if (nameErr) return { error: "Gagal menyimpan nama brand." };

    // Upsert brand_settings
    const { data: existing } = await (adminDb as any)
      .from("brand_settings")
      .select("id")
      .eq("brand_id", brandId)
      .maybeSingle();

    if (existing) {
      await (adminDb as any)
        .from("brand_settings")
        .update({
          store_name: data.name.trim(),
          logo_url: data.logoUrl,
          theme_primary_color: data.primaryColor,
          theme_accent_color: data.accentColor,
        })
        .eq("id", existing.id);
    } else {
      await (adminDb as any)
        .from("brand_settings")
        .insert({
          brand_id: brandId,
          store_name: data.name.trim(),
          logo_url: data.logoUrl,
          theme_primary_color: data.primaryColor,
          theme_accent_color: data.accentColor,
        });
    }

    return {};
  } catch (err: any) {
    return { error: err.message || "Gagal menyimpan profil brand." };
  }
}

/**
 * Save branch name during onboarding.
 */
export async function saveOnboardingBranchAction(
  branchId: string,
  data: { name: string },
): Promise<{ error?: string }> {
  try {
    const adminDb = createServiceRoleSupabaseClient();
    const { error } = await (adminDb as any)
      .from("branches")
      .update({ name: data.name.trim() })
      .eq("id", branchId);

    if (error) return { error: "Gagal menyimpan nama cabang." };
    return {};
  } catch (err: any) {
    return { error: err.message || "Gagal menyimpan cabang." };
  }
}
