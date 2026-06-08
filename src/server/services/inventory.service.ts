/**
 * Inventory domain service.
 */

import type { Result } from "@/lib/utils/result";
import { fail } from "@/lib/utils/result";
import type { AppContext } from "@/lib/context/app-context";

export class InventoryService {
  constructor(private ctx: AppContext) {}

  async listItems() {
    return fail("InventoryService.listItems — not implemented");
  }

  async getBranchStocks(branchId: string) {
    return fail("InventoryService.getBranchStocks — not implemented");
  }
}
