"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { addServiceTimelineEntry, addAuditLog } from "@/repositories/service.repository";
import { getSessionData, successResult, errorResult, requireActionPermission, requireActiveStoreSession, handleActionError, } from "./action-helper";
import type {
  CreateSparepartV4Input,
  CreateProductV4Input,
  CreateUnitBaruV4Input,
  CreateUnitSecondV4Input,
  UpdateProductV4Input,
  UpdateVariantV4Input,
  UpdateUnitSecondV4Input,
  ListProductsV4Params,
  ListUnitSecondV4Params,
  ListInventoryMovementsV4Params,
  ProductV4Row,
  ProductDetailV4Row,
  UnitSecondV4Row,
  CreateCategoryV4Input,
  UpdateCategoryV4Input,
  CreateStockPurchaseV4Input,
  SubmitStockOpnameV4Input,
  ListStockOpnameVariantsV4Params,
  UseSparepartForServiceV4Input,
  CheckoutPosV4Input,
  VoidPosTransactionV4Input,
} from "@/server/domain/inventory-v4.types";
import {
  listProductsV4,
  setProductActiveStatusV4,
  setVariantActiveStatusV4,
  setUnitSecondStatusV4,
  updateProductV4 as repoUpdateProduct,
  updateVariantV4 as repoUpdateVariant,
  updateUnitSecondV4 as repoUpdateUnitSecond,
  getProductDetailV4,
  createSparepartV4 as repoCreateSparepart,
  createProductV4 as repoCreateProduct,
  createUnitBaruV4 as repoCreateUnitBaru,
  createUnitSecondV4 as repoCreateUnitSecond,
  searchUnitSecondModelsV4 as repoSearchUnitSecondModels,
  listUnitSecondV4,
  listCategoriesV4 as repoListCategories,
  createCategoryV4 as repoCreateCategory,
  updateCategoryV4 as repoUpdateCategory,
  listInventoryMovementsV4 as repoListMovements,
  searchPurchaseVariantsV4 as repoSearchVariants,
  createStockPurchaseV4 as repoCreatePurchase,
  listStockPurchasesV4 as repoListPurchases,
  getStockPurchaseDetailV4 as repoGetPurchaseDetail,
  listStockOpnameVariantsV4 as repoListOpnameVariants,
  submitStockOpnameV4 as repoSubmitOpname,
  searchServiceSparepartsV4 as repoSearchServiceSpareparts,
  useSparepartForServiceV4 as repoUseSparepart,
  listServiceSparepartUsageV4 as repoListServiceUsage,
  searchServicesV4 as repoSearchServices,
  listPosProductsV4 as repoListPosProducts,
  listPosUnitOptionsV4 as repoListPosUnitOptions,
  checkoutPosV4 as repoCheckoutPos,
  listPosTransactionsV4 as repoListPosTransactions,
  getPosTransactionDetailV4 as repoGetPosTransactionDetail,
  listPosCategoriesV4 as repoListPosCategories,
  listPosPaymentMethodsV4 as repoListPosPaymentMethods,
  voidPosTransactionV4 as repoVoidPosTransaction,
} from "@/server/repositories/inventory-v4.repository";
import { PERMISSIONS } from "@/lib/permissions/permissions";

/* ─── List categories V4 ─── */

export async function listCategoriesV4Action(
  brandSlug: string,
  itemType?: string | null,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const supabase = await createServerSupabase();
    const result = await repoListCategories(supabase as any, session.brandId, itemType);

    return successResult(result);
  } catch (err: any) {
    console.error("[listCategoriesV4Action]", err);
    return errorResult(err.message || "Gagal memuat kategori.");
  }
}

/* ─── Create category V4 ─── */

export async function createCategoryV4Action(
  brandSlug: string,
  input: CreateCategoryV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);

    if (!input.name?.trim()) return errorResult("Nama kategori wajib diisi.");

    const id = await repoCreateCategory(supabase as any, { ...input, brandId: session.brandId });

    return successResult({ id });
  } catch (err: any) {
    console.error("[createCategoryV4Action]", err);
    return handleActionError(err, "Gagal membuat kategori.");
  }
}

/* ─── Update category V4 ─── */

