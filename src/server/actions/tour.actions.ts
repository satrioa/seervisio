"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { TourState } from "@/types/tour";

const DEFAULT_TOUR_STATE: TourState = {
  tour_version: 1,
  completed_at: null,
  skipped_at: null,
  last_step: 0,
  last_mission: null,
  completed_missions: [],
  dismissed_missions: [],
};

export async function loadTourStateAction(userId: string): Promise<TourState> {
  const supabase = await createServerSupabase();
  const { data, error } = await (supabase as any)
    .from("user_preferences")
    .select("tour_state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || !data.tour_state) {
    return DEFAULT_TOUR_STATE;
  }

  return (data.tour_state as unknown as TourState) ?? DEFAULT_TOUR_STATE;
}

export async function saveTourStateAction(userId: string, state: Partial<TourState>): Promise<void> {
  const supabase = await createServerSupabase();
  
  const current = await loadTourStateAction(userId);
  const newState = { ...current, ...state };

  await (supabase as any)
    .from("user_preferences")
    .update({ 
      tour_state: newState as any,
      updated_at: new Date().toISOString() 
    })
    .eq("user_id", userId);
}