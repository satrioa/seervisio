export type ProductType = "SPAREPART" | "PRODUCT" | "UNIT";
export type ConditionType = "NONE" | "NEW" | "SECOND";
export type TrackingType = "QUANTITY" | "SERIALIZED" | "NON_STOCK";
export type MovementType =
  | "OPENING_STOCK" | "STOCK_IMPORT" | "PURCHASE"
  | "POS_SALE" | "SERVICE_USAGE"
  | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"
  | "TRANSFER_IN" | "TRANSFER_OUT"
  | "RETURN" | "VOID_REVERSAL";
export type MovementDirection = "IN" | "OUT";
export type SerialUnitStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "IN_SERVICE" | "RETURNED" | "LOST";
export type ImportBatchStatus = "DRAFT" | "PARSED" | "COMMITTED" | "FAILED" | "CANCELLED";
export type ImportRowStatus = "READY" | "NEEDS_REVIEW" | "SKIPPED" | "COMMITTED" | "ERROR";

export interface MockProductCategory {
  id: string;
  name: string;
  productType: ProductType;
}

export interface MockProduct {
  id: string;
  name: string;
  categoryId: string;
  productType: ProductType;
  brandName: string | null;
  description: string | null;
  images: string[];
  specifications: Record<string, string>;
}

export interface MockVariantGroup {
  id: string;
  productId: string;
  name: string;
  position: number;
  options: MockVariantOption[];
}

export interface MockVariantOption {
  id: string;
  groupId: string;
  value: string;
  imageUrl: string | null;
  position: number;
}

export interface MockVariant {
  id: string;
  productId: string;
  sku: string | null;
  variantName: string | null;
  attributes: Record<string, string>;
  conditionType: ConditionType;
  trackingType: TrackingType;
  costPrice: number;
  sellingPrice: number;
  isActive: boolean;
}

export interface MockStockBalance {
  variantId: string;
  branchId: string;
  branchName: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

export interface MockSerializedUnit {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  attributes: Record<string, string>;
  imei: string | null;
  serialNumber: string | null;
  externalCode: string | null;
  batteryHealth: number | null;
  conditionGrade: string | null;
  warrantyLabel: string | null;
  warrantyUntil: string | null;
  costPrice: number;
  sellingPrice: number;
  branchName: string;
  status: SerialUnitStatus;
}

export interface MockImportBatch {
  id: string;
  title: string;
  branchName: string;
  importDate: string;
  sourceType: string;
  rawText: string;
  status: ImportBatchStatus;
}

export interface MockImportRow {
  id: string;
  batchId: string;
  rawLine: string;
  sectionName: string | null;
  detectedProductType: ProductType | null;
  detectedConditionType: ConditionType | null;
  parsedBrandName: string | null;
  parsedProductName: string | null;
  parsedVariantAttributes: Record<string, string>;
  qty: number;
  imei: string | null;
  serialNumber: string | null;
  externalCode: string | null;
  batteryHealth: number | null;
  warrantyLabel: string | null;
  conditionGrade: string | null;
  notes: string | null;
  parseConfidence: number;
  status: ImportRowStatus;
  errorMessage: string | null;
}

export interface MockSparepartItem {
  id: string;
  productName: string;
  variantName: string;
  compatibleModel: string;
  quality: string;
  branchStocks: { branch: string; stock: number }[];
  costPrice: number;
  serviceSellingPrice: number;
  status: "Aktif" | "Nonaktif";
}

export interface MockProdukItem {
  id: string;
  productName: string;
  variants: string[];
  branchStocks: { branch: string; stock: number }[];
  priceRange: { min: number; max: number };
  status: "Aktif" | "Nonaktif";
}

export interface MockUnitBaruItem {
  id: string;
  productName: string;
  variantCount: number;
  availableStock: number;
  priceRange: { min: number; max: number };
  status: "Aktif" | "Nonaktif";
}
