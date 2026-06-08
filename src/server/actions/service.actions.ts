"use server";

/**
 * Service server actions.
 * Pattern: validate input → get context → check permission → call service → return Result.
 */

import type { Result } from "@/lib/utils/result";
import { ok, fail } from "@/lib/utils/result";

/**
 * Placeholder: List services for a branch.
 */
export async function listServices(brandId: number, branchId: string): Promise<Result<any[]>> {
  // TODO: Implement
  return fail("Not implemented");
}

/**
 * Placeholder: Create a new service.
 */
export async function createService(input: any): Promise<Result<any>> {
  // TODO: Implement
  return fail("Not implemented");
}

/**
 * Placeholder: Transition service status.
 */
export async function transitionServiceStatus(
  serviceId: string,
  toStatus: string
): Promise<Result<any>> {
  // TODO: Implement
  return fail("Not implemented");
}
