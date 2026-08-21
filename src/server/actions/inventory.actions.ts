"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  requireBranchAccess,
  requireActiveStoreSession,
  handleActionError,
  type ActionResult,
} from "./action-helper";
import { ok, fail, type Result } from "@/lib/utils/result";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getBranchesByBrandId } from "@/repositories/branch.repository";
import type { ItemType } from "@/types/app";

/* ── Types ── */

export interface InventoryListInput {
  branchId?: string | null;
  categoryId?: string | null;
  itemType?: string | null;
  stockType?: string | null;
  trackingType?: string | null;
  stockStatus?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
  groupByParent?: boolean;
  /** 
   * grouped: show non-variant + parent items (exclude child variants). Default for inventory page.
   * stockableOnly: show non-variant + child variants, exclude parent items. Default for selectors.
   * flat: show all rows. No filtering by variant relationship.
   */
  mode?: "grouped" | "stockableOnly" | "flat";
}

import {
  resolveUserFacingItemType,
  mapToItemType,
  resolveTrackingTypeSync,
  type UserFacingItemType,
} from "@/types/app";

export type { UserFacingItemType };

export async function resolveUserFacingType(itemType: string): Promise<UserFacingItemType> {
  return resolveUserFacingItemType(itemType);
}

export async function mapToInternalItemType(userType: UserFacingItemType): Promise<string> {
  return mapToItemType(userType);
}

export async function resolveTrackingType(itemType: string, unitCondition?: string | null): Promise<string> {
  return resolveTrackingTypeSync(itemType, unitCondition);
}

export interface InventoryItemRow {
  id: string;
  brandId: number;
  categoryId: string | null;
  categoryName: string | null;
  itemType: string;
  stockType: string;
  appearsInPos: boolean;
  serviceUsageEnabled: boolean;
  unitAttributes: Record<string, any>;
  name: string;
  sku: string | null;
  barcode: string | null;
  variantName: string | null;
  variantAttributes: Record<string, any>;
  trackingType: string;
  description: string | null;
  unitName: string;
  costPrice: number;
  averageCost: number;
  sellingPrice: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  branchId: string | null;
  branchName: string | null;
  parentItemId: string | null;
  isVariantParent: boolean;
  hasVariants: boolean;
  variantOptionValues: Record<string, any>;
  variantDisplayName: string | null;
  unitCondition: string | null;
}

export interface InventoryListResult {
  items: InventoryItemRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InventoryCategoryRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  stockType?: string;
  /** @deprecated Use stockType instead */
  itemType?: string;
}

export interface VariationGroup {
  id: string;
  name: string;
  options: VariationOption[];
}

export interface VariationOption {
  id: string;
  name: string;
  description?: string;
}

export interface VariantInput {
  displayName: string;
  sku?: string | null;
  barcode?: string | null;
  costPrice: number;
  sellingPrice: number;
  initialStock: number;
}

export interface CreateInventoryInput {
  branchId?: string | null;
  categoryId?: string | null;
  name: string;
  userFacingType: UserFacingItemType;
  stockType: string;
  itemType: string;
  unitCondition?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unitName?: string;
  minStock?: number;
  costPrice?: number;
  sellingPrice?: number;
  initialStock?: number;
  isActive?: boolean;
  description?: string | null;
  hasVariants: boolean;
  appearsInPos: boolean;
  serviceUsageEnabled: boolean;
  unitAttributes?: Record<string, any>;
  variationGroups?: VariationGroup[];
  variants?: Record<string, VariantInput>;
  parentId?: string | null;
}

export interface UpdateInventoryInput {
  categoryId?: string | null;
  name?: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  unitName?: string;
  costPrice?: number;
  sellingPrice?: number;
  minStock?: number;
  isActive?: boolean;
  appearsInPos?: boolean;
  serviceUsageEnabled?: boolean;
  stockType?: string;
}

export interface FindByBarcodeInput {
  code: string;
  branchId?: string | null;
}

export interface FindByBarcodeResult {
  type: "INVENTORY_ITEM" | "SERIALIZED_UNIT";
  item: InventoryItemRow;
  serializedUnit?: SerializedUnitRow;
}

/* ── Serialized Unit types ── */

export type SerializedUnitStatus = "READY_STOCK" | "RESERVED" | "SOLD" | "IN_SERVICE" | "DEFECTIVE" | "RETURNED" | "ARCHIVED";

export interface SerializedUnitRow {
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

export interface SerializedUnitInput {
  branchId: string;
  inventoryItemId: string;
  serialNumber?: string | null;
  imei?: string | null;
  barcode?: string | null;
  batteryHealth?: number | null;
  conditionGrade?: string | null;
  physicalConditionNotes?: string | null;
  functionalConditionNotes?: string | null;
  accessoriesIncluded?: string | null;
  purchaseCost?: number | null;
  sellingPrice?: number | null;
  status?: SerializedUnitStatus;
  sourceType?: string | null;
  sourceReferenceId?: string | null;
}

export interface SerializedUnitListInput {
  branchId?: string | null;
  status?: string | null;
  search?: string | null;
  inventoryItemId?: string | null;
  page?: number;
  pageSize?: number;
}

export interface SerializedUnitListResult {
  items: SerializedUnitRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ── Helpers ── */

function mapRow(item: any, stock?: any): InventoryItemRow {
  return {
    id: item.id,
    brandId: item.brand_id,
    categoryId: item.category_id,
    categoryName: item.category_name ?? null,
    itemType: item.item_type,
    stockType: item.stock_type ?? (item.item_type === "SPAREPART" ? "SPAREPART" : item.item_type === "DEVICE_UNIT" ? "UNIT" : "PRODUCT"),
    appearsInPos: item.appears_in_pos ?? false,
    serviceUsageEnabled: item.service_usage_enabled ?? false,
    unitAttributes: (item.unit_attributes ?? {}) as Record<string, any>,
    name: item.name,
    sku: item.sku ?? null,
    barcode: item.barcode ?? null,
    variantName: item.variant_name ?? null,
    variantAttributes: (item.variant_attributes ?? {}) as Record<string, any>,
    trackingType: item.tracking_type ?? "QUANTITY",
    description: item.description ?? null,
    unitName: item.unit_name ?? "pcs",
    costPrice: Number(item.cost_price ?? 0),
    averageCost: Number(item.average_cost ?? 0),
    sellingPrice: Number(item.selling_price ?? 0),
    minStock: Number(item.min_stock ?? 0),
    isActive: item.is_active ?? true,
    createdAt: item.created_at ?? new Date().toISOString(),
    updatedAt: item.updated_at ?? new Date().toISOString(),
    currentStock: Number(stock?.current_stock ?? item.current_stock ?? 0),
    reservedStock: Number(stock?.reserved_stock ?? item.reserved_stock ?? 0),
    availableStock: Number(stock?.available_stock ?? item.available_stock ?? 0),
    branchId: stock?.branch_id ?? item.branch_id ?? null,
    branchName: stock?.branch_name ?? item.branch_name ?? null,
    parentItemId: item.parent_item_id ?? null,
    isVariantParent: item.is_variant_parent ?? false,
    hasVariants: item.has_variants ?? false,
    variantOptionValues: (item.variant_option_values ?? {}) as Record<string, any>,
    variantDisplayName: item.variant_display_name ?? null,
    unitCondition: item.unit_condition ?? null,
  };
}

/* ── List inventory items ── */

export async function listInventoryItemsAction(
  brandSlug: string,
  input: InventoryListInput,
): Promise<ActionResult<InventoryListResult>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    if (input.branchId && input.branchId !== "ALL_BRANCHES") {
      requireBranchAccess(session, input.branchId, "listInventoryItemsAction");
    }

    const supabase = await createServerSupabase();
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const allBranches = await getBranchesByBrandId(supabase as any, session.brandId);
    const accessibleBranchIds =
      session.canAccessAllBranches
        ? allBranches.map((b: any) => b.id)
        : session.accessibleBranchIds;

    const branchFilter =
      input.branchId && input.branchId !== "ALL_BRANCHES" ? [input.branchId] : accessibleBranchIds;

    let query = (supabase as any)
      .from("inventory_listing")
      .select("*", { count: "exact" })
      .in("branch_id", branchFilter)
      .eq("brand_id", session.brandId);

    const mode = input.mode ?? (input.groupByParent ? "flat" : "stockableOnly");

    if (mode === "grouped") {
      query = query.is("parent_item_id", null);
    } else if (mode === "stockableOnly") {
      query = query.or("is_variant_parent.is.false,is_variant_parent.is.null");
    }
    // flat: no filter

