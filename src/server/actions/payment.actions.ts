"use server";

import type { Result } from "@/lib/utils/result";
import { ok, fail } from "@/lib/utils/result";

/**
 * Placeholder: Record service payment.
 */
export async function recordServicePayment(input: any): Promise<Result<any>> {
  return fail("Not implemented");
}

/**
 * Placeholder: List payment methods for a branch.
 */
export async function listPaymentMethods(brandId: number, branchId: string): Promise<Result<any[]>> {
  return fail("Not implemented");
}
