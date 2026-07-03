import React from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { getProfileByAuthUserId } from "@/repositories/profile.repository";
import { OnboardingPageClient } from "@/components/onboarding/onboarding-page-client";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function OnboardingPage({ params }: PageProps) {
  const { brandSlug } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  const profile = await getProfileByAuthUserId(supabase as any, user.id);
  if (!profile) {
    return <div>Profile not found</div>;
  }

  const role = (profile as any).role ?? "MASTER_ADMIN";
  const onboarding_completed = (profile as any).onboarding_completed ?? false;
  const onboarding_completed_tasks = (profile as any).onboarding_completed_tasks ?? [];

  return (
    <OnboardingPageClient
      profileId={profile.id}
      role={role}
      brandSlug={brandSlug}
      userName={profile.name}
      initialCompleted={onboarding_completed}
      initialCompletedTasks={onboarding_completed_tasks}
    />
  );
}