    if (input.categoryId && input.categoryId !== "ALL_CATEGORIES") {
      query = query.eq("category_id", input.categoryId);
    }

    if (input.itemType && input.itemType !== "ALL_TYPES") {
      query = query.eq("item_type", input.itemType);
    }

    if (input.trackingType && input.trackingType !== "ALL_TRACKING_TYPES") {
      query = query.eq("tracking_type", input.trackingType);
    }

    if (input.stockType && input.stockType !== "ALL_TYPES") {
      query = query.eq("stock_type", input.stockType);
    }

    if (input.stockStatus && input.stockStatus !== "ALL_STATUS") {
      if (input.stockStatus === "OUT") {
        query = query.lte("current_stock", 0);
      } else if (input.stockStatus === "LOW") {
        query = query.gt("current_stock", 0).or(`current_stock.lte.min_stock`);
      } else if (input.stockStatus === "SAFE") {
        query = query.gt("current_stock", "min_stock");
      } else if (input.stockStatus === "INACTIVE") {
        query = query.eq("is_active", false);
      }
    }

    if (input.search && input.search.trim()) {
      const q = input.search.trim();
      query = query.or(
        `name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%,variant_name.ilike.%${q}%,variant_display_name.ilike.%${q}%`,
      );
    }

    query = query.order("updated_at", { ascending: false });
    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      return errorResult(error.message);
    }

    const items = (data ?? []).map((row: any) => mapRow(row));

    return successResult({
      items,
      total: count ?? items.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? items.length) / pageSize)),
    });
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat data inventory");
  }
}

/* ── Get single item ── */

export async function getInventoryItemAction(
  brandSlug: string,
  itemId: string,
): Promise<ActionResult<InventoryItemRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any)
      .from("inventory_listing")
      .select("*")
      .eq("id", itemId)
      .eq("brand_id", session.brandId)
      .single();

    if (error || !data) {
      return errorResult("Item tidak ditemukan");
    }

    return successResult(mapRow(data));
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat item");
  }
}

/* ── Create item ── */

export async function createInventoryItemAction(
  brandSlug: string,
  input: CreateInventoryInput,
): Promise<ActionResult<InventoryItemRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    const supabase = await createServerSupabase();

    // Validate required fields
    if (!input.name?.trim()) {
      return errorResult("Nama item wajib diisi");
    }
    if (!input.itemType) {
      return errorResult("Tipe item wajib diisi");
    }

    const targetBranchId = input.branchId || session.defaultBranchId;
    if (!targetBranchId) {
      return errorResult("Cabang wajib dipilih untuk item inventory.");
    }
    requireBranchAccess(session, targetBranchId, "create");

    await requireActiveStoreSession(supabase, session.brandId, targetBranchId);

    // Check barcode uniqueness per brand
    if (input.barcode && input.barcode.trim()) {
      const { data: existing } = await (supabase as any)
        .from("inventory_items")
        .select("id")
        .eq("brand_id", session.brandId)
        .eq("barcode", input.barcode.trim())
        .maybeSingle();

      if (existing) {
        return errorResult(`Barcode "${input.barcode}" sudah digunakan oleh item lain.`);
      }
    }

    // Check SKU uniqueness per brand
    if (input.sku && input.sku.trim()) {
      const { data: existingSku } = await (supabase as any)
        .from("inventory_items")
        .select("id")
        .eq("brand_id", session.brandId)
        .eq("sku", input.sku.trim())
        .maybeSingle();

      if (existingSku) {
        return errorResult(`SKU "${input.sku}" sudah digunakan oleh item lain.`);
      }
    }

    const trackingType = resolveTrackingTypeSync(input.itemType, input.unitCondition);

    if (!input.hasVariants) {
      // ── Case A: Single non-variant item ──
      const insertData: Record<string, any> = {
        brand_id: session.brandId,
        branch_id: targetBranchId,
        category_id: input.categoryId || null,
        item_type: input.itemType,
        stock_type: input.stockType,
        name: input.name.trim(),
        sku: input.sku?.trim() || null,
        barcode: input.barcode?.trim() || null,
        tracking_type: trackingType,
        unit_condition: input.unitCondition ?? null,
        appears_in_pos: input.appearsInPos,
        service_usage_enabled: input.serviceUsageEnabled,
        description: input.description?.trim() || null,
        unit_name: input.unitName || "pcs",
        cost_price: input.costPrice ?? 0,
        average_cost: (input.costPrice && (input.initialStock ?? 0) > 0) ? (input.costPrice ?? 0) : 0,
        selling_price: input.sellingPrice ?? 0,
        min_stock: input.minStock ?? 0,
        track_stock: trackingType === "QUANTITY",
        allow_negative_stock: false,
        is_active: input.isActive ?? true,
        is_variant_parent: false,
        has_variants: false,
        variant_option_values: {},
        current_stock: trackingType === "QUANTITY" ? (input.initialStock ?? 0) : 0,
        metadata: {},
        unit_attributes: input.unitAttributes ?? {},
      };

      const { data: newItem, error: insertError } = await (supabase as any)
        .from("inventory_items")
        .insert(insertData)
        .select()
        .single();

      if (insertError) return errorResult(insertError.message);
      const initialStock = trackingType === "QUANTITY" ? (input.initialStock ?? 0) : 0;

      if (targetBranchId && initialStock > 0) {
        const { data: existingStock } = await (supabase as any)
          .from("branch_inventory_stocks")
          .select("id")
          .eq("branch_id", targetBranchId)
          .eq("item_id", newItem.id)
          .maybeSingle();

        if (existingStock) {
          await (supabase as any)
            .from("branch_inventory_stocks")
            .update({ current_stock: initialStock, last_movement_at: new Date().toISOString() })
            .eq("id", existingStock.id);
        } else {
          await (supabase as any)
            .from("branch_inventory_stocks")
            .insert({ brand_id: session.brandId, branch_id: targetBranchId, item_id: newItem.id, current_stock: initialStock, reserved_stock: 0 });
        }
      }

      const { data: createdItem } = await (supabase as any)
        .from("inventory_listing")
        .select("*")
        .eq("id", newItem.id)
        .single();

      return successResult(mapRow(createdItem ?? newItem));
    }

    // ── Case B: Parent with variants ──
    if (!input.variants || Object.keys(input.variants).length === 0) {
      return errorResult("Item dengan variasi wajib memiliki minimal 1 varian.");
    }

    const parentData: Record<string, any> = {
      brand_id: session.brandId,
      branch_id: targetBranchId,
      category_id: input.categoryId || null,
      item_type: input.itemType,
      stock_type: input.stockType,
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      barcode: input.barcode?.trim() || null,
      tracking_type: trackingType,
      unit_condition: input.unitCondition ?? null,
      appears_in_pos: input.appearsInPos,
      service_usage_enabled: input.serviceUsageEnabled,
      description: input.description?.trim() || null,
      unit_name: input.unitName || "pcs",
      min_stock: input.minStock ?? 0,
      track_stock: false,
      allow_negative_stock: false,
      is_active: input.isActive ?? true,
      is_variant_parent: true,
      has_variants: true,
      variant_option_values: input.variationGroups ?? {},
      current_stock: 0,
      cost_price: 0,
      average_cost: 0,
      selling_price: 0,
      metadata: {},
    };

    const { data: parentItem, error: parentError } = await (supabase as any)
      .from("inventory_items")
      .insert(parentData)
      .select()
      .single();

    if (parentError) return errorResult(parentError.message);

    const childIds: string[] = [];

    for (const [variantKey, variant] of Object.entries(input.variants)) {
      const childInitialStock = trackingType === "QUANTITY" ? (variant.initialStock ?? 0) : 0;

      const childData: Record<string, any> = {
        brand_id: session.brandId,
        branch_id: targetBranchId,
        category_id: input.categoryId || null,
        item_type: input.itemType,
        name: input.name.trim(),
        variant_display_name: variant.displayName,
        variant_option_values: { variantKey },
        sku: variant.sku?.trim() || null,
        barcode: variant.barcode?.trim() || null,
        tracking_type: trackingType,
        unit_condition: input.unitCondition ?? null,
        unit_name: input.unitName || "pcs",
        cost_price: variant.costPrice ?? 0,
        average_cost: (variant.costPrice && childInitialStock > 0) ? variant.costPrice : 0,
        selling_price: variant.sellingPrice ?? 0,
        min_stock: input.minStock ?? 0,
        current_stock: childInitialStock,
        track_stock: trackingType === "QUANTITY",
        allow_negative_stock: false,
        is_active: true,
        parent_item_id: parentItem.id,
        is_variant_parent: false,
        has_variants: false,
        metadata: {},
      };

      const { data: childItem, error: childError } = await (supabase as any)
        .from("inventory_items")
        .insert(childData)
        .select()
        .single();

      if (childError) return errorResult(childError.message);
      childIds.push(childItem.id);

      // Create branch stock for child
      if (targetBranchId && childInitialStock > 0) {
        await (supabase as any)
          .from("branch_inventory_stocks")
          .insert({ brand_id: session.brandId, branch_id: targetBranchId, item_id: childItem.id, current_stock: childInitialStock, reserved_stock: 0 });
      }
    }

    return successResult(mapRow(parentItem));
  } catch (e: any) {
    return handleActionError(e, "Gagal membuat item");
  }
}

