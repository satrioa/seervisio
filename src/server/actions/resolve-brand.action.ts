"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getProfileByAuthUserId } from "@/repositories/profile.repository";
import { ROLES } from "@/lib/permissions/roles";

export async function resolveFirstBrandSlugAction(): Promise<string | null> {
  try {
    const supabase = await createServerSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await getProfileByAuthUserId(supabase as any, user.id);
    if (!profile) return null;

    const { data: membership } = await (supabase as any)
      .from("user_brand_memberships")
      .select("brand_id")
      .eq("profile_id", profile.id)
      .not("brand_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (!membership?.brand_id) return null;

    const { data: brand } = await (supabase as any)
      .from("brands")
      .select("slug")
      .eq("id", membership.brand_id)
      .maybeSingle();

    return brand?.slug ?? null;
  } catch {
    return null;
  }
}

export async function resolveLoginRedirectAction(): Promise<string> {
  return "/";
}