export async function updateCategoryV4Action(
  brandSlug: string,
  id: string,
  input: UpdateCategoryV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);
    await repoUpdateCategory(supabase as any, id, input);

    return successResult({});
  } catch (err: any) {
    console.error("[updateCategoryV4Action]", err);
    return handleActionError(err, "Gagal memperbarui kategori.");
  }
}

/* ─── List movements V4 ─── */

/* ─── Search purchase variants V4 ─── */

export async function searchPurchaseVariantsV4Action(
  brandSlug: string,
  branchId: string,
  search?: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    const supabase = await createServerSupabase();
    const result = await repoSearchVariants(supabase as any, session.brandId, branchId, search);
    return successResult(result);
  } catch (err: any) {
    console.error("[searchPurchaseVariantsV4Action]", err);
    return errorResult(err.message || "Gagal mencari varian.");
  }
}

/* ─── Create stock purchase V4 ─── */

export async function createStockPurchaseV4Action(
  brandSlug: string,
  input: CreateStockPurchaseV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, input.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    if (!input.paymentAccountId) return errorResult("Akun pembayaran wajib dipilih.");
    if (!input.items || input.items.length === 0) return errorResult("Minimal satu item harus ditambahkan.");
    for (const item of input.items) {
      if (!item.variantId) return errorResult("Varian tidak valid.");
      if (!item.quantity || item.quantity <= 0) return errorResult("Jumlah beli harus lebih dari 0.");
      if (item.unitCost < 0) return errorResult("Harga modal tidak boleh negatif.");
    }

    const result = await repoCreatePurchase(supabase as any, input, session.brandId, session.profileId);

    return successResult({
      purchaseId: result.purchaseId,
      purchaseNumber: result.purchaseNumber,
      totalAmount: result.totalAmount,
      itemCount: result.itemCount,
    });
  } catch (err: any) {
    console.error("[createStockPurchaseV4Action]", err);
    return handleActionError(err, "Gagal mencatat belanja stok.");
  }
}

/* ─── List stock purchase history V4 ─── */

export async function listStockPurchasesV4Action(
  brandSlug: string,
  params: { branchId?: string | null; page?: number; pageSize?: number; search?: string },
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    if (params.branchId) {
      const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
      const { canAccessBranch } = await import("@/domain/access/branch-access");
      if (!canAccessBranch(ctx, params.branchId)) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    const supabase = await createServerSupabase();
    const result = await repoListPurchases(supabase as any, { ...params, brandId: session.brandId });
    return successResult(result);
  } catch (err: any) {
    console.error("[listStockPurchasesV4Action]", err);
    return errorResult(err.message || "Gagal memuat riwayat belanja.");
  }
}

/* ─── Get stock purchase detail V4 ─── */

export async function getStockPurchaseDetailV4Action(
  brandSlug: string,
  purchaseId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const supabase = await createServerSupabase();
    const result = await repoGetPurchaseDetail(supabase as any, purchaseId);
    return successResult(result);
  } catch (err: any) {
    console.error("[getStockPurchaseDetailV4Action]", err);
    return errorResult(err.message || "Gagal memuat detail belanja.");
  }
}

export async function listInventoryMovementsV4Action(
  brandSlug: string,
  params: ListInventoryMovementsV4Params,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    if (params.branchId) {
      const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
      const { canAccessBranch } = await import("@/domain/access/branch-access");
      if (!canAccessBranch(ctx, params.branchId)) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    const supabase = await createServerSupabase();
    const result = await repoListMovements(supabase as any, { ...params, brandId: session.brandId });

    return successResult(result);
  } catch (err: any) {
    console.error("[listInventoryMovementsV4Action]", err);
    return errorResult(err.message || "Gagal memuat riwayat movement.");
  }
}

/* ─── List stock opname variants V4 ─── */