/* ── Update item ── */

export async function updateInventoryItemAction(
  brandSlug: string,
  itemId: string,
  input: UpdateInventoryInput,
): Promise<ActionResult<InventoryItemRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    const supabase = await createServerSupabase();

    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);

    // Verify item exists
    const { data: existingItem } = await (supabase as any)
      .from("inventory_items")
      .select("id, barcode, sku")
      .eq("id", itemId)
      .eq("brand_id", session.brandId)
      .single();

    if (!existingItem) {
      return errorResult("Item tidak ditemukan");
    }

    // Check barcode uniqueness if changing
    if (input.barcode && input.barcode.trim() && input.barcode.trim() !== existingItem.barcode) {
      const { data: dup } = await (supabase as any)
        .from("inventory_items")
        .select("id")
        .eq("brand_id", session.brandId)
        .eq("barcode", input.barcode.trim())
        .neq("id", itemId)
        .maybeSingle();

      if (dup) {
        return errorResult(`Barcode "${input.barcode}" sudah digunakan oleh item lain.`);
      }
    }

    // Check SKU uniqueness if changing
    if (input.sku && input.sku.trim() && input.sku.trim() !== existingItem.sku) {
      const { data: dupSku } = await (supabase as any)
        .from("inventory_items")
        .select("id")
        .eq("brand_id", session.brandId)
        .eq("sku", input.sku.trim())
        .neq("id", itemId)
        .maybeSingle();

      if (dupSku) {
        return errorResult(`SKU "${input.sku}" sudah digunakan oleh item lain.`);
      }
    }

    const updateData: Record<string, any> = {};

    if (input.categoryId !== undefined) updateData.category_id = input.categoryId || null;
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.sku !== undefined) updateData.sku = input.sku?.trim() || null;
    if (input.barcode !== undefined) updateData.barcode = input.barcode?.trim() || null;
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.unitName !== undefined) updateData.unit_name = input.unitName;
    if (input.costPrice !== undefined) updateData.cost_price = input.costPrice;
    if (input.sellingPrice !== undefined) updateData.selling_price = input.sellingPrice;
    if (input.minStock !== undefined) updateData.min_stock = input.minStock;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.appearsInPos !== undefined) updateData.appears_in_pos = input.appearsInPos;
    if (input.serviceUsageEnabled !== undefined) updateData.service_usage_enabled = input.serviceUsageEnabled;
    if (input.stockType !== undefined) updateData.stock_type = input.stockType;

    const { data: updated, error: updateError } = await (supabase as any)
      .from("inventory_items")
      .update(updateData)
      .eq("id", itemId)
      .select()
      .single();

    if (updateError) {
      return errorResult(updateError.message);
    }

    // Fetch with stock view
    const { data: fullItem } = await (supabase as any)
      .from("inventory_listing")
      .select("*")
      .eq("id", itemId)
      .single();

    return successResult(mapRow(fullItem ?? updated));
  } catch (e: any) {
    return handleActionError(e, "Gagal mengupdate item");
  }
}

/* ── Find by barcode ── */

export async function findInventoryByBarcodeAction(
  brandSlug: string,
  input: FindByBarcodeInput,
): Promise<ActionResult<FindByBarcodeResult>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    if (input.branchId && input.branchId !== "ALL_BRANCHES") {
      requireBranchAccess(session, input.branchId, "findInventoryByBarcodeAction");
    }

    const supabase = await createServerSupabase();
    const code = input.code?.trim();

    if (!code) {
      return errorResult("Kode tidak boleh kosong");
    }

    const allBranches = await getBranchesByBrandId(supabase as any, session.brandId);
    const accessibleBranchIds =
      session.canAccessAllBranches
        ? allBranches.map((b: any) => b.id)
        : session.accessibleBranchIds;

    const branchFilter =
      input.branchId && input.branchId !== "ALL_BRANCHES" ? [input.branchId] : accessibleBranchIds;

    // ── Priority 1-3: Search serialized units by barcode, IMEI, serial_number ──
    const { data: serializedUnit } = await (supabase as any)
      .from("inventory_serialized_units")
      .select(`
        *,
        branches!inner(name),
        inventory_items!inner(name, sku, variant_name, tracking_type, unit_name, item_type, cost_price, average_cost, selling_price, parent_item_id, is_variant_parent, has_variants, variant_option_values, variant_display_name, unit_condition)
      `)
      .eq("brand_id", session.brandId)
      .in("branch_id", branchFilter)
      .or(`barcode.eq.${code},imei.eq.${code},serial_number.eq.${code}`)
      .maybeSingle();

    if (serializedUnit) {
      const invItem = serializedUnit.inventory_items;
      const itemRow: InventoryItemRow = {
        id: serializedUnit.inventory_item_id,
        brandId: serializedUnit.brand_id,
        categoryId: invItem.category_id ?? null,
        categoryName: null,
        itemType: invItem.item_type,
        stockType: invItem.stock_type ?? (invItem.item_type === "SPAREPART" ? "SPAREPART" : invItem.item_type === "DEVICE_UNIT" ? "UNIT" : "PRODUCT"),
        appearsInPos: invItem.appears_in_pos ?? false,
        serviceUsageEnabled: invItem.service_usage_enabled ?? false,
        unitAttributes: (invItem.unit_attributes ?? {}) as Record<string, any>,
        name: invItem.name,
        sku: invItem.sku ?? null,
        barcode: invItem.barcode ?? null,
        variantName: invItem.variant_name ?? null,
        variantAttributes: (invItem.variant_attributes ?? {}) as Record<string, any>,
        trackingType: invItem.tracking_type ?? "QUANTITY",
        description: invItem.description ?? null,
        unitName: invItem.unit_name ?? "pcs",
        costPrice: Number(invItem.cost_price ?? 0),
        averageCost: Number(invItem.average_cost ?? 0),
        sellingPrice: Number(invItem.selling_price ?? 0),
        minStock: Number(invItem.min_stock ?? 0),
        isActive: invItem.is_active ?? true,
        currentStock: Number(serializedUnit.current_stock ?? 0),
        reservedStock: 0,
        availableStock: Number(serializedUnit.current_stock ?? 0),
        branchId: serializedUnit.branch_id,
        branchName: serializedUnit.branches?.name ?? null,
        createdAt: invItem.created_at,
        updatedAt: invItem.updated_at,
        parentItemId: invItem.parent_item_id ?? null,
        isVariantParent: invItem.is_variant_parent ?? false,
        hasVariants: invItem.has_variants ?? false,
        variantOptionValues: (invItem.variant_option_values ?? {}) as Record<string, any>,
        variantDisplayName: invItem.variant_display_name ?? null,
        unitCondition: invItem.unit_condition ?? null,
      };

      return successResult({
        type: "SERIALIZED_UNIT",
        item: itemRow,
        serializedUnit: mapSerializedUnitRow(serializedUnit),
      });
    }

    // ── Priority 4-5: Search inventory items by barcode, then SKU ──
    let item: any = null;

    const { data: barcodeResult } = await (supabase as any)
      .from("inventory_listing")
      .select("*")
      .eq("brand_id", session.brandId)
      .in("branch_id", branchFilter)
      .eq("barcode", code)
      .maybeSingle();

    if (barcodeResult) {
      item = barcodeResult;
    }

    if (!item) {
      const { data: skuResult } = await (supabase as any)
        .from("inventory_listing")
        .select("*")
        .eq("brand_id", session.brandId)
        .in("branch_id", branchFilter)
        .eq("sku", code)
        .maybeSingle();

      if (skuResult) {
        item = skuResult;
      }
    }

    if (!item) {
      const { data: fallbackItem } = await (supabase as any)
        .from("inventory_items")
        .select("id")
        .eq("brand_id", session.brandId)
        .or(`barcode.eq.${code},sku.eq.${code}`)
        .maybeSingle();

      if (fallbackItem) {
        const { data: fullItem } = await (supabase as any)
          .from("inventory_listing")
          .select("*")
          .eq("id", fallbackItem.id)
          .in("branch_id", branchFilter)
          .maybeSingle();

        if (fullItem) {
          item = fullItem;
        }
      }
    }

    if (!item) {
      return errorResult("Item atau unit dengan kode ini tidak ditemukan.");
    }

    // ── Guard: parent item with variants cannot be used directly ──
    if (item.has_variants) {
      return errorResult("Item ini memiliki varian. Pilih varian terlebih dahulu.");
    }

    return successResult({
      type: "INVENTORY_ITEM",
      item: mapRow(item),
    });
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal mencari item");
  }
}

