/**
 * Store shift domain service.
 */

import type { Result } from "@/lib/utils/result";
import { fail } from "@/lib/utils/result";
import type { AppContext } from "@/lib/context/app-context";

export class StoreShiftService {
  constructor(private ctx: AppContext) {}

  async openShift(input: any) {
    return fail("StoreShiftService.openShift — not implemented");
  }

  async closeShift(input: any) {
    return fail("StoreShiftService.closeShift — not implemented");
  }

  async listShifts(branchId: string) {
    return fail("StoreShiftService.listShifts — not implemented");
  }
}
