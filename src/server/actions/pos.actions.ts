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

import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionData, successResult, errorResult, requireActionPermission, requireBranchAccess } from "./action-helper";
import type { ActionResult } from "./action-helper";
import type {
  PosProductResult,
  PosSaleResult,
  CreatePosSaleInput,
} from "@/domain/pos/types";
import {
  searchPosProducts as repoSearchProducts,
  countAvailableUnits,
  getAvailableDeviceUnits,
  callRecordPosSaleV2,
  getPosSalesByBranch as repoListSales,
  getPosSaleById as repoGetSale,
} from "@/repositories/pos.repository";
import { findOrCreateCustomer } from "@/repositories/customer.repository";
import { getPaymentMethodsByBrand } from "@/repositories/payment.repository";
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

function normalizePosItemType(value?: string): string | undefined {
  if (!value) return undefined;
  if (value === "ACCESSORY") return "PRODUCT";
  if (value === "CONSUMABLE") return "SUPPLY";
  return value;
}

function resolveSessionBranchId(session: any, branchId?: string | null) {
  const resolvedBranchId = branchId || session.defaultBranchId;
  if (!resolvedBranchId) return { error: "Cabang POS belum dipilih." };
  if (session.accessibleBranchIds?.length && !session.accessibleBranchIds.includes(resolvedBranchId)) {
    return { error: "Anda tidak memiliki akses ke cabang POS ini." };
  }
  return { branchId: resolvedBranchId };
}

/* ─── Search Products ─── */

