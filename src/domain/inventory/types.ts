export type ItemType = "PRODUCT" | "SPAREPART" | "ACCESSORY" | "CONSUMABLE" | "SUPPLY" | "DEVICE_UNIT" | "OTHER";

export type TrackingType = "QUANTITY" | "SERIALIZED";

export interface InventoryItemInput {
  brandId: number;
  categoryId?: string;
  itemType: ItemType;
  name: string;
  sku?: string;
  barcode?: string;
  variantName?: string;
  variantAttributes?: Record<string, any>;
  trackingType?: TrackingType;
  description?: string;
  unitName?: string;
  costPrice: number;
  sellingPrice: number;
  minStock?: number;
  trackStock?: boolean;
  isActive?: boolean;
}

export interface InventoryMovementInput {
  brandId: number;
  branchId: string;
  itemId: string;
  direction: "IN" | "OUT";
  movementType: string;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}

export interface StockSummary {
  itemId: string;
  itemName: string;
  sku?: string;
  itemType: ItemType;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  stockStatus: "OK" | "LOW" | "OUT";
}
