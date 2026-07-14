import React from "react";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolveBrandContext } from "@/lib/context/resolve-brand-context";
import { resolveActiveOperator } from "@/lib/auth/active-operator";
import { getImpersonationCookie } from "@/lib/auth/impersonation";
import { getBranchesByBrandId } from "@/repositories/branch.repository";
import { PanelLayoutClient } from "./panel-layout-client";
import { ROLES } from "@/lib/permissions/roles";
import { getActiveLicenseForBrand } from "@/server/repositories/license.repository";

interface PanelLayoutProps {
  children: React.ReactNode;
  params: Promise<{ brandSlug: string }>;
}

export default async function PanelLayout({
  children,
  params,
}: PanelLayoutProps) {
  const { brandSlug } = await params;

  // Step 1: Authenticate
  const authResult = await getCurrentUser();

  if (!authResult.user) {
    redirect("/login");
  }

  // Step 2: Detect impersonation
  const impersonatingBrandSlug = await getImpersonationCookie();
  const isPlatformOwner = authResult.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER
  );
  const isImpersonating = isPlatformOwner && impersonatingBrandSlug === brandSlug;

  // Step 3: Resolve brand context (validates access)
  const supabase = await createServerSupabase();

  try {
    const context = await resolveBrandContext(supabase, authResult.user, brandSlug);

    // Step 4: Check active operator override (staff quick-switch)
    const activeOperator = await resolveActiveOperator(supabase, context.brandId, context.profileId);

    let effectiveContext = context;
    if (activeOperator) {
      effectiveContext = await resolveBrandContext(supabase, authResult.user, brandSlug, activeOperator);
    }

    const allBranches = await getBranchesByBrandId(supabase as any, effectiveContext.brandId);
    const accessibleBranches = effectiveContext.canAccessAllBranches
      ? allBranches.map((branch) => ({ id: branch.id, name: branch.name }))
      : allBranches
          .filter((branch) => effectiveContext.accessibleBranchIds.includes(branch.id))
          .map((branch) => ({ id: branch.id, name: branch.name }));

    // Step 5: Fetch license status
    let activeLicense: { status: string; expires_at: string | null; is_trial: boolean } | null = null;
    try {
      const lic = await getActiveLicenseForBrand(effectiveContext.brandId);
      if (lic) {
        activeLicense = {
          status: lic.status,
          expires_at: lic.expires_at,
          is_trial: lic.is_trial,
        };
      }
    } catch {
      // License check failure should not block access
    }

    // Step 6: Fetch onboarding progress
    const { data: onboardingData } = await (supabase as any)
      .from("profiles")
      .select("onboarding_completed, onboarding_completed_tasks")
      .eq("id", effectiveContext.profileId)
      .maybeSingle();

    const onboardingCompleted = onboardingData?.onboarding_completed ?? false;
    const onboardingCompletedTasks = onboardingData?.onboarding_completed_tasks ?? [];

    return (
      <PanelLayoutClient
        brandSlug={brandSlug}
        brandId={effectiveContext.brandId}
        brandName={effectiveContext.brandName}
        brandLogoUrl={effectiveContext.brandLogoUrl}
        branches={accessibleBranches}
        initialBranchId={effectiveContext.branchId}
        role={effectiveContext.role}
        canAccessAllBranches={effectiveContext.canAccessAllBranches}
        authUserId={authResult.user.authUserId}
        activeOperatorId={effectiveContext.activeOperatorId}
        activeOperatorName={effectiveContext.activeOperatorName}
        userName={effectiveContext.name}
        userEmail={effectiveContext.email}
        userAvatarUrl={effectiveContext.avatarUrl}
        isImpersonating={isImpersonating}
        profileId={effectiveContext.profileId}
        onboardingCompleted={onboardingCompleted}
        onboardingCompletedTasks={onboardingCompletedTasks}
        activeLicense={activeLicense}
      >
        {children}
      </PanelLayoutClient>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      // Brand slug may have changed — try to resolve from user's memberships
      const brandIds = authResult.user.memberships
        .map((m) => m.brandId)
        .filter((id): id is number => id !== null && id !== undefined);

      if (brandIds.length > 0) {
        const { data: fallbackBrand } = await (supabase as any)
          .from("brands")
          .select("slug")
          .in("id", brandIds)
          .limit(1)
          .maybeSingle();

        if (fallbackBrand?.slug) {
          const targetPath = `/${fallbackBrand.slug}/panel/dashboard`;
          redirect(targetPath);
        }
      }

      notFound();
    }
    // Permission error or other — show access denied
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Akses ditolak</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Terjadi kesalahan"}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
