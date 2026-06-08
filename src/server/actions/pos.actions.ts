"use server";

import type { Result } from "@/lib/utils/result";
import { ok, fail } from "@/lib/utils/result";

/**
 * Placeholder: Create a POS sale.
 */
export async function createPosSale(input: any): Promise<Result<any>> {
  return fail("Not implemented");
}

/**
 * Placeholder: List POS sales.
 */
export async function listPosSales(brandId: number, branchId: string): Promise<Result<any[]>> {
  return fail("Not implemented");
}
