"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  type ActionResult,
} from "./action-helper";
import {
  getV4PosSalesSummary as repoPosSalesSummary,
  getV4PosItemSales as repoPosItemSales,
  getV4PosPaymentSummary as repoPosPaymentSummary,
  getV4InventoryStockSummary as repoInventoryStockSummary,
  getV4InventoryValuation as repoInventoryValuation,
  getV4UnitSecondSummary as repoUnitSecondSummary,
  getV4MovementSummary as repoMovementSummary,
  getV4SparepartUsageSummary as repoSparepartUsageSummary,
  getV4StockPurchaseSummary as repoStockPurchaseSummary,
  getV4BranchBusinessSummary as repoBranchBusinessSummary,
  getV4InventoryReportTotals as repoInventoryReportTotals,
} from "@/server/repositories/reporting-v4.repository";
import type {
  V4ReportFilter,
  V4InventoryReportTotals,
  V4InventoryStockSummaryRow,
  V4InventoryValuationRow,
  V4InventoryMovementSummaryRow,
  V4StockPurchaseSummaryRow,
  V4UnitSecondSummaryRow,
} from "@/server/domain/reporting-v4.types";
import { PERMISSIONS } from "@/lib/permissions/permissions";

/* ─── Helpers ─── */

async function getReportData<T>(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
  repoFn: (supabase: any, brandId: number, filters: V4ReportFilter) => Promise<{ data: T[]; total: number }>,
  permission: string,
  errorLabel: string,
) {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, permission as any);

    if (filter.branchId) {
      const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
      const { canAccessBranch } = await import("@/domain/access/branch-access");
      if (!canAccessBranch(ctx, filter.branchId)) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    const supabase = await createServerSupabase();
    const result = await repoFn(supabase as any, session.brandId, filter as V4ReportFilter);
    return successResult(result);
  } catch (err: any) {
    console.error(`[${errorLabel}]`, err);
    return errorResult(err.message || "Gagal memuat data laporan.");
  }
}

/* ─── Actions ─── */

export async function getV4PosSalesSummaryAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoPosSalesSummary, PERMISSIONS.INVENTORY_VIEW, "getV4PosSalesSummaryAction");
}

export async function getV4PosItemSalesAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoPosItemSales, PERMISSIONS.INVENTORY_VIEW, "getV4PosItemSalesAction");
}

export async function getV4PosPaymentSummaryAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoPosPaymentSummary, PERMISSIONS.INVENTORY_VIEW, "getV4PosPaymentSummaryAction");
}

export async function getV4InventoryStockSummaryAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoInventoryStockSummary, PERMISSIONS.INVENTORY_VIEW, "getV4InventoryStockSummaryAction");
}

export async function getV4InventoryValuationAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoInventoryValuation, PERMISSIONS.INVENTORY_VIEW, "getV4InventoryValuationAction");
}

export async function getV4UnitSecondSummaryAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoUnitSecondSummary, PERMISSIONS.INVENTORY_VIEW, "getV4UnitSecondSummaryAction");
}

export async function getV4MovementSummaryAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoMovementSummary, PERMISSIONS.INVENTORY_VIEW, "getV4MovementSummaryAction");
}

export async function getV4SparepartUsageSummaryAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoSparepartUsageSummary, PERMISSIONS.INVENTORY_VIEW, "getV4SparepartUsageSummaryAction");
}

export async function getV4StockPurchaseSummaryAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoStockPurchaseSummary, PERMISSIONS.INVENTORY_VIEW, "getV4StockPurchaseSummaryAction");
}

export async function getV4BranchBusinessSummaryAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
) {
  return getReportData(brandSlug, filter, repoBranchBusinessSummary, PERMISSIONS.INVENTORY_VIEW, "getV4BranchBusinessSummaryAction");
}

/* ─── Inventory Report Totals ─── */

export async function getV4InventoryReportTotalsAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
): Promise<ActionResult<V4InventoryReportTotals>> {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW as any);

    if (filter.branchId) {
      const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
      const { canAccessBranch } = await import("@/domain/access/branch-access");
      if (!canAccessBranch(ctx, filter.branchId)) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    const supabase = await createServerSupabase();
    const totals = await repoInventoryReportTotals(supabase as any, session.brandId, filter as V4ReportFilter);
    return successResult(totals);
  } catch (err: any) {
    console.error("[getV4InventoryReportTotalsAction]", err);
    return errorResult(err.message || "Gagal memuat data laporan.");
  }
}

/* ─── Export Stock Report CSV ─── */

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "0";
  return n.toLocaleString("id-ID");
}

