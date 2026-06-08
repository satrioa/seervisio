/**
 * Require authentication — throws AuthError if not authenticated.
 * Use in server actions and API routes that require a logged-in user.
 */

import type { UserSession } from "./get-current-user";
import { AuthError } from "@/lib/utils/errors";

/**
 * Require authentication in a server action or API route.
 * Throws AuthError if not authenticated.
 * Returns the UserSession if authenticated.
 */
export async function requireAuth(): Promise<UserSession> {
  const { getCurrentUser } = await import("./get-current-user");
  const result = await getCurrentUser();

  if (!result.user) {
    throw new AuthError(result.error ?? "Authentication required");
  }

  return result.user;
}

/**
 * Require authentication and return the UserSession.
 * Returns null instead of throwing — use when you want to handle the unauthenticated case yourself.
 */
export async function requireAuthSafe(): Promise<UserSession | null> {
  const { getCurrentUser } = await import("./get-current-user");
  const result = await getCurrentUser();

  return result.user;
}