export async function listStockOpnameVariantsV4Action(
  brandSlug: string,
  params: ListStockOpnameVariantsV4Params,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (params.branchId && !canAccessBranch(ctx, params.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    const supabase = await createServerSupabase();
    const result = await repoListOpnameVariants(supabase as any, { ...params, brandId: session.brandId });
    return successResult(result);
  } catch (err: any) {
    console.error("[listStockOpnameVariantsV4Action]", err);
    return errorResult(err.message || "Gagal memuat varian opname.");
  }
}

/* ─── Submit stock opname V4 ─── */

export async function submitStockOpnameV4Action(
  brandSlug: string,
  input: SubmitStockOpnameV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, input.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    if (!input.notes?.trim()) return errorResult("Catatan/alasan penyesuaian wajib diisi.");
    if (!input.adjustments || input.adjustments.length === 0) return errorResult("Minimal satu item penyesuaian harus disertakan.");
    for (const a of input.adjustments) {
      if (a.physicalStock < 0) return errorResult("Stok opname tidak boleh negatif.");
    }
    const result = await repoSubmitOpname(supabase as any, input, session.brandId);
    return successResult(result);
  } catch (err: any) {
    console.error("[submitStockOpnameV4Action]", err);
    return handleActionError(err, "Gagal menyimpan penyesuaian stok.");
  }
}

/* ─── List products V4 ─── */

export async function listProductsV4Action(
  brandSlug: string,
  params: ListProductsV4Params,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    if (params.branchId) {
      const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
      const { canAccessBranch } = await import("@/domain/access/branch-access");
      if (!canAccessBranch(ctx, params.branchId)) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    const supabase = await createServerSupabase();
    const result = await listProductsV4(supabase as any, { ...params, brandId: session.brandId });

    return successResult(result);
  } catch (err: any) {
    console.error("[listProductsV4Action]", err);
    return errorResult(err.message || "Gagal memuat daftar produk.");
  }
}

/* ─── Deactivate product V4 ─── */

export async function deactivateProductV4Action(
  brandSlug: string,
  productId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);
    await setProductActiveStatusV4(supabase as any, productId, false);

    return successResult(null);
  } catch (err: any) {
    console.error("[deactivateProductV4Action]", err);
    return handleActionError(err, "Gagal menonaktifkan produk.");
  }
}

/* ─── Reactivate product V4 ─── */

export async function reactivateProductV4Action(
  brandSlug: string,
  productId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);
    await setProductActiveStatusV4(supabase as any, productId, true);

    return successResult(null);
  } catch (err: any) {
    console.error("[reactivateProductV4Action]", err);
    return handleActionError(err, "Gagal mengaktifkan produk.");
  }
}

/* ─── Deactivate variant V4 ─── */

export async function deactivateVariantV4Action(
  brandSlug: string,
  variantId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);
    await setVariantActiveStatusV4(supabase as any, variantId, false);

    return successResult(null);
  } catch (err: any) {
    console.error("[deactivateVariantV4Action]", err);
    return handleActionError(err, "Gagal menonaktifkan varian.");
  }
}

/* ─── Reactivate variant V4 ─── */

export async function reactivateVariantV4Action(
  brandSlug: string,
  variantId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);
    await setVariantActiveStatusV4(supabase as any, variantId, true);

    return successResult(null);
  } catch (err: any) {
    console.error("[reactivateVariantV4Action]", err);
    return handleActionError(err, "Gagal mengaktifkan varian.");
  }
}

/* ─── Archive Unit Second V4 ─── */

export async function archiveUnitSecondV4Action(
  brandSlug: string,
  unitId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);
    await setUnitSecondStatusV4(supabase as any, unitId, "ARCHIVED");

    return successResult(null);
  } catch (err: any) {
    console.error("[archiveUnitSecondV4Action]", err);
    return handleActionError(err, "Gagal mengarsipkan unit.");
  }
}

/* ─── Reactivate (unarchive) Unit Second V4 ─── */

export async function reactivateUnitSecondV4Action(
  brandSlug: string,
  unitId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, session.defaultBranchId);
    await setUnitSecondStatusV4(supabase as any, unitId, "READY_STOCK");

    return successResult(null);
  } catch (err: any) {
    console.error("[reactivateUnitSecondV4Action]", err);
    return handleActionError(err, "Gagal mengaktifkan kembali unit.");
  }
}

/* ─── Update product V4 ─── */