/* ── List categories ── */

export async function getInventoryCategoriesAction(
  brandSlug: string,
  stockType?: string | null,
  includeInactive?: boolean,
): Promise<ActionResult<InventoryCategoryRow[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();

    let query = (supabase as any)
      .from("inventory_categories")
      .select("id, name, description, is_active, stock_type")
      .eq("brand_id", session.brandId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }
    if (stockType) {
      query = query.eq("stock_type", stockType);
    }

    const { data, error } = await query;

    if (error) {
      return errorResult(error.message);
    }

    return successResult(
      (data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        isActive: c.is_active,
        stockType: c.stock_type,
      })),
    );
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat kategori");
  }
}

/* ── Manage category (create/update/deactivate) ── */

export interface ManageCategoryInput {
  id?: string;
  name: string;
  stockType: string;
  description?: string | null;
  isActive?: boolean;
}

export async function manageInventoryCategoryAction(
  brandSlug: string,
  input: ManageCategoryInput,
): Promise<ActionResult<InventoryCategoryRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    const supabase = await createServerSupabase();

    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);

    if (!input.name?.trim()) {
      return errorResult("Nama kategori wajib diisi.");
    }
    if (!["SPAREPART", "PRODUCT", "UNIT"].includes(input.stockType)) {
      return errorResult("Tipe barang tidak valid.");
    }

    const name = input.name.trim();
    const stockType = input.stockType;

    // Check duplicate active name within same brand + stock_type
    let dupQuery = (supabase as any)
      .from("inventory_categories")
      .select("id, name, deleted_at")
      .eq("brand_id", session.brandId)
      .eq("stock_type", stockType)
      .is("deleted_at", null)
      .ilike("name", name);

    if (input.id) {
      dupQuery = dupQuery.neq("id", input.id);
    }
    const { data: dupes } = await dupQuery;
    if (dupes && dupes.length > 0) {
      return errorResult(`Kategori "${name}" sudah ada untuk tipe barang ini.`);
    }

    if (input.id) {
      // Update
      const updateData: Record<string, any> = {
        name,
        stock_type: stockType,
        updated_at: new Date().toISOString(),
      };
      if (input.description !== undefined) {
        updateData.description = input.description ?? null;
      }
      if (input.isActive !== undefined) {
        updateData.is_active = input.isActive;
      }

      const { data, error } = await (supabase as any)
        .from("inventory_categories")
        .update(updateData)
        .eq("id", input.id)
        .eq("brand_id", session.brandId)
        .select("id, name, description, is_active, stock_type")
        .single();

      if (error) return errorResult(error.message);

      return successResult({
        id: data.id,
        name: data.name,
        description: data.description ?? null,
        isActive: data.is_active,
        stockType: data.stock_type,
      });
    } else {
      // Insert
      // Check if soft-deleted record exists — re-activate it instead
      const { data: softDeleted } = await (supabase as any)
        .from("inventory_categories")
        .select("id, name, deleted_at")
        .eq("brand_id", session.brandId)
        .eq("stock_type", stockType)
        .ilike("name", name)
        .not("deleted_at", "is", null)
        .maybeSingle();

      if (softDeleted) {
        const { data, error } = await (supabase as any)
          .from("inventory_categories")
          .update({
            deleted_at: null,
            is_active: true,
            description: input.description ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", softDeleted.id)
          .select("id, name, description, is_active, stock_type")
          .single();

        if (error) return errorResult(error.message);
        return successResult({
          id: data.id,
          name: data.name,
          description: data.description ?? null,
          isActive: data.is_active,
          stockType: data.stock_type,
        });
      }

      const { data, error } = await (supabase as any)
        .from("inventory_categories")
        .insert({
          brand_id: session.brandId,
          name,
          stock_type: stockType,
          description: input.description ?? null,
          is_active: true,
        })
        .select("id, name, description, is_active, stock_type")
        .single();

      if (error) return errorResult(error.message);

      return successResult({
        id: data.id,
        name: data.name,
        description: data.description ?? null,
        isActive: data.is_active,
        stockType: data.stock_type,
      });
    }
  } catch (e: any) {
    return handleActionError(e, "Gagal mengelola kategori.");
  }
}

/* ── Toggle category active status ── */

export async function toggleInventoryCategoryAction(
  brandSlug: string,
  categoryId: string,
  active: boolean,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    const supabase = await createServerSupabase();

    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);

    const { error } = await (supabase as any)
      .from("inventory_categories")
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq("id", categoryId)
      .eq("brand_id", session.brandId);

    if (error) return errorResult(error.message);
    return successResult(undefined);
  } catch (e: any) {
    return handleActionError(e, "Gagal mengubah status kategori.");
  }
}

/* ── Delete category (soft delete only; hard delete if no items) ── */

export async function deleteInventoryCategoryAction(
  brandSlug: string,
  categoryId: string,
): Promise<ActionResult<void>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    const supabase = await createServerSupabase();

    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);

    const { data: items } = await (supabase as any)
      .from("inventory_items")
      .select("id")
      .eq("category_id", categoryId)
      .is("deleted_at", null)
      .limit(1);

    if (items && items.length > 0) {
      // Soft delete
      const { error } = await (supabase as any)
        .from("inventory_categories")
        .update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", categoryId)
        .eq("brand_id", session.brandId);
      if (error) return errorResult(error.message);
      return successResult(undefined);
    }

    // Hard delete
    const { error } = await (supabase as any)
      .from("inventory_categories")
      .delete()
      .eq("id", categoryId)
      .eq("brand_id", session.brandId);

    if (error) return errorResult(error.message);
    return successResult(undefined);
  } catch (e: any) {
    return handleActionError(e, "Gagal menghapus kategori.");
  }
}

/* ── Check barcode uniqueness ── */

export async function checkBarcodeUniqueAction(
  brandSlug: string,
  barcode: string,
  excludeItemId?: string,
): Promise<ActionResult<{ unique: boolean }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();

    let query = (supabase as any)
      .from("inventory_items")
      .select("id")
      .eq("brand_id", session.brandId)
      .eq("barcode", barcode.trim());

    if (excludeItemId) {
      query = query.neq("id", excludeItemId);
    }

    const { data } = await query.maybeSingle();

    return successResult({ unique: !data });
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memeriksa barcode");
  }
}

/* ── Duplicate barcode report ── */

export async function reportDuplicateBarcodesAction(
  brandSlug: string,
): Promise<ActionResult<{ barcode: string; count: number }[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any)
      .rpc("report_duplicate_barcodes", { p_brand_id: session.brandId });

    if (error) {
      // RPC may not exist yet; fall back to manual query
      const { data: items } = await (supabase as any)
        .from("inventory_items")
        .select("barcode")
        .eq("brand_id", session.brandId)
        .not("barcode", "is", null)
        .not("barcode", "eq", "");

      if (!items) return successResult([]);

      const countMap = new Map<string, number>();
      for (const item of items) {
        if (item.barcode) {
          countMap.set(item.barcode, (countMap.get(item.barcode) ?? 0) + 1);
        }
      }

      const duplicates = Array.from(countMap.entries())
        .filter(([_, count]) => count > 1)
        .map(([barcode, count]) => ({ barcode, count }));

      return successResult(duplicates);
    }

    return successResult(data ?? []);
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memeriksa barcode duplikat");
  }
}

/* ── Movement types helpaer ── */

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
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
};

function getMovementTypeLabel(t: string): string {
  return MOVEMENT_TYPE_LABELS[t] ?? t;
}

/* ── Movement types ── */

