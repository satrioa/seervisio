// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
/**
 * pos.actions.ts
 * Server actions for POS / Penjualan Produk.
 *
 * Flow for createPosSaleAction:
 *   1. Auth & role validation
 *   2. Validate cart items from authoritative DB data
 *   3. Calculate authoritative totals (server-side)
 *   4. Mark DEVICE_UNIT units as SOLD
 *   5. Create trade-in inventory unit (if applicable)
 *   6. Call record_pos_sale() RPC (stock, payment, finance)
 *   7. Create trade_ins DB record linking to sale
 *   8. Audit log
 *   9. Return result
 */

"use server";

import { createClient } from "@/lib/utils/supabase/server";
import { getSessionData, successResult, errorResult } from "./action-helper";
import type { ActionResult } from "./action-helper";
import type {
  PosCartItem,
  PosProductResult,
  PosSaleResult,
  CreatePosSaleInput,
  PosPaymentInput,
} from "@/domain/pos/types";
import { calculatePosTotals } from "@/domain/pos/calculate-pos";
import {
  searchPosProducts as repoSearchProducts,
  countAvailableUnits,
  getAvailableDeviceUnits,
  callRecordPosSale,
  createTradeIn,
  getPosSalesByBranch as repoListSales,
  getPosSaleById as repoGetSale,
} from "@/repositories/pos.repository";
import { findOrCreateCustomer } from "@/repositories/customer.repository";
import { getPaymentMethodsByBrand, getPaymentAccountsByBranch } from "@/repositories/payment.repository";
import type { InventoryItemUnitRow } from "@/repositories/pos.repository";

/* ─── Helpers ─── */

function mapUnitRowToDomain(row: InventoryItemUnitRow) {
  return {
    unitId: row.id,
    imei: row.imei,
    serialNumber: row.serial_number,
    storage: row.storage,
    color: row.color,
    conditionGrade: row.condition_grade,
    batteryHealth: row.battery_health,
    sellingPrice: Number(row.selling_price || 0),
  };
}

/* ─── Search Products ─── */

export async function searchPosProductsAction(
  brandSlug: string,
  params: {
    query?: string;
    itemType?: string;
    categoryId?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<ActionResult<{ products: PosProductResult[]; total: number }>> {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");

    const supabase = await createClient();

    const { data: products, total } = await repoSearchProducts(supabase, {
      brandId: session.brandId,
      branchId: session.defaultBranchId,
      query: params.query,
      itemType: params.itemType,
      categoryId: params.categoryId,
      page: params.page,
      pageSize: params.pageSize,
    });

    // For DEVICE_UNIT items, fetch available units count
    const enriched = await Promise.all(
      products.map(async (product) => {
        if (product.itemType === "DEVICE_UNIT") {
          const count = await countAvailableUnits(supabase, product.id);
          return { ...product, availableUnitsCount: count };
        }
        return product;
      }),
    );

    return successResult({ products: enriched, total });
  } catch (err: any) {
    console.error("[searchPosProductsAction]", err);
    return errorResult(err.message || "Gagal mencari produk.");
  }
}

/* ─── Get Available Device Units ─── */

export async function getAvailableDeviceUnitsAction(
  brandSlug: string,
  inventoryItemId: string,
): Promise<
  ActionResult<
    Array<{
      unitId: string;
      imei?: string;
      serialNumber?: string;
      storage?: string;
      color?: string;
      conditionGrade?: string;
      batteryHealth?: string;
      sellingPrice: number;
    }>
  >
> {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");

    const supabase = await createClient();
    const units = await getAvailableDeviceUnits(supabase, inventoryItemId);

    return successResult(units.map(mapUnitRowToDomain));
  } catch (err: any) {
    console.error("[getAvailableDeviceUnitsAction]", err);
    return errorResult(err.message || "Gagal mengambil unit tersedia.");
  }
}

/* ─── Create POS Sale ─── */