export async function updateProductV4Action(
  brandSlug: string,
  input: UpdateProductV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);
    if (!input.productId) return errorResult("Produk tidak valid.");
    if (!input.name?.trim()) return errorResult("Nama item wajib diisi.");

    const supabase = await createServerSupabase();
    const { data: product, error: productErr } = await (supabase as any)
      .from("inv_products")
      .select("id, brand_id, branch_id")
      .eq("id", input.productId)
      .maybeSingle();
    if (productErr) throw productErr;
    if (!product || product.brand_id !== session.brandId) return errorResult("Produk tidak ditemukan.");

    await requireActiveStoreSession(supabase, session.brandId, product.branch_id);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, product.branch_id)) return errorResult("Anda tidak memiliki akses ke cabang ini.");

    await repoUpdateProduct(supabase as any, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
    });

    return successResult(null);
  } catch (err: any) {
    console.error("[updateProductV4Action]", err);
    return handleActionError(err, "Gagal memperbarui item.");
  }
}

/* ─── Update variant V4 ─── */

export async function updateVariantV4Action(
  brandSlug: string,
  input: UpdateVariantV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);
    if (!input.variantId) return errorResult("Varian tidak valid.");
    if (!input.name?.trim()) return errorResult("Nama varian wajib diisi.");
    if ((input.minStock ?? 0) < 0) return errorResult("Minimum stok tidak boleh negatif.");
    if ((input.costPrice ?? 0) < 0) return errorResult("Harga modal tidak boleh negatif.");
    if ((input.sellingPrice ?? 0) < 0) return errorResult("Harga jual tidak boleh negatif.");

    const supabase = await createServerSupabase();
    const { data: variant, error: variantErr } = await (supabase as any)
      .from("inv_variants")
      .select("id, brand_id, branch_id")
      .eq("id", input.variantId)
      .maybeSingle();
    if (variantErr) throw variantErr;
    if (!variant || variant.brand_id !== session.brandId) return errorResult("Varian tidak ditemukan.");

    await requireActiveStoreSession(supabase, session.brandId, variant.branch_id);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, variant.branch_id)) return errorResult("Anda tidak memiliki akses ke cabang ini.");

    await repoUpdateVariant(supabase as any, {
      ...input,
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      barcode: input.barcode?.trim() || null,
      unit: input.unit?.trim() || "pcs",
      imageUrl: input.imageUrl?.trim() || null,
    });

    return successResult(null);
  } catch (err: any) {
    console.error("[updateVariantV4Action]", err);
    return handleActionError(err, "Gagal memperbarui varian.");
  }
}

/* ─── Update Unit Second metadata V4 ─── */

export async function updateUnitSecondV4Action(
  brandSlug: string,
  input: UpdateUnitSecondV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);
    if (!input.unitId) return errorResult("Unit tidak valid.");
    if (input.batteryHealth !== undefined && input.batteryHealth !== null && (input.batteryHealth < 0 || input.batteryHealth > 100)) {
      return errorResult("Battery health harus antara 0-100.");
    }
    if ((input.purchaseCost ?? 0) < 0) return errorResult("Harga modal tidak boleh negatif.");
    if ((input.sellingPrice ?? 0) < 0) return errorResult("Harga jual tidak boleh negatif.");

    const supabase = await createServerSupabase();
    const { data: unit, error: unitErr } = await (supabase as any)
      .from("inv_units")
      .select("id, brand_id, branch_id")
      .eq("id", input.unitId)
      .maybeSingle();
    if (unitErr) throw unitErr;
    if (!unit || unit.brand_id !== session.brandId) return errorResult("Unit tidak ditemukan.");

    await requireActiveStoreSession(supabase, session.brandId, unit.branch_id);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, unit.branch_id)) return errorResult("Anda tidak memiliki akses ke cabang ini.");

    await repoUpdateUnitSecond(supabase as any, {
      ...input,
      imei: input.imei?.trim() || null,
      serialNumber: input.serialNumber?.trim() || null,
      barcode: input.barcode?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      physicalConditionNotes: input.physicalConditionNotes?.trim() || null,
      functionalConditionNotes: input.functionalConditionNotes?.trim() || null,
      accessoriesIncluded: input.accessoriesIncluded?.trim() || null,
      warrantyNotes: input.warrantyNotes?.trim() || null,
    });

    return successResult(null);
  } catch (err: any) {
    console.error("[updateUnitSecondV4Action]", err);
    return handleActionError(err, "Gagal memperbarui unit second.");
  }
}