export interface MovementListInput {
  branchId?: string | null;
  movementType?: string | null;
  search?: string | null;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface MovementRow {
  id: string;
  brandId: number;
  branchId: string;
  branchName: string | null;
  itemId: string;
  itemName: string | null;
  itemSku: string | null;
  itemBarcode: string | null;
  itemVariantName: string | null;
  movementType: string;
  movementTypeLabel: string;
  direction: string;
  quantity: number;
  unitSnapshot: string | null;
  stockBefore: number;
  stockAfter: number;
  unitCostSnapshot: number | null;
  totalCostSnapshot: number;
  referenceType: string | null;
  referenceId: string | null;
  referenceLabel: string | null;
  notes: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface MovementListResult {
  items: MovementRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ── List inventory movements ── */

export async function listInventoryMovementsAction(
  brandSlug: string,
  input: MovementListInput,
): Promise<ActionResult<MovementListResult>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    if (input.branchId && input.branchId !== "ALL_BRANCHES") {
      requireBranchAccess(session, input.branchId, "listInventoryMovementsAction");
    }

    const supabase = await createServerSupabase();
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const allBranches = await getBranchesByBrandId(supabase as any, session.brandId);
    const accessibleBranchIds =
      session.canAccessAllBranches
        ? allBranches.map((b: any) => b.id)
        : session.accessibleBranchIds;

    const branchFilter =
      input.branchId && input.branchId !== "ALL_BRANCHES" ? [input.branchId] : accessibleBranchIds;

    let query = (supabase as any)
      .from("inventory_movements")
      .select(`
        *,
        branches!inner(name),
        profiles!inventory_movements_created_by_fkey(name)
      `, { count: "exact" })
      .in("branch_id", branchFilter)
      .eq("brand_id", session.brandId);

    if (input.movementType && input.movementType !== "ALL_TYPES") {
      query = query.eq("movement_type", input.movementType);
    }

    if (input.dateFrom) {
      query = query.gte("created_at", input.dateFrom);
    }

    if (input.dateTo) {
      query = query.lte("created_at", input.dateTo + "T23:59:59.999Z");
    }

    if (input.search && input.search.trim()) {
      const q = input.search.trim();
      // Subquery: filter by item name/sku/barcode via item_id lookup
      const { data: matchingItems } = await (supabase as any)
        .from("inventory_items")
        .select("id")
        .eq("brand_id", session.brandId)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);

      const itemIds = (matchingItems ?? []).map((i: any) => i.id);
      if (itemIds.length > 0) {
        query = query.in("item_id", itemIds);
      } else {
        // No matching items, return empty
        return successResult({
          items: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        });
      }
    }

    query = query.order("created_at", { ascending: false });
    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      return errorResult(error.message);
    }

    // Enrich with item info
    const itemIds = [...new Set((data ?? []).map((m: any) => m.item_id))];
    let itemMap = new Map<string, any>();
    if (itemIds.length > 0) {
      const { data: items } = await (supabase as any)
        .from("inventory_items")
        .select("id, name, sku, barcode, variant_name, unit_name")
        .in("id", itemIds);
      for (const it of items ?? []) {
        itemMap.set(it.id, it);
      }
    }

    const canViewCost = can(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const rows: MovementRow[] = (data ?? []).map((m: any) => {
      const item = itemMap.get(m.item_id) ?? {};
      return {
        id: m.id,
        brandId: m.brand_id,
        branchId: m.branch_id,
        branchName: m.branches?.name ?? null,
        itemId: m.item_id,
        itemName: item.name ?? null,
        itemSku: item.sku ?? null,
        itemBarcode: item.barcode ?? null,
        itemVariantName: item.variant_name ?? null,
        movementType: m.movement_type,
        movementTypeLabel: getMovementTypeLabel(m.movement_type),
        direction: m.direction,
        quantity: Number(m.quantity),
        unitSnapshot: m.unit_snapshot ?? item.unit_name ?? null,
        stockBefore: Number(m.before_quantity),
        stockAfter: Number(m.after_quantity),
        unitCostSnapshot: canViewCost ? (m.unit_cost_snapshot != null ? Number(m.unit_cost_snapshot) : null) : null,
        totalCostSnapshot: canViewCost ? Number(m.total_cost_snapshot ?? 0) : 0,
        referenceType: m.reference_type,
        referenceId: m.reference_id,
        referenceLabel: m.reference_label,
        notes: m.notes ?? m.description ?? null,
        createdBy: m.created_by,
        createdByName: m.profiles?.name ?? null,
        createdAt: m.created_at,
      };
    });

    return successResult({
      items: rows,
      total: count ?? rows.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? rows.length) / pageSize)),
    });
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat movement stok");
  }
}

/* ── Stock adjustment ── */

export interface AdjustStockInput {
  itemId: string;
  branchId: string;
  direction: "IN" | "OUT";
  quantity: number;
  reason: string;
}

export async function adjustInventoryStockAction(
  brandSlug: string,
  input: AdjustStockInput,
): Promise<ActionResult<MovementRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();
    const { itemId, branchId, direction, quantity, reason } = input;

    if (!reason?.trim()) {
      return errorResult("Alasan penyesuaian wajib diisi");
    }
    if (quantity <= 0) {
      return errorResult("Jumlah harus lebih dari 0");
    }

    // Verify branch access
    requireBranchAccess(session, branchId, "adjustment");

    await requireActiveStoreSession(supabase, session.brandId, branchId);

    // Fetch item
    const { data: item, error: itemError } = await (supabase as any)
      .from("inventory_items")
      .select("*")
      .eq("id", itemId)
      .eq("brand_id", session.brandId)
      .single();

    if (itemError || !item) {
      return errorResult("Item tidak ditemukan");
    }

    // Fetch current stock
    const { data: stockRow } = await (supabase as any)
      .from("branch_inventory_stocks")
      .select("*")
      .eq("branch_id", branchId)
      .eq("item_id", itemId)
      .maybeSingle();

    const stockBefore = Number(stockRow?.current_stock ?? 0);
    let stockAfter: number;

    if (direction === "IN") {
      stockAfter = stockBefore + quantity;
    } else {
      if (stockBefore - quantity < 0 && !item.allow_negative_stock) {
        return errorResult(`Stok tidak mencukupi. Stok saat ini: ${stockBefore}`);
      }
      stockAfter = stockBefore - quantity;
    }

    const movementType = direction === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const refLabel = `Penyesuaian ${direction === "IN" ? "Masuk" : "Keluar"} - ${reason.substring(0, 50)}`;

    // Update branch stock
    if (stockRow?.id) {
      await (supabase as any)
        .from("branch_inventory_stocks")
        .update({
          current_stock: stockAfter,
          last_movement_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", stockRow.id);
    } else {
      await (supabase as any)
        .from("branch_inventory_stocks")
        .insert({
          brand_id: session.brandId,
          branch_id: branchId,
          item_id: itemId,
          current_stock: stockAfter,
          reserved_stock: 0,
        });
    }

    // Create movement
    const movementData: Record<string, any> = {
      brand_id: session.brandId,
      branch_id: branchId,
      item_id: itemId,
      movement_type: movementType,
      direction,
      quantity,
      unit_snapshot: item.unit_name ?? "pcs",
      before_quantity: stockBefore,
      after_quantity: stockAfter,
      unit_cost_snapshot: item.cost_price ?? 0,
      total_cost_snapshot: quantity * (item.cost_price ?? 0),
      selling_price_snapshot: item.selling_price ?? 0,
      total_price_snapshot: quantity * (item.selling_price ?? 0),
      reference_type: "INVENTORY_ADJUSTMENT",
      reference_label: refLabel,
      notes: reason,
      created_by: session.profileId,
    };

    const { data: movement, error: movError } = await (supabase as any)
      .from("inventory_movements")
      .insert(movementData)
      .select()
      .single();

    if (movError) {
      return errorResult(movError.message);
    }

    // Audit log
    await (supabase as any).from("audit_logs").insert({
      brand_id: session.brandId,
      branch_id: branchId,
      actor_id: session.profileId,
      action: direction === "IN" ? "STOCK_ADJUSTMENT_IN" : "STOCK_ADJUSTMENT_OUT",
      target_type: "INVENTORY_ITEM",
      target_id: itemId,
      target_label: item.name,
      description: `${direction === "IN" ? "Penyesuaian masuk" : "Penyesuaian keluar"}: ${item.name} - ${quantity} ${item.unit_name ?? "pcs"} (${reason})`,
    });

    // Return movement with item info
    const row: MovementRow = {
      id: movement.id,
      brandId: session.brandId,
      branchId,
      branchName: null,
      itemId,
      itemName: item.name,
      itemSku: item.sku,
      itemBarcode: item.barcode,
      itemVariantName: item.variant_name,
      movementType: movementType,
      movementTypeLabel: getMovementTypeLabel(movementType),
      direction,
      quantity,
      unitSnapshot: item.unit_name ?? "pcs",
      stockBefore,
      stockAfter,
      unitCostSnapshot: can(session.role, PERMISSIONS.INVENTORY_MANAGE) ? Number(item.cost_price) : null,
      totalCostSnapshot: can(session.role, PERMISSIONS.INVENTORY_MANAGE) ? quantity * Number(item.cost_price ?? 0) : 0,
      referenceType: "INVENTORY_ADJUSTMENT",
      referenceId: movement.id,
      referenceLabel: refLabel,
      notes: reason,
      createdBy: session.profileId,
      createdByName: null,
      createdAt: movement.created_at,
    };

    return successResult(row);
  } catch (e: any) {
    return handleActionError(e, "Gagal melakukan penyesuaian stok");
  }
}

