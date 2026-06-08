/**
 * POS domain service.
 */

import type { Result } from "@/lib/utils/result";
import { fail } from "@/lib/utils/result";
import type { AppContext } from "@/lib/context/app-context";

export class PosService {
  constructor(private ctx: AppContext) {}

  async createSale(input: any) {
    return fail("PosService.createSale — not implemented");
  }

  async listSales(branchId: string) {
    return fail("PosService.listSales — not implemented");
  }
}
