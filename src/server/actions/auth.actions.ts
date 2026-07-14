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
  /** Opaque checkout-session token, if the visitor started checkout first. */
  checkoutSessionToken?: string | null;
}

export async function signupAction(
  input: SignupInput,
): Promise<ActionResult<{ profileId: string }>> {
  try {
    const adminDb = createServiceRoleSupabaseClient();

    // NOTE: Registration creates the CUSTOMER ACCOUNT ONLY.
    // No brand / branch / membership / license is created here.
    // The brand is created later, in the Welcome Wizard, AFTER the
    // license becomes ACTIVE. See checkout.actions.ts / license flow.

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

    // 2. Create profile (account only)
    const { data: profile, error: profileError } = await (adminDb as any)
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        email: input.email,
        name: input.fullName,
        is_active: true,
        account_type: 'customer',
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

    // 3. If the visitor started checkout before registering, bind the
    // session to the new account so the selected package survives.
    if (input.checkoutSessionToken) {
      try {
        const { bindCheckoutSessionToProfileAction } = await import("@/server/actions/checkout.actions");
        await bindCheckoutSessionToProfileAction(input.checkoutSessionToken, profile.id);
      } catch (e) {
        console.warn("[auth] Failed to bind checkout session:", e);
      }
    }

    return successResult({ profileId: profile.id });
  } catch (err: any) {
    console.error("[auth] signupAction error:", err.message);
    return errorResult("An unexpected error occurred. Please try again.");
  }
}

/**
 * Resolve where a freshly-registered / logged-in customer should land.
 * Customers without an active license are routed to the License Center
 * (never the dashboard). This replaces the old onboarding-only gate.
 */
export async function resolveCustomerHomeAction(): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return successResult({ redirectTo: "/login" });

    const profile = await getProfileByAuthUserId(supabase as any, user.id) as any;
    if (!profile) return successResult({ redirectTo: "/onboarding" });

    if (profile.account_type === 'platform') {
      return successResult({ redirectTo: "/platform/dashboard" });
    }

    const { getActiveLicenseForProfile } = await import("@/server/repositories/license.repository");
    const license = await getActiveLicenseForProfile(profile.id);
    const { isDashboardAllowed } = await import("@/lib/customer-journey/license-status");

    if (!isDashboardAllowed(license)) {
      return successResult({ redirectTo: "/license" });
    }
    if (!profile.onboarding_completed) {
      return successResult({ redirectTo: "/welcome" });
    }
    return successResult({ redirectTo: "/" });
  } catch (err: any) {
    console.error("[auth] resolveCustomerHomeAction:", err.message);
    return errorResult("Gagal menentukan halaman tujuan.");
  }
}

export async function checkAuthAction(): Promise<ActionResult<{
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  canAccessDashboard: boolean;
  redirectTo: string;
}>> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return successResult({
        isAuthenticated: false,
        needsOnboarding: false,
        canAccessDashboard: false,
        redirectTo: "/login",
      });
    }

    const profile = await getProfileByAuthUserId(supabase as any, user.id) as any;

    if (!profile) {
      return successResult({
        isAuthenticated: true,
        needsOnboarding: true,
        canAccessDashboard: false,
        redirectTo: "/onboarding",
      });
    }

    // Platform users skip the customer license/onboarding flow entirely.
    if (profile.account_type === 'platform') {
      return successResult({
        isAuthenticated: true,
        needsOnboarding: false,
        canAccessDashboard: true,
        redirectTo: "/platform/dashboard",
      });
    }

    // Customer: dashboard is gated by an ACTVE LICENSE (never before).
    const { getActiveLicenseForProfile } = await import("@/server/repositories/license.repository");
    const { isDashboardAllowed } = await import("@/lib/customer-journey/license-status");
    const license = await getActiveLicenseForProfile(profile.id);
    const licensed = isDashboardAllowed(license);

    if (!licensed) {
      // No active license -> License Center, regardless of onboarding.
      return successResult({
        isAuthenticated: true,
        needsOnboarding: profile.onboarding_completed ? false : true,
        canAccessDashboard: false,
        redirectTo: "/license",
      });
    }

    if (!profile.onboarding_completed) {
      return successResult({
        isAuthenticated: true,
        needsOnboarding: true,
        canAccessDashboard: false,
        redirectTo: "/welcome",
      });
    }

    // Licensed + onboarded -> operational dashboard.
    return successResult({
      isAuthenticated: true,
      needsOnboarding: false,
      canAccessDashboard: true,
      redirectTo: "/",
    });
  } catch {
    return successResult({
      isAuthenticated: false,
      needsOnboarding: false,
      canAccessDashboard: false,
      redirectTo: "/login",
    });
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