/* ── Purchase types ── */

export interface PurchaseInput {
  branchId: string;
  supplierName?: string;
  supplierId?: string | null;
  paymentAccountId: string;
  purchaseDate?: string;
  notes?: string;
  items: PurchaseInputItem[];
}

export interface PurchaseInputItem {
  itemId: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseRow {
  id: string;
  brandId: number;
  branchId: string;
  branchName: string | null;
  purchaseNumber: string;
  supplierName: string | null;
  supplierId: string | null;
  paymentAccountId: string | null;
  paymentAccountName: string | null;
  purchaseDate: string;
  totalAmount: number;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  items?: PurchaseItemRow[];
}

export interface PurchaseItemRow {
  id: string;
  purchaseId: string;
  itemId: string;
  itemNameSnapshot: string;
  variantSnapshot: Record<string, any> | null;
  skuSnapshot: string | null;
  barcodeSnapshot: string | null;
  quantity: number;
  unitSnapshot: string;
  unitCostSnapshot: number;
  subtotal: number;
}

export interface PurchaseListInput {
  branchId?: string | null;
  search?: string | null;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PurchaseListResult {
  items: PurchaseRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ── Create stock purchase ── */

export async function createStockPurchaseAction(
  brandSlug: string,
  input: PurchaseInput,
): Promise<ActionResult<PurchaseRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    const supabase = await createServerSupabase();

    if (!input.branchId) {
      return errorResult("Cabang wajib diisi");
    }
    if (!input.items || input.items.length === 0) {
      return errorResult("Minimal 1 item harus ditambahkan");
    }
    if (!input.paymentAccountId) {
      return errorResult("Akun pembayaran wajib diisi");
    }

    requireBranchAccess(session, input.branchId, "purchase");

    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    // Validate items
    for (const item of input.items) {
      if (item.quantity <= 0) {
        return errorResult("Jumlah item harus lebih dari 0");
      }
      if (item.unitCost < 0) {
        return errorResult("Harga modal tidak boleh negatif");
      }
    }

    // Generate purchase number
    const { data: numberData } = await (supabase as any)
      .rpc("generate_purchase_number", { p_brand_id: session.brandId });

    const purchaseNumber = numberData ?? `PO/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/MANUAL`;

    // Use atomic RPC
    const { data: rpcResult, error: rpcError } = await (supabase as any)
      .rpc("create_purchase_with_movements", {
        p_brand_id: session.brandId,
        p_branch_id: input.branchId,
        p_purchase_number: purchaseNumber,
        p_supplier_name: input.supplierName ?? null,
        p_supplier_id: input.supplierId ?? null,
        p_payment_account_id: input.paymentAccountId,
        p_purchase_date: input.purchaseDate ?? new Date().toISOString().split("T")[0],
        p_notes: input.notes ?? null,
        p_created_by: session.profileId,
        p_items: input.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      });

    if (rpcError) {
      return errorResult(rpcError.message);
    }

    const purchaseId = rpcResult?.purchase_id;

    if (!purchaseId) {
      return errorResult("Gagal membuat purchase");
    }

    // Fetch created purchase
    const { data: purchase } = await (supabase as any)
      .from("purchases")
      .select(`
        *,
        branches!inner(name),
        payment_accounts!inner(account_name)
      `)
      .eq("id", purchaseId)
      .single();

    const { data: purchaseItems } = await (supabase as any)
      .from("purchase_items")
      .select("*")
      .eq("purchase_id", purchaseId);

    const row: PurchaseRow = {
      id: purchase.id,
      brandId: purchase.brand_id,
      branchId: purchase.branch_id,
      branchName: purchase.branches?.name ?? null,
      purchaseNumber: purchase.purchase_number,
      supplierName: purchase.supplier_name ?? null,
      supplierId: purchase.supplier_id ?? null,
      paymentAccountId: purchase.payment_account_id,
      paymentAccountName: purchase.payment_accounts?.account_name ?? null,
      purchaseDate: purchase.purchase_date,
      totalAmount: Number(purchase.total_amount),
      status: purchase.status,
      notes: purchase.notes ?? null,
      createdBy: purchase.created_by,
      createdByName: null,
      createdAt: purchase.created_at,
      items: (purchaseItems ?? []).map((pi: any) => ({
        id: pi.id,
        purchaseId: pi.purchase_id,
        itemId: pi.item_id,
        itemNameSnapshot: pi.item_name_snapshot,
        variantSnapshot: pi.variant_snapshot ?? null,
        skuSnapshot: pi.sku_snapshot ?? null,
        barcodeSnapshot: pi.barcode_snapshot ?? null,
        quantity: Number(pi.quantity),
        unitSnapshot: pi.unit_snapshot,
        unitCostSnapshot: Number(pi.unit_cost_snapshot),
        subtotal: Number(pi.subtotal),
      })),
    };

    return successResult(row);
  } catch (e: any) {
    return handleActionError(e, "Gagal membuat belanja stok");
  }
}

/* ── List purchase history ── */

export async function listPurchaseHistoryAction(
  brandSlug: string,
  input: PurchaseListInput,
): Promise<ActionResult<PurchaseListResult>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const canManage = can(session.role, PERMISSIONS.INVENTORY_MANAGE);
    // TECHNICIAN cannot view purchase history
    if (!canManage) {
      return successResult({
        items: [],
        total: 0,
        page: 1,
        pageSize: input.pageSize ?? 10,
        totalPages: 0,
      });
    }

    const supabase = await createServerSupabase();
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const allBranches = await getBranchesByBrandId(supabase as any, session.brandId);
    const accessibleBranchIds =
      session.canAccessAllBranches
        ? allBranches.map((b: any) => b.id)
        : session.accessibleBranchIds;

    const branchFilter =
      input.branchId && input.branchId !== "ALL_BRANCHES" ? [input.branchId] : accessibleBranchIds;

    if (input.branchId && input.branchId !== "ALL_BRANCHES") {
      requireBranchAccess(session, input.branchId, "listPurchaseHistoryAction");
    }

    let query = (supabase as any)
      .from("purchases")
      .select(`
        *,
        branches!inner(name),
        payment_accounts!left(account_name)
      `, { count: "exact" })
      .in("branch_id", branchFilter)
      .eq("brand_id", session.brandId);

    if (input.search && input.search.trim()) {
      query = query.or(
        `purchase_number.ilike.%${input.search.trim()}%,supplier_name.ilike.%${input.search.trim()}%`,
      );
    }

    if (input.dateFrom) {
      query = query.gte("purchase_date", input.dateFrom);
    }

    if (input.dateTo) {
      query = query.lte("purchase_date", input.dateTo);
    }

    query = query.order("created_at", { ascending: false });
    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      return errorResult(error.message);
    }

    // Fetch creator names
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

    const rows: PurchaseRow[] = (data ?? []).map((p: any) => ({
      id: p.id,
      brandId: p.brand_id,
      branchId: p.branch_id,
      branchName: p.branches?.name ?? null,
      purchaseNumber: p.purchase_number,
      supplierName: p.supplier_name ?? null,
      supplierId: p.supplier_id ?? null,
      paymentAccountId: p.payment_account_id,
      paymentAccountName: p.payment_accounts?.account_name ?? null,
      purchaseDate: p.purchase_date,
      totalAmount: Number(p.total_amount),
      status: p.status,
      notes: p.notes ?? null,
      createdBy: p.created_by,
      createdByName: profileMap.get(p.created_by) ?? null,
      createdAt: p.created_at,
    }));

    return successResult({
      items: rows,
      total: count ?? rows.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? rows.length) / pageSize)),
    });
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat riwayat belanja");
  }
}

