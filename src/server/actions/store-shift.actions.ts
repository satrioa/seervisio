"use server";

import type { Result } from "@/lib/utils/result";
import { ok, fail } from "@/lib/utils/result";

/**
 * Placeholder: Open a store shift.
 */
export async function openShift(input: any): Promise<Result<any>> {
  return fail("Not implemented");
}

/**
 * Placeholder: Close a store shift.
 */
export async function closeShift(input: any): Promise<Result<any>> {
  return fail("Not implemented");
}

/**
 * Placeholder: List shifts for a branch.
 */
export async function listShifts(brandId: number, branchId: string): Promise<Result<any[]>> {
  return fail("Not implemented");
}
