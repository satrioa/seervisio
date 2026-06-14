/**
 * Server-side permission check helper.
 * Throws PermissionError if the user lacks the required permission.
 */

import type { Role } from "./roles";
import type { Permission } from "./permissions";
import { can } from "./can";
import { PermissionError } from "@/lib/utils/errors";

/**
 * Check permission and throw if not allowed.
 * Use in server actions and domain services.
 */
export function requirePermission(role: Role | null | undefined, permission: Permission): void {
  const allowed = can(role, permission);
  console.log("[permission:check]", {
    action: "requirePermission",
    role,
    permission,
    allowed,
  });
  if (!allowed) {
    throw new PermissionError("Role Anda tidak memiliki akses untuk aksi ini.");
  }
}

/**
 * Check permission and return boolean (no throw).
 * Use in UI components for conditional rendering.
 */
export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return can(role, permission);
}