export async function searchPosProductsAction(
  brandSlug: string,
  params: {
    query?: string;
    itemType?: string;
    stockType?: string;
    categoryId?: string;
    branchId?: string | null;
    page?: number;
    pageSize?: number;
  },
): Promise<ActionResult<{ products: PosProductResult[]; total: number }>> {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    const branch = resolveSessionBranchId(session, params.branchId);
    if (branch.error) return errorResult(branch.error);

    const supabase = await createServerSupabase();

    const { data: products, total } = await repoSearchProducts(supabase, {
      brandId: session.brandId,
      branchId: branch.branchId,
      query: params.query,
      itemType: normalizePosItemType(params.itemType),
      stockType: params.stockType,
      categoryId: params.categoryId,
      page: params.page,
      pageSize: params.pageSize,
    });

    // For DEVICE_UNIT items, fetch available units count
    const enriched = await Promise.all(
      products.map(async (product) => {
        if (product.itemType === "DEVICE_UNIT") {
          const count = await countAvailableUnits(supabase, product.id, branch.branchId);
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
  branchId?: string | null,
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
    const branch = resolveSessionBranchId(session, branchId);
    if (branch.error) return errorResult(branch.error);

    const supabase = await createServerSupabase();
    const units = await getAvailableDeviceUnits(supabase, inventoryItemId, branch.branchId);

    return successResult(units.map(mapUnitRowToDomain));
  } catch (err: any) {
    console.error("[getAvailableDeviceUnitsAction]", err);
    return errorResult(err.message || "Gagal mengambil unit tersedia.");
  }
}

export async function getPosPaymentMethodsAction(
  brandSlug: string,
): Promise<ActionResult<Array<{ id: string; name: string; type: string }>>> {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");

    const methods = await getPaymentMethodsByBrand(session.brandId);
    return successResult(
      methods.map((method: any) => ({
        id: method.id,
        name: method.name,
        type: method.type,
      })),
    );
  } catch (err: any) {
    console.error("[getPosPaymentMethodsAction]", err);
    return errorResult(err.message || "Gagal mengambil metode pembayaran.");
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
    requireActionPermission(session.role, "pos.sale.create");

    const supabase = await createServerSupabase();
    const branch = resolveSessionBranchId(session, input.branchId);
    if (branch.error) return errorResult(branch.error);
    const branchId = branch.branchId;
    await requireActiveStoreSession(supabase, session.brandId, branchId);
    const brandId = input.brandId || session.brandId;

    // ── 2. Validate Cart ──
    if (!input.cartItems || input.cartItems.length === 0) {
      return errorResult("Keranjang masih kosong.");
    }

    for (const cartItem of input.cartItems) {
      if (!cartItem.inventoryItemId) {
        return errorResult("Produk tidak valid.");
      }
      if (!cartItem.quantity || cartItem.quantity <= 0) {
        return errorResult(`Kuantitas "${cartItem.productName}" tidak valid.`);
      }
      const itemType = normalizePosItemType(cartItem.itemType);
      if (itemType === "DEVICE_UNIT" && !cartItem.selectedUnit && !cartItem.inventoryItemUnitId) {
        return errorResult(`Pilih unit/IMEI untuk "${cartItem.productName}" terlebih dahulu.`);
      }
      if (itemType === "DEVICE_UNIT" && cartItem.quantity !== 1) {
        return errorResult("Kuantitas unit serial harus 1.");
      }
    }

    const payment = input.payments?.[0]; // MVP: single payment; split payment later.
    if (!payment?.paymentMethodId) {
      return errorResult("Metode pembayaran wajib dipilih.");
    }

    const paymentAmount = Number(input.paymentAmount ?? payment.amount ?? 0);
    if (paymentAmount <= 0) {
      return errorResult("Nominal pembayaran tidak valid.");
    }

    if (input.tradeIn) {
      if (!input.tradeIn.deviceBrand || !input.tradeIn.deviceModel) {
        return errorResult("Data perangkat tukar tambah belum lengkap.");
      }
      if (!input.tradeIn.appraisalValue || input.tradeIn.appraisalValue <= 0) {
        return errorResult("Nilai tukar tidak valid.");
      }
    }

    // ── 4. Handle Customer ──
    let customerId = input.customerId;
    if (!customerId && input.customerQuickCreate) {
      const result = await findOrCreateCustomer({
        brand_id: brandId,
        name: input.customerQuickCreate.name,
        phone: input.customerQuickCreate.phone,
      });
      if (result) customerId = result.id;
    }

    // ── 5. Single atomic checkout RPC ──
    const saleItems = input.cartItems.map((item) => ({
        inventory_item_id: item.inventoryItemId,
        inventory_item_unit_id: item.inventoryItemUnitId || item.selectedUnit?.unitId || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount || 0,
    }));

    const tradeInPayload = input.tradeIn
      ? {
          device_brand: input.tradeIn.deviceBrand,
          device_model: input.tradeIn.deviceModel,
          storage: input.tradeIn.storage || null,
          color: input.tradeIn.color || null,
          imei: input.tradeIn.imei || null,
          serial_number: input.tradeIn.serialNumber || null,
          condition_grade: input.tradeIn.conditionGrade || null,
          battery_health: input.tradeIn.batteryHealth || null,
          appraisal_value: input.tradeIn.appraisalValue,
          notes: input.tradeIn.notes || null,
        }
      : null;

    const rpcResult = await callRecordPosSaleV2(supabase, {
      brandId,
      branchId,
      paymentMethodId: payment.paymentMethodId,
      items: saleItems,
      customerId: customerId || undefined,
      discountAmount: input.discountAmount || 0,
      tradeIn: tradeInPayload,
      paymentAmount,
      notes: input.notes,
      metadata: { source: "pos_action" },
      createdBy: session.profileId,
      idempotencyKey: input.idempotencyKey,
    });

    if (!rpcResult.success) {
      return errorResult(rpcResult.error || "Gagal menyimpan transaksi POS.");
    }

    return successResult(rpcResult.data);
  } catch (err: any) {
    console.error("[createPosSaleAction]", err);
    return handleActionError(err, "Gagal memproses penjualan.");
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

    if (branchId) {
      requireBranchAccess(session, branchId, "listPosSalesAction");
    }

    const supabase = await createServerSupabase();
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

    const supabase = await createServerSupabase();
    const sale = await repoGetSale(supabase, saleId);
    if (!sale) return errorResult("Transaksi tidak ditemukan.");
    return successResult(sale);
  } catch (err: any) {
    console.error("[getPosSaleDetailAction]", err);
    return errorResult(err.message || "Gagal mengambil detail penjualan.");
  }
}
