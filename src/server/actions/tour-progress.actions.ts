"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { successResult, errorResult, type ActionResult } from "./action-helper";
import type { TourProgressRow } from "@/features/tour/tour.types";

export async function getTourProgressAction(
  tourName: string,
): Promise<ActionResult<TourProgressRow | null>> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await (supabase as any)
      .from("tour_progress")
      .select("*")
      .eq("tour_name", tourName)
      .maybeSingle();

    if (error) return errorResult(error.message);
    return successResult(data ? (data as TourProgressRow) : null);
  } catch (err: any) {
    return errorResult(err.message || "Gagal memuat progres tur.");
  }
}

export async function saveTourProgressAction(input: {
  tourName: string;
  tourVersion: number;
  currentStep: number;
  completed?: boolean;
  skipped?: boolean;
}): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerSupabase();
    const { data: existing } = await (supabase as any)
      .from("tour_progress")
      .select("id")
      .eq("tour_name", input.tourName)
      .maybeSingle();

    const payload: any = {
      tour_version: input.tourVersion,
      current_step: input.currentStep,
    };
    if (input.completed) {
      payload.completed = true;
      payload.completed_at = new Date().toISOString();
    }
    if (input.skipped) {
      payload.skipped = true;
    }

    if (existing?.id) {
      const { error } = await (supabase as any)
        .from("tour_progress")
        .update(payload)
        .eq("id", existing.id);
      if (error) return errorResult(error.message);
    } else {
      const { error } = await (supabase as any)
        .from("tour_progress")
        .insert({ tour_name: input.tourName, ...payload });
      if (error) return errorResult(error.message);
    }
    return successResult(undefined);
  } catch (err: any) {
    return errorResult(err.message || "Gagal menyimpan progres tur.");
  }
}

export async function resetTourProgressAction(
  tourName: string,
): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerSupabase();
    const { error } = await (supabase as any)
      .from("tour_progress")
      .delete()
      .eq("tour_name", tourName);
    if (error) return errorResult(error.message);
    return successResult(undefined);
  } catch (err: any) {
    return errorResult(err.message || "Gagal mengatur ulang tur.");
  }
}
