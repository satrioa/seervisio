import React from "react";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolveBrandContext } from "@/lib/context/resolve-brand-context";
import { LicensesPageClient } from "./licenses-page-client";
import {
  getLicensesForBrand,
  getLicenseOrdersForBrand,
  getPendingOrderForBrand,
} from "@/server/repositories/license.repository";
import { cancelScheduledDowngradeAction } from "@/server/actions/license.actions";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function LicensesPage({ params }: PageProps) {
  const { brandSlug } = await params;

  const authResult = await getCurrentUser();
  if (!authResult.user) return notFound();

  const supabase = await createServerSupabase();
  const context = await resolveBrandContext(supabase, authResult.user, brandSlug);

  const [licenses, orders, pendingOrder] = await Promise.all([
    getLicensesForBrand(context.brandId),
    getLicenseOrdersForBrand(context.brandId),
    getPendingOrderForBrand(context.brandId),
  ]);

  const activeLicense = licenses.find(
    (l) => l.status === "active" || l.status === "trial" || l.status === "suspended",
  ) ?? null;

  const pastLicenses = licenses.filter(
    (l) => l.status === "expired" || l.status === "cancelled",
  );

  async function handleCancelDowngrade() {
    "use server";
    if (activeLicense?.downgrade_to_package_id) {
      await cancelScheduledDowngradeAction(brandSlug);
    }
  }

  return (
    <LicensesPageClient
      brandSlug={brandSlug}
      activeLicense={activeLicense}
      pastLicenses={pastLicenses}
      orders={orders}
      pendingOrder={pendingOrder}
      onCancelDowngrade={handleCancelDowngrade}
    />
  );
}
