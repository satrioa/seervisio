/**
 * Payment domain service.
 */

import type { Result } from "@/lib/utils/result";
import { fail } from "@/lib/utils/result";
import type { AppContext } from "@/lib/context/app-context";

export class PaymentService {
  constructor(private ctx: AppContext) {}

  async recordServicePayment(input: any) {
    return fail("PaymentService.recordServicePayment — not implemented");
  }

  async listPaymentMethods(branchId: string) {
    return fail("PaymentService.listPaymentMethods — not implemented");
  }
}
