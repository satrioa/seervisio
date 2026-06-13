import React from "react";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolveBrandContext } from "@/lib/context/resolve-brand-context";
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
    const allBranches = await getBranchesByBrandId(supabase as any, context.brandId);
    const accessibleBranches = allBranches
      .filter((branch) => context.accessibleBranchIds.includes(branch.id))
      .map((branch) => ({ id: branch.id, name: branch.name }));

    return (
      <PanelLayoutClient
        brandSlug={brandSlug}
        branches={accessibleBranches}
        initialBranchId={context.branchId}
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
