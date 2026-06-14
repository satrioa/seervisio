import React from "react";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolveBrandContext } from "@/lib/context/resolve-brand-context";
import { resolveActiveOperator } from "@/lib/auth/active-operator";
import { getBranchesByBrandId } from "@/repositories/branch.repository";
import { PanelLayoutClient } from "./panel-layout-client";

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

  // Step 2: Resolve brand context (validates access)
  const supabase = await createServerSupabase();

  try {
    const context = await resolveBrandContext(supabase, authResult.user, brandSlug);

    // Step 3: Check active operator override (staff quick-switch)
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

    return (
      <PanelLayoutClient
        brandSlug={brandSlug}
        branches={accessibleBranches}
        initialBranchId={effectiveContext.branchId}
        role={effectiveContext.role}
        canAccessAllBranches={effectiveContext.canAccessAllBranches}
        authUserId={authResult.user.authUserId}
        activeOperatorId={effectiveContext.activeOperatorId}
        activeOperatorName={effectiveContext.activeOperatorName}
        userName={effectiveContext.name}
        userEmail={effectiveContext.email}
      >
        {children}
      </PanelLayoutClient>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
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
