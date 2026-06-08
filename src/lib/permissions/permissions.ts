/**
 * Permission keys grouped by module.
 * Used with can() and requirePermission() to check access.
 */

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // Services
  SERVICE_VIEW: "service.view",
  SERVICE_CREATE: "service.create",
  SERVICE_UPDATE: "service.update",
  SERVICE_TRANSITION: "service.transition",
  SERVICE_PAYMENT_CREATE: "service.payment.create",
  SERVICE_DELETE: "service.delete",

  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_MANAGE: "inventory.manage",

  // POS
  POS_VIEW: "pos.view",
  POS_SALE_CREATE: "pos.sale.create",
  POS_VOID: "pos.void",
  POS_REFUND: "pos.refund",

  // Finance
  FINANCE_VIEW: "finance.view",

  // Store Shifts
  STORE_SHIFT_OPEN: "store_shift.open",
  STORE_SHIFT_CLOSE: "store_shift.close",
  STORE_SHIFT_VIEW: "store_shift.view",

  // Settings
  SETTINGS_MANAGE: "settings.manage",
  PAYMENT_METHOD_MANAGE: "payment.method.manage",
  PAYMENT_ACCOUNT_MANAGE: "payment.account.manage",
  USER_MANAGE: "user.manage",
  BRANCH_MANAGE: "branch.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
