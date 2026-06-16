import type {
  ProductV4Row,
  VariantV4Row,
  UnitSecondV4Row,
  ProductDetailV4Row,
} from "./inventory-v4.types";

type DbProductRow = Record<string, unknown>;
type DbVariantRow = Record<string, unknown>;
type DbVariantStockRow = Record<string, unknown>;
type DbUnitRow = Record<string, unknown>;

export function productKindLabel(
  productKind: string,
  conditionType: string | null,
): string {
  if (productKind === "SPAREPART") return "Sparepart";
  if (productKind === "PRODUCT") return "Produk";
  if (productKind === "UNIT" && conditionType === "NEW") return "Unit Baru";
  if (productKind === "UNIT" && conditionType === "SECOND") return "Unit Second";
  return productKind;
}

export function unitStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    READY_STOCK: "Ready",
    RESERVED: "Reserved",
    SOLD: "Terjual",
    IN_SERVICE: "Dipakai Servis",
    DEFECTIVE: "Rusak",
    RETURNED: "Retur",
    ARCHIVED: "Arsip",
  };
  return labels[status] ?? status;
}

export function movementDirectionLabel(direction: string): string {
  const labels: Record<string, string> = {
    IN: "Masuk",
    OUT: "Keluar",
    ADJUST: "Adjust",
  };
  return labels[direction] ?? direction;
}

export function movementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    OPENING_STOCK: "Stok Awal",
    PURCHASE_IN: "Pembelian",
    STOCK_OPNAME_IN: "Opname Masuk",
    STOCK_OPNAME_OUT: "Opname Keluar",
    SERVICE_USAGE: "Pemakaian Servis",
    POS_SALE: "Penjualan POS",
    UNIT_IN: "Unit Masuk",
    UNIT_STATUS_CHANGE: "Ubah Status Unit",
    UNIT_SOLD: "Unit Terjual",
    VOID_REVERSAL: "Void",
    ADJUSTMENT: "Penyesuaian",
  };
  return labels[type] ?? type;
}

export function formatVariantAttributes(attributes: Record<string, string> | null): string {
  if (!attributes) return "";
  return Object.values(attributes).join(" / ");
}

export function mapProductRow(row: DbProductRow): ProductV4Row {
  return {
    id: row.id as string,
    brandId: row.brand_id as number,
    branchId: row.branch_id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    productKind: row.product_kind as string,
    conditionType: (row.condition_type as string) ?? null,
    categoryId: (row.category_id as string) ?? null,
    unit: (row.unit as string) ?? "pcs",
    appearsInPos: row.appears_in_pos as boolean,
    serviceUsageEnabled: row.service_usage_enabled as boolean,
    isActive: row.is_active as boolean,
    variantsCount: (row.variants_count as number) ?? 0,
    totalStock: (row.total_stock as number) ?? 0,
    priceMin: (row.price_min as number) ?? 0,
    priceMax: (row.price_max as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapVariantRow(
  variant: DbVariantRow,
  stock?: DbVariantStockRow | null,
): VariantV4Row {
  return {
    id: variant.id as string,
    productId: variant.product_id as string,
    name: variant.name as string,
    attributes: (variant.attributes as Record<string, string>) ?? {},
    sku: (variant.sku as string) ?? null,
    barcode: (variant.barcode as string) ?? null,
    imageUrl: (variant.image_url as string) ?? null,
    unit: (variant.unit as string) ?? "pcs",
    minStock: (variant.min_stock as number) ?? 0,
    costPrice: (variant.cost_price as number) ?? 0,
    sellingPrice: (variant.selling_price as number) ?? 0,
    averageCost: (variant.average_cost as number) ?? 0,
    currentStock: (stock?.current_stock as number) ?? 0,
    reservedStock: (stock?.reserved_stock as number) ?? 0,
    isActive: variant.is_active as boolean,
  };
}

export function mapUnitSecondRow(
  unit: DbUnitRow,
  productName?: string,
  variantName?: string | null,
): UnitSecondV4Row {
  return {
    id: unit.id as string,
    productId: unit.product_id as string,
    productName: productName ?? "",
    variantId: (unit.variant_id as string) ?? null,
    variantName: variantName ?? null,
    unitAttributes: (unit.unit_attributes as Record<string, string>) ?? null,
    imei: (unit.imei as string) ?? null,
    serialNumber: (unit.serial_number as string) ?? null,
    barcode: (unit.barcode as string) ?? null,
    imageUrl: (unit.image_url as string) ?? null,
    batteryHealth: (unit.battery_health as number) ?? null,
    conditionGrade: (unit.condition_grade as string) ?? null,
    physicalConditionNotes: (unit.physical_condition_notes as string) ?? null,
    functionalConditionNotes: (unit.functional_condition_notes as string) ?? null,
    accessoriesIncluded: (unit.accessories_included as string) ?? null,
    warrantyUntil: (unit.warranty_until as string) ?? null,
    warrantyNotes: (unit.warranty_notes as string) ?? null,
    purchaseCost: (unit.purchase_cost as number) ?? 0,
    sellingPrice: (unit.selling_price as number) ?? 0,
    status: unit.status as string,
    branchId: unit.branch_id as string,
    createdAt: unit.created_at as string,
  };
}
