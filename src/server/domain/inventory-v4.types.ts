export type StockType = "SPAREPART" | "PRODUCT" | "UNIT";

export type UnitCondition = "NEW" | "SECOND";

export type UnitStatus =
  | "READY_STOCK"
  | "RESERVED"
  | "SOLD"
  | "IN_SERVICE"
  | "DEFECTIVE"
  | "RETURNED"
  | "ARCHIVED";

export type MovementDirection = "IN" | "OUT" | "ADJUST";

export type MovementType =
  | "OPENING_STOCK"
  | "PURCHASE_IN"
  | "STOCK_OPNAME_IN"
  | "STOCK_OPNAME_OUT"
  | "SERVICE_USAGE"
  | "POS_SALE"
  | "UNIT_IN"
  | "UNIT_STATUS_CHANGE"
  | "UNIT_SOLD"
  | "VOID_REVERSAL"
  | "ADJUSTMENT";

export interface CreateVariantInput {
  name: string;
  attributes?: Record<string, string>;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  unit?: string;
  minStock?: number;
  initialStock?: number;
  costPrice?: number;
  sellingPrice?: number;
}

export interface SparepartCommonInput {
  brandId: number;
  branchId: string;
  categoryId?: string | null;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  unit?: string;
  variants: CreateVariantInput[];
}

export interface CreateSparepartV4Input extends SparepartCommonInput {
  productKind: "SPAREPART";
}

export interface CreateProductV4Input extends SparepartCommonInput {
  productKind: "PRODUCT";
}

export interface CreateUnitBaruV4Input extends SparepartCommonInput {
  productKind: "UNIT";
  conditionType: "NEW";
}

export interface CreateUnitSecondRowInput {
  variantId?: string | null;
  unitAttributes?: Record<string, string>;
  imei?: string | null;
  serialNumber?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  batteryHealth?: number | null;
  conditionGrade?: string | null;
  physicalConditionNotes?: string | null;
  functionalConditionNotes?: string | null;
  accessoriesIncluded?: string | null;
  warrantyUntil?: string | null;
  warrantyNotes?: string | null;
  purchaseCost?: number;
  sellingPrice?: number;
  status?: UnitStatus;
}

export interface CreateUnitSecondV4Input {
  brandId: number;
  branchId: string;
  categoryId?: string | null;
  existingProductId?: string | null;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  variants?: CreateVariantInput[];
  units: CreateUnitSecondRowInput[];
}