/* ─── Get product detail V4 ─── */

export async function getProductDetailV4Action(
  brandSlug: string,
  productId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const supabase = await createServerSupabase();
    const result = await getProductDetailV4(supabase as any, productId);

    if (!result) return errorResult("Produk tidak ditemukan.");

    return successResult(result);
  } catch (err: any) {
    console.error("[getProductDetailV4Action]", err);
    return errorResult(err.message || "Gagal memuat detail produk.");
  }
}

/* ─── Create sparepart V4 ─── */

export async function createSparepartV4Action(
  brandSlug: string,
  input: CreateSparepartV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, input.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    // Validation
    if (!input.name?.trim()) return errorResult("Nama sparepart wajib diisi.");
    if (!input.branchId) return errorResult("Cabang wajib dipilih.");
    if (!input.variants || input.variants.length === 0) {
      input.variants = [{ name: input.name }];
    }

    const result = await repoCreateSparepart(supabase as any, { ...input, brandId: session.brandId }, session.profileId);

    return successResult(result);
  } catch (err: any) {
    console.error("[createSparepartV4Action]", err);
    return handleActionError(err, "Gagal membuat sparepart.");
  }
}

/* ─── Create product V4 ─── */

export async function createProductV4Action(
  brandSlug: string,
  input: CreateProductV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, input.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    // Validation
    if (!input.name?.trim()) return errorResult("Nama produk wajib diisi.");
    if (!input.branchId) return errorResult("Cabang wajib dipilih.");
    if (!input.variants || input.variants.length === 0) {
      input.variants = [{ name: input.name }];
    }

    const result = await repoCreateProduct(supabase as any, { ...input, brandId: session.brandId }, session.profileId);

    return successResult(result);
  } catch (err: any) {
    console.error("[createProductV4Action]", err);
    return handleActionError(err, "Gagal membuat produk.");
  }
}

/* ─── Create unit baru V4 ─── */

export async function createUnitBaruV4Action(
  brandSlug: string,
  input: CreateUnitBaruV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, input.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    // Validation
    if (!input.name?.trim()) return errorResult("Nama unit wajib diisi.");
    if (!input.branchId) return errorResult("Cabang wajib dipilih.");
    if (!input.variants || input.variants.length === 0) {
      input.variants = [{ name: input.name }];
    }

    const result = await repoCreateUnitBaru(supabase as any, { ...input, brandId: session.brandId }, session.profileId);

    return successResult(result);
  } catch (err: any) {
    console.error("[createUnitBaruV4Action]", err);
    return handleActionError(err, "Gagal membuat unit baru.");
  }
}

/* ─── Create unit second V4 ─── */

/* ─── Search Unit Second models V4 ─── */

export async function searchUnitSecondModelsV4Action(
  brandSlug: string,
  branchId: string,
  query: string,
) {
  try {
    if (!query.trim()) return successResult([]);
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");

    const supabase = await createServerSupabase();
    const result = await repoSearchUnitSecondModels(supabase as any, session.brandId, branchId, query);
    return successResult(result);
  } catch (err: any) {
    console.error("[searchUnitSecondModelsV4Action]", err);
    return errorResult(err.message || "Gagal mencari model.");
  }
}

export async function createUnitSecondV4Action(
  brandSlug: string,
  input: CreateUnitSecondV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, input.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    // Validation
    if (!input.name?.trim()) return errorResult("Nama unit wajib diisi.");
    if (!input.branchId) return errorResult("Cabang wajib dipilih.");
    if (!input.units || input.units.length === 0) {
      return errorResult("Minimal satu unit second wajib ditambahkan.");
    }

    // Validate battery health
    for (const u of input.units) {
      if (
        u.batteryHealth !== undefined &&
        u.batteryHealth !== null &&
        (u.batteryHealth < 0 || u.batteryHealth > 100)
      ) {
        return errorResult("Battery health harus antara 0-100.");
      }
    }
    const result = await repoCreateUnitSecond(supabase as any, { ...input, brandId: session.brandId }, session.profileId);

    return successResult(result);
  } catch (err: any) {
    console.error("[createUnitSecondV4Action]", err);
    return handleActionError(err, "Gagal membuat unit second.");
  }
}

