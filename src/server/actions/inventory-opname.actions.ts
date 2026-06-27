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
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export interface StockOpnameItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  variantDisplayName: string | null;
  itemType: string;
  trackingType: string;
  unitName: string;
  currentStock: number;
  categoryName: string | null;
  branchName: string | null;
  isVariantParent: boolean;
  parentItemId: string | null;
}

export interface StockOpnameListResult {
  items: StockOpnameItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StockOpnameInput {
  itemId: string;
  physicalStock: number;
}

export async function listInventoryForStockOpnameAction(
  brandSlug: string,
  input: {
    itemType: "SPAREPART" | "PRODUCT" | "DEVICE_UNIT";
    categoryId?: string | null;
    search?: string;
    branchId?: string | null;
    page?: number;
    pageSize?: number;
  },
): Promise<ActionResult<StockOpnameListResult>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    const resolvedBranchId = input.branchId === "ALL_BRANCHES" ? null : (input.branchId ?? null);
    let effectiveBranchId = resolvedBranchId;
    if (resolvedBranchId) {
      requireBranchAccess(session, resolvedBranchId, "opname");
    } else if (!session.canAccessAllBranches) {
      effectiveBranchId = session.defaultBranchId;
      if (!effectiveBranchId) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    const supabase = await createServerSupabase();
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(25, Math.max(1, input.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    // Build query for inventory items that are stockable
    let countQuery = (supabase as any)
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", session.brandId)
      .eq("item_type", input.itemType)
      .is("deleted_at", null)
      .eq("is_variant_parent", false) // exclude parent variants
      .eq("is_active", true);

    let dataQuery = (supabase as any)
      .from("inventory_items")
      .select(`
        id,
        name,
        sku,
        barcode,
        item_type,
        tracking_type,
        unit_name,
        variant_display_name,
        is_variant_parent,
        parent_item_id,
        category_id,
        inventory_categories!left(id, name),
        branch_inventory_stocks!left(
          branch_id,
          current_stock,
          branches!inner(id, name)
        )
      `)
      .eq("brand_id", session.brandId)
      .eq("item_type", input.itemType)
      .is("deleted_at", null)
      .eq("is_variant_parent", false)
      .eq("is_active", true);

    if (input.categoryId) {
      countQuery = countQuery.eq("category_id", input.categoryId);
      dataQuery = dataQuery.eq("category_id", input.categoryId);
    }

    if (input.search?.trim()) {
      const q = input.search.trim();
      const searchFilter = `name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    if (effectiveBranchId) {
      dataQuery = dataQuery.eq("branch_inventory_stocks.branch_id", effectiveBranchId);
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    const { data, error } = await dataQuery
      .order("name", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const items: StockOpnameItem[] = (data ?? []).map((row: any) => {
      const stockRows = Array.isArray(row.branch_inventory_stocks)
        ? row.branch_inventory_stocks
        : row.branch_inventory_stocks
          ? [row.branch_inventory_stocks]
          : [];

      return {
        id: row.id,
        name: row.name,
        sku: row.sku ?? null,
        barcode: row.barcode ?? null,
        variantDisplayName: row.variant_display_name ?? null,
        itemType: row.item_type,
        trackingType: row.tracking_type ?? "QUANTITY",
        unitName: row.unit_name ?? "pcs",
        currentStock: effectiveBranchId
          ? Number(stockRows[0]?.current_stock ?? 0)
          : 0,
        categoryName: row.inventory_categories?.name ?? null,
        branchName: effectiveBranchId
          ? (stockRows[0]?.branches?.name ?? null)
          : null,
        isVariantParent: row.is_variant_parent ?? false,
        parentItemId: row.parent_item_id ?? null,
      };
    });

    return successResult({ items, page, pageSize, total, totalPages });
  } catch (e: any) {
    return errorResult(e.message ?? "Gagal memuat data stok");
  }
}

export async function adjustInventoryOpnameAction(
  brandSlug: string,
  input: {
    adjustments: StockOpnameInput[];
    note: string;
    branchId?: string | null;
  },
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "inventory.view");

    if (session.role === "TECHNICIAN" && !input.note?.trim()) {
      return errorResult("Alasan penyesuaian wajib diisi untuk teknisi.");
    }

    const resolvedBranchId = input.branchId === "ALL_BRANCHES" ? null : (input.branchId ?? null);
    let effectiveBranchId = resolvedBranchId;
    if (resolvedBranchId) {
      requireBranchAccess(session, resolvedBranchId, "opname");
    } else if (!session.canAccessAllBranches) {
      effectiveBranchId = session.defaultBranchId;
      if (!effectiveBranchId) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    if (!effectiveBranchId) {
      return errorResult("Pilih cabang terlebih dahulu.");
    }

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, effectiveBranchId);

    if (!input.adjustments || input.adjustments.length === 0) {
      return errorResult("Tidak ada penyesuaian yang dilakukan.");
    }
    let updatedCount = 0;

    for (const adj of input.adjustments) {
      // Fetch item
      const { data: item, error: itemError } = await (supabase as any)
        .from("inventory_items")
        .select("id, name, brand_id, item_type, tracking_type, is_variant_parent, unit_name, cost_price, selling_price, allow_negative_stock")
        .eq("id", adj.itemId)
        .eq("brand_id", session.brandId)
        .single();

      if (itemError || !item) {
        console.warn(`[opname] Item ${adj.itemId} not found, skipping`);
        continue;
      }

      // Reject parent variants
      if (item.is_variant_parent) {
        console.warn(`[opname] Item ${item.name} is variant parent, skipping`);
        continue;
      }

      // Reject SERIALIZED tracking
      if (item.tracking_type === "SERIALIZED") {
        console.warn(`[opname] Item ${item.name} is SERIALIZED, skipping`);
        continue;
      }

      // Fetch current stock
      const { data: stockRow } = await (supabase as any)
        .from("branch_inventory_stocks")
        .select("*")
        .eq("branch_id", effectiveBranchId)
        .eq("item_id", adj.itemId)
        .maybeSingle();

      const stockBefore = Number(stockRow?.current_stock ?? 0);
      const diff = adj.physicalStock - stockBefore;

      if (diff === 0) continue;

      const direction = diff > 0 ? "IN" : "OUT";
      const absDiff = Math.abs(diff);
      const movementType = diff > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";

      // Update branch stock
      if (stockRow?.id) {
        await (supabase as any)
          .from("branch_inventory_stocks")
          .update({
            current_stock: adj.physicalStock,
            last_movement_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", stockRow.id);
      } else {
        await (supabase as any)
          .from("branch_inventory_stocks")
          .insert({
            brand_id: session.brandId,
            branch_id: effectiveBranchId,
            item_id: adj.itemId,
            current_stock: adj.physicalStock,
            reserved_stock: 0,
          });
      }

      // Create movement
      const refLabel = `OPNAME/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}/${String(updatedCount + 1).padStart(4, "0")}`;

      const movementData: Record<string, any> = {
        brand_id: session.brandId,
        branch_id: effectiveBranchId,
        item_id: adj.itemId,
        movement_type: movementType,
        direction,
        quantity: absDiff,
        unit_snapshot: item.unit_name ?? "pcs",
        before_quantity: stockBefore,
        after_quantity: adj.physicalStock,
        unit_cost_snapshot: can(session.role, PERMISSIONS.INVENTORY_MANAGE) ? Number(item.cost_price ?? 0) : null,
        total_cost_snapshot: can(session.role, PERMISSIONS.INVENTORY_MANAGE) ? absDiff * Number(item.cost_price ?? 0) : null,
        selling_price_snapshot: item.selling_price ?? 0,
        total_price_snapshot: absDiff * Number(item.selling_price ?? 0),
        reference_type: "STOCK_OPNAME",
        reference_label: refLabel,
        notes: input.note || `Stok opname: ${item.name}`,
        created_by: session.profileId,
      };

      const { error: movError } = await (supabase as any)
        .from("inventory_movements")
        .insert(movementData);

      if (movError) {
        console.error(`[opname] movement insert error for ${item.name}:`, movError);
        continue;
      }

      // Audit log
      await (supabase as any).from("audit_logs").insert({
        brand_id: session.brandId,
        actor_id: session.profileId,
        action: "STOCK_OPNAME_ADJUSTMENT",
        target_type: "INVENTORY_ITEM",
        target_id: adj.itemId,
        target_label: item.name,
        description: `Stok opname: ${item.name} (${stockBefore} → ${adj.physicalStock}, ${direction === "IN" ? "+" : ""}${diff} ${item.unit_name ?? "pcs"})`,
      });

      updatedCount++;
    }

    return successResult({ updatedCount });
  } catch (e: any) {
    return handleActionError(e, "Gagal melakukan penyesuaian stok opname");
  }
}
