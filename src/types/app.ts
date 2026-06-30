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
export type ItemType = "PRODUCT" | "SPAREPART" | "ACCESSORY" | "CONSUMABLE" | "SUPPLY" | "DEVICE_UNIT" | "OTHER";
export type TrackingType = "QUANTITY" | "SERIALIZED";
export type UserFacingItemType = "SPAREPART" | "PRODUCT" | "UNIT";

export function resolveUserFacingItemType(itemType: string): UserFacingItemType {
  if (itemType === "SPAREPART") return "SPAREPART";
  if (itemType === "PRODUCT" || itemType === "ACCESSORY" || itemType === "CONSUMABLE") return "PRODUCT";
  if (itemType === "DEVICE_UNIT") return "UNIT";
  return "SPAREPART";
}

export function mapToItemType(userType: UserFacingItemType): string {
  if (userType === "SPAREPART") return "SPAREPART";
  if (userType === "PRODUCT") return "PRODUCT";
  if (userType === "UNIT") return "DEVICE_UNIT";
  return "SPAREPART";
}

export function resolveTrackingTypeSync(itemType: string, unitCondition?: string | null): TrackingType {
  if (itemType === "DEVICE_UNIT" && unitCondition === "SECOND") return "SERIALIZED";
  return "QUANTITY";
}

export interface InventoryItem {
  id: string;
  brandId: number;
  categoryId?: string;
  categoryName?: string;
  itemType: ItemType;
  name: string;
  sku?: string;
  barcode?: string;
  variantName?: string;
  variantAttributes?: Record<string, any>;
  trackingType: TrackingType;
  description?: string;
  unitName: string;
  costPrice: number;
  averageCost: number;
  sellingPrice: number;
  minStock: number;
  isActive: boolean;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  branchId?: string;
  branchName?: string;
  createdAt: string;
  updatedAt: string;
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

// ── Inventory Movement ─────────────────────────────
export type InventoryMovementType =
  | "OPENING_STOCK"
  | "PURCHASE"
  | "PURCHASE_IN"
  | "SERVICE_USAGE"
  | "SERVICE_RETURN"
  | "POS_SALE"
  | "POS_RETURN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "DAMAGE"
  | "DAMAGE_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "STOCK_OPNAME_ADJUSTMENT"
  | "SERIALIZED_UNIT_IN"
  | "SERIALIZED_UNIT_OUT";

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  OPENING_STOCK: "Stok Awal",
  PURCHASE: "Belanja Stok",
  PURCHASE_IN: "Belanja Stok",
  SERVICE_USAGE: "Penggunaan Servis",
  SERVICE_RETURN: "Retur Servis",
  POS_SALE: "Penjualan POS",
  POS_RETURN: "Retur POS",
  ADJUSTMENT_IN: "Penyesuaian Masuk",
  ADJUSTMENT_OUT: "Penyesuaian Keluar",
  DAMAGE: "Rusak/Hilang",
  DAMAGE_OUT: "Rusak/Hilang",
  TRANSFER_IN: "Transfer Masuk",
  TRANSFER_OUT: "Transfer Keluar",
  STOCK_OPNAME_ADJUSTMENT: "Stock Opname",
  SERIALIZED_UNIT_IN: "Unit Serial Masuk",
  SERIALIZED_UNIT_OUT: "Unit Serial Keluar",
};

export interface InventoryMovement {
  id: string;
  brandId: number;
  branchId: string;
  itemId: string;
  movementType: string;
  direction: "IN" | "OUT";
  quantity: number;
  unitSnapshot: string;
  stockBefore: number;
  stockAfter: number;
  unitCostSnapshot: number | null;
  totalCostSnapshot: number;
  sellingPriceSnapshot: number;
  totalPriceSnapshot: number;
  referenceType: string | null;
  referenceId: string | null;
  referenceLabel: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  itemName?: string;
  itemSku?: string;
  itemBarcode?: string;
  itemVariantName?: string;
  branchName?: string;
  createdByName?: string;
}

