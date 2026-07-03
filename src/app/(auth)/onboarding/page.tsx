import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getProfileByAuthUserId } from "@/repositories/profile.repository";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileByAuthUserId(supabase as any, user.id) as any;

  // Already completed onboarding? redirect to dashboard
  if (profile?.onboarding_completed) {
    const { data: membership } = await (supabase as any)
      .from("user_brand_memberships")
      .select("brand_id")
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .not("brand_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (membership) {
      const { data: brand } = await (supabase as any)
        .from("brands")
        .select("slug")
        .eq("id", membership.brand_id)
        .maybeSingle();

      if (brand?.slug) {
        redirect(`/${brand.slug}/panel/dashboard`);
      }
    }

    redirect("/");
  }

  return <OnboardingWizard profileId={profile?.id} />;
}
