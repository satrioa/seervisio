import React from "react";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolveBrandContext } from "@/lib/context/resolve-brand-context";
import { getBranchesByBrandId } from "@/repositories/branch.repository";
import { PanelLayoutClient } from "./panel-layout-client";
import { ROLE_LABELS } from "@/lib/permissions/roles";

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
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Tidak dapat mengakses panel</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {authResult.error}
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Resolve brand context
  const supabase = await createServerSupabase();

  try {
    const context = await resolveBrandContext(supabase, authResult.user, brandSlug);

    // Step 3: Get branches for this brand
    const branches = await getBranchesByBrandId(supabase, context.brandId);

    // Step 4: Render the layout with context
    return (
      <PanelLayoutClient
        brandSlug={brandSlug}
        userName={context.name}
        userEmail={context.email}
        role={context.role}
        roleLabel={ROLE_LABELS[context.role] ?? context.role}
        brandName={context.brandName}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        currentBranchId={context.branchId}
      >
        {children}
      </PanelLayoutClient>
    );
  } catch (error) {
    // If brand not found, return 404
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      notFound();
    }

    // For other errors (permission, etc.), show an error state
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
}
