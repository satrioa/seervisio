import React from "react";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolveBrandContext } from "@/lib/context/resolve-brand-context";
import { LicensesPageClient } from "./licenses-page-client";
import { getLicensesForBrand, getLicenseOrdersForBrand } from "@/server/repositories/license.repository";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function LicensesPage({ params }: PageProps) {
  const { brandSlug } = await params;

  const authResult = await getCurrentUser();
  if (!authResult.user) return notFound();

  const supabase = await createServerSupabase();
  const context = await resolveBrandContext(supabase, authResult.user, brandSlug);

  const [licenses, orders] = await Promise.all([
    getLicensesForBrand(context.brandId),
    getLicenseOrdersForBrand(context.brandId),
  ]);

  const activeLicense = licenses.find(
    (l) => l.status === "active" || l.status === "trial",
  ) ?? null;

  const pastLicenses = licenses.filter(
    (l) => l.status === "expired" || l.status === "cancelled",
  );

  return (
    <LicensesPageClient
      brandSlug={brandSlug}
      activeLicense={activeLicense}
      pastLicenses={pastLicenses}
      orders={orders}
    />
  );
}