/* ─── List unit second V4 ─── */

export async function listUnitSecondV4Action(
  brandSlug: string,
  params: ListUnitSecondV4Params,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    if (params.branchId) {
      const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
      const { canAccessBranch } = await import("@/domain/access/branch-access");
      if (!canAccessBranch(ctx, params.branchId)) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    const supabase = await createServerSupabase();
    const result = await listUnitSecondV4(supabase as any, { ...params, brandId: session.brandId });

    return successResult(result);
  } catch (err: any) {
    console.error("[listUnitSecondV4Action]", err);
    return errorResult(err.message || "Gagal memuat daftar unit second.");
  }
}

/* ─── Search service sparepart variants V4 ─── */

export async function searchServiceSparepartsV4Action(
  brandSlug: string,
  branchId: string,
  search?: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    const supabase = await createServerSupabase();
    const result = await repoSearchServiceSpareparts(supabase as any, session.brandId, branchId, search);
    return successResult(result);
  } catch (err: any) {
    console.error("[searchServiceSparepartsV4Action]", err);
    return errorResult(err.message || "Gagal mencari sparepart.");
  }
}

/* ─── Use sparepart for service V4 ─── */

export async function useSparepartForServiceV4Action(
  brandSlug: string,
  input: UseSparepartForServiceV4Input,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_MANAGE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, input.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    if (!input.serviceId) return errorResult("Servis wajib dipilih.");
    if (!input.items || input.items.length === 0) return errorResult("Minimal satu item sparepart harus ditambahkan.");
    for (const item of input.items) {
      if (!item.variantId) return errorResult("Varian tidak valid.");
      if (!item.quantity || item.quantity <= 0) return errorResult("Jumlah pemakaian harus lebih dari 0.");
    }

    const result = await repoUseSparepart(supabase as any, input, session.brandId, session.profileId);

    /* Record timeline and audit for sparepart usage */
    try {
      const adminDb = createServiceRoleSupabaseClient();
      const { data: service } = await (adminDb as any)
        .from("services")
        .select("service_number, current_status")
        .eq("id", input.serviceId)
        .maybeSingle();

      const itemNames: string[] = [];
      const { data: usageRows } = await (adminDb as any)
        .from("inv_sparepart_usage")
        .select("item_name_snapshot, quantity, selling_price_snapshot")
        .in("id", result.usageIds);

      const totalCost = (usageRows ?? []).reduce(
        (sum: number, u: any) => sum + Number(u.selling_price_snapshot ?? 0) * Number(u.quantity ?? 1),
        0,
      );
      (usageRows ?? []).forEach((u: any) => { if (u.item_name_snapshot) itemNames.push(u.item_name_snapshot); });
      const itemSummary = itemNames.length > 0 ? itemNames.slice(0, 3).join(", ") + (itemNames.length > 3 ? "..." : "") : `${input.items.length} item`;

      await addServiceTimelineEntry({
        brand_id: session.brandId,
        branch_id: input.branchId,
        service_id: input.serviceId,
        from_status: null,
        to_status: service?.current_status ?? "REPAIRING",
        reason: `Sparepart ditambahkan: ${itemSummary} — Rp ${totalCost.toLocaleString("id-ID")}`,
        metadata: { items: input.items as any, usage_ids: result.usageIds, total_sparepart_cost: totalCost, source: "V4" },
        changed_by: session.profileId,
      });

      await addAuditLog({
        brand_id: session.brandId,
        branch_id: input.branchId,
        action: "SERVICE_SPAREPART_ADDED",
        target_type: "service",
        target_id: input.serviceId,
        target_label: service?.service_number ?? input.serviceId,
        actor_id: session.profileId,
        description: `Sparepart ditambahkan (V4): ${itemSummary} — Rp ${totalCost.toLocaleString("id-ID")}`,
        details: {
          usage_ids: result.usageIds,
          movement_ids: result.movementIds,
          total_sparepart_cost: totalCost,
          source: "V4",
        },
      });
    } catch (auditErr: any) {
      console.warn("[useSparepartForServiceV4Action] audit/timeline error:", auditErr.message);
    }

    return successResult(result);
  } catch (err: any) {
    console.error("[useSparepartForServiceV4Action]", err);
    return handleActionError(err, "Gagal mencatat pemakaian sparepart.");
  }
}

