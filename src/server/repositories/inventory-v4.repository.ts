/**
 * Inventory V4 repository.
 * All functions accept supabase client as first argument (Pattern A).
 */
import type {
  CreateSparepartV4Input,
  CreateProductV4Input,
  CreateUnitBaruV4Input,
  CreateUnitSecondV4Input,
  UpdateProductV4Input,
  UpdateVariantV4Input,
  UpdateUnitSecondV4Input,
  CreateMovementV4Input,
  ListProductsV4Params,
  ListUnitSecondV4Params,
  ListInventoryMovementsV4Params,
  ProductV4Row,
  ProductDetailV4Row,
  UnitSecondV4Row,
  VariantV4Row,
  CategoryV4Row,
  CreateCategoryV4Input,
  UpdateCategoryV4Input,
  InventoryMovementV4Row,
  CreateStockPurchaseV4Input,
  PurchaseVariantSearchRow,
  StockPurchaseV4Row,
  StockPurchaseItemV4Row,
  ListStockPurchaseV4Params,
  StockOpnameVariantRow,
  SubmitStockOpnameV4Input,
  StockOpnameResult,
  ListStockOpnameVariantsV4Params,
  ServiceSparepartSearchRow,
  UseSparepartForServiceV4Input,
  ServiceSparepartUsageResult,
  ServiceSparepartUsageV4Row,
  PosProductV4Row,
  PosVariantV4Row,
  PosUnitSecondOptionV4Row,
  CheckoutPosV4Input,
  CheckoutPosV4Result,
  PosTransactionV4Row,
  PosTransactionItemV4Row,
  CheckoutPosItemV4Input,
  VoidPosTransactionV4Result,
} from "@/server/domain/inventory-v4.types";
import {
  mapProductRow,
  mapVariantRow,
  mapUnitSecondRow,
} from "@/server/domain/inventory-v4.mapper";

type SupabaseClientLike = any;

const MAX_PAGE_SIZE = 25;

/* ─── Internal helpers ─── */

function buildPagination(page?: number, pageSize?: number): { from: number; to: number } {
  const p = Math.max(1, page ?? 1);
  const s = Math.min(Math.max(1, pageSize ?? 10), MAX_PAGE_SIZE);
  return { from: (p - 1) * s, to: p * s - 1 };
}

function parsePgErr(err: any): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  const msg = err.message ?? err.details ?? String(err);
  if (msg.includes("duplicate key") || msg.includes("violates unique constraint")) {
    if (msg.toLowerCase().includes("imei")) return "IMEI sudah terdaftar.";
    if (msg.toLowerCase().includes("serial")) return "Nomor serial sudah terdaftar.";
    if (msg.toLowerCase().includes("barcode")) return "Barcode sudah terdaftar.";
    if (msg.toLowerCase().includes("sku")) return "SKU sudah terdaftar.";
    return "Data sudah ada.";
  }
  return msg;
}

/* ─── List products V4 ─── */

export async function listProductsV4(
  supabase: SupabaseClientLike,
  params: ListProductsV4Params,
): Promise<{ data: ProductV4Row[]; total: number }> {
  const brandId = params.brandId!;
  const { branchId, productKind, conditionType, search, isActive, page, pageSize } = params;
  const { from, to } = buildPagination(page, pageSize);

  let countQuery = (supabase as any)
    .from("inv_products")
    .select("id", { count: "exact", head: false })
    .eq("brand_id", brandId);

  if (branchId) {
    countQuery = countQuery.eq("branch_id", branchId);
  }
  if (productKind) {
    countQuery = countQuery.eq("product_kind", productKind);
  }
  if (conditionType !== undefined && conditionType !== null) {
    countQuery = countQuery.eq("condition_type", conditionType);
  } else if (productKind === "UNIT" && conditionType === undefined) {
    // When no condition filter but product kind is UNIT, show both NEW and SECOND
  }
  if (isActive !== undefined && isActive !== null) {
    countQuery = countQuery.eq("is_active", isActive);
  }
  if (search) {
    countQuery = countQuery.ilike("name", `%${search}%`);
  }
  countQuery = countQuery.order("created_at", { ascending: false });

  let dataQuery = (supabase as any)
    .from("inv_products")
    .select(`
      *,
      variants:inv_variants(
        id,
        selling_price,
        min_stock,
        inv_variant_stocks(current_stock)
      )
    `)
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (branchId) {
    dataQuery = dataQuery.eq("branch_id", branchId);
  }
  if (productKind) {
    dataQuery = dataQuery.eq("product_kind", productKind);
  }
  if (conditionType !== undefined && conditionType !== null) {
    dataQuery = dataQuery.eq("condition_type", conditionType);
  } else if (productKind === "UNIT" && conditionType === undefined) {
    // When no condition filter but product kind is UNIT, show both NEW and SECOND
  }
  if (isActive !== undefined && isActive !== null) {
    dataQuery = dataQuery.eq("is_active", isActive);
  }
  if (search) {
    dataQuery = dataQuery.ilike("name", `%${search}%`);
  }

  const { data: idData, error: countErr, count } = await countQuery.range(from, to);
  if (countErr) throw new Error(parsePgErr(countErr));

  const total = count ?? 0;
  if (!idData || (idData as any[]).length === 0) {
    return { data: [], total };
  }

  const ids = (idData as any[]).map((r: any) => r.id);

  const { data: products, error: dataErr } = await dataQuery.in("id", ids);
  if (dataErr) throw new Error(parsePgErr(dataErr));

  const rows: ProductV4Row[] = ((products as any[]) ?? []).map((p: any) => {
    const variants: any[] = p.variants ?? [];
    const variantsCount = variants.length;
    let totalStock = 0;
    let priceMin = Infinity;
    let priceMax = -Infinity;

    for (const v of variants) {
      const stocks: any[] = v.inv_variant_stocks ?? [];
      for (const s of stocks) {
        totalStock += Number(s.current_stock ?? 0);
      }
      const sp = Number(v.selling_price);
      if (sp > 0) {
        if (sp < priceMin) priceMin = sp;
        if (sp > priceMax) priceMax = sp;
      }
    }

    if (priceMin === Infinity) priceMin = 0;
    if (priceMax === -Infinity) priceMax = 0;

    return mapProductRow({
      ...p,
      variants_count: variantsCount,
      total_stock: totalStock,
      price_min: priceMin,
      price_max: priceMax,
    });
  });

  return { data: rows, total };
}

/* ─── Set product active status V4 (soft deactivate/reactivate) ─── */

