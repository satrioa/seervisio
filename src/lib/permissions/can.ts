/**
 * Permission checking logic.
 * Defines which roles have which permissions.
 */

import type { Role } from "./roles";
import type { Permission } from "./permissions";

/**
 * Role-to-permission mapping.
 * Higher roles inherit all permissions of lower roles.
 * Only explicit grants are listed; inheritance is handled by can().
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  PLATFORM_OWNER: [
    "dashboard.view",
    "service.view", "service.create", "service.update", "service.transition", "service.payment.create", "service.delete",
    "inventory.view", "inventory.manage",
    "pos.view", "pos.sale.create", "pos.void", "pos.refund",
    "finance.view",
    "store_shift.view", "store_shift.open", "store_shift.close",
    "settings.manage", "payment.method.manage", "payment.account.manage", "user.manage", "branch.manage",
  ],
  MASTER_ADMIN: [
    "dashboard.view",
    "service.view", "service.create", "service.update", "service.transition", "service.payment.create", "service.delete",
    "inventory.view", "inventory.manage",
    "pos.view", "pos.sale.create", "pos.void", "pos.refund",
    "finance.view",
    "store_shift.view", "store_shift.open", "store_shift.close",
    "settings.manage", "payment.method.manage", "payment.account.manage", "user.manage",
  ],
  ADMIN: [
    "dashboard.view",
    "service.view", "service.create", "service.update", "service.transition", "service.payment.create",
    "inventory.view", "inventory.manage",
    "pos.view", "pos.sale.create", "pos.void", "pos.refund",
    "finance.view",
    "store_shift.view", "store_shift.open", "store_shift.close",
  ],
  FRONTLINER: [
    "dashboard.view",
    "service.view", "service.create", "service.update",
    "inventory.view",
    "pos.view", "pos.sale.create",
    "store_shift.view",
  ],
  TECHNICIAN: [
    "dashboard.view",
    "service.view", "service.update", "service.transition",
    "inventory.view",
    "store_shift.view",
  ],
};

const ROLE_HIERARCHY: Record<Role, number> = {
  PLATFORM_OWNER: 0,
  MASTER_ADMIN: 1,
  ADMIN: 2,
  FRONTLINER: 3,
  TECHNICIAN: 4,
};

/**
 * Check if a role has a specific permission.
 * Permissions cascade down: higher roles inherit all permissions of lower roles.
 */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;

  // Check the role's own permissions
  const ownPermissions = ROLE_PERMISSIONS[role] ?? [];
  if (ownPermissions.includes(permission)) return true;

  // Check inherited permissions from lower-ranked roles
  const currentRank = ROLE_HIERARCHY[role];
  if (currentRank === undefined) return false;

  for (const [lowerRole, lowerRank] of Object.entries(ROLE_HIERARCHY)) {
    if (lowerRank > currentRank) {
      const lowerPermissions = ROLE_PERMISSIONS[lowerRole as Role] ?? [];
      if (lowerPermissions.includes(permission)) return true;
    }
  }

  return false;
}
