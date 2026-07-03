"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getProfileByAuthUserId } from "@/repositories/profile.repository";

async function getServerClient() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function getOnboardingProgressAction() {
  try {
    const { supabase, user } = await getServerClient();
    const profile = await getProfileByAuthUserId(supabase as any, user.id);
    if (!profile) return { success: false as const, error: "Profile not found" };

    return {
      success: true as const,
      data: {
        onboarding_completed: (profile as any).onboarding_completed ?? false,
        onboarding_current_step: (profile as any).onboarding_current_step ?? 0,
        onboarding_completed_tasks: (profile as any).onboarding_completed_tasks ?? [],
        onboarding_earned_badges: (profile as any).onboarding_earned_badges ?? [],
      },
    };
  } catch {
    return { success: false as const, error: "Failed to fetch onboarding progress" };
  }
}

export async function updateOnboardingStepAction(step: number) {
  try {
    const { supabase, user } = await getServerClient();
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ onboarding_current_step: step })
      .eq("auth_user_id", user.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to update step" };
  }
}

export async function completeOnboardingTaskAction(taskId: string) {
  try {
    const { supabase, user } = await getServerClient();

    const profile = await getProfileByAuthUserId(supabase as any, user.id);
    if (!profile) return { success: false as const, error: "Profile not found" };

    const currentTasks: string[] = (profile as any).onboarding_completed_tasks ?? [];
    if (currentTasks.includes(taskId)) {
      return { success: true as const };
    }

    const updatedTasks = [...currentTasks, taskId];
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ onboarding_completed_tasks: updatedTasks })
      .eq("auth_user_id", user.id);

    if (error) return { success: false as const, error: error.message };
    return { success: true as const, data: updatedTasks };
  } catch {
    return { success: false as const, error: "Failed to complete task" };
  }
}

export async function completeOnboardingAction() {
  try {
    const { supabase, user } = await getServerClient();
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_current_step: 0,
      })
      .eq("auth_user_id", user.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to complete onboarding" };
  }
}

export async function restartOnboardingAction() {
  try {
    const { supabase, user } = await getServerClient();
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        onboarding_completed: false,
        onboarding_current_step: 0,
        onboarding_completed_tasks: [],
        onboarding_earned_badges: [],
      })
      .eq("auth_user_id", user.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to restart onboarding" };
  }
}