/* ── Get purchase detail ── */

export async function getPurchaseDetailAction(
  brandSlug: string,
  purchaseId: string,
): Promise<ActionResult<PurchaseRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();

    const { data: purchase, error } = await (supabase as any)
      .from("purchases")
      .select(`
        *,
        branches!inner(name),
        payment_accounts!left(account_name)
      `)
      .eq("id", purchaseId)
      .eq("brand_id", session.brandId)
      .single();

    if (error || !purchase) {
      return errorResult("Purchase tidak ditemukan");
    }

    const { data: items } = await (supabase as any)
      .from("purchase_items")
      .select("*")
      .eq("purchase_id", purchaseId);

    // Get creator name
    let createdByName: string | null = null;
    if (purchase.created_by) {
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("name")
        .eq("id", purchase.created_by)
        .single();
      createdByName = profile?.name ?? null;
    }

    const row: PurchaseRow = {
      id: purchase.id,
      brandId: purchase.brand_id,
      branchId: purchase.branch_id,
      branchName: purchase.branches?.name ?? null,
      purchaseNumber: purchase.purchase_number,
      supplierName: purchase.supplier_name ?? null,
      supplierId: purchase.supplier_id ?? null,
      paymentAccountId: purchase.payment_account_id,
      paymentAccountName: purchase.payment_accounts?.account_name ?? null,
      purchaseDate: purchase.purchase_date,
      totalAmount: Number(purchase.total_amount),
      status: purchase.status,
      notes: purchase.notes ?? null,
      createdBy: purchase.created_by,
      createdByName,
      createdAt: purchase.created_at,
      items: (items ?? []).map((pi: any) => ({
        id: pi.id,
        purchaseId: pi.purchase_id,
        itemId: pi.item_id,
        itemNameSnapshot: pi.item_name_snapshot,
        variantSnapshot: pi.variant_snapshot ?? null,
        skuSnapshot: pi.sku_snapshot ?? null,
        barcodeSnapshot: pi.barcode_snapshot ?? null,
        quantity: Number(pi.quantity),
        unitSnapshot: pi.unit_snapshot,
        unitCostSnapshot: Number(pi.unit_cost_snapshot),
        subtotal: Number(pi.subtotal),
      })),
    };

    return successResult(row);
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat detail purchase");
  }
}

/* ── Get payment accounts for purchase ── */

export async function getPaymentAccountsForPurchaseAction(
  brandSlug: string,
  branchId?: string | null,
): Promise<ActionResult<{ id: string; name: string; balance: number }[]>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    if (branchId && branchId !== "ALL_BRANCHES") {
      requireBranchAccess(session, branchId, "getPaymentAccountsForPurchaseAction");
    }

    const supabase = await createServerSupabase();

    let query = (supabase as any)
      .from("payment_accounts")
      .select("id, account_name, current_balance, type")
      .eq("brand_id", session.brandId)
      .eq("is_active", true);

    if (branchId && branchId !== "ALL_BRANCHES") {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }

    const { data, error } = await query.order("account_name", { ascending: true });

    if (error) {
      return errorResult(error.message);
    }

    return successResult(
      (data ?? []).map((a: any) => ({
        id: a.id,
        name: `${a.account_name} (${a.type})`,
        balance: Number(a.current_balance),
      })),
    );
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat akun pembayaran");
  }
}

/* ── Serialized Unit actions ── */

/* ── List serialized units ── */

function mapSerializedUnitRow(item: any): SerializedUnitRow {
  return {
    id: item.id,
    brandId: item.brand_id,
    branchId: item.branch_id,
    inventoryItemId: item.inventory_item_id,
    serialNumber: item.serial_number ?? null,
    imei: item.imei ?? null,
    barcode: item.barcode ?? null,
    batteryHealth: item.battery_health != null ? Number(item.battery_health) : null,
    conditionGrade: item.condition_grade ?? null,
    physicalConditionNotes: item.physical_condition_notes ?? null,
    functionalConditionNotes: item.functional_condition_notes ?? null,
    accessoriesIncluded: item.accessories_included ?? null,
    purchaseCost: item.purchase_cost != null ? Number(item.purchase_cost) : null,
    sellingPrice: item.selling_price != null ? Number(item.selling_price) : null,
    status: item.status,
    sourceType: item.source_type ?? null,
    sourceReferenceId: item.source_reference_id ?? null,
    createdBy: item.created_by ?? null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    branchName: item.branches?.name ?? item.branch_name ?? null,
    itemName: item.inventory_items?.name ?? item.item_name ?? null,
    itemSku: item.inventory_items?.sku ?? item.item_sku ?? null,
    itemVariantName: item.inventory_items?.variant_name ?? item.item_variant_name ?? null,
    itemTrackingType: item.inventory_items?.tracking_type ?? item.item_tracking_type ?? null,
  };
}

export async function listSerializedUnitsAction(
  brandSlug: string,
  input: SerializedUnitListInput,
): Promise<ActionResult<SerializedUnitListResult>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    if (input.branchId && input.branchId !== "ALL_BRANCHES") {
      requireBranchAccess(session, input.branchId, "listSerializedUnitsAction");
    }

    const supabase = await createServerSupabase();

    const allBranches = await getBranchesByBrandId(supabase as any, session.brandId);
    const accessibleBranchIds =
      session.canAccessAllBranches
        ? allBranches.map((b: any) => b.id)
        : session.accessibleBranchIds;

    const branchFilter =
      input.branchId && input.branchId !== "ALL_BRANCHES" ? [input.branchId] : accessibleBranchIds;

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let query = (supabase as any)
      .from("inventory_serialized_units")
      .select(`
        *,
        branches!inner(name),
        inventory_items!inner(name, sku, variant_name, tracking_type)
      `, { count: "exact" })
      .eq("brand_id", session.brandId)
      .in("branch_id", branchFilter);

    if (input.status && input.status !== "ALL_STATUS") {
      query = query.eq("status", input.status);
    }

    if (input.inventoryItemId) {
      query = query.eq("inventory_item_id", input.inventoryItemId);
    }

    if (input.search && input.search.trim()) {
      const s = input.search.trim();
      query = query.or(
        `imei.ilike.%${s}%,serial_number.ilike.%${s}%,barcode.ilike.%${s}%`,
      );
    }

    query = query.order("created_at", { ascending: false });
    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      return errorResult(error.message);
    }

    const items: SerializedUnitRow[] = (data ?? []).map((row: any) => mapSerializedUnitRow(row));

    return successResult({
      items,
      total: count ?? items.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? items.length) / pageSize)),
    });
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat unit serial");
  }
}

/* ── Get single serialized unit ── */

export async function getSerializedUnitAction(
  brandSlug: string,
  unitId: string,
): Promise<ActionResult<SerializedUnitRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();

    const { data, error } = await (supabase as any)
      .from("inventory_serialized_units")
      .select(`
        *,
        branches!inner(name),
        inventory_items!inner(name, sku, variant_name, tracking_type)
      `)
      .eq("id", unitId)
      .eq("brand_id", session.brandId)
      .single();

    if (error || !data) {
      return errorResult("Unit tidak ditemukan");
    }

    return successResult(mapSerializedUnitRow(data));
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat unit serial");
  }
}

/* ── Create serialized unit ── */

