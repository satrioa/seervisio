import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getActiveLicenseForProfile } from "@/server/repositories/license.repository";
import { WelcomeWizardClient } from "./welcome-wizard-client";

export default async function WelcomePage() {
  const authResult = await getCurrentUser();
  if (!authResult.user) redirect("/login?redirect=/welcome");

  const profileId = authResult.user.profileId;

  // The Welcome Wizard only runs for customers with an ACTIVE license.
  const license = await getActiveLicenseForProfile(profileId);
  if (!license) redirect("/license");

  // Already finished onboarding → operational dashboard.
  const { createServiceRoleSupabaseClient } = await import(
    "@/lib/supabase/admin"
  );
  const adminDb = createServiceRoleSupabaseClient();
  const { data: profile } = await (adminDb as any)
    .from("profiles")
    .select("onboarding_completed, onboarding_current_step, name, business_name")
    .eq("id", profileId)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/");

  // Fetch brand + branch from the membership created during signup
  const { data: membership } = await (adminDb as any)
    .from("user_brand_memberships")
    .select("brand_id, brands!user_brand_memberships_brand_id_fkey(id, name, slug)")
    .eq("profile_id", profileId)
    .not("brand_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const brand = membership?.brands as { id: number; name: string; slug: string } | null;

  // Fetch default branch
  let branchId: string | null = null;
  if (brand) {
    const { data: branch } = await (adminDb as any)
      .from("branches")
      .select("id")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    branchId = branch?.id ?? null;
  }

  const packageLabel =
    (license as any).packages?.name ?? "Paket Anda";

  return (
    <Suspense fallback={null}>
      <WelcomeWizardClient
        profileId={profileId}
        brandId={brand?.id ?? null}
        brandSlug={brand?.slug ?? null}
        branchId={branchId}
        ownerName={profile?.name ?? authResult.user.name}
        businessName={brand?.name ?? profile?.business_name ?? ""}
        packageName={packageLabel}
      />
    </Suspense>
  );
}
