import { TourState } from "@/types/tour";

export const DEFAULT_TOUR_STATE: TourState = {
  tour_version: 1,
  completed_at: null,
  skipped_at: null,
  last_step: 0,
  last_mission: null,
  completed_missions: [],
  dismissed_missions: [],
};

export async function loadTourState(
  userId: string,
  supabase?: any,
): Promise<TourState> {
  if (!supabase) {
    const { createServerSupabase } = await import("@/lib/supabase/server");
    supabase = await createServerSupabase();
  }
  const result = await (supabase as any)
    .from("user_preferences")
    .select("tour_state")
    .eq("user_id", userId)
    .maybeSingle();

  const { data, error } = result;

  if (error || !data || !data.tour_state) {
    return DEFAULT_TOUR_STATE;
  }

  return (data.tour_state as unknown as TourState) ?? DEFAULT_TOUR_STATE;
}

export async function saveTourState(
  userId: string,
  state: Partial<TourState>,
  supabase?: any,
): Promise<void> {
  if (!supabase) {
    const { createServerSupabase } = await import("@/lib/supabase/server");
    supabase = await createServerSupabase();
  }

  const current = await loadTourState(userId, supabase);
  const newState = { ...current, ...state };

  await (supabase as any)
    .from("user_preferences")
    .update({
      tour_state: newState as any,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);
}

export async function resetTourState(
  userId: string,
  supabase?: any,
): Promise<void> {
  await saveTourState(userId, DEFAULT_TOUR_STATE, supabase);
}