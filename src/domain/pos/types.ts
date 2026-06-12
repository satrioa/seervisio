// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
/**
 * POS / Penjualan Produk domain types.
 * Supports: accessories, spareparts retail, device units, trade-in, split payment.
 */

/* ─── Item / Product Types ─── */

/** Extended product type that POS supports. DEVICE_UNIT requires serialized unit tracking. */
export type PosProductType = "ACCESSORY" | "SPAREPART" | "DEVICE_UNIT" | "CONSUMABLE" | "OTHER";

/* ─── Inventory Item Unit (Serialized Device) ─── */

export type DeviceUnitSource = "PURCHASE" | "TRADE_IN" | "MANUAL" | "RETURN";
export type DeviceUnitStatus = "AVAILABLE" | "SOLD" | "RESERVED" | "DEFECTIVE" | "RETURNED";

export interface InventoryItemUnit {
  id: string;
  brandId: number;
  branchId: string;
  inventoryItemId: string;
  imei?: string;
  serialNumber?: string;
  deviceBrand?: string;
  deviceModel?: string;
  storage?: string;
  color?: string;
  conditionGrade?: string;
  batteryHealth?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  warrantyUntil?: string;
  source: DeviceUnitSource;
  status: DeviceUnitStatus;
  note?: string;
  createdAt: string;
}

/* ─── Cart / Line Items ─── */

/** Item in the POS cart before submission. */
export interface PosCartItem {
  /** Unique client-side key for cart management. */
  cartKey: string;
  /** inventory_items.id */
  inventoryItemId: string;
  itemType: PosProductType;
  productName: string;
  sku?: string;
  /** For quantity-based items (ACCESSORY, SPAREPART, etc.) */
  quantity: number;
  /** For serialized DEVICE_UNIT — must be 1 */
  unitPrice: number;
  costPrice?: number;
  discountAmount: number;
  /** Selected inventory_item_unit for DEVICE_UNIT */
  selectedUnit?: CartDeviceUnit;
}

export interface CartDeviceUnit {
  unitId: string;
  imei?: string;
  serialNumber?: string;
  storage?: string;
  color?: string;
  conditionGrade?: string;
  batteryHealth?: string;
  sellingPrice: number;
}

/* ─── Trade-in ─── */

export type TradeInStatus = "APPRAISED" | "ACCEPTED" | "IN_STOCK" | "SOLD" | "REJECTED" | "RETURNED";

export interface PosTradeIn {
  deviceBrand: string;
  deviceModel: string;
  storage?: string;
  color?: string;
  imei?: string;
  serialNumber?: string;
  conditionGrade?: string;
  batteryHealth?: string;
  appraisalValue: number;
  notes?: string;
}

/* ─── Payment ─── */

export interface PosPaymentInput {
  paymentMethodId: string;
  paymentAccountId: string;
  amount: number;
}

/* ─── Sale Input / Result ─── */

export interface CreatePosSaleInput {
  brandId: number;
  branchId: string;
  customerId?: string;
  customerQuickCreate?: {
    name: string;
    phone?: string;
  };
  cartItems: PosCartItem[];
  tradeIn?: PosTradeIn;
  payments: PosPaymentInput[];
  discountAmount: number;
  notes?: string;
}

export interface PosSaleResult {
  posSaleId: string;
  saleNumber: string;
  grossAmount: number;
  discountAmount: number;
  tradeInValue: number;
  totalAfterTradeIn: number;
  paidAmount: number;
  changeAmount: number;
  mdrAmount: number;
  netAmount: number;
  status: string;
}

/* ─── Product Search Result ─── */

export interface PosProductResult {
  id: string;
  name: string;
  sku?: string;
  itemType: PosProductType;
  categoryName?: string;
  sellingPrice: number;
  costPrice: number;
  availableStock: number;
  /** For DEVICE_UNIT: count of available serialized units */
  availableUnitsCount: number;
  unit?: string;
  isActive: boolean;
}