export interface UpdateProductV4Input {
  productId: string;
  name: string;
  categoryId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface UpdateVariantV4Input {
  variantId: string;
  name: string;
  attributes?: Record<string, string>;
  sku?: string | null;
  barcode?: string | null;
  unit?: string;
  minStock?: number;
  costPrice?: number;
  sellingPrice?: number;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface CreateVariantV4Input {
  productId: string;
  name: string;
  attributes?: Record<string, string>;
  sku?: string | null;
  barcode?: string | null;
  unit?: string;
  minStock?: number;
  costPrice?: number;
  sellingPrice?: number;
  imageUrl?: string | null;
  initialStock?: number;
}

export interface UpdateUnitSecondV4Input {
  unitId: string;
  unitAttributes?: Record<string, string>;
  imei?: string | null;
  serialNumber?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  batteryHealth?: number | null;
  conditionGrade?: string | null;
  physicalConditionNotes?: string | null;
  functionalConditionNotes?: string | null;
  accessoriesIncluded?: string | null;
  warrantyUntil?: string | null;
  warrantyNotes?: string | null;
  purchaseCost?: number;
  sellingPrice?: number;
}

export interface ListProductsV4Params {
  brandId?: number;
  branchId?: string | null;
  productKind?: StockType;
  conditionType?: UnitCondition | null;
  search?: string;
  isActive?: boolean | null;
  page?: number;
  pageSize?: number;
}

export interface ListUnitSecondV4Params {
  brandId?: number;
  branchId?: string | null;
  status?: UnitStatus | null;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductV4Row {
  id: string;
  brandId: number;
  branchId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  productKind: string;
  conditionType: string | null;
  categoryId: string | null;
  unit: string;
  appearsInPos: boolean;
  serviceUsageEnabled: boolean;
  isActive: boolean;
  variantsCount: number;
  totalStock: number;
  priceMin: number;
  priceMax: number;
  createdAt: string;
  updatedAt: string;
}

export interface VariantV4Row {
  id: string;
  productId: string;
  name: string;
  attributes: Record<string, string>;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  unit: string;
  minStock: number;
  costPrice: number;
  sellingPrice: number;
  averageCost: number;
  currentStock: number;
  reservedStock: number;
  isActive: boolean;
}

export interface ProductDetailV4Row {
  product: ProductV4Row;
  variants: VariantV4Row[];
  unitSecondSummary?: {
    total: number;
    readyStock: number;
    reserved: number;
    sold: number;
    inService: number;
    defective: number;
    returned: number;
    archived: number;
  };
}

export interface UnitSecondV4Row {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  unitAttributes: Record<string, string> | null;
  imei: string | null;
  serialNumber: string | null;
  barcode: string | null;
  imageUrl: string | null;
  batteryHealth: number | null;
  conditionGrade: string | null;
  physicalConditionNotes: string | null;
  functionalConditionNotes: string | null;
  accessoriesIncluded: string | null;
  warrantyUntil: string | null;
  warrantyNotes: string | null;
  purchaseCost: number;
  sellingPrice: number;
  status: string;
  branchId: string;
  createdAt: string;
}

export interface CreateMovementV4Input {
  brandId: number;
  branchId: string;
  direction: MovementDirection;
  movementType: string;
  productId: string | null;
  variantId: string | null;
  unitId: string | null;
  quantity: number;
  stockBefore: number | null;
  stockAfter: number | null;
  unitStatusBefore: string | null;
  unitStatusAfter: string | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceLabel: string | null;
  notes: string | null;
}

export interface CategoryV4Row {
  id: string;
  brandId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  stockType: string | null;
  itemType: string;
  sortOrder: number;
}

export interface CreateCategoryV4Input {
  brandId: number;
  name: string;
  description?: string | null;
  itemType: string;
}

export interface UpdateCategoryV4Input {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface ListInventoryMovementsV4Params {
  brandId?: number;
  branchId?: string | null;
  productId?: string | null;
  movementType?: string | null;
  page?: number;
  pageSize?: number;
}

export interface InventoryMovementV4Row {
  id: string;
  brandId: number;
  branchId: string;
  direction: string;
  movementType: string;
  productId: string | null;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  unitId: string | null;
  quantity: number;
  stockBefore: number | null;
  stockAfter: number | null;
  unitStatusBefore: string | null;
  unitStatusAfter: string | null;
  referenceType: string | null;
  referenceLabel: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

/* ─── Purchase types ─── */

export interface PurchaseStockV4ItemInput {
  variantId: string;
  quantity: number;
  unitCost: number;
  unitSellingPrice?: number | null;
  note?: string | null;
}

export interface CreateStockPurchaseV4Input {
  branchId: string;
  paymentAccountId: string;
  supplierName?: string | null;
  supplierId?: string | null;
  purchaseDate?: string;
  notes?: string | null;
  items: PurchaseStockV4ItemInput[];
}

export interface StockPurchaseV4Result {
  purchaseId: string;
  purchaseNumber: string;
  totalAmount: number;
  itemCount: number;
  movementIds: string[];
}

export interface PurchaseVariantSearchRow {
  variantId: string;
  variantName: string;
  productId: string;
  productName: string;
  productKind: string;
  conditionType: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStock: number;
  currentStock: number;
  reservedStock: number;
  stockAvailable: number;
  attributes: Record<string, string>;
  categoryId: string | null;
}

export interface ListStockPurchaseV4Params {
  brandId?: number;
  branchId?: string | null;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface StockPurchaseV4Row {
  id: string;
  branchId: string;
  purchaseNumber: string;
  purchaseDate: string;
  supplierName: string | null;
  supplierId: string | null;
  totalAmount: number;
  paymentAccountId: string;
  paymentAccountName: string | null;
  status: string;
  notes: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
}

export interface StockPurchaseItemV4Row {
  id: string;
  purchaseId: string;
  productId: string;
  variantId: string;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  attributesSnapshot: Record<string, string>;
  skuSnapshot: string | null;
  barcodeSnapshot: string | null;
  unitSnapshot: string;
  quantity: number;
  unitCost: number;
  unitSellingPriceSnapshot: number;
  subtotalAmount: number;
  movementId: string | null;
}

/* ─── Stock opname types ─── */

export interface StockOpnameVariantRow {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  attributes: Record<string, string>;
  productKind: string;
  conditionType: string | null;
  categoryId: string | null;
  categoryName: string | null;
  sku: string | null;
  barcode: string | null;
  currentStock: number;
  minStock: number;
}

export interface StockOpnameAdjustmentInput {
  variantId: string;
  physicalStock: number;
}

export interface SubmitStockOpnameV4Input {
  branchId: string;
  notes: string;
  adjustments: StockOpnameAdjustmentInput[];
}

export interface StockOpnameResult {
  adjustedCount: number;
  skippedCount: number;
  movementIds: string[];
}

export interface ListStockOpnameVariantsV4Params {
  branchId?: string;
  productKind?: "SPAREPART" | "PRODUCT" | "UNIT";
  categoryId?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
}

/* ─── Service sparepart usage types ─── */

export interface ServiceSparepartSearchRow {
  serviceId: string;
  serviceNumber: string;
  customerName: string | null;
  deviceBrand: string | null;
  deviceModel: string | null;
  currentStatus: string | null;
  brandId: number;
  branchId: string;
}

export interface UseSparepartForServiceV4Input {
  branchId: string;
  serviceId: string;
  notes?: string | null;
  items: ServiceSparepartUsageItemInput[];
}

export interface ServiceSparepartUsageItemInput {
  variantId: string;
  quantity: number;
}

export interface ServiceSparepartUsageResult {
  usageCount: number;
  movementIds: string[];
  usageIds: string[];
}

export interface ReturnSparepartFromServiceInput {
  branchId: string;
  serviceId: string;
  usageId: string;
}

export interface ReturnSparepartFromServiceResult {
  usageId: string;
  movementId: string;
  restoredQuantity: number;
  stockAfter: number;
}

export interface ServiceSparepartUsageV4Row {
  id: string;
  serviceId: string;
  productId: string;
  variantId: string;
  quantity: number;
  costPriceSnapshot: number;
  sellingPriceSnapshot: number;
  itemNameSnapshot: string;
  variantNameSnapshot: string | null;
  attributesSnapshot: Record<string, string>;
  movementId: string | null;
  createdBy: string;
  createdAt: string;
}

/* ─── POS V4 types ─── */

export type PosCartItemTypeV4 = "PRODUCT_QUANTITY" | "UNIT_NEW_QUANTITY" | "UNIT_SECOND_SERIALIZED";

export interface PosProductV4Row {
  productId: string;
  name: string;
  productKind: string;
  conditionType: string | null;
  categoryId: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  fallbackUnitImageUrl?: string | null;
  unit: string;
  appearsInPos: boolean;
  variants: PosVariantV4Row[];
  productIds?: string[];
}

export interface PosVariantV4Row {
  variantId: string;
  variantName: string;
  attributes: Record<string, string>;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  costPrice: number;
  sellingPrice: number;
  minStock: number;
  currentStock: number;
  unit: string;
}

export interface PosUnitSecondOptionV4Row {
  unitId: string;
  productId: string;
  variantId: string | null;
  variantName: string | null;
  unitAttributes: Record<string, string> | null;
  imei: string | null;
  serialNumber: string | null;
  batteryHealth: number | null;
  conditionGrade: string | null;
  imageUrl: string | null;
  purchaseCost: number;
  sellingPrice: number;
  status: string;
}

export interface PosCartItemV4 {
  tempId: string;
  type: PosCartItemTypeV4;
  productId: string;
  variantId: string | null;
  unitId: string | null;
  nameSnapshot: string;
  variantSnapshot: string | null;
  attributesSnapshot: Record<string, string> | null;
  imeiSnapshot: string | null;
  serialNumberSnapshot: string | null;
  batteryHealthSnapshot: number | null;
  conditionSnapshot: string | null;
  quantity: number;
  stockAvailable: number;
  price: number;
  costSnapshot: number;
}

export interface CheckoutPosV4Input {
  paymentMethodId: string;
  customerId?: string | null;
  discountAmount?: number;
  serviceFeeAmount?: number;
  paidAmount?: number;
  notes?: string | null;
  items: CheckoutPosItemV4Input[];
}

export interface CheckoutPosItemV4Input {
  itemType: PosCartItemTypeV4;
  variantId?: string | null;
  unitId?: string | null;
  quantity?: number;
  sellingPrice: number;
}

export interface CheckoutPosV4Result {
  transactionId: string;
  transactionNumber: string;
  subtotalAmount: number;
  discountAmount: number;
  serviceFeeAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  mdrAmount: number;
  netAmount: number;
  paymentAccountId: string;
  paymentAccountMovementId: string;
  movementIds: string[];
}

export interface PosTransactionV4Row {
  id: string;
  brandId: number;
  branchId: string;
  transactionNumber: string;
  customerId: string | null;
  customerName: string | null;
  subtotalAmount: number;
  discountAmount: number;
  serviceFeeAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethodId: string;
  paymentMethodName: string | null;
  paymentAccountId: string;
  paymentAccountName: string | null;
  status: string;
  notes: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
}

export interface PosTransactionItemV4Row {
  id: string;
  transactionId: string;
  productId: string;
  variantId: string | null;
  unitId: string | null;
  itemType: string;
  itemNameSnapshot: string;
  variantNameSnapshot: string | null;
  attributesSnapshot: Record<string, string> | null;
  imeiSnapshot: string | null;
  serialNumberSnapshot: string | null;
  batteryHealthSnapshot: number | null;
  conditionSnapshot: string | null;
  quantity: number;
  costPriceSnapshot: number;
  sellingPriceSnapshot: number;
  subtotalAmount: number;
  movementId: string | null;
}

export interface VoidPosTransactionV4Input {
  transactionId: string;
  reason: string;
}

export interface VoidPosTransactionV4Result {
  transactionId: string;
  transactionNumber: string;
  status: string;
  restoredItemCount: number;
  stockMovementIds: string[];
  paymentReversalMovementId: string;
  reversalId: string;
}

export interface PosTransactionReversalV4Row {
  id: string;
  brandId: number;
  branchId: string;
  transactionId: string;
  reversalNumber: string | null;
  reason: string;
  totalAmount: number;
  paymentReversalMovementId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
