/**
 * Permission checking logic.
 * Defines which roles have which permissions.
 * Higher roles inherit all permissions of lower roles.
 */

import type { Role } from "./roles";
import type { Permission } from "./permissions";

/**
 * Role-to-permission mapping.
 * Only explicit grants are listed; inheritance is handled by can().
 * Higher roles inherit all permissions from lower-ranked roles.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  PLATFORM_OWNER: [
    "layout.view_panel",
    "dashboard.view", "dashboard.view_all_branches",
    "service.view", "service.create", "service.update", "service.update_status", "service.transition",
    "service.reopen", "service.add_sparepart",
    "service.payment.create", "service.verify_pickup", "service.delete",
    "customer.view", "customer.create",
    "inventory.view", "inventory.manage",
    "pos.view", "pos.sale.create", "pos.void", "pos.refund",
    "finance.view",
    "payment_account.view",
    "store_shift.view", "store_shift.open", "store_shift.close",
    "settings.manage", "payment.method.manage", "payment.account.manage",
    "user.manage", "branch.manage",
    "audit_log.view",
  ],
  MASTER_ADMIN: [
    "layout.view_panel",
    "dashboard.view", "dashboard.view_all_branches",
    "service.view", "service.create", "service.update", "service.update_status", "service.transition",
    "service.reopen", "service.add_sparepart",
    "service.payment.create", "service.verify_pickup", "service.delete",
    "customer.view", "customer.create",
    "inventory.view", "inventory.manage",
    "pos.view", "pos.sale.create", "pos.void", "pos.refund",
    "finance.view",
    "payment_account.view",
    "store_shift.view", "store_shift.open", "store_shift.close",
    "settings.manage", "payment.method.manage", "payment.account.manage",
    "user.manage",
    "audit_log.view",
  ],
  ADMIN: [
    "layout.view_panel",
    "dashboard.view",
    "service.view", "service.create", "service.update", "service.update_status", "service.transition",
    "service.add_sparepart",
    "service.payment.create", "service.verify_pickup",
    "customer.view", "customer.create",
    "inventory.view", "inventory.manage",
    "pos.view", "pos.sale.create", "pos.void", "pos.refund",
    "finance.view",
    "payment_account.view",
    "store_shift.view", "store_shift.open", "store_shift.close",
    "settings.manage",
  ],
  FRONTLINER: [
    "layout.view_panel",
    "dashboard.view",
    "service.view", "service.create", "service.update", "service.update_status",
    "service.payment.create", "service.verify_pickup",
    "customer.view", "customer.create",
    "inventory.view",
    "payment_account.view",
    "pos.view", "pos.sale.create",
    "store_shift.view", "store_shift.open", "store_shift.close",
  ],
  TECHNICIAN: [
    "layout.view_panel",
    "dashboard.view",
    "service.view", "service.create", "service.update_status",
    "service.add_sparepart",
    "customer.view", "customer.create",
    "inventory.view", "inventory.manage",
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
