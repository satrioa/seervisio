import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCheckoutSessionAction } from "@/server/actions/checkout.actions";
import { getPlatformPaymentMethodsAction } from "@/server/actions/license.actions";
import { CheckoutClient } from "./checkout-client";

interface CheckoutPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { token } = await searchParams;
  const result = await getCheckoutSessionAction(token);

  if (!result.success || !result.data) {
    redirect("/pricing");
  }

  // Load auth + profile using the same reliable getCurrentUser() used by
  // /license. Falls back to the session's bound profileId if auth fails.
  let profile: {
    id: string;
    business_name: string | null;
    name: string;
    phone: string | null;
  } | null = null;
  let email: string | null = null;
  let ownerName: string | null = null;

  const authResult = await getCurrentUser();
  if (authResult.user) {
    email = authResult.user.email;
    const adminDb = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient();
    const { data: p } = await (adminDb as any)
      .from("profiles")
      .select("id, business_name, name, phone")
      .eq("auth_user_id", authResult.user.authUserId)
      .maybeSingle();
    if (p) {
      profile = p;
      // Fetch owner name from brand (profile.name is now brand name)
      const { data: membership } = await (adminDb as any)
        .from("user_brand_memberships")
        .select("brands!user_brand_memberships_brand_id_fkey(owner_name)")
        .eq("profile_id", p.id)
        .not("brand_id", "is", null)
        .limit(1)
        .maybeSingle();
      ownerName = membership?.brands?.owner_name ?? null;
    }
  }

  // Fallback: if auth failed but the session has a bound profile.
  if (!profile && result.data.profileId) {
    try {
      const adminDb = (await import("@/lib/supabase/admin")).createServiceRoleSupabaseClient();
      const { data: p } = await (adminDb as any)
        .from("profiles")
        .select("id, business_name, name, phone")
        .eq("id", result.data.profileId)
        .maybeSingle();
      if (p) profile = p;
    } catch {
      // ignore
    }
  }

  // Fetch active platform payment methods from Console settings
  const paymentMethodsResult = await getPlatformPaymentMethodsAction();
  const paymentMethods = paymentMethodsResult.success ? paymentMethodsResult.data! : [];

  return (
    <Suspense fallback={null}>
      <CheckoutClient session={result.data} profile={profile} email={email} ownerName={ownerName} paymentMethods={paymentMethods} />
    </Suspense>
  );
}
