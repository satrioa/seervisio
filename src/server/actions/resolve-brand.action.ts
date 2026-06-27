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
  try {
    const supabase = await createServerSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "/login";

    const profile = await getProfileByAuthUserId(supabase as any, user.id);
    if (!profile) return "/login";

    const { data: memberships } = await (supabase as any)
      .from("user_brand_memberships")
      .select("brand_id, role")
      .eq("profile_id", profile.id)
      .eq("is_active", true);

    if (memberships && memberships.length > 0) {
      const platformOwner = memberships.find(
        (m: any) => m.role === ROLES.PLATFORM_OWNER && m.brand_id === null
      );
      if (platformOwner) {
        return "/platform/dashboard";
      }

      const brandMembership = memberships.find(
        (m: any) => m.brand_id !== null
      );
      if (brandMembership) {
        const { data: brand } = await (supabase as any)
          .from("brands")
          .select("slug")
          .eq("id", brandMembership.brand_id)
          .maybeSingle();

        if (brand?.slug) {
          return `/${brand.slug}/panel/dashboard`;
        }
      }
    }

    return "/";
  } catch {
    return "/";
  }
}