/* ─── List service sparepart usage V4 ─── */

export async function listServiceSparepartUsageV4Action(
  brandSlug: string,
  serviceId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const supabase = await createServerSupabase();
    const result = await repoListServiceUsage(supabase as any, serviceId);
    return successResult(result);
  } catch (err: any) {
    console.error("[listServiceSparepartUsageV4Action]", err);
    return errorResult(err.message || "Gagal memuat pemakaian sparepart.");
  }
}

/* ─── Search services V4 (for sparepart usage) ─── */

export async function searchServicesV4Action(
  brandSlug: string,
  branchId: string,
  search?: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    const supabase = await createServerSupabase();
    const result = await repoSearchServices(supabase as any, session.brandId, branchId, search);
    return successResult(result);
  } catch (err: any) {
    console.error("[searchServicesV4Action]", err);
    return errorResult(err.message || "Gagal mencari servis.");
  }
}

/* ─── POS V4 Actions ─── */

export async function listPosProductsV4Action(
  brandSlug: string,
  branchId: string,
  categoryId?: string | null,
  search?: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    const supabase = await createServerSupabase();
    console.log("[pos-v4/action] list input", { brandSlug, branchId, search, categoryId, brandId: session.brandId });
    const result = await repoListPosProducts(supabase as any, session.brandId, branchId, categoryId, search);
    console.log("[pos-v4/action] result count", result.length);
    return successResult(result);
  } catch (err: any) {
    console.error("[listPosProductsV4Action]", err);
    return errorResult(err.message || "Gagal memuat produk POS.");
  }
}

export async function listPosUnitOptionsV4Action(
  brandSlug: string,
  productIds: string[],
  branchId: string,
) {
  try {
    if (!productIds || productIds.length === 0) return errorResult("ID produk tidak valid.");
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const supabase = await createServerSupabase();
    const result = await repoListPosUnitOptions(supabase as any, productIds, branchId);
    return successResult(result);
  } catch (err: any) {
    console.error("[listPosUnitOptionsV4Action]", err);
    return errorResult(err.message || "Gagal memuat opsi unit.");
  }
}

export async function checkoutPosV4Action(
  brandSlug: string,
  input: CheckoutPosV4Input & { branchId: string },
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.POS_SALE_CREATE);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, input.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    if (!input.paymentMethodId) return errorResult("Metode pembayaran wajib dipilih.");
    if (!input.items || input.items.length === 0) return errorResult("Minimal satu item harus ditambahkan.");
    for (const item of input.items) {
      if (item.itemType === "UNIT_SECOND_SERIALIZED") {
        if (!item.unitId) return errorResult("Unit Second wajib dipilih.");
      } else {
        if (!item.variantId) return errorResult("Varian wajib dipilih.");
        if (!item.quantity || item.quantity <= 0) return errorResult("Jumlah harus lebih dari 0.");
      }
      if (item.sellingPrice < 0) return errorResult("Harga jual tidak boleh negatif.");
    }
    const result = await repoCheckoutPos(supabase as any, input, session.brandId, session.profileId);

    try {
      await addAuditLog({
        brand_id: session.brandId,
        branch_id: input.branchId,
        action: "POS_CHECKOUT",
        target_type: "pos_transaction",
        target_id: result.transactionId,
        target_label: result.transactionNumber,
        actor_id: session.profileId,
        description: `Checkout POS: ${result.transactionNumber} — Rp ${result.totalAmount.toLocaleString("id-ID")}`,
        details: {
          transaction_number: result.transactionNumber,
          total_amount: result.totalAmount,
          subtotal_amount: result.subtotalAmount,
          discount_amount: result.discountAmount,
          service_fee_amount: result.serviceFeeAmount,
          paid_amount: result.paidAmount,
          change_amount: result.changeAmount,
          item_count: input.items.length,
          payment_account_id: result.paymentAccountId,
        },
      });
    } catch (auditErr: any) {
      console.warn("[checkoutPosV4Action] audit log error:", auditErr.message);
    }

    return successResult(result);
  } catch (err: any) {
    console.error("[checkoutPosV4Action]", err);
    return handleActionError(err, "Gagal memproses transaksi POS.");
  }
}