// ── Purchase ───────────────────────────────────────
export type PurchaseStatus = "PAID" | "VOIDED";

export interface Purchase {
  id: string;
  brandId: number;
  branchId: string;
  purchaseNumber: string;
  supplierName?: string;
  paymentAccountId?: string;
  purchaseDate: string;
  totalAmount: number;
  status: PurchaseStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  branchName?: string;
  paymentAccountName?: string;
  createdByName?: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  itemId: string;
  itemNameSnapshot: string;
  variantSnapshot?: Record<string, any>;
  skuSnapshot?: string;
  barcodeSnapshot?: string;
  quantity: number;
  unitSnapshot: string;
  unitCostSnapshot: number;
  subtotal: number;
}

// ── Serialized Unit ────────────────────────────────
export type SerializedUnitStatus =
  | "READY_STOCK"
  | "RESERVED"
  | "SOLD"
  | "IN_SERVICE"
  | "DEFECTIVE"
  | "RETURNED"
  | "ARCHIVED";

export type ConditionGrade = "A" | "B" | "C" | "D";

export const CONDITION_GRADE_LABELS: Record<string, string> = {
  A: "A / Mulus",
  B: "B / Normal pemakaian",
  C: "C / Banyak minus",
  D: "D / Rusak / kanibal",
};

export const SERIALIZED_UNIT_STATUS_LABELS: Record<string, string> = {
  READY_STOCK: "Tersedia",
  RESERVED: "Dipesan",
  SOLD: "Terjual",
  IN_SERVICE: "Dalam Servis",
  DEFECTIVE: "Rusak",
  RETURNED: "Dikembalikan",
  ARCHIVED: "Diarsipkan",
};

export interface SerializedUnit {
  id: string;
  brandId: number;
  branchId: string;
  inventoryItemId: string;
  serialNumber: string | null;
  imei: string | null;
  barcode: string | null;
  batteryHealth: number | null;
  conditionGrade: string | null;
  physicalConditionNotes: string | null;
  functionalConditionNotes: string | null;
  accessoriesIncluded: string | null;
  purchaseCost: number | null;
  sellingPrice: number | null;
  status: SerializedUnitStatus;
  sourceType: string | null;
  sourceReferenceId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined
  branchName?: string | null;
  itemName?: string | null;
  itemSku?: string | null;
  itemVariantName?: string | null;
  itemTrackingType?: string | null;
}

// ── Enhanced Sparepart (with snapshots) ────────────
export interface SparepartSnapshot {
  id: string;
  serviceId: string;
  inventoryItemId: string;
  quantity: number;
  unitCost: number | null;
  sellingPrice: number | null;
  isReturned: boolean;
  // Snapshots
  itemNameSnapshot: string | null;
  variantSnapshot: Record<string, any> | null;
  skuSnapshot: string | null;
  barcodeSnapshot: string | null;
  serializedUnitId: string | null;
  imeiSnapshot: string | null;
  serialNumberSnapshot: string | null;
  batteryHealthSnapshot: number | null;
  conditionGradeSnapshot: string | null;
  conditionNotesSnapshot: string | null;
  unitSnapshot: string | null;
  unitCostSnapshot: number | null;
  sellingPriceSnapshot: number | null;
  totalCostSnapshot: number | null;
  totalPriceSnapshot: number | null;
  notes: string | null;
  createdAt: string;
  // Serialized unit info
  serializedUnit?: SerializedUnit | null;
}

// ── Store Shift ────────────────────────────────────
export type ShiftStatus = "OPEN" | "CLOSED" | "CANCELLED";

export type ClosingReason = "MANUAL" | "AUTO_CLOSE" | "SYSTEM";

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
  autoClosed?: boolean;
  closingReason?: ClosingReason;
  scheduledOpenTime?: string;
  scheduledCloseTime?: string;
  lateOpenMinutes?: number;
  earlyOpenMinutes?: number;
  lateCloseMinutes?: number;
}
