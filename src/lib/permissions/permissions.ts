/**
 * Permission keys grouped by module.
 * Used with can() and requirePermission() to check access.
 */

export const PERMISSIONS = {
  // Layout
  LAYOUT_VIEW_PANEL: "layout.view_panel",

  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",
  DASHBOARD_VIEW_ALL_BRANCHES: "dashboard.view_all_branches",

  // Services
  SERVICE_VIEW: "service.view",
  SERVICE_CREATE: "service.create",
  SERVICE_UPDATE: "service.update",
  SERVICE_UPDATE_STATUS: "service.update_status",
  SERVICE_TRANSITION: "service.transition",
  SERVICE_REOPEN: "service.reopen",
  SERVICE_ADD_SPAREPART: "service.add_sparepart",
  SERVICE_PAYMENT_CREATE: "service.payment.create",
  SERVICE_VERIFY_PICKUP: "service.verify_pickup",
  SERVICE_DELETE: "service.delete",

  // Customers
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_CREATE: "customer.create",

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

  // Payment Accounts
  PAYMENT_ACCOUNT_VIEW: "payment_account.view",

  // Store Shifts
  STORE_SHIFT_OPEN: "store_shift.open",
  STORE_SHIFT_CLOSE: "store_shift.close",
  STORE_SHIFT_VIEW: "store_shift.view",

  // Settings
  SETTINGS_MANAGE: "settings.manage",
  PAYMENT_METHOD_MANAGE: "payment.method.manage",
  PAYMENT_ACCOUNT_MANAGE: "payment.account.manage",

  // User & Access
  USER_MANAGE: "user.manage",
  BRANCH_MANAGE: "branch.manage",

  // Audit
  AUDIT_LOG_VIEW: "audit_log.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
