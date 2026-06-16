"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
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
} from "@/server/repositories/reporting-v4.repository";
import type { V4ReportFilter } from "@/server/domain/reporting-v4.types";
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