export async function exportStockReportCSVAction(
  brandSlug: string,
  filter: V4ReportFilter & { branchId?: string | null },
): Promise<ActionResult<{ csv: string; filename: string }>> {
  try {
    const session = await getSessionData(brandSlug);
    if (!session) return errorResult("Sesi tidak valid.");
    requireActionPermission(session.role, PERMISSIONS.INVENTORY_VIEW as any);

    if (filter.branchId) {
      const ctx = { role: session.role, accessibleBranchIds: session.accessibleBranchIds };
      const { canAccessBranch } = await import("@/domain/access/branch-access");
      if (!canAccessBranch(ctx, filter.branchId)) {
        return errorResult("Anda tidak memiliki akses ke cabang ini.");
      }
    }

    const supabase = await createServerSupabase();
    const brandId = session.brandId;

    const stockResult = await repoInventoryStockSummary(supabase as any, brandId, filter as V4ReportFilter);
    const valuationResult = await repoInventoryValuation(supabase as any, brandId, filter as V4ReportFilter);
    const movementResult = await repoMovementSummary(supabase as any, brandId, { ...filter, page: 1, pageSize: 100 } as V4ReportFilter);
    const purchaseResult = await repoStockPurchaseSummary(supabase as any, brandId, { ...filter, page: 1, pageSize: 100 } as V4ReportFilter);
    const unitResult = await repoUnitSecondSummary(supabase as any, brandId, { ...filter, page: 1, pageSize: 100 } as V4ReportFilter);
    const totals = await repoInventoryReportTotals(supabase as any, brandId, filter as V4ReportFilter);

    const lines: string[] = [];

    lines.push("=== LAPORAN STOK ===");
    lines.push(`Dibuat: ${new Date().toLocaleString("id-ID")}`);
    lines.push("");
    lines.push("Ringkasan");
    lines.push("Metrik,Nilai");
    lines.push(`Total Varian,${totals.variantCount}`);
    lines.push(`Stok Tersedia,${fmtCurrency(totals.totalAvailableStock)}`);
    lines.push(`Stok Tereservasi,${fmtCurrency(totals.totalReservedStock)}`);
    lines.push(`Nilai Persediaan (HPP),${fmtCurrency(totals.totalCostValue)}`);
    lines.push(`Nilai Jual Potensial,${fmtCurrency(totals.totalPotentialSalesValue)}`);
    lines.push(`Potensi Laba,${fmtCurrency(totals.totalPotentialGrossProfit)}`);
    lines.push(`Stok Menipis,${totals.lowStockCount}`);
    lines.push(`Stok Habis,${totals.outOfStockCount}`);
    lines.push(`Unit Second Ready,${totals.unitSecondReadyCount}`);
    lines.push(`Unit Second Terjual,${totals.unitSecondSoldCount}`);
    lines.push("");

    lines.push("Ringkasan Stok");
    lines.push("Produk,Varian,SKU,Kategori,Stok,Tereservasi,Tersedia,Min,Status");
    for (const r of stockResult.data as V4InventoryStockSummaryRow[]) {
      lines.push([
        escapeCsv(r.productName),
        escapeCsv(r.variantName),
        escapeCsv(r.sku),
        escapeCsv(r.categoryName),
        r.currentStock,
        r.reservedStock,
        r.availableStock,
        r.minStock ?? 0,
        escapeCsv(r.stockStatus),
      ].join(","));
    }
    lines.push("");

    lines.push("Nilai Persediaan");
    lines.push("Produk,Varian,Stok,HPP,Harga Jual,Nilai Persediaan,Nilai Jual Potensial,Potensi Laba");
    for (const r of valuationResult.data as V4InventoryValuationRow[]) {
      lines.push([
        escapeCsv(r.productName),
        escapeCsv(r.variantName),
        r.currentStock,
        fmtCurrency(r.averageCost),
        fmtCurrency(r.sellingPrice),
        fmtCurrency(r.costValue),
        fmtCurrency(r.potentialSalesValue),
        fmtCurrency(r.potentialGrossProfit),
      ].join(","));
    }
    lines.push("");

    lines.push("Mutasi Stok");
    lines.push("Tanggal,Produk,Varian,Tipe,Arah,Qty,Stok Sebelum,Stok Sesudah,Referensi,Catatan");
    for (const r of movementResult.data as V4InventoryMovementSummaryRow[]) {
      lines.push([
        escapeCsv(r.movementDate),
        escapeCsv(r.productName),
        escapeCsv(r.variantName),
        escapeCsv(r.movementType),
        escapeCsv(r.direction),
        r.quantity,
        r.stockBefore ?? "",
        r.stockAfter ?? "",
        escapeCsv(r.referenceLabel),
        escapeCsv(r.notes),
      ].join(","));
    }
    lines.push("");

    lines.push("Riwayat Pembelian");
    lines.push("Tanggal,No. PO,Supplier,Produk,Varian,Qty,HPP,Subtotal,Status");
    for (const r of purchaseResult.data as V4StockPurchaseSummaryRow[]) {
      lines.push([
        escapeCsv(r.purchaseDate),
        escapeCsv(r.purchaseNumber),
        escapeCsv(r.supplierName),
        escapeCsv(r.productNameSnapshot),
        escapeCsv(r.variantNameSnapshot),
        r.quantity,
        fmtCurrency(r.unitCost),
        fmtCurrency(r.subtotalAmount),
        escapeCsv(r.status),
      ].join(","));
    }
    lines.push("");

    lines.push("Unit Second");
    lines.push("IMEI,Serial,Model,Varian,Kondisi,Battery,Harga Beli,Harga Jual,Potensi Laba,Status");
    for (const r of unitResult.data as V4UnitSecondSummaryRow[]) {
      lines.push([
        escapeCsv(r.imei),
        escapeCsv(r.serialNumber),
        escapeCsv(r.productName),
        escapeCsv(r.variantName),
        escapeCsv(r.conditionGrade),
        r.batteryHealth ?? "",
        fmtCurrency(r.purchaseCost),
        fmtCurrency(r.sellingPrice),
        fmtCurrency(r.potentialProfit),
        escapeCsv(r.status),
      ].join(","));
    }

    const filename = `laporan-stok-${brandSlug}-${new Date().toISOString().split("T")[0]}.csv`;
    return successResult({ csv: lines.join("\n"), filename });
  } catch (err: any) {
    console.error("[StockReport] export:", err.message);
    return errorResult(err.message || "Gagal mengexport laporan.");
  }
}
