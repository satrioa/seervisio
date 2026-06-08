"use server";

import type { Result } from "@/lib/utils/result";
import { ok, fail } from "@/lib/utils/result";

/**
 * Placeholder: List inventory items for a brand.
 */
export async function listInventoryItems(brandId: number): Promise<Result<any[]>> {
  return fail("Not implemented");
}

/**
 * Placeholder: Get branch stock levels.
 */
export async function getBranchStocks(brandId: number, branchId: string): Promise<Result<any[]>> {
  return fail("Not implemented");
}
