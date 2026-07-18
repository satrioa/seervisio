import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function WelcomePage() {
  const authResult = await getCurrentUser();
  if (!authResult.user) redirect("/login?redirect=/welcome");

  const profileId = authResult.user.profileId;

  // Already finished onboarding → dashboard.
  // NOTE: Do NOT redirect to /license when no license — that creates a
  // /license <-> /welcome redirect loop. The guided tour launches from the
  // dashboard regardless of license state.
  const { createServiceRoleSupabaseClient } = await import("@/lib/supabase/admin");
  const adminDb = createServiceRoleSupabaseClient();
  const { data: profile } = await (adminDb as any)
    .from("profiles")
    .select("onboarding_completed, name, business_name")
    .eq("id", profileId)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/");

  // Resolve brand slug from membership.
  const { data: membership } = await (adminDb as any)
    .from("user_brand_memberships")
    .select("brand_id, brands!user_brand_memberships_brand_id_fkey(id, name, slug)")
    .eq("profile_id", profileId)
    .not("brand_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const brand = membership?.brands as { id: number; name: string; slug: string } | null;
  const brandSlug = brand?.slug ?? null;

  if (!brandSlug) {
    // No brand yet — something went wrong during signup. Redirect to pricing.
    redirect("/pricing");
  }

  // Launch the guided onboarding tour from the dashboard.
  redirect(`/${brandSlug}/panel/dashboard`);
}
