"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { loadTourState, saveTourState, resetTourState } from "@/lib/tour/storage";

async function getServerClient() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function getOnboardingProgressAction() {
  try {
    const { user } = await getServerClient();
    const state = await loadTourState(user.id);

    return {
      success: true as const,
      data: {
        onboarding_completed: !!state.completed_at,
        onboarding_current_step: state.last_step,
        onboarding_completed_tasks: state.completed_missions,
        onboarding_earned_badges: [],
      },
    };
  } catch {
    return { success: false as const, error: "Failed to fetch onboarding progress" };
  }
}

export async function updateOnboardingStepAction(step: number) {
  try {
    const { user } = await getServerClient();
    await saveTourState(user.id, { last_step: step });
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to update step" };
  }
}

export async function completeOnboardingTaskAction(taskId: string) {
  try {
    const { user } = await getServerClient();
    const state = await loadTourState(user.id);

    if (state.completed_missions.includes(taskId)) {
      return { success: true as const, data: state.completed_missions };
    }

    const updatedTasks = [...state.completed_missions, taskId];
    await saveTourState(user.id, { completed_missions: updatedTasks });

    return { success: true as const, data: updatedTasks };
  } catch {
    return { success: false as const, error: "Failed to complete task" };
  }
}

export async function completeOnboardingAction() {
  try {
    const { user } = await getServerClient();
    await saveTourState(user.id, {
      completed_at: new Date().toISOString(),
      last_step: 0,
    });
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to complete onboarding" };
  }
}

export async function restartOnboardingAction() {
  try {
    const { user } = await getServerClient();
    await resetTourState(user.id);
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to restart onboarding" };
  }
}
