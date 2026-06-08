/**
 * Role constants matching user_brand_memberships.role CHECK constraint.
 */

export const ROLES = {
  PLATFORM_OWNER: "PLATFORM_OWNER",
  MASTER_ADMIN: "MASTER_ADMIN",
  ADMIN: "ADMIN",
  FRONTLINER: "FRONTLINER",
  TECHNICIAN: "TECHNICIAN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  PLATFORM_OWNER: "Platform Owner",
  MASTER_ADMIN: "Master Admin",
  ADMIN: "Admin",
  FRONTLINER: "Frontliner",
  TECHNICIAN: "Technician",
};

export const ROLE_HIERARCHY: Role[] = [
  "PLATFORM_OWNER",
  "MASTER_ADMIN",
  "ADMIN",
  "FRONTLINER",
  "TECHNICIAN",
];

/**
 * Check if a role has equal or higher rank than another.
 * Platform Owner is highest (index 0), Technician is lowest.
 */
export function isRoleAtLeast(role: Role, minimum: Role): boolean {
  const roleIndex = ROLE_HIERARCHY.indexOf(role);
  const minIndex = ROLE_HIERARCHY.indexOf(minimum);
  if (roleIndex === -1 || minIndex === -1) return false;
  return roleIndex <= minIndex;
}
