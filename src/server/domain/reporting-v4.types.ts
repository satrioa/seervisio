export interface V4PosSalesSummaryRow {
  brandId: number;
  branchId: string;
  branchName: string | null;
  salesDate: string;
  transactionCount: number;
  grossSales: number;
  discountAmount: number;
  serviceFeeAmount: number;
  netSales: number;
  paidAmount: number;
  voidedCount: number;
  voidedAmount: number;
}

export interface V4PosItemSalesRow {
  brandId: number;
  branchId: string;
  branchName: string | null;
  salesDate: string;
  transactionId: string;
  transactionNumber: string;
  itemType: string;
  productId: string;
  variantId: string | null;
  unitId: string | null;
  itemNameSnapshot: string;
  variantNameSnapshot: string | null;
  attributesSnapshot: Record<string, any> | null;
  imeiSnapshot: string | null;
  batteryHealthSnapshot: number | null;
  conditionSnapshot: string | null;
  quantity: number;
  costPriceSnapshot: number;
  sellingPriceSnapshot: number;
  subtotalAmount: number;
  grossProfit: number;
  marginPercent: number;
  transactionStatus: string;
  createdAt: string;
}

export interface V4PosPaymentSummaryRow {
  brandId: number;
  branchId: string;
  branchName: string | null;
  salesDate: string;
  paymentMethodId: string;
  paymentMethodName: string | null;
  paymentAccountId: string;
  paymentAccountName: string | null;
  transactionCount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
}

export interface V4InventoryStockSummaryRow {
  brandId: number;
  branchId: string;
  branchName: string | null;
  productKind: string;
  conditionType: string | null;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  attributes: Record<string, any> | null;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number | null;
  stockStatus: string;
}

export interface V4InventoryValuationRow {
  brandId: number;
  branchId: string;
  branchName: string | null;
  productKind: string;
  conditionType: string | null;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  currentStock: number;
  averageCost: number;
  sellingPrice: number;
  costValue: number;
  potentialSalesValue: number;
  potentialGrossProfit: number;
}

export interface V4UnitSecondSummaryRow {
  brandId: number;
  branchId: string;
  branchName: string | null;
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  unitId: string;
  unitAttributes: Record<string, any> | null;
  imei: string | null;
  serialNumber: string | null;
  barcode: string | null;
  batteryHealth: number | null;
  conditionGrade: string | null;
  purchaseCost: number;
  sellingPrice: number;
  potentialProfit: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  ageDays: number;
}

export interface V4InventoryMovementSummaryRow {
  brandId: number;
  branchId: string;
  branchName: string | null;
  movementDate: string;
  movementType: string;
  direction: string;
  productKind: string | null;
  conditionType: string | null;
  productName: string;
  variantName: string;
  unitImei: string | null;
  quantity: number;
  stockBefore: number | null;
  stockAfter: number | null;
  unitStatusBefore: string | null;
  unitStatusAfter: string | null;
  referenceType: string | null;
  referenceLabel: string | null;
  notes: string | null;
  createdAt: string;
}

export interface V4SparepartUsageSummaryRow {
  brandId: number;
  branchId: string;
  branchName: string | null;
  serviceId: string;
  serviceNumber: string | null;
  usageDate: string;
  productId: string;
  productNameSnapshot: string;
  variantId: string | null;
  variantNameSnapshot: string | null;
  attributesSnapshot: Record<string, any> | null;
  quantity: number;
  costPriceSnapshot: number;
  sellingPriceSnapshot: number;
  totalCost: number;
  totalCharge: number;
  grossProfit: number;
}

export interface V4StockPurchaseSummaryRow {
  brandId: number;
  branchId: string;
  branchName: string | null;
  purchaseDate: string;
  purchaseNumber: string;
  supplierName: string;
  productId: string;
  productNameSnapshot: string;
  variantId: string | null;
  variantNameSnapshot: string | null;
  quantity: number;
  unitCost: number;
  subtotalAmount: number;
  paymentAccountId: string | null;
  status: string;
}

export interface V4BranchBusinessSummaryRow {
  brandId: number | null;
  branchId: string | null;
  branchName: string | null;
  summaryDate: string;
  posTransactionCount: number;
  posNetSales: number;
  posGrossProfit: number;
  stockPurchaseTotal: number;
  sparepartUsageCharge: number;
  sparepartUsageCost: number;
  unitSecondReadyCount: number;
  unitSecondSoldCount: number;
}

export type V4ReportFilter = {
  branchId?: string | null;
  dateFrom?: string;
  dateTo?: string;
  productKind?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};
