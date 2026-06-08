"use server";

import type { Result } from "@/lib/utils/result";
import { ok, fail } from "@/lib/utils/result";

/**
 * Placeholder: Get daily finance summary.
 */
export async function getDailySummary(
  brandId: number,
  branchId?: string
): Promise<Result<any[]>> {
  return fail("Not implemented");
}

/**
 * Placeholder: Get monthly finance summary.
 */
export async function getMonthlySummary(
  brandId: number,
  branchId?: string
): Promise<Result<any[]>> {
  return fail("Not implemented");
}
