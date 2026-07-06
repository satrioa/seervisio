"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { successResult, errorResult, type ActionResult } from "./action-helper";
import { getProfileByAuthUserId } from "@/repositories/profile.repository";

export interface SignupInput {
  fullName: string;
  companyName: string;
  email: string;
  password: string;
}

export async function signupAction(
  input: SignupInput,
): Promise<ActionResult<{ profileId: string }>> {
  try {
    const adminDb = createServiceRoleSupabaseClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await (adminDb as any).auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.fullName },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        return errorResult("An account with this email already exists.");
      }
      return errorResult("Failed to create account. Please try again.");
    }

    const authUserId = authData.user.id;

    // 2. Create profile
    const { data: profile, error: profileError } = await (adminDb as any)
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        email: input.email,
        name: input.fullName,
        is_active: true,
        onboarding_completed: false,
        onboarding_current_step: 0,
      })
      .select("id")
      .single();

    if (profileError) {
      // Rollback auth user
      await (adminDb as any).auth.admin.deleteUser(authUserId);
      return errorResult("Failed to create profile. Please try again.");
    }

    // 3. Create brand
    const { data: brand, error: brandError } = await (adminDb as any)
      .from("brands")
      .insert({
        name: input.companyName,
        slug: input.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        status: "active",
        owner_name: input.fullName,
        owner_email: input.email,
      })
      .select("id")
      .single();

    if (brandError) {
      await (adminDb as any).auth.admin.deleteUser(authUserId);
      return errorResult("Failed to create brand. Please try again.");
    }

    const brandId = brand.id;

    // 4. Create brand settings
    await (adminDb as any)
      .from("brand_settings")
      .insert({ brand_id: brandId, store_name: input.companyName })
      .maybeSingle();

    // 5. Create brand subscription (free trial)
    await (adminDb as any)
      .from("brand_subscriptions")
      .insert({
        brand_id: brandId,
        plan: "free",
        status: "active",
        started_at: new Date().toISOString(),
      });

    // 6. Create user_brand_membership as MASTER_ADMIN
    const { data: membership } = await (adminDb as any)
      .from("user_brand_memberships")
      .insert({
        profile_id: profile.id,
        brand_id: brandId,
        role: "MASTER_ADMIN",
        is_active: true,
      })
      .select("id")
      .single();

    if (membership) {
      // 7. Create default branch
      const { data: branch } = await (adminDb as any)
        .from("branches")
        .insert({
          brand_id: brandId,
          name: "Main Branch",
          is_active: true,
        })
        .select("id")
        .single();

      if (branch && membership) {
        // Grant branch access
        await (adminDb as any)
          .from("user_branch_access")
          .insert({
            membership_id: membership.id,
            branch_id: branch.id,
            is_active: true,
            is_default: true,
          });
      }
    }

    return successResult({ profileId: profile.id });
  } catch (err: any) {
    console.error("[auth] signupAction error:", err.message);
    return errorResult("An unexpected error occurred. Please try again.");
  }
}

export async function checkAuthAction(): Promise<ActionResult<{
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  redirectTo: string;
}>> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return successResult({ isAuthenticated: false, needsOnboarding: false, redirectTo: "/login" });
    }

    const profile = await getProfileByAuthUserId(supabase as any, user.id) as any;

    if (!profile) {
      return successResult({ isAuthenticated: true, needsOnboarding: true, redirectTo: "/onboarding" });
    }

    if (!profile.onboarding_completed) {
      return successResult({ isAuthenticated: true, needsOnboarding: true, redirectTo: "/onboarding" });
    }

    // Profile exists and onboarding complete
    return successResult({ isAuthenticated: true, needsOnboarding: false, redirectTo: "/" });
  } catch {
    return successResult({ isAuthenticated: false, needsOnboarding: false, redirectTo: "/login" });
  }
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return errorResult("Not authenticated");

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_current_step: 0,
      })
      .eq("auth_user_id", user.id);

    if (error) return errorResult("Failed to complete onboarding.");

    return successResult(null as any);
  } catch (err: any) {
    return errorResult("Failed to complete onboarding.");
  }
}

export async function landingLogoutAction(): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    return successResult(undefined);
  } catch (err: any) {
    return errorResult(err.message ?? "Gagal logout.");
  }
}