export async function createSerializedUnitAction(
  brandSlug: string,
  input: SerializedUnitInput,
): Promise<ActionResult<SerializedUnitRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.manage");

    const supabase = await createServerSupabase();

    if (!input.branchId) return errorResult("Cabang wajib diisi");
    requireBranchAccess(session, input.branchId, "createSerializedUnitAction");
    if (!input.inventoryItemId) return errorResult("Item wajib diisi");

    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    // Validate item belongs to brand and is SERIALIZED
    const { data: item } = await (supabase as any)
      .from("inventory_items")
      .select("id, brand_id, tracking_type, item_type, name, sku, barcode, unit_name, is_variant_parent")
      .eq("id", input.inventoryItemId)
      .eq("brand_id", session.brandId)
      .single();

    if (!item) return errorResult("Item tidak ditemukan");

    // Parent items cannot have serialized units
    if (item.is_variant_parent) {
      return errorResult("Item induk varian tidak dapat memiliki unit serial. Pilih varian spesifik.");
    }

    // Check tracking type allows serialized units
    if (item.tracking_type !== "SERIALIZED" && item.item_type !== "DEVICE_UNIT") {
      return errorResult("Item ini tidak mendukung unit serial. Ubah tracking type ke SERIALIZED.");
    }

    // Validate uniqueness of IMEI, serial, barcode per brand
    const uniquenessChecks: { value: string | null | undefined; field: string }[] = [
      { value: input.imei, field: "imei" },
      { value: input.serialNumber, field: "serial_number" },
      { value: input.barcode, field: "barcode" },
    ];

    for (const check of uniquenessChecks) {
      if (!check.value) continue;
      const { data: existing } = await (supabase as any)
        .from("inventory_serialized_units")
        .select("id")
        .eq("brand_id", session.brandId)
        .eq(check.field, check.value)
        .maybeSingle();

      if (existing) {
        return errorResult(`${check.field === "imei" ? "IMEI" : check.field === "serial_number" ? "Serial number" : "Barcode"} sudah terdaftar`);
      }
    }

    // Validate battery health range
    if (input.batteryHealth != null && (input.batteryHealth < 0 || input.batteryHealth > 100)) {
      return errorResult("Battery health harus antara 0-100");
    }

    const status = input.status ?? "READY_STOCK";

    const insertData: Record<string, any> = {
      brand_id: session.brandId,
      branch_id: input.branchId,
      inventory_item_id: input.inventoryItemId,
      serial_number: input.serialNumber ?? null,
      imei: input.imei ?? null,
      barcode: input.barcode ?? null,
      battery_health: input.batteryHealth ?? null,
      condition_grade: input.conditionGrade ?? null,
      physical_condition_notes: input.physicalConditionNotes ?? null,
      functional_condition_notes: input.functionalConditionNotes ?? null,
      accessories_included: input.accessoriesIncluded ?? null,
      purchase_cost: input.purchaseCost ?? null,
      selling_price: input.sellingPrice ?? null,
      status,
      source_type: input.sourceType ?? null,
      source_reference_id: input.sourceReferenceId ?? null,
      created_by: session.profileId,
    };

    const { data: created, error } = await (supabase as any)
      .from("inventory_serialized_units")
      .insert(insertData)
      .select(`
        *,
        branches!inner(name),
        inventory_items!inner(name, sku, variant_name, tracking_type)
      `)
      .single();

    if (error) return errorResult(error.message);

    // Create inventory movement if status is READY_STOCK
    if (status === "READY_STOCK") {
      const { data: stockBefore } = await (supabase as any)
        .from("branch_inventory_stocks")
        .select("current_stock")
        .eq("branch_id", input.branchId)
        .eq("item_id", input.inventoryItemId)
        .maybeSingle();

      try {
        await (supabase as any).rpc("add_inventory_movement", {
          p_brand_id: session.brandId,
          p_branch_id: input.branchId,
          p_item_id: input.inventoryItemId,
          p_direction: "IN",
          p_movement_type: "SERIALIZED_UNIT_IN",
          p_quantity: 1,
          p_unit_cost: input.purchaseCost ?? null,
          p_reference_type: "serialized_unit",
          p_reference_id: created.id,
          p_reference_label: input.imei ?? input.barcode ?? input.serialNumber ?? item.name,
          p_description: `Unit serial baru: ${item.name}`,
          p_metadata: { serialized_unit_id: created.id },
          p_created_by: session.profileId,
          p_unit_snapshot: item.unit_name,
          p_notes: null,
          p_serialized_unit_id: created.id,
        });
      } catch (movErr: any) {
        console.warn("[createSerializedUnitAction] Movement creation failed:", movErr.message);
      }
    }

    return successResult(mapSerializedUnitRow(created));
  } catch (e: any) {
    return handleActionError(e, "Gagal membuat unit serial");
  }
}

/* ── Update serialized unit ── */

export async function updateSerializedUnitAction(
  brandSlug: string,
  unitId: string,
  input: Partial<SerializedUnitInput>,
): Promise<ActionResult<SerializedUnitRow>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const supabase = await createServerSupabase();

    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);

    const canManage = can(session.role, PERMISSIONS.INVENTORY_MANAGE);

    // Check existing unit
    const { data: existing } = await (supabase as any)
      .from("inventory_serialized_units")
      .select("*")
      .eq("id", unitId)
      .eq("brand_id", session.brandId)
      .single();

    if (!existing) return errorResult("Unit tidak ditemukan");

    // TECHNICIAN restrictions
    if (!canManage) {
      // Cannot edit cost/price
      if (input.purchaseCost !== undefined || input.sellingPrice !== undefined) {
        return errorResult("Anda tidak memiliki izin untuk mengubah harga");
      }
      // Cannot change branch
      if (input.branchId !== undefined) {
        return errorResult("Anda tidak memiliki izin untuk mengubah cabang");
      }
    }

    if (!canManage) {
      // TECHNICIAN can only update: battery health, condition, notes, status
      const allowedFields: (keyof SerializedUnitInput)[] = [
        "batteryHealth", "conditionGrade", "physicalConditionNotes",
        "functionalConditionNotes", "accessoriesIncluded", "status",
      ];
      const attemptedFields = Object.keys(input) as (keyof SerializedUnitInput)[];
      const invalidFields = attemptedFields.filter((f) => !allowedFields.includes(f));
      if (invalidFields.length > 0) {
        return errorResult(`Anda tidak memiliki izin untuk mengubah field: ${invalidFields.join(", ")}`);
      }
    }

    // Validate uniqueness if changing IMEI/serial/barcode
    const checkFields = [
      { value: input.imei, field: "imei", label: "IMEI" },
      { value: input.serialNumber, field: "serial_number", label: "Serial number" },
      { value: input.barcode, field: "barcode", label: "Barcode" },
    ];

    for (const check of checkFields) {
      if (!check.value) continue;
      if (existing[check.field] === check.value) continue; // No change
      const { data: dup } = await (supabase as any)
        .from("inventory_serialized_units")
        .select("id")
        .eq("brand_id", session.brandId)
        .eq(check.field, check.value)
        .neq("id", unitId)
        .maybeSingle();
      if (dup) return errorResult(`${check.label} sudah terdaftar`);
    }

    // Validate battery health
    if (input.batteryHealth != null && (input.batteryHealth < 0 || input.batteryHealth > 100)) {
      return errorResult("Battery health harus antara 0-100");
    }

    const oldStatus = existing.status;
    const newStatus = input.status ?? oldStatus;

    const updateData: Record<string, any> = {};
    if (input.branchId !== undefined) updateData.branch_id = input.branchId;
    if (input.serialNumber !== undefined) updateData.serial_number = input.serialNumber ?? null;
    if (input.imei !== undefined) updateData.imei = input.imei ?? null;
    if (input.barcode !== undefined) updateData.barcode = input.barcode ?? null;
    if (input.batteryHealth !== undefined) updateData.battery_health = input.batteryHealth ?? null;
    if (input.conditionGrade !== undefined) updateData.condition_grade = input.conditionGrade ?? null;
    if (input.physicalConditionNotes !== undefined) updateData.physical_condition_notes = input.physicalConditionNotes ?? null;
    if (input.functionalConditionNotes !== undefined) updateData.functional_condition_notes = input.functionalConditionNotes ?? null;
    if (input.accessoriesIncluded !== undefined) updateData.accessories_included = input.accessoriesIncluded ?? null;
    if (input.purchaseCost !== undefined) updateData.purchase_cost = input.purchaseCost ?? null;
    if (input.sellingPrice !== undefined) updateData.selling_price = input.sellingPrice ?? null;
    if (input.status !== undefined) updateData.status = input.status;

    if (Object.keys(updateData).length === 0) {
      return errorResult("Tidak ada data yang diubah");
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await (supabase as any)
      .from("inventory_serialized_units")
      .update(updateData)
      .eq("id", unitId)
      .select(`
        *,
        branches!inner(name),
        inventory_items!inner(name, sku, variant_name, tracking_type)
      `)
      .single();

    if (error) return errorResult(error.message);

    return successResult(mapSerializedUnitRow(updated));
  } catch (e: any) {
    return handleActionError(e, "Gagal mengupdate unit serial");
  }
}

/* ── Backward-compatible stubs ── */

export async function listInventoryItems(brandId: number): Promise<Result<any[]>> {
  return fail("Not implemented");
}

export async function getBranchStocks(brandId: number, branchId: string): Promise<Result<any[]>> {
  return fail("Not implemented");
}
