/**
 * Centralized StoreGuard — determines which actions require an active store shift.
 *
 * OPERATIONAL actions require the store to be open.
 * ADMINISTRATIVE / CONFIGURATION actions never require the store to be open.
 */

export const StoreAction = {
  /* ══ OPERATIONAL — require store open ══ */

  // Service
  SERVICE_CREATE: "SERVICE_CREATE",
  SERVICE_UPDATE: "SERVICE_UPDATE",
  SERVICE_STATUS_UPDATE: "SERVICE_STATUS_UPDATE",
  SERVICE_PICKUP: "SERVICE_PICKUP",
  SERVICE_SPAREPART: "SERVICE_SPAREPART",
  SERVICE_TECHNICIAN: "SERVICE_TECHNICIAN",
  SERVICE_TIMELINE: "SERVICE_TIMELINE",

  // POS
  POS_CREATE: "POS_CREATE",
  POS_PAYMENT: "POS_PAYMENT",
  POS_REFUND: "POS_REFUND",
  POS_VOID: "POS_VOID",

  // Inventory — stock movements
  STOCK_IN: "STOCK_IN",
  STOCK_OUT: "STOCK_OUT",
  STOCK_MUTATION: "STOCK_MUTATION",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  STOCK_OPNAME: "STOCK_OPNAME",
  INVENTORY_TRANSACTION: "INVENTORY_TRANSACTION",

  // Finance — operational
  FINANCE_CASH_IN: "FINANCE_CASH_IN",
  FINANCE_CASH_OUT: "FINANCE_CASH_OUT",
  FINANCE_SHIFT_CASH: "FINANCE_SHIFT_CASH",
  FINANCE_EXPENSE: "FINANCE_EXPENSE",
  FINANCE_PETTY_CASH: "FINANCE_PETTY_CASH",

  // Shift
  SHIFT_CLOSE: "SHIFT_CLOSE",
  SHIFT_END: "SHIFT_END",

  /* ══ ADMINISTRATIVE / CONFIGURATION — no store required ══ */

  // System
  SYSTEM_SETTING_EDIT: "SYSTEM_SETTING_EDIT",
  BRAND_PROFILE_EDIT: "BRAND_PROFILE_EDIT",

  // Management
  BRANCH_MANAGE: "BRANCH_MANAGE",
  ACCOUNT_MANAGE: "ACCOUNT_MANAGE",
  ROLE_MANAGE: "ROLE_MANAGE",
  CUSTOMER_VIEW: "CUSTOMER_VIEW",
  TECHNICIAN_VIEW: "TECHNICIAN_VIEW",
  SUPPLIER_MANAGE: "SUPPLIER_MANAGE",

  // Finance — setup
  PAYMENT_ACCOUNT_EDIT: "PAYMENT_ACCOUNT_EDIT",
  PAYMENT_METHOD_EDIT: "PAYMENT_METHOD_EDIT",
  EXPENSE_CATEGORY_EDIT: "EXPENSE_CATEGORY_EDIT",
  FINANCIAL_CONFIG: "FINANCIAL_CONFIG",

  // Inventory — master data
  INVENTORY_MASTER_EDIT: "INVENTORY_MASTER_EDIT",
  CATEGORY_MANAGE: "CATEGORY_MANAGE",
  UNIT_MANAGE: "UNIT_MANAGE",
  BRAND_MANAGE: "BRAND_MANAGE",
  DEVICE_TYPE_MANAGE: "DEVICE_TYPE_MANAGE",

  // Reports
  REPORT_VIEW: "REPORT_VIEW",
  AUDIT_LOG_VIEW: "AUDIT_LOG_VIEW",

  // Dashboard
  DASHBOARD_VIEW: "DASHBOARD_VIEW",
} as const;

export type StoreAction = (typeof StoreAction)[keyof typeof StoreAction];

/**
 * Set of actions that require the store to be open.
 */
const STORE_OPEN_REQUIRED: ReadonlySet<string> = new Set([
  StoreAction.SERVICE_CREATE,
  StoreAction.SERVICE_UPDATE,
  StoreAction.SERVICE_STATUS_UPDATE,
  StoreAction.SERVICE_PICKUP,
  StoreAction.SERVICE_SPAREPART,
  StoreAction.SERVICE_TECHNICIAN,
  StoreAction.SERVICE_TIMELINE,
  StoreAction.POS_CREATE,
  StoreAction.POS_PAYMENT,
  StoreAction.POS_REFUND,
  StoreAction.POS_VOID,
  StoreAction.STOCK_IN,
  StoreAction.STOCK_OUT,
  StoreAction.STOCK_MUTATION,
  StoreAction.STOCK_ADJUSTMENT,
  StoreAction.STOCK_OPNAME,
  StoreAction.INVENTORY_TRANSACTION,
  StoreAction.FINANCE_CASH_IN,
  StoreAction.FINANCE_CASH_OUT,
  StoreAction.FINANCE_SHIFT_CASH,
  StoreAction.FINANCE_EXPENSE,
  StoreAction.FINANCE_PETTY_CASH,
  StoreAction.SHIFT_CLOSE,
  StoreAction.SHIFT_END,
]);

/**
 * Returns true if the given action requires an active store shift.
 */
export function isOperationalAction(action: string): boolean {
  return STORE_OPEN_REQUIRED.has(action);
}

/**
 * Returns true if the given action does NOT require the store to be open
 * (i.e., it is administrative / configuration).
 */
export function isAdministrativeAction(action: string): boolean {
  return !STORE_OPEN_REQUIRED.has(action);
}

/**
 * Human-readable label for UI tooltips.
 */
export function getStoreGuardTooltip(): string {
  return "Buka toko terlebih dahulu.";
}

/**
 * Human-readable label for dashboard warning.
 */
export function getStoreClosedWarning(): string {
  return "Toko belum dibuka hari ini";
}
