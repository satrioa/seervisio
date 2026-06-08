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

  // Step 1: Get authenticated user from Supabase Auth
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { user: null, error: authError?.message ?? "Not authenticated" };
  }

  // Step 2: Load profile linked to this auth user
  const profile = await getProfileByAuthUserId(supabase, authUser.id);

  if (!profile) {
    return {
      user: null,
      error: "Akun Anda belum terhubung ke profil. Silakan hubungi administrator.",
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

  if (memberships.length === 0) {
    return {
      user: null,
      error: "Anda belum memiliki akses ke brand manapun. Silakan hubungi administrator.",
    };
  }

  // Step 4: Build and return user session
  return {
    user: {
      profileId: profile.id,
      authUserId: authUser.id,
      name: profile.name,
      email: profile.email,
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

