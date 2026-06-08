/**
 * Service domain service.
 * Business logic for service operations before calling repositories.
 */

import type { Result } from "@/lib/utils/result";
import { fail } from "@/lib/utils/result";
import type { AppContext } from "@/lib/context/app-context";

export class ServiceService {
  constructor(private ctx: AppContext) {}

  async list() {
    return fail("ServiceService.list — not implemented");
  }

  async create(input: any) {
    return fail("ServiceService.create — not implemented");
  }

  async transitionStatus(serviceId: string, toStatus: string) {
    return fail("ServiceService.transitionStatus — not implemented");
  }
}
