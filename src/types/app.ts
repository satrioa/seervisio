/**
 * Core application type definitions for Seervis V2.
 */

// ── Brand ──────────────────────────────────────────
export interface Brand {
  id: number;
  name: string;
  slug: string;
  status: "active" | "suspended" | "trial";
  timezone?: string;
  currency?: string;
}

// ── Branch ─────────────────────────────────────────
export interface Branch {
  id: string;
  brandId: number;
  name: string;
  code?: string;
  address?: string;
  isActive: boolean;
}

// ── User / Profile ─────────────────────────────────
export interface Profile {
  id: string;
  authUserId?: string;
  email: string;
  name: string;
  phone?: string;
  isActive: boolean;
  preferredBrandId?: number;
}

export type UserRole =
  | "PLATFORM_OWNER"
  | "MASTER_ADMIN"
  | "ADMIN"
  | "FRONTLINER"
  | "TECHNICIAN";

export interface BrandMembership {
  id: string;
  profileId: string;
  brandId: number | null;
  role: UserRole;
  isActive: boolean;
}

export interface BranchAccess {
  id: string;
  membershipId: string;
  branchId: string;
  isActive: boolean;
}

// ── Payment ────────────────────────────────────────
export type PaymentMethodType = "CASH" | "QRIS" | "TRANSFER" | "DEBIT" | "CREDIT" | "EWALLET";

export interface PaymentMethod {
  id: string;
  brandId: number;
  type: PaymentMethodType;
  name: string;
  isActive: boolean;
  mdrPercentage: number;
}

export interface PaymentAccount {
  id: string;
  brandId: number;
  branchId?: string;
  accountName: string;
  type: "CASH" | "BANK" | "QRIS" | "TRANSFER" | "DEBIT" | "OTHER";
  isCashAccount: boolean;
  currentBalance: number;
  isActive: boolean;
}

// ── Inventory ──────────────────────────────────────
export type ItemType = "PRODUCT" | "SPAREPART" | "SUPPLY" | "DEVICE_UNIT" | "OTHER";

export interface InventoryItem {
  id: string;
  brandId: number;
  categoryId?: string;
  itemType: ItemType;
  name: string;
  sku?: string;
  costPrice: number;
  sellingPrice: number;
  minStock: number;
  isActive: boolean;
}

export interface BranchStock {
  id: string;
  branchId: string;
  itemId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  lastMovementAt?: string;
}

// ── Service ────────────────────────────────────────
export type ServiceStatus =
  | "INTAKE"
  | "DIAGNOSIS"
  | "WAITING_APPROVAL"
  | "REPAIRING"
  | "QC"
  | "DONE"
  | "CANCELLED";

export interface Service {
  id: string;
  brandId: number;
  branchId: string;
  customerId?: string;
  serviceNumber: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceImei?: string;
  reportedIssue: string;
  currentStatus: ServiceStatus;
  estimatedCost: number;
  finalCost: number;
  createdAt: string;
}

// ── Finance ────────────────────────────────────────
export type FinanceEntryType =
  | "SERVICE_REVENUE"
  | "POS_REVENUE"
  | "OTHER_INCOME"
  | "MDR_EXPENSE"
  | "OPERATING_EXPENSE"
  | "STOCK_PURCHASE"
  | "COGS"
  | "CASH_ADJUSTMENT"
  | "PAYMENT_REFUND"
  | "VOID_REVERSAL";

export type FinanceDirection = "DEBIT" | "CREDIT";

export interface FinanceLedgerEntry {
  id: string;
  brandId: number;
  branchId?: string;
  ledgerDate: string;
  entryType: FinanceEntryType;
  direction: FinanceDirection;
  amount: number;
  description?: string;
}

// ── POS ────────────────────────────────────────────
export type SaleStatus = "COMPLETED" | "VOIDED" | "REFUNDED";

export interface PosSale {
  id: string;
  brandId: number;
  branchId: string;
  saleNumber: string;
  saleStatus: SaleStatus;
  grossAmount: number;
  discountAmount: number;
  mdrAmount: number;
  netAmount: number;
  soldAt: string;
}

// ── Store Shift ────────────────────────────────────
export type ShiftStatus = "OPEN" | "CLOSED" | "CANCELLED";

export interface StoreShift {
  id: string;
  brandId: number;
  branchId: string;
  shiftNumber: string;
  shiftStatus: ShiftStatus;
  openingCash: number;
  expectedClosingCash?: number;
  countedClosingCash?: number;
  cashDifference?: number;
  openedAt: string;
  closedAt?: string;
  openedBy?: string;
  closedBy?: string;
  openedByName?: string;
  closedByName?: string;
}
