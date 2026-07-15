import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getProfileByAuthUserId } from "@/repositories/profile.repository";

export default async function OnboardingPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfileByAuthUserId(supabase as any, user.id) as any;
  if (!profile) {
    redirect("/login");
  }

  // Onboarding now requires an active license.
  // No license yet → send to license plans.
  // Has license but not active → send to license center.
  // License active + onboarding completed → dashboard.
  // License active + onboarding not done → welcome wizard.
  const { getActiveLicenseForProfile } = await import("@/server/repositories/license.repository");
  const license = await getActiveLicenseForProfile(profile.id);
  const { isDashboardAllowed } = await import("@/lib/customer-journey/license-status");

  if (!license) {
    redirect("/license");
  }

  if (!isDashboardAllowed(license)) {
    redirect("/panel/licenses");
  }

  if (profile.onboarding_completed) {
    redirect("/");
  }

  redirect("/welcome");
}
