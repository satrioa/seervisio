/**
 * Get the currently authenticated user from Supabase session.
 * Returns the user session with profile, memberships, and accessible brands.
 * Brand/branch context is NOT resolved here — that happens in the layout/page.
 */

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getProfileByAuthUserId,
  getMembershipsForProfile,
} from "@/repositories/profile.repository";

export interface UserSession {
  /** Profile UUID from public.profiles */
  profileId: string;
  /** Auth user UUID from auth.users */
  authUserId: string;
  /** Profile name */
  name: string;
  /** Profile email */
  email: string;
  /** Account type: 'customer' or 'platform' */
  accountType: 'customer' | 'platform';
  /** All brand memberships (brand_id + role) */
  memberships: Array<{
    id: string;
    brandId: number;
    role: string;
    preferredBranchId: string | null;
  }>;
}

export type AuthResult =
  | { user: UserSession; error: null }
  | { user: null; error: string };

/**
 * Get the current authenticated user session.
 * This is a server-only function — call it from server components, server actions, or API routes.
 *
 * Flow:
 * 1. Validate Supabase session via auth.getUser()
 * 2. Load profile linked to auth user
 * 3. Load brand memberships for the profile
 * 4. Return UserSession with all non-brand-specific info
 */
export async function getCurrentUser(): Promise<AuthResult> {
  const supabase = await createServerSupabase();

  // Step 0: Check session
  const { data: sessionData } = await supabase.auth.getSession();
  console.log("[getCurrentUser] auth.getSession result:", {
    hasSession: Boolean(sessionData?.session),
    expiresAt: sessionData?.session?.expires_at,
    userId: sessionData?.session?.user?.id,
  });

  // Step 1: Get authenticated user from Supabase Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  console.log("[getCurrentUser] auth.getUser result:", {
    hasUser: Boolean(authUser),
    userId: authUser?.id,
    email: authUser?.email,
    authError: authError?.message,
  });

  if (authError || !authUser) {
    return { user: null, error: authError?.message ?? "Not authenticated" };
  }

  // Step 2: Load profile linked to this auth user
  console.log("[getCurrentUser] about to query profiles with auth_user_id:", authUser.id);
  let profile = await getProfileByAuthUserId(supabase, authUser.id);

  // Fallback: if SSR client profile query returns null but we have a session,
  // try with a directly-authenticated client using the access token.
  if (!profile && sessionData?.session?.access_token) {
    console.log("[getCurrentUser] SSR client returned null profile. Trying fallback with session access_token...");
    const { createClient } = await import("@supabase/supabase-js");
    const authedClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        },
      }
    );
    profile = await getProfileByAuthUserId(authedClient, authUser.id);
    console.log("[getCurrentUser] Fallback profile query result:", Boolean(profile));
  }

  if (!profile) {
    return {
      user: null,
      error: `Akun Anda belum terhubung ke profil. (authUserId: ${authUser.id}, email: ${authUser.email})`,
    };
  }

  if (!profile.is_active) {
    return {
      user: null,
      error: "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.",
    };
  }

  // Step 3: Load brand memberships
  const memberships = await getMembershipsForProfile(supabase, profile.id);

  // Step 4: Build and return user session
  // Platform users can exist without brand memberships.
  // NEW customer accounts (post-refactor) ALSO start with NO brand
  // memberships — the brand is created LATER, in the Welcome Wizard,
  // after the license is ACTIVE. They must still authenticate so they
  // can reach /checkout and /license. A brand-less customer is a
  // VALID pre-onboarding state, NOT an error here; the brand-scoped
  // panel enforces membership on its own.
  const accountType: 'customer' | 'platform' = (profile.account_type || 'customer') as 'customer' | 'platform';

  return {
    user: {
      profileId: profile.id,
      authUserId: authUser.id,
      name: profile.name,
      email: profile.email,
      accountType,
      memberships: memberships.map((m) => ({
        id: m.id,
        brandId: m.brand_id!,
        role: m.role,
        preferredBranchId: (m as any).preferred_branch_id,
      })),
    },
    error: null,
  };
}