export async function listPosTransactionsV4Action(
  brandSlug: string,
  branchId?: string | null,
  page?: number,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    if (branchId) {
      const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
      const { canAccessBranch } = await import("@/domain/access/branch-access");
      if (!canAccessBranch(ctx, branchId)) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    const supabase = await createServerSupabase();
    const result = await repoListPosTransactions(supabase as any, session.brandId, branchId, page);
    return successResult(result);
  } catch (err: any) {
    console.error("[listPosTransactionsV4Action]", err);
    return errorResult(err.message || "Gagal memuat riwayat transaksi.");
  }
}

export async function getPosTransactionDetailV4Action(
  brandSlug: string,
  transactionId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const supabase = await createServerSupabase();
    const result = await repoGetPosTransactionDetail(supabase as any, transactionId);
    return successResult(result);
  } catch (err: any) {
    console.error("[getPosTransactionDetailV4Action]", err);
    return errorResult(err.message || "Gagal memuat detail transaksi.");
  }
}

export async function listPosCategoriesV4Action(
  brandSlug: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const supabase = await createServerSupabase();
    const result = await repoListPosCategories(supabase as any, session.brandId);
    return successResult(result);
  } catch (err: any) {
    console.error("[listPosCategoriesV4Action]", err);
    return errorResult(err.message || "Gagal memuat kategori POS.");
  }
}

export async function listPosPaymentMethodsV4Action(
  brandSlug: string,
  branchId: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    const supabase = await createServerSupabase();
    const result = await repoListPosPaymentMethods(supabase as any, session.brandId, branchId);
    console.log("[pos-v4/payment-methods] result", {
      brandSlug,
      brandId: session.brandId,
      branchId,
      count: result?.length ?? 0,
      methods: result?.map((m: any) => ({
        name: m.paymentMethodName,
        type: m.paymentMethodType,
        paymentMethodId: m.paymentMethodId,
        branchPaymentMethodId: m.branchPaymentMethodId,
        defaultPaymentAccountId: m.defaultPaymentAccountId,
      })),
    });
    return successResult(result);
  } catch (err: any) {
    console.error("[listPosPaymentMethodsV4Action]", err);
    return errorResult(err.message || "Gagal memuat metode pembayaran.");
  }
}

export async function voidPosTransactionV4Action(
  brandSlug: string,
  input: VoidPosTransactionV4Input & { branchId: string },
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.POS_VOID);

    const supabase = await createServerSupabase();
    await requireActiveStoreSession(supabase, session.brandId, input.branchId);

    const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
    const { canAccessBranch } = await import("@/domain/access/branch-access");
    if (!canAccessBranch(ctx, input.branchId)) {
      return errorResult("Anda tidak memiliki akses ke cabang ini.");
    }

    if (!input.transactionId) return errorResult("ID transaksi wajib diisi.");
    if (!input.reason || input.reason.trim().length < 5) return errorResult("Alasan pembatalan minimal 5 karakter.");

    const result = await repoVoidPosTransaction(
      supabase as any,
      session.brandId,
      input.branchId,
      input.transactionId,
      input.reason.trim(),
    );

    try {
      await addAuditLog({
        brand_id: session.brandId,
        branch_id: input.branchId,
        action: "POS_VOID",
        target_type: "pos_transaction",
        target_id: result.transactionId,
        target_label: result.transactionNumber,
        actor_id: session.profileId,
        description: `Void POS: ${result.transactionNumber} — ${input.reason.trim()}`,
        details: {
          transaction_number: result.transactionNumber,
          reason: input.reason.trim(),
          restored_item_count: result.restoredItemCount,
          status: result.status,
        },
      });
    } catch (auditErr: any) {
      console.warn("[voidPosTransactionV4Action] audit log error:", auditErr.message);
    }

    return successResult(result);
  } catch (err: any) {
    console.error("[voidPosTransactionV4Action]", err);
    return handleActionError(err, "Gagal membatalkan transaksi POS.");
  }
}
