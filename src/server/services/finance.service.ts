/**
 * Finance domain service.
 */

import type { Result } from "@/lib/utils/result";
import { fail } from "@/lib/utils/result";
import type { AppContext } from "@/lib/context/app-context";

export class FinanceService {
  constructor(private ctx: AppContext) {}

  async getDailySummary(branchId?: string) {
    return fail("FinanceService.getDailySummary — not implemented");
  }

  async getMonthlySummary(branchId?: string) {
    return fail("FinanceService.getMonthlySummary — not implemented");
  }
}