export async function setProductActiveStatusV4(
  supabase: SupabaseClientLike,
  productId: string,
  isActive: boolean,
): Promise<void> {
  // Update product
  const { error: productErr } = await (supabase as any)
    .from("inv_products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (productErr) throw new Error(parsePgErr(productErr));

  // Update all variants
  const { error: variantErr } = await (supabase as any)
    .from("inv_variants")
    .update({ is_active: isActive })
    .eq("product_id", productId);

  if (variantErr) throw new Error(parsePgErr(variantErr));
}

/* ─── Set variant active status V4 ─── */

export async function setVariantActiveStatusV4(
  supabase: SupabaseClientLike,
  variantId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("inv_variants")
    .update({ is_active: isActive })
    .eq("id", variantId);

  if (error) throw new Error(parsePgErr(error));
}

/* ─── Set unit second status V4 (archive/reactivate) ─── */

export async function setUnitSecondStatusV4(
  supabase: SupabaseClientLike,
  unitId: string,
  status: string,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("inv_units")
    .update({ status })
    .eq("id", unitId);

  if (error) throw new Error(parsePgErr(error));
}

/* ─── Update product / variant / unit second metadata V4 ─── */

export async function updateProductV4(
  supabase: SupabaseClientLike,
  input: UpdateProductV4Input,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("inv_products")
    .update({
      name: input.name.trim(),
      category_id: input.categoryId ?? null,
      description: input.description ?? null,
      image_url: input.imageUrl ?? null,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.productId);

  if (error) throw new Error(parsePgErr(error));
}

export async function updateVariantV4(
  supabase: SupabaseClientLike,
  input: UpdateVariantV4Input,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("inv_variants")
    .update({
      name: input.name.trim(),
      attributes: (input.attributes ?? {}) as any,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      unit: input.unit ?? "pcs",
      min_stock: input.minStock ?? 0,
      cost_price: input.costPrice ?? 0,
      selling_price: input.sellingPrice ?? 0,
      image_url: input.imageUrl ?? null,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.variantId);

  if (error) throw new Error(parsePgErr(error));
}

export async function updateUnitSecondV4(
  supabase: SupabaseClientLike,
  input: UpdateUnitSecondV4Input,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("inv_units")
    .update({
      unit_attributes: (input.unitAttributes ?? {}) as any,
      imei: input.imei ?? null,
      serial_number: input.serialNumber ?? null,
      barcode: input.barcode ?? null,
      image_url: input.imageUrl ?? null,
      battery_health: input.batteryHealth ?? null,
      condition_grade: input.conditionGrade ?? null,
      physical_condition_notes: input.physicalConditionNotes ?? null,
      functional_condition_notes: input.functionalConditionNotes ?? null,
      accessories_included: input.accessoriesIncluded ?? null,
      warranty_until: input.warrantyUntil ?? null,
      warranty_notes: input.warrantyNotes ?? null,
      purchase_cost: input.purchaseCost ?? 0,
      selling_price: input.sellingPrice ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.unitId);

  if (error) throw new Error(parsePgErr(error));
}

/* ─── Get product detail V4 ─── */

export async function getProductDetailV4(
  supabase: SupabaseClientLike,
  productId: string,
): Promise<ProductDetailV4Row | null> {
  const { data: product, error: productErr } = await supabase
    .from("inv_products")
    .select("*")
    .eq("id", productId)
    .single();

  if (productErr) throw new Error(parsePgErr(productErr));
  if (!product) return null;

  const { data: variants, error: variantErr } = await supabase
    .from("inv_variants")
    .select("*, inv_variant_stocks(*)")
    .eq("product_id", productId)
    .order("name", { ascending: true });

  if (variantErr) throw new Error(parsePgErr(variantErr));

  const mappedProduct = mapProductRow(product as any);
  const mappedVariants: VariantV4Row[] = ((variants as any[]) ?? []).map((v: any) =>
    mapVariantRow(v, v.inv_variant_stocks?.[0] ?? null),
  );

  let unitSecondSummary: ProductDetailV4Row["unitSecondSummary"] | undefined;

  if (
    (product as any).product_kind === "UNIT" &&
    (product as any).condition_type === "SECOND"
  ) {
    const { data: units, error: unitErr } = await supabase
      .from("inv_units")
      .select("status")
      .eq("product_id", productId);

    if (!unitErr && units) {
      const total = units.length;
      const byStatus: Record<string, number> = {};
      for (const u of units as any[]) {
        byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;
      }
      unitSecondSummary = {
        total,
        readyStock: byStatus["READY_STOCK"] ?? 0,
        reserved: byStatus["RESERVED"] ?? 0,
        sold: byStatus["SOLD"] ?? 0,
        inService: byStatus["IN_SERVICE"] ?? 0,
        defective: byStatus["DEFECTIVE"] ?? 0,
        returned: byStatus["RETURNED"] ?? 0,
        archived: byStatus["ARCHIVED"] ?? 0,
      };
    }
  }

  return { product: mappedProduct, variants: mappedVariants, unitSecondSummary };
}

/* ─── Create quantity-based product (SPAREPART, PRODUCT, UNIT Baru) ─── */

async function createQuantityProductV4(
  supabase: SupabaseClientLike,
  input: CreateSparepartV4Input | CreateProductV4Input | CreateUnitBaruV4Input,
  createdBy: string,
): Promise<{ productId: string; variantIds: string[] }> {
  const { brandId, branchId, categoryId, name, description, imageUrl, unit, variants } = input;

  const productKind = "productKind" in input ? input.productKind : "PRODUCT";
  const conditionType = "conditionType" in input ? input.conditionType ?? null : null;

  const appearsInPos = input.productKind === "SPAREPART" ? false : true;
  const serviceUsageEnabled = input.productKind === "SPAREPART" ? true : false;

  const effectiveVariants = variants.length > 0 ? variants : [{ name }];

  // 1. Create product
  const { data: product, error: productErr } = await supabase
    .from("inv_products")
    .insert({
      brand_id: brandId,
      branch_id: branchId,
      category_id: categoryId ?? null,
      name,
      description: description ?? null,
      image_url: imageUrl ?? null,
      product_kind: productKind,
      condition_type: conditionType,
      unit: unit ?? "pcs",
      appears_in_pos: appearsInPos,
      service_usage_enabled: serviceUsageEnabled,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (productErr) throw new Error(parsePgErr(productErr));

  const productId = (product as any).id;

  // 2. Create variants and stocks
  const variantIds: string[] = [];
  for (const v of effectiveVariants) {
    const { data: variant, error: variantErr } = await supabase
      .from("inv_variants")
      .insert({
        product_id: productId,
        branch_id: branchId,
        brand_id: brandId,
        name: v.name,
        attributes: (v.attributes ?? {}) as any,
        sku: v.sku ?? null,
        barcode: v.barcode ?? null,
        image_url: v.imageUrl ?? null,
        unit: v.unit ?? unit ?? "pcs",
        min_stock: v.minStock ?? 0,
        cost_price: v.costPrice ?? 0,
        selling_price: v.sellingPrice ?? 0,
      })
      .select("id")
      .single();

    if (variantErr) throw new Error(parsePgErr(variantErr));

    const variantId = (variant as any).id;
    variantIds.push(variantId);

    // 3. Create variant stock
    const initialStock = v.initialStock ?? 0;
    const { error: stockErr } = await supabase.from("inv_variant_stocks").insert({
      variant_id: variantId,
      branch_id: branchId,
      brand_id: brandId,
      current_stock: initialStock,
      reserved_stock: 0,
    });

    if (stockErr) throw new Error(parsePgErr(stockErr));

    // 4. Create opening stock movement if initialStock > 0
    if (initialStock > 0) {
      const { error: movErr } = await supabase.from("inv_stock_movements").insert({
        brand_id: brandId,
        branch_id: branchId,
        product_id: productId,
        variant_id: variantId,
        direction: "IN",
        movement_type: "OPENING_STOCK",
        quantity: initialStock,
        stock_before: 0,
        stock_after: initialStock,
        created_by: createdBy,
        notes: "Stok awal",
      });

      if (movErr) throw new Error(parsePgErr(movErr));
    }
  }

  return { productId, variantIds };
}

/* ─── Create sparepart V4 ─── */

export async function createSparepartV4(
  supabase: SupabaseClientLike,
  input: CreateSparepartV4Input,
  createdBy: string,
): Promise<{ productId: string; variantIds: string[] }> {
  return createQuantityProductV4(supabase, input, createdBy);
}

/* ─── Create product V4 ─── */

export async function createProductV4(
  supabase: SupabaseClientLike,
  input: CreateProductV4Input,
  createdBy: string,
): Promise<{ productId: string; variantIds: string[] }> {
  return createQuantityProductV4(supabase, input, createdBy);
}

/* ─── Create unit baru V4 ─── */

export async function createUnitBaruV4(
  supabase: SupabaseClientLike,
  input: CreateUnitBaruV4Input,
  createdBy: string,
): Promise<{ productId: string; variantIds: string[] }> {
  return createQuantityProductV4(supabase, input, createdBy);
}

/* ─── Create unit second V4 ─── */

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function resolveProductIdForUnitSecond(
  supabase: SupabaseClientLike,
  input: CreateUnitSecondV4Input,
  createdBy: string,
): Promise<string> {
  const { brandId, branchId, categoryId, existingProductId, name, description, imageUrl } = input;

  // If existingProductId is provided, validate it
  if (existingProductId) {
    const { data: product, error: productErr } = await supabase
      .from("inv_products")
      .select("id, brand_id, branch_id, product_kind, condition_type, is_active")
      .eq("id", existingProductId)
      .single();

    if (productErr) throw new Error("Model existing tidak ditemukan.");
    if (product.brand_id !== brandId) throw new Error("Model bukan milik brand ini.");
    if (product.branch_id !== branchId) throw new Error("Model bukan milik cabang ini.");
    if (product.product_kind !== "UNIT") throw new Error("Model bukan unit.");
    if (product.condition_type !== "SECOND") throw new Error("Model bukan unit second.");
    if (!product.is_active) throw new Error("Model sudah tidak aktif.");

    return (product as any).id;
  }

  // Check for exact name match (trim, lowercase, collapse spaces)
  const normalizedName = normalizeName(name);

  const { data: exactMatch } = await (supabase as any)
    .from("inv_products")
    .select("id")
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .eq("product_kind", "UNIT")
    .eq("condition_type", "SECOND")
    .eq("is_active", true)
    .ilike("name", normalizedName);

  if (exactMatch && exactMatch.length > 0) {
    return (exactMatch[0] as any).id;
  }

  // Create new product
  const { data: product, error: productErr } = await supabase
    .from("inv_products")
    .insert({
      brand_id: brandId,
      branch_id: branchId,
      category_id: categoryId ?? null,
      name,
      description: description ?? null,
      image_url: imageUrl ?? null,
      product_kind: "UNIT",
      condition_type: "SECOND",
      unit: "pcs",
      appears_in_pos: true,
      service_usage_enabled: false,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (productErr) throw new Error(parsePgErr(productErr));

  return (product as any).id;
}

export async function createUnitSecondV4(
  supabase: SupabaseClientLike,
  input: CreateUnitSecondV4Input,
  createdBy: string,
): Promise<{
  productId: string;
  variantIds: string[];
  unitIds: string[];
}> {
  const { brandId, branchId, name, imageUrl, variants, units } = input;

  // Resolve product ID (existing or new)
  const productId = await resolveProductIdForUnitSecond(supabase, input, createdBy);

  const effectiveVariants =
    variants && variants.length > 0 ? variants : [{ name }];

  // 2. Create variants
  const variantIds: string[] = [];
  for (const v of effectiveVariants) {
    const { data: variant, error: variantErr } = await supabase
      .from("inv_variants")
      .insert({
        product_id: productId,
        branch_id: branchId,
        brand_id: brandId,
        name: v.name,
        attributes: (v.attributes ?? {}) as any,
        sku: v.sku ?? null,
        barcode: v.barcode ?? null,
        image_url: v.imageUrl ?? null,
        unit: v.unit ?? "pcs",
        min_stock: v.minStock ?? 0,
        cost_price: v.costPrice ?? 0,
        selling_price: v.sellingPrice ?? 0,
      })
      .select("id")
      .single();

    if (variantErr) throw new Error(parsePgErr(variantErr));

    const variantId = (variant as any).id;
    variantIds.push(variantId);

    // 3. Create variant stock (tracking unit count)
    const { error: stockErr } = await supabase.from("inv_variant_stocks").insert({
      variant_id: variantId,
      branch_id: branchId,
      brand_id: brandId,
      current_stock: 0,
      reserved_stock: 0,
    });

    if (stockErr) throw new Error(parsePgErr(stockErr));
  }

  // 4. Create unit rows
  const unitIds: string[] = [];
  for (const u of units) {
    const unitStatus = u.status ?? "READY_STOCK";
    const { data: unitRow, error: unitErr } = await supabase
      .from("inv_units")
      .insert({
        product_id: productId,
        variant_id: u.variantId ?? (variantIds.length > 0 ? variantIds[0] : null),
        branch_id: branchId,
        brand_id: brandId,
        imei: u.imei ?? null,
        serial_number: u.serialNumber ?? null,
        barcode: u.barcode ?? null,
        image_url: u.imageUrl ?? null,
        battery_health: u.batteryHealth ?? null,
        condition_grade: u.conditionGrade ?? null,
        physical_condition_notes: u.physicalConditionNotes ?? null,
        functional_condition_notes: u.functionalConditionNotes ?? null,
        accessories_included: u.accessoriesIncluded ?? null,
        warranty_until: u.warrantyUntil ?? null,
        warranty_notes: u.warrantyNotes ?? null,
        purchase_cost: u.purchaseCost ?? 0,
        selling_price: u.sellingPrice ?? 0,
        status: unitStatus,
        unit_attributes: (u.unitAttributes ?? {}) as any,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (unitErr) throw new Error(parsePgErr(unitErr));

    const unitId = (unitRow as any).id;
    unitIds.push(unitId);

    // 5. Create UNIT_IN movement for READY_STOCK units
    if (unitStatus === "READY_STOCK") {
      const refLabel = u.imei ?? u.serialNumber ?? name;
      const { error: movErr } = await supabase.from("inv_stock_movements").insert({
        brand_id: brandId,
        branch_id: branchId,
        product_id: productId,
        variant_id: u.variantId ?? (variantIds.length > 0 ? variantIds[0] : null),
        unit_id: unitId,
        direction: "IN",
        movement_type: "UNIT_IN",
        quantity: 1,
        created_by: createdBy,
        reference_type: "UNIT_SECOND",
        reference_label: refLabel,
        notes: "Tambah Unit Second",
      });

      if (movErr) throw new Error(parsePgErr(movErr));
    }
  }

  return { productId, variantIds, unitIds };
}

/* ─── List unit second V4 ─── */

export async function listUnitSecondV4(
  supabase: SupabaseClientLike,
  params: ListUnitSecondV4Params,
): Promise<{ data: UnitSecondV4Row[]; total: number }> {
  const brandId = params.brandId!;
  const { branchId, status, search, page, pageSize } = params;
  const { from, to } = buildPagination(page, pageSize);

  let query = supabase
    .from("inv_units")
    .select("*, inv_products!inner(name, product_kind, condition_type)", { count: "exact" })
    .eq("inv_products.brand_id", brandId)
    .eq("inv_products.product_kind", "UNIT")
    .eq("inv_products.condition_type", "SECOND")
    .order("created_at", { ascending: false });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.or(
      `imei.ilike.%${search}%,serial_number.ilike.%${search}%,barcode.ilike.%${search}%,inv_products.name.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  const rows = ((data as any[]) ?? []).map((row: any) => {
    const productName = row.inv_products?.name ?? "";
    return mapUnitSecondRow(row, productName, null);
  });

  return { data: rows, total: count ?? 0 };
}

/* ─── Create inventory movement V4 (low-level helper) ─── */

/* ─── Category: list V4 ─── */

export async function listCategoriesV4(
  supabase: SupabaseClientLike,
  brandId: number,
  itemType?: string | null,
): Promise<CategoryV4Row[]> {
  let query = (supabase as any)
    .from("inventory_categories")
    .select("id, brand_id, name, description, is_active, stock_type, item_type, sort_order")
    .eq("brand_id", brandId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (itemType) {
    query = query.eq("item_type", itemType);
  }

  const { data, error } = await query;
  if (error) throw new Error(parsePgErr(error));

  return ((data as any[]) ?? []).map((c: any) => ({
    id: c.id,
    brandId: c.brand_id,
    name: c.name,
    description: c.description ?? null,
    isActive: c.is_active,
    stockType: c.stock_type ?? null,
    itemType: c.item_type,
    sortOrder: c.sort_order,
  }));
}

/* ─── Category: create V4 ─── */

export async function createCategoryV4(
  supabase: SupabaseClientLike,
  input: CreateCategoryV4Input,
): Promise<string> {
  const { data, error } = await supabase
    .from("inventory_categories")
    .insert({
      brand_id: input.brandId,
      name: input.name,
      description: input.description ?? null,
      item_type: input.itemType,
      is_active: true,
      sort_order: 0,
    } as any)
    .select("id")
    .single();

  if (error) throw new Error(parsePgErr(error));
  return (data as any).id;
}

/* ─── Category: update V4 ─── */

export async function updateCategoryV4(
  supabase: SupabaseClientLike,
  id: string,
  input: UpdateCategoryV4Input,
): Promise<void> {
  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.isActive !== undefined) updatePayload.is_active = input.isActive;

  const { error } = await supabase
    .from("inventory_categories")
    .update(updatePayload as any)
    .eq("id", id);

  if (error) throw new Error(parsePgErr(error));
}

/* ─── List inventory movements V4 ─── */

export async function listInventoryMovementsV4(
  supabase: SupabaseClientLike,
  params: ListInventoryMovementsV4Params,
): Promise<{ data: InventoryMovementV4Row[]; total: number }> {
  const brandId = params.brandId!;
  const { branchId, productId, movementType, page, pageSize } = params;
  const { from, to } = buildPagination(page, pageSize);

  let query = (supabase as any)
    .from("inv_stock_movements")
    .select("*, inv_products!left(name)", { count: "exact" })
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);
  if (productId) query = query.eq("product_id", productId);
  if (movementType) query = query.eq("movement_type", movementType);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  const rows = ((data as any[]) ?? []).map((row: any) => ({
    id: row.id,
    brandId: row.brand_id,
    branchId: row.branch_id,
    direction: row.direction,
    movementType: row.movement_type,
    productId: row.product_id,
    productName: row.inv_products?.name ?? "",
    variantId: row.variant_id,
    variantName: row.variant_name ?? null,
    unitId: row.unit_id,
    quantity: row.quantity,
    stockBefore: row.stock_before,
    stockAfter: row.stock_after,
    unitStatusBefore: row.unit_status_before,
    unitStatusAfter: row.unit_status_after,
    referenceType: row.reference_type,
    referenceLabel: row.reference_label,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));

  return { data: rows, total: count ?? 0 };
}

/* ─── Purchase variant search V4 ─── */

export async function searchPurchaseVariantsV4(
  supabase: SupabaseClientLike,
  brandId: number,
  branchId: string,
  search?: string,
): Promise<PurchaseVariantSearchRow[]> {
  let query = (supabase as any)
    .from("inv_variants")
    .select(`
      id, name, product_id, sku, barcode, unit, min_stock,
      cost_price, selling_price, attributes,
      inv_products!inner(id, name, product_kind, condition_type, category_id)
    `)
    .eq("inv_products.brand_id", brandId)
    .eq("inv_variants.is_active", true)
    .not("inv_products.product_kind", "eq", "UNIT")
    .or("inv_products.condition_type.is.null,inv_products.condition_type.neq.SECOND")
    .order("inv_products.name", { ascending: true });

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(
      `inv_products.name.ilike.%${term}%,inv_variants.name.ilike.%${term}%,inv_variants.sku.ilike.%${term}%,inv_variants.barcode.ilike.%${term}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(parsePgErr(error));

  const rows: PurchaseVariantSearchRow[] = [];
  for (const raw of (data as any[]) ?? []) {
    const variantId = raw.id;
    const { data: stockData } = await (supabase as any)
      .from("inv_variant_stocks")
      .select("current_stock")
      .eq("branch_id", branchId)
      .eq("variant_id", variantId)
      .maybeSingle();

    rows.push({
      variantId,
      variantName: raw.name,
      productId: raw.product_id,
      productName: raw.inv_products.name,
      productKind: raw.inv_products.product_kind,
      conditionType: raw.inv_products.condition_type,
      sku: raw.sku,
      barcode: raw.barcode,
      unit: raw.unit,
      costPrice: Number(raw.cost_price),
      sellingPrice: Number(raw.selling_price),
      minStock: Number(raw.min_stock ?? 0),
      currentStock: Number(stockData?.current_stock ?? 0),
      attributes: raw.attributes ?? {},
      categoryId: raw.inv_products.category_id,
    });
  }

  return rows;
}

/* ─── Create stock purchase V4 (atomic) ─── */

export async function createStockPurchaseV4(
  supabase: SupabaseClientLike,
  input: CreateStockPurchaseV4Input,
  brandId: number,
  createdBy: string,
): Promise<{ purchaseId: string; purchaseNumber: string; totalAmount: number; itemCount: number }> {
  const { data, error } = await (supabase as any)
    .rpc("create_inv_stock_purchase", {
      p_brand_id: brandId,
      p_branch_id: input.branchId,
      p_payment_account_id: input.paymentAccountId,
      p_supplier_name: input.supplierName ?? null,
      p_purchase_date: input.purchaseDate ?? new Date().toISOString().split("T")[0],
      p_notes: input.notes ?? null,
      p_created_by: createdBy,
      p_items: input.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        unitSellingPrice: item.unitSellingPrice ?? null,
        note: item.note ?? null,
      })),
    });

  if (error) throw new Error(parsePgErr(error));

  return {
    purchaseId: data.purchase_id,
    purchaseNumber: data.purchase_number,
    totalAmount: Number(data.total_amount),
    itemCount: Number(data.item_count),
  };
}

/* ─── List stock purchase history V4 ─── */

export async function listStockPurchasesV4(
  supabase: SupabaseClientLike,
  params: ListStockPurchaseV4Params,
): Promise<{ data: StockPurchaseV4Row[]; total: number }> {
  const brandId = params.brandId!;
  const { branchId, page, pageSize, search } = params;
  const { from, to } = buildPagination(page, pageSize);

  let query = (supabase as any)
    .from("inv_stock_purchases")
    .select("*, payment_accounts!left(account_name)", { count: "exact" })
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);
  if (search && search.trim()) {
    query = query.or(`purchase_number.ilike.%${search.trim()}%,supplier_name.ilike.%${search.trim()}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  const creatorIds = [...new Set((data ?? []).map((p: any) => p.created_by).filter(Boolean))];
  let profileMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, name")
      .in("id", creatorIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.name);
    }
  }

  const rows: StockPurchaseV4Row[] = ((data as any[]) ?? []).map((r: any) => ({
    id: r.id,
    branchId: r.branch_id,
    purchaseNumber: r.purchase_number,
    purchaseDate: r.purchase_date,
    supplierName: r.supplier_name,
    totalAmount: Number(r.total_amount),
    paymentAccountId: r.payment_account_id,
    paymentAccountName: r.payment_accounts?.account_name ?? null,
    status: r.status,
    notes: r.notes,
    createdBy: r.created_by,
    createdByName: profileMap.get(r.created_by) ?? null,
    createdAt: r.created_at,
  }));

  return { data: rows, total: count ?? 0 };
}

/* ─── Get stock purchase detail V4 (items) ─── */

export async function getStockPurchaseDetailV4(
  supabase: SupabaseClientLike,
  purchaseId: string,
): Promise<StockPurchaseItemV4Row[]> {
  const { data, error } = await (supabase as any)
    .from("inv_stock_purchase_items")
    .select("*")
    .eq("purchase_id", purchaseId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(parsePgErr(error));

  return ((data as any[]) ?? []).map((r: any) => ({
    id: r.id,
    purchaseId: r.purchase_id,
    productId: r.product_id,
    variantId: r.variant_id,
    productNameSnapshot: r.product_name_snapshot,
    variantNameSnapshot: r.variant_name_snapshot,
    attributesSnapshot: r.attributes_snapshot ?? {},
    skuSnapshot: r.sku_snapshot,
    barcodeSnapshot: r.barcode_snapshot,
    unitSnapshot: r.unit_snapshot,
    quantity: Number(r.quantity),
    unitCost: Number(r.unit_cost),
    unitSellingPriceSnapshot: Number(r.unit_selling_price_snapshot),
    subtotalAmount: Number(r.subtotal_amount),
    movementId: r.movement_id,
  }));
}

export async function createInventoryMovementV4(
  supabase: SupabaseClientLike,
  input: CreateMovementV4Input,
): Promise<string> {
  const { data, error } = await supabase
    .from("inv_stock_movements")
    .insert({
      brand_id: input.brandId,
      branch_id: input.branchId,
      direction: input.direction,
      movement_type: input.movementType,
      product_id: input.productId,
      variant_id: input.variantId,
      unit_id: input.unitId,
      quantity: input.quantity,
      stock_before: input.stockBefore,
      stock_after: input.stockAfter,
      unit_status_before: input.unitStatusBefore,
      unit_status_after: input.unitStatusAfter,
      reference_type: input.referenceType,
      reference_id: input.referenceId,
      reference_label: input.referenceLabel,
      notes: input.notes,
    })
    .select("id")
    .single();

  if (error) throw new Error(parsePgErr(error));
  return (data as any).id;
}

/* ─── List stock opname variants V4 ─── */

export async function listStockOpnameVariantsV4(
  supabase: SupabaseClientLike,
  params: ListStockOpnameVariantsV4Params & { brandId: number },
): Promise<{ data: StockOpnameVariantRow[]; total: number }> {
  const { brandId, branchId, productKind, categoryId, search, page, pageSize } = params;
  const { from, to } = buildPagination(page, pageSize);

  let query = (supabase as any)
    .from("inv_variants")
    .select(`
      id, name, product_id, sku, barcode,
      min_stock, attributes,
      inv_products!inner(id, name, product_kind, condition_type, category_id),
      inv_variant_stocks!inner(current_stock)
    `, { count: "exact" })
    .eq("inv_variants.brand_id", brandId)
    .eq("inv_variants.is_active", true);

  if (branchId) {
    query = query.eq("inv_variant_stocks.branch_id", branchId);
  }
  if (productKind) {
    query = query.eq("inv_products.product_kind", productKind);
    if (productKind === "UNIT") {
      query = query.eq("inv_products.condition_type", "NEW");
    }
  } else {
    query = query.not("inv_products.product_kind", "eq", "UNIT")
      .or("inv_products.condition_type.is.null,inv_products.condition_type.neq.SECOND", { foreignTable: "inv_products" });
  }
  if (categoryId) {
    query = query.eq("inv_products.category_id", categoryId);
  }
  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(
      `inv_products.name.ilike.%${term}%,inv_variants.name.ilike.%${term}%,inv_variants.sku.ilike.%${term}%,inv_variants.barcode.ilike.%${term}%`
    );
  }

  query = query.order("inv_products.name", { ascending: true })
    .order("inv_variants.name", { ascending: true });

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  const catIds = [...new Set((data ?? []).map((r: any) => r.inv_products?.category_id).filter(Boolean))];
  let catMap = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await (supabase as any)
      .from("inventory_categories")
      .select("id, name")
      .in("id", catIds);
    for (const c of cats ?? []) catMap.set(c.id, c.name);
  }

  const rows: StockOpnameVariantRow[] = ((data as any[]) ?? []).map((r: any) => ({
    variantId: r.id,
    productId: r.product_id,
    productName: r.inv_products?.name ?? "",
    variantName: r.name,
    attributes: r.attributes ?? {},
    productKind: r.inv_products?.product_kind ?? "",
    conditionType: r.inv_products?.condition_type ?? null,
    categoryId: r.inv_products?.category_id ?? null,
    categoryName: catMap.get(r.inv_products?.category_id) ?? null,
    sku: r.sku,
    barcode: r.barcode,
    currentStock: Number(r.inv_variant_stocks?.current_stock ?? 0),
    minStock: Number(r.min_stock),
  }));

  return { data: rows, total: count ?? 0 };
}

/* ─── Submit stock opname V4 (atomic) ─── */

export async function submitStockOpnameV4(
  supabase: SupabaseClientLike,
  input: SubmitStockOpnameV4Input,
  brandId: number,
): Promise<StockOpnameResult> {
  const { data, error } = await (supabase as any)
    .rpc("adjust_inv_variant_stock_opname", {
      p_brand_id: brandId,
      p_branch_id: input.branchId,
      p_notes: input.notes,
      p_adjustments: input.adjustments.map((a) => ({
        variant_id: a.variantId,
        physical_stock: a.physicalStock,
      })),
    });

  if (error) throw new Error(parsePgErr(error));

  return {
    adjustedCount: Number(data.adjusted_count),
    skippedCount: Number(data.skipped_count),
    movementIds: (data.movement_ids ?? []) as string[],
  };
}

/* ─── Search service sparepart variants V4 (spareparts only, for service usage) ─── */

export async function searchServiceSparepartsV4(
  supabase: SupabaseClientLike,
  brandId: number,
  branchId: string,
  search?: string,
): Promise<PurchaseVariantSearchRow[]> {
  let query = (supabase as any)
    .from("inv_variants")
    .select(`
      id, name, product_id, sku, barcode, unit, min_stock,
      cost_price, selling_price, attributes,
      inv_products!inner(id, name, product_kind, condition_type, category_id)
    `)
    .eq("inv_products.brand_id", brandId)
    .eq("inv_products.product_kind", "SPAREPART")
    .eq("inv_products.service_usage_enabled", true)
    .eq("inv_variants.is_active", true)
    .order("inv_products.name", { ascending: true });

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(
      `inv_products.name.ilike.%${term}%,inv_variants.name.ilike.%${term}%,inv_variants.sku.ilike.%${term}%,inv_variants.barcode.ilike.%${term}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(parsePgErr(error));

  const rows: PurchaseVariantSearchRow[] = [];
  for (const raw of (data as any[]) ?? []) {
    const variantId = raw.id;
    const { data: stockData } = await (supabase as any)
      .from("inv_variant_stocks")
      .select("current_stock")
      .eq("branch_id", branchId)
      .eq("variant_id", variantId)
      .maybeSingle();

    rows.push({
      variantId,
      variantName: raw.name,
      productId: raw.product_id,
      productName: raw.inv_products.name,
      productKind: raw.inv_products.product_kind,
      conditionType: raw.inv_products.condition_type,
      sku: raw.sku,
      barcode: raw.barcode,
      unit: raw.unit,
      costPrice: Number(raw.cost_price),
      sellingPrice: Number(raw.selling_price),
      minStock: Number(raw.min_stock ?? 0),
      currentStock: Number(stockData?.current_stock ?? 0),
      attributes: raw.attributes ?? {},
      categoryId: raw.inv_products.category_id,
    });
  }

  return rows;
}

/* ─── Use sparepart for service V4 (atomic RPC) ─── */

export async function useSparepartForServiceV4(
  supabase: SupabaseClientLike,
  input: UseSparepartForServiceV4Input,
  brandId: number,
  createdBy: string,
): Promise<ServiceSparepartUsageResult> {
  const { data, error } = await (supabase as any)
    .rpc("use_inv_sparepart_for_service", {
      p_brand_id: brandId,
      p_branch_id: input.branchId,
      p_service_id: input.serviceId,
      p_items: input.items.map((item) => ({
        variant_id: item.variantId,
        quantity: item.quantity,
      })),
      p_notes: input.notes ?? null,
      p_created_by: createdBy,
    });

  if (error) throw new Error(parsePgErr(error));

  return {
    usageCount: Number(data.usage_count),
    movementIds: (data.movement_ids ?? []) as string[],
    usageIds: (data.usage_ids ?? []) as string[],
  };
}

/* ─── List service sparepart usage V4 ─── */

export async function listServiceSparepartUsageV4(
  supabase: SupabaseClientLike,
  serviceId: string,
): Promise<ServiceSparepartUsageV4Row[]> {
  const { data, error } = await (supabase as any)
    .from("inv_sparepart_usage")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(parsePgErr(error));

  return ((data as any[]) ?? []).map((r: any) => ({
    id: r.id,
    serviceId: r.service_id,
    productId: r.product_id,
    variantId: r.variant_id,
    quantity: Number(r.quantity),
    costPriceSnapshot: Number(r.cost_price_snapshot),
    sellingPriceSnapshot: Number(r.selling_price_snapshot),
    itemNameSnapshot: r.item_name_snapshot,
    variantNameSnapshot: r.variant_name_snapshot,
    attributesSnapshot: r.attributes_snapshot ?? {},
    movementId: r.movement_id,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
}

/* ─── Search services V4 ─── */

export async function searchServicesV4(
  supabase: SupabaseClientLike,
  brandId: number,
  branchId: string,
  search?: string,
): Promise<ServiceSparepartSearchRow[]> {
  let query = (supabase as any)
    .from("services")
    .select(`
      id, service_number, customer_name, brand_name, type_name, current_status,
      brand_id, branch_id
    `)
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .in("current_status", ["PERBAIKAN", "QC"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`service_number.ilike.%${term}%,customer_name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(parsePgErr(error));

  return ((data as any[]) ?? []).map((r: any) => ({
    serviceId: r.id,
    serviceNumber: r.service_number,
    customerName: r.customer_name ?? null,
    deviceBrand: r.brand_name ?? null,
    deviceModel: r.type_name ?? null,
    currentStatus: r.current_status ?? null,
    brandId: r.brand_id,
    branchId: r.branch_id,
  }));
}

/* ─── POS V4 ─── */

/* ─── List POS products V4 ─── */

export async function listPosProductsV4(
  supabase: SupabaseClientLike,
  brandId: number,
  branchId: string,
  categoryId?: string | null,
  search?: string,
): Promise<PosProductV4Row[]> {
  console.log("[pos-v4/repo] query input", { brandId, branchId, categoryId, search });

  // ── Step 1: Query inv_products directly (no joins) ──────────────────────
  let productQuery = (supabase as any)
    .from("inv_products")
    .select("id, name, image_url, product_kind, condition_type, category_id, unit, appears_in_pos")
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .eq("appears_in_pos", true)
    .not("product_kind", "eq", "SPAREPART")
    .order("name", { ascending: true });

  // category filter: ignore "ALL" sentinel or empty string
  if (categoryId && categoryId !== "ALL") {
    productQuery = productQuery.eq("category_id", categoryId);
  }
  if (search && search.trim()) {
    productQuery = productQuery.ilike("name", `%${search.trim()}%`);
  }

  const { data: productsData, error: productsError } = await productQuery;
  if (productsError) throw new Error(parsePgErr(productsError));

  console.log("[pos-v4/repo] products count", productsData?.length ?? 0);

  if (!productsData || productsData.length === 0) return [];

  const productIds = (productsData as any[]).map((p) => p.id);

  // ── Step 2: Query inv_variants for those products ────────────────────────
  const { data: variantsData, error: variantsError } = await (supabase as any)
    .from("inv_variants")
    .select("id, product_id, name, attributes, sku, barcode, image_url, cost_price, selling_price, min_stock, unit")
    .in("product_id", productIds)
    .eq("is_active", true);
  if (variantsError) throw new Error(parsePgErr(variantsError));

  console.log("[pos-v4/repo] variants count", variantsData?.length ?? 0);

  const variantIds = (variantsData as any[] ?? []).map((v) => v.id);

  // ── Step 3: Query inv_variant_stocks for those variants at this branch ───
  let stocksData: any[] = [];
  if (variantIds.length > 0) {
    const { data: sd, error: stocksError } = await (supabase as any)
      .from("inv_variant_stocks")
      .select("variant_id, current_stock")
      .in("variant_id", variantIds)
      .eq("branch_id", branchId);
    if (stocksError) throw new Error(parsePgErr(stocksError));
    stocksData = sd ?? [];
  }

  console.log("[pos-v4/repo] stocks count", stocksData.length);

  // Build stock lookup: variantId → currentStock
  const stockMap = new Map<string, number>();
  for (const s of stocksData) {
    stockMap.set(s.variant_id, Number(s.current_stock ?? 0));
  }

  // ── Step 4: Query READY_STOCK units for Unit SECOND products ─────────────
  const unitSecondProductIds = (productsData as any[])
    .filter((p) => p.product_kind === "UNIT" && p.condition_type === "SECOND")
    .map((p) => p.id);

  // unitReadyMap: productId → count
  const unitReadyMap = new Map<string, number>();
  // fallbackUnitImageMap: productId → image_url of newest ready unit
  const fallbackUnitImageMap = new Map<string, string | null>();
  if (unitSecondProductIds.length > 0) {
    const { data: unitsData, error: unitsError } = await (supabase as any)
      .from("inv_units")
      .select("product_id, image_url, created_at")
      .in("product_id", unitSecondProductIds)
      .eq("branch_id", branchId)
      .eq("status", "READY_STOCK")
      .order("created_at", { ascending: false });
    if (unitsError) throw new Error(parsePgErr(unitsError));
    console.log("[pos-v4/repo] units (READY_STOCK) count", unitsData?.length ?? 0);
    for (const u of (unitsData ?? []) as any[]) {
      const pid = u.product_id;
      unitReadyMap.set(pid, (unitReadyMap.get(pid) ?? 0) + 1);
      // Only set fallback if not already set (first = newest due to ordering desc)
      if (!fallbackUnitImageMap.has(pid)) {
        fallbackUnitImageMap.set(pid, u.image_url ?? null);
      }
    }
  }

  // ── Step 5: Assemble ─────────────────────────────────────────────────────
  // Build variant list per product
  const variantsByProduct = new Map<string, any[]>();
  for (const v of (variantsData as any[] ?? [])) {
    const arr = variantsByProduct.get(v.product_id) ?? [];
    arr.push(v);
    variantsByProduct.set(v.product_id, arr);
  }

  // Fetch category names once
  const catIds = [...new Set((productsData as any[]).map((p) => p.category_id).filter(Boolean))];
  const categoryNameMap = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await (supabase as any)
      .from("inventory_categories")
      .select("id, name")
      .in("id", catIds);
    for (const c of (cats ?? []) as any[]) {
      categoryNameMap.set(c.id, c.name);
    }
  }

  const result: PosProductV4Row[] = [];

  for (const p of (productsData as any[])) {
    const pid = p.id;
    const isUnitSecond = p.product_kind === "UNIT" && p.condition_type === "SECOND";
    const pvariants = variantsByProduct.get(pid) ?? [];

    const assembledVariants: PosVariantV4Row[] = [];

    if (isUnitSecond) {
      // Unit SECOND: show if there are READY_STOCK units; stock = count of those units
      const readyCount = unitReadyMap.get(pid) ?? 0;
      if (readyCount > 0) {
        // Use first variant as representative (Unit Second has one variant)
        const v = pvariants[0];
        if (v) {
          assembledVariants.push({
            variantId: v.id,
            variantName: v.name,
            attributes: v.attributes ?? {},
            sku: v.sku ?? null,
            barcode: v.barcode ?? null,
            imageUrl: v.image_url ?? p.image_url ?? null,
            costPrice: Number(v.cost_price ?? 0),
            sellingPrice: Number(v.selling_price ?? 0),
            minStock: Number(v.min_stock ?? 0),
            currentStock: readyCount,
            unit: v.unit ?? p.unit ?? "pcs",
          });
        }
      }
    } else {
      // PRODUCT or UNIT NEW: show variants with stock > 0
      for (const v of pvariants) {
        const currentStock = stockMap.get(v.id) ?? 0;
        if (currentStock > 0) {
          assembledVariants.push({
            variantId: v.id,
            variantName: v.name,
            attributes: v.attributes ?? {},
            sku: v.sku ?? null,
            barcode: v.barcode ?? null,
            imageUrl: v.image_url ?? p.image_url ?? null,
            costPrice: Number(v.cost_price ?? 0),
            sellingPrice: Number(v.selling_price ?? 0),
            minStock: Number(v.min_stock ?? 0),
            currentStock,
            unit: v.unit ?? p.unit ?? "pcs",
          });
        }
      }
    }

    if (assembledVariants.length === 0) continue; // skip products with no sellable variants

    const productImageUrl = p.image_url ?? null;
    const fallbackImage = isUnitSecond ? (fallbackUnitImageMap.get(pid) ?? null) : null;

    result.push({
      productId: pid,
      name: p.name,
      productKind: p.product_kind,
      conditionType: p.condition_type ?? null,
      categoryId: p.category_id ?? null,
      categoryName: p.category_id ? (categoryNameMap.get(p.category_id) ?? null) : null,
      imageUrl: productImageUrl,
      fallbackUnitImageUrl: fallbackImage,
      unit: p.unit ?? "pcs",
      appearsInPos: p.appears_in_pos,
      variants: assembledVariants,
    });
  }

  console.log("[pos-v4/repo] final assembled products count", result.length);
  return result;
}


/* ─── Search Unit Second models for autocomplete V4 ─── */

export async function searchUnitSecondModelsV4(
  supabase: SupabaseClientLike,
  brandId: number,
  branchId: string,
  query: string,
): Promise<Array<{
  productId: string;
  name: string;
  categoryName: string | null;
  readyCount: number;
}>> {
  if (!query.trim()) return [];

  // Search matching products
  const { data: products, error: productsErr } = await (supabase as any)
    .from("inv_products")
    .select("id, name, category_id")
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .eq("product_kind", "UNIT")
    .eq("condition_type", "SECOND")
    .eq("is_active", true)
    .ilike("name", `%${query.trim()}%`)
    .order("name", { ascending: true })
    .limit(10);

  if (productsErr) throw new Error(parsePgErr(productsErr));
  if (!products || products.length === 0) return [];

  const productIds = (products as any[]).map((p) => p.id);

  // Fetch category names
  const catIds = [...new Set((products as any[]).map((p) => p.category_id).filter(Boolean))];
  const categoryNameMap = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await (supabase as any)
      .from("inventory_categories")
      .select("id, name")
      .in("id", catIds);
    for (const c of (cats ?? []) as any[]) {
      categoryNameMap.set(c.id, c.name);
    }
  }

  // Count READY_STOCK units per product
  const { data: unitsData } = await (supabase as any)
    .from("inv_units")
    .select("product_id")
    .in("product_id", productIds)
    .eq("branch_id", branchId)
    .eq("status", "READY_STOCK");

  const readyCountMap = new Map<string, number>();
  for (const u of (unitsData ?? []) as any[]) {
    readyCountMap.set(u.product_id, (readyCountMap.get(u.product_id) ?? 0) + 1);
  }

  return (products as any[]).map((p) => ({
    productId: p.id,
    name: p.name,
    categoryName: p.category_id ? (categoryNameMap.get(p.category_id) ?? null) : null,
    readyCount: readyCountMap.get(p.id) ?? 0,
  }));
}

/* ─── List Unit Second options for a product V4 ─── */

export async function listPosUnitOptionsV4(
  supabase: SupabaseClientLike,
  productId: string,
  branchId: string,
): Promise<PosUnitSecondOptionV4Row[]> {
  const { data, error } = await (supabase as any)
    .from("inv_units")
    .select(`
      id, product_id, variant_id, unit_attributes, image_url,
      imei, serial_number, battery_health, condition_grade,
      purchase_cost, selling_price, status,
      inv_variants!left(name)
    `)
    .eq("product_id", productId)
    .eq("branch_id", branchId)
    .eq("status", "READY_STOCK")
    .order("created_at", { ascending: true });

  if (error) throw new Error(parsePgErr(error));

  return ((data as any[]) ?? []).map((r: any) => ({
    unitId: r.id,
    productId: r.product_id,
    variantId: r.variant_id ?? null,
    variantName: r.inv_variants?.name ?? null,
    unitAttributes: r.unit_attributes ?? null,
    imageUrl: r.image_url ?? null,
    imei: r.imei ?? null,
    serialNumber: r.serial_number ?? null,
    batteryHealth: r.battery_health ?? null,
    conditionGrade: r.condition_grade ?? null,
    purchaseCost: Number(r.purchase_cost),
    sellingPrice: Number(r.selling_price),
    status: r.status,
  }));
}

/* ─── Checkout POS V4 (atomic RPC) ─── */

export async function checkoutPosV4(
  supabase: SupabaseClientLike,
  input: CheckoutPosV4Input & { branchId: string },
  brandId: number,
  createdBy: string,
): Promise<CheckoutPosV4Result> {
  const { data, error } = await (supabase as any)
    .rpc("checkout_pos_v4", {
      p_brand_id: brandId,
      p_branch_id: input.branchId,
      p_payment_method_id: input.paymentMethodId,
      p_items: input.items.map((item: CheckoutPosItemV4Input) => {
        const obj: Record<string, any> = {
          item_type: item.itemType,
          selling_price: item.sellingPrice,
        };
        if (item.itemType === "UNIT_SECOND_SERIALIZED") {
          obj.unit_id = item.unitId;
        } else {
          obj.variant_id = item.variantId;
          obj.quantity = item.quantity ?? 1;
        }
        return obj;
      }),
      p_customer_id: input.customerId ?? null,
      p_discount_amount: input.discountAmount ?? 0,
      p_service_fee_amount: input.serviceFeeAmount ?? 0,
      p_paid_amount: input.paidAmount ?? 0,
      p_notes: input.notes ?? null,
      p_created_by: createdBy,
    });

  if (error) throw new Error(parsePgErr(error));

  return {
    transactionId: data.transaction_id,
    transactionNumber: data.transaction_number,
    subtotalAmount: Number(data.subtotal_amount),
    discountAmount: Number(data.discount_amount),
    serviceFeeAmount: Number(data.service_fee_amount),
    totalAmount: Number(data.total_amount),
    paidAmount: Number(data.paid_amount),
    changeAmount: Number(data.change_amount),
    mdrAmount: Number(data.mdr_amount),
    netAmount: Number(data.net_amount),
    paymentAccountId: data.payment_account_id,
    paymentAccountMovementId: data.payment_account_movement_id,
    movementIds: (data.movement_ids ?? []) as string[],
  };
}

/* ─── List POS transactions V4 ─── */

export async function listPosTransactionsV4(
  supabase: SupabaseClientLike,
  brandId: number,
  branchId?: string | null,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: PosTransactionV4Row[]; total: number }> {
  const { from, to } = buildPagination(page, pageSize);

  let query = (supabase as any)
    .from("pos_transactions")
    .select("*, payment_methods!left(name)", { count: "exact" })
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(parsePgErr(error));

  const creatorIds = [...new Set((data ?? []).map((p: any) => p.created_by).filter(Boolean))];
  let profileMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, name")
      .in("id", creatorIds);
    for (const p of profiles ?? []) profileMap.set(p.id, p.name);
  }

  const rows: PosTransactionV4Row[] = ((data as any[]) ?? []).map((r: any) => ({
    id: r.id,
    brandId: r.brand_id,
    branchId: r.branch_id,
    transactionNumber: r.transaction_number,
    customerId: r.customer_id ?? null,
    customerName: null,
    subtotalAmount: Number(r.subtotal_amount),
    discountAmount: Number(r.discount_amount),
    serviceFeeAmount: Number(r.service_fee_amount),
    totalAmount: Number(r.total_amount),
    paidAmount: Number(r.paid_amount),
    changeAmount: Number(r.change_amount),
    paymentMethodId: r.payment_method_id,
    paymentMethodName: r.payment_methods?.name ?? null,
    paymentAccountId: r.payment_account_id,
    paymentAccountName: null,
    status: r.status,
    notes: r.notes ?? null,
    createdBy: r.created_by,
    createdByName: profileMap.get(r.created_by) ?? null,
    createdAt: r.created_at,
  }));

  return { data: rows, total: count ?? 0 };
}

/* ─── Get POS transaction detail V4 ─── */

export async function getPosTransactionDetailV4(
  supabase: SupabaseClientLike,
  transactionId: string,
): Promise<PosTransactionItemV4Row[]> {
  const { data, error } = await (supabase as any)
    .from("pos_transaction_items")
    .select("*")
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(parsePgErr(error));

  return ((data as any[]) ?? []).map((r: any) => ({
    id: r.id,
    transactionId: r.transaction_id,
    productId: r.product_id,
    variantId: r.variant_id ?? null,
    unitId: r.unit_id ?? null,
    itemType: r.item_type,
    itemNameSnapshot: r.item_name_snapshot,
    variantNameSnapshot: r.variant_name_snapshot ?? null,
    attributesSnapshot: r.attributes_snapshot ?? null,
    imeiSnapshot: r.imei_snapshot ?? null,
    serialNumberSnapshot: r.serial_number_snapshot ?? null,
    batteryHealthSnapshot: r.battery_health_snapshot ?? null,
    conditionSnapshot: r.condition_snapshot ?? null,
    quantity: Number(r.quantity),
    costPriceSnapshot: Number(r.cost_price_snapshot),
    sellingPriceSnapshot: Number(r.selling_price_snapshot),
    subtotalAmount: Number(r.subtotal_amount),
    movementId: r.movement_id ?? null,
  }));
}

/* ─── List POS product categories V4 ─── */

export async function listPosCategoriesV4(
  supabase: SupabaseClientLike,
  brandId: number,
): Promise<CategoryV4Row[]> {
  const { data, error } = await (supabase as any)
    .from("inventory_categories")
    .select("id, brand_id, name, description, is_active, stock_type, item_type, sort_order")
    .eq("brand_id", brandId)
    .in("item_type", ["PRODUCT", "DEVICE_UNIT"])
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(parsePgErr(error));

  return ((data as any[]) ?? []).map((c: any) => ({
    id: c.id,
    brandId: c.brand_id,
    name: c.name,
    description: c.description ?? null,
    isActive: c.is_active,
    stockType: c.stock_type ?? null,
    itemType: c.item_type,
    sortOrder: c.sort_order,
  }));
}

/* ─── List payment methods for POS V4 ─── */

export async function listPosPaymentMethodsV4(
  supabase: SupabaseClientLike,
  brandId: number,
  branchId: string,
): Promise<any[]> {
  // Allowed POS method types
  const POS_METHOD_TYPES = ["CASH", "QRIS", "TRANSFER", "DEBIT"];

  // Helper to convert method_type to display name
  const labelFromMethodType = (type: string): string => {
    switch (type) {
      case "CASH":
        return "Tunai";
      case "QRIS":
        return "QRIS";
      case "TRANSFER":
        return "Transfer";
      case "DEBIT":
        return "Debit";
      case "E_WALLET":
        return "E-Wallet";
      default:
        return type;
    }
  };

  const { data, error } = await (supabase as any)
    .from("branch_payment_methods")
    .select("id, brand_id, branch_id, method_type, payment_account_id, mdr_percentage, is_active")
    .eq("brand_id", brandId)
    .eq("branch_id", branchId)
    .eq("is_active", true);

  if (error) {
    console.error("[pos-v4/payment-methods] query error", error);
    throw new Error(error.message);
  }

  const rows = (data ?? []).filter((r: any) => POS_METHOD_TYPES.includes(r.method_type));

  return rows.map((row: any) => ({
    branchPaymentMethodId: row.id,
    methodType: row.method_type,
    paymentAccountId: row.payment_account_id ?? null,
    mdrPercentage: row.mdr_percentage === null ? null : Number(row.mdr_percentage),
    paymentMethodId: row.id,
    paymentMethodName: labelFromMethodType(row.method_type),
    paymentMethodType: row.method_type,
    defaultPaymentAccountId: row.payment_account_id ?? null,
  }));
}

export async function voidPosTransactionV4(
  supabase: SupabaseClientLike,
  brandId: number,
  branchId: string,
  transactionId: string,
  reason: string,
): Promise<VoidPosTransactionV4Result> {
  const { data, error } = await (supabase as any).rpc("void_pos_transaction_v4", {
    p_brand_id: brandId,
    p_branch_id: branchId,
    p_transaction_id: transactionId,
    p_reason: reason,
  });

  if (error) throw new Error(parsePgErr(error));

  const r = data as Record<string, any>;
  return {
    transactionId: r.transaction_id,
    transactionNumber: r.transaction_number,
    status: r.status,
    restoredItemCount: r.restored_item_count,
    stockMovementIds: r.stock_movement_ids ?? [],
    paymentReversalMovementId: r.payment_reversal_movement_id,
    reversalId: r.reversal_id,
  };
}