export async function createPosSaleAction(
  brandSlug: string,
  input: CreatePosSaleInput,
): Promise<ActionResult<PosSaleResult>> {
  try {
    // ── 1. Auth & Role ──
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");

    const allowedRoles = ["MASTER_ADMIN", "ADMIN", "FRONTLINER"];
    const hasRole = session.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return errorResult("Role Anda tidak memiliki akses untuk transaksi POS.");
    }

    const supabase = await createClient();
    const branchId = input.branchId || session.defaultBranchId;

    // ── 2. Validate Cart ──
    if (!input.cartItems || input.cartItems.length === 0) {
      return errorResult("Keranjang masih kosong.");
    }

    // ── 3. Fetch authoritative item data ──
    const itemIds = input.cartItems.map((i) => i.inventoryItemId);
    const { data: dbItems } = await supabase
      .from("inventory_items")
      .select("id, name, sku, item_type, selling_price, cost_price, track_stock")
      .in("id", itemIds);

    if (!dbItems || dbItems.length === 0) {
      return errorResult("Produk tidak ditemukan.");
    }

    const itemMap = new Map(dbItems.map((i: any) => [i.id, i]));

    // ── 4. Validate stock & units for each cart item ──
    for (const cartItem of input.cartItems) {
      const dbItem = itemMap.get(cartItem.inventoryItemId);
      if (!dbItem) {
        return errorResult(`Produk "${cartItem.productName}" tidak ditemukan.`);
      }

      // Validate price matches DB (never trust client price)
      if (Number(dbItem.selling_price) !== cartItem.unitPrice) {
        return errorResult(
          `Harga "${cartItem.productName}" tidak valid. Refresh halaman.`,
        );
      }

      if (dbItem.item_type === "DEVICE_UNIT") {
        // Serialized unit must have a selected unit
        if (!cartItem.selectedUnit) {
          return errorResult(
            `Pilih unit/IMEI untuk "${cartItem.productName}" terlebih dahulu.`,
          );
        }
        // Quantity must be 1 for serialized device
        if (cartItem.quantity !== 1) {
          return errorResult("Kuantitas unit serial harus 1.");
        }
        // Validate unit is still AVAILABLE
        if (cartItem.selectedUnit) {
          const { data: unitCheck } = await supabase
            .from("inventory_item_units")
            .select("status")
            .eq("id", cartItem.selectedUnit.unitId)
            .single();

          if (!unitCheck || unitCheck.status !== "AVAILABLE") {
            return errorResult(
              `Unit "${cartItem.productName}" sudah tidak tersedia.`,
            );
          }
        }
      } else {
        // Quantity-based item: validate stock
        if (dbItem.track_stock) {
          const { data: stock } = await supabase
            .from("branch_inventory_stocks")
            .select("available_stock")
            .eq("branch_id", branchId)
            .eq("item_id", cartItem.inventoryItemId)
            .single();

          const availableStock = Number(stock?.available_stock || 0);
          if (cartItem.quantity > availableStock) {
            return errorResult(
              `Stok "${cartItem.productName}" tidak mencukupi. Tersedia: ${availableStock}.`,
            );
          }
        }
      }
    }

    // ── 5. Handle Customer ──
    let customerId = input.customerId;
    if (!customerId && input.customerQuickCreate) {
      const result = await findOrCreateCustomer(
        supabase,
        input.brandId,
        input.customerQuickCreate.name,
        input.customerQuickCreate.phone,
      );
      if (result) customerId = result.id;
    }

    // ── 6. Calculate Authoritative Totals ──
    const totals = calculatePosTotals({
      cartItems: input.cartItems,
      discountAmount: input.discountAmount,
      tradeIn: input.tradeIn
        ? {
            deviceBrand: input.tradeIn.deviceBrand,
            deviceModel: input.tradeIn.deviceModel,
            appraisalValue: input.tradeIn.appraisalValue,
          }
        : undefined,
      payments: input.payments,
    });

    // ── 7. Build items for record_pos_sale RPC ──
    const saleItems = input.cartItems.map((item) => {
      const dbItem = itemMap.get(item.inventoryItemId);
      return {
        inventory_item_id: item.inventoryItemId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount || 0,
        line_total: item.quantity * item.unitPrice - (item.discountAmount || 0),
      };
    });

    // ── 8. Mark DEVICE_UNIT units as SOLD (before RPC) ──
    for (const cartItem of input.cartItems) {
      if (cartItem.selectedUnit) {
        const { error: markError } = await (supabase as any).rpc(
          "mark_device_unit_sold",
          {
            p_unit_id: cartItem.selectedUnit.unitId,
            p_updated_by: session.profileId,
          },
        );
        if (markError) {
          return errorResult(
            `Gagal menandai unit "${cartItem.productName}" sebagai terjual.`,
          );
        }
      }
    }

    // ── 9. Determine payment method/account ──
    const payment = input.payments[0]; // MVP: single payment
    if (!payment) {
      return errorResult("Metode pembayaran wajib dipilih.");
    }

    // ── 10. Call record_pos_sale RPC ──
    const rpcResult = await callRecordPosSale(supabase, {
      brandId: input.brandId,
      branchId: branchId,
      paymentMethodId: payment.paymentMethodId,
      paymentAccountId: payment.paymentAccountId,
      items: saleItems,
      customerId: customerId || undefined,
      discountAmount: totals.discountAmount,
      notes: input.notes,
      createdBy: session.profileId,
    });

    if (!rpcResult.success) {
      return errorResult(rpcResult.error || "Gagal menyimpan transaksi POS.");
    }

    const saleData = rpcResult.data;
    const posSaleId: string = saleData?.pos_sale_id || saleData?.id;

    // ── 11. Handle Trade-in ──
    let tradeInUnitId: string | undefined;
    let tradeInItemId: string | undefined;

    if (input.tradeIn) {
      // Create inventory unit from trade-in
      const { data: unitResult } = await (supabase as any).rpc(
        "create_trade_in_inventory_unit",
        {
          p_brand_id: input.brandId,
          p_branch_id: branchId,
          p_device_brand: input.tradeIn.deviceBrand,
          p_device_model: input.tradeIn.deviceModel,
          p_storage: input.tradeIn.storage || null,
          p_color: input.tradeIn.color || null,
          p_imei: input.tradeIn.imei || null,
          p_serial_number: input.tradeIn.serialNumber || null,
          p_condition_grade: input.tradeIn.conditionGrade || null,
          p_battery_health: input.tradeIn.batteryHealth || null,
          p_appraisal_value: input.tradeIn.appraisalValue,
          p_note: input.tradeIn.notes || null,
          p_created_by: session.profileId,
        },
      );

      if (unitResult?.success) {
        tradeInItemId = unitResult.item_id;
        tradeInUnitId = unitResult.unit_id;
      }

      // Create trade_ins record
      await createTradeIn(supabase, {
        brandId: input.brandId,
        branchId: branchId,
        posSaleId: posSaleId,
        customerId: customerId || undefined,
        deviceBrand: input.tradeIn.deviceBrand,
        deviceModel: input.tradeIn.deviceModel,
        storage: input.tradeIn.storage,
        color: input.tradeIn.color,
        imei: input.tradeIn.imei,
        serialNumber: input.tradeIn.serialNumber,
        conditionGrade: input.tradeIn.conditionGrade,
        batteryHealth: input.tradeIn.batteryHealth,
        appraisalValue: input.tradeIn.appraisalValue,
        inventoryItemId: tradeInItemId,
        inventoryItemUnitId: tradeInUnitId,
        note: input.tradeIn.notes,
        createdBy: session.profileId,
      });
    }

    // ── 12. Audit Log ──
    try {
      await supabase.from("audit_logs").insert({
        brand_id: input.brandId,
        branch_id: branchId,
        action: "POS_SALE_COMPLETED",
        entity_type: "pos_sale",
        entity_id: posSaleId,
        profile_id: session.profileId,
        metadata: {
          sale_number: saleData?.sale_number,
          gross_amount: totals.subtotal,
          net_amount: totals.amountDue,
          item_count: input.cartItems.length,
          has_trade_in: !!input.tradeIn,
          payment_method: payment.paymentMethodId,
        },
      });
    } catch (logErr) {
      console.warn("[createPosSaleAction] Audit log failed:", logErr);
    }

    // ── 13. Return Result ──
    return successResult({
      posSaleId,
      saleNumber: saleData?.sale_number || "",
      grossAmount: totals.subtotal,
      discountAmount: totals.discountAmount,
      tradeInValue: totals.tradeInValue,
      totalAfterTradeIn: totals.amountDue + (totals.totalPaid - totals.amountDue), // amount due before payment
      paidAmount: totals.totalPaid,
      changeAmount: totals.changeAmount,
      mdrAmount: saleData?.mdr_amount || 0,
      netAmount: saleData?.net_amount || 0,
      status: "COMPLETED",
    });
  } catch (err: any) {
    console.error("[createPosSaleAction]", err);
    return errorResult(err.message || "Gagal memproses penjualan.");
  }
}

/* ─── List POS Sales ─── */

export async function listPosSalesAction(
  brandSlug: string,
  branchId?: string,
): Promise<ActionResult<any[]>> {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");

    const supabase = await createClient();
    const { data } = await repoListSales(supabase, session.brandId, branchId || session.defaultBranchId);
    return successResult(data);
  } catch (err: any) {
    console.error("[listPosSalesAction]", err);
    return errorResult(err.message || "Gagal mengambil riwayat penjualan.");
  }
}

/* ─── Get Sale Detail ─── */

export async function getPosSaleDetailAction(
  brandSlug: string,
  saleId: string,
): Promise<ActionResult<any>> {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");

    const supabase = await createClient();
    const sale = await repoGetSale(supabase, saleId);
    if (!sale) return errorResult("Transaksi tidak ditemukan.");
    return successResult(sale);
  } catch (err: any) {
    console.error("[getPosSaleDetailAction]", err);
    return errorResult(err.message || "Gagal mengambil detail penjualan.");
  }
}
