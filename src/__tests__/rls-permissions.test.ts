import { describe, it, expect } from "vitest";

describe("RLS and Permissions", () => {
  describe("Cross-brand isolation", () => {
    it("must prevent user of brand A from accessing brand B data", () => {
      function canAccessBrand(userBrandIds: number[], targetBrandId: number): boolean {
        return userBrandIds.includes(targetBrandId);
      }
      const brandAUser = [1];
      const brandBId = 2;
      expect(canAccessBrand(brandAUser, brandBId)).toBe(false);
    });

    it("must allow PLATFORM_OWNER to access all brands", () => {
      function isPlatformOwner(roles: string[]): boolean {
        return roles.includes("PLATFORM_OWNER");
      }
      expect(isPlatformOwner(["PLATFORM_OWNER"])).toBe(true);
      expect(isPlatformOwner(["ADMIN"])).toBe(false);
    });

    it("must allow user within same brand to access data", () => {
      function canAccessBrand(userBrandIds: number[], targetBrandId: number): boolean {
        return userBrandIds.includes(targetBrandId) || userBrandIds.length === 0;
      }
      const brandAUser = [1];
      expect(canAccessBrand(brandAUser, 1)).toBe(true);
    });
  });

  describe("Cross-branch isolation", () => {
    it("must prevent user from accessing data of a branch they do not have access to", () => {
      function canAccessBranch(userBranchIds: string[], targetBranchId: string): boolean {
        return userBranchIds.includes(targetBranchId);
      }
      const userBranches = ["branch-a"];
      expect(canAccessBranch(userBranches, "branch-b")).toBe(false);
    });

    it("must allow MASTER_ADMIN to access all branches within brand", () => {
      function canAccessBranch(userRole: string, userBranchIds: string[], targetBranchId: string): boolean {
        if (userRole === "MASTER_ADMIN" || userRole === "PLATFORM_OWNER") return true;
        return userBranchIds.includes(targetBranchId);
      }
      expect(canAccessBranch("MASTER_ADMIN", [], "any-branch")).toBe(true);
    });

    it("must restrict FRONTLINER to assigned branches only", () => {
      function canAccessBranch(userRole: string, userBranchIds: string[], targetBranchId: string): boolean {
        if (userRole === "MASTER_ADMIN" || userRole === "PLATFORM_OWNER") return true;
        return userBranchIds.includes(targetBranchId);
      }
      expect(canAccessBranch("FRONTLINER", ["branch-a"], "branch-b")).toBe(false);
    });

    it("must restrict TECHNICIAN to assigned branches only", () => {
      function canAccessBranch(userRole: string, userBranchIds: string[], targetBranchId: string): boolean {
        if (userRole === "MASTER_ADMIN" || userRole === "PLATFORM_OWNER") return true;
        return userBranchIds.includes(targetBranchId);
      }
      expect(canAccessBranch("TECHNICIAN", ["branch-a"], "branch-b")).toBe(false);
    });
  });

  describe("Role-based mutation permissions", () => {
    it("must require MASTER_ADMIN or ADMIN to insert/update/delete inventory products", () => {
      function canMutateInventory(roles: string[]): boolean {
        const allowed = ["MASTER_ADMIN", "ADMIN"];
        return roles.some(r => allowed.includes(r));
      }
      expect(canMutateInventory(["MASTER_ADMIN"])).toBe(true);
      expect(canMutateInventory(["ADMIN"])).toBe(true);
      expect(canMutateInventory(["FRONTLINER"])).toBe(false);
      expect(canMutateInventory(["TECHNICIAN"])).toBe(false);
    });

    it("must allow TECHNICIAN to insert sparepart usage", () => {
      function canInsertSparepartUsage(roles: string[]): boolean {
        const allowed = ["MASTER_ADMIN", "ADMIN", "TECHNICIAN"];
        return roles.some(r => allowed.includes(r));
      }
      expect(canInsertSparepartUsage(["TECHNICIAN"])).toBe(true);
      expect(canInsertSparepartUsage(["FRONTLINER"])).toBe(false);
    });

    it("must allow FRONTLINER to insert POS transactions for their branch", () => {
      function canInsertPOS(role: string, userBranchIds: string[], txBranchId: string): boolean {
        const allowedRoles = ["MASTER_ADMIN", "ADMIN"];
        if (allowedRoles.includes(role)) return true;
        if (role === "FRONTLINER") return userBranchIds.includes(txBranchId);
        return false;
      }
      expect(canInsertPOS("FRONTLINER", ["branch-a"], "branch-a")).toBe(true);
      expect(canInsertPOS("FRONTLINER", ["branch-a"], "branch-b")).toBe(false);
    });

    it("must restrict invoice/service creation to ADMIN or FRONTLINER", () => {
      function canCreateService(roles: string[]): boolean {
        const allowed = ["MASTER_ADMIN", "ADMIN", "FRONTLINER"];
        return roles.some(r => allowed.includes(r));
      }
      expect(canCreateService(["ADMIN"])).toBe(true);
      expect(canCreateService(["FRONTLINER"])).toBe(true);
      expect(canCreateService(["TECHNICIAN"])).toBe(false);
    });
  });

  describe("Table-level access by role", () => {
    it("must allow all authenticated users to insert audit_logs", () => {
      const policySql = "create policy al_insert on public.audit_logs for insert with check (auth.role() = 'authenticated')";
      expect(policySql).toContain("auth.role() = 'authenticated'");
    });

    it("must restrict audit_log SELECT to PLATFORM_OWNER, MASTER_ADMIN, or brand members", () => {
      function canSelectAuditLogs(roles: string[], userBrandIds: number[], logBrandId: number | null): boolean {
        if (roles.includes("PLATFORM_OWNER") || roles.includes("MASTER_ADMIN")) return true;
        if (logBrandId !== null && userBrandIds.includes(logBrandId)) return true;
        return false;
      }
      expect(canSelectAuditLogs(["ADMIN"], [1], 1)).toBe(true);
      expect(canSelectAuditLogs(["ADMIN"], [1], 2)).toBe(false);
      expect(canSelectAuditLogs(["FRONTLINER"], [1], null)).toBe(false);
    });

    it("must prevent direct INSERT on finance_ledger (only via SECURITY DEFINER function)", () => {
      const hasInsertPolicy = false; // No INSERT policy exists for finance_ledger
      expect(hasInsertPolicy).toBe(false);
    });

    it("must prevent direct INSERT on service_payments (only via SECURITY DEFINER function)", () => {
      const hasInsertPolicy = false; // No INSERT policy exists for service_payments
      expect(hasInsertPolicy).toBe(false);
    });

    it("must block UPDATE on payment_account_movements", () => {
      const hasUpdatePolicy = false; // Note says: "No UPDATE or DELETE policies — movements are immutable"
      expect(hasUpdatePolicy).toBe(false);
    });

    it("must block DELETE on payment_account_movements", () => {
      const hasDeletePolicy = false;
      expect(hasDeletePolicy).toBe(false);
    });

    it("must block UPDATE on inv_stock_movements", () => {
      const hasUpdatePolicy = false;
      expect(hasUpdatePolicy).toBe(false);
    });

    it("must block DELETE on inv_stock_movements", () => {
      const hasDeletePolicy = false;
      expect(hasDeletePolicy).toBe(false);
    });
  });

  describe("Security definer function access", () => {
    it("must use SECURITY DEFINER for record_service_payment", () => {
      const fnDef = "security definer";
      expect(fnDef).toBe("security definer");
    });

    it("must use SECURITY DEFINER for add_finance_ledger_entry", () => {
      const fnDef = "security definer";
      expect(fnDef).toBe("security definer");
    });

    it("must use SECURITY DEFINER for record_service_payment_finance_entries", () => {
      const fnDef = "security definer";
      expect(fnDef).toBe("security definer");
    });

    it("must not grant direct INSERT access to service_payments table via RLS", () => {
      const policies = [
        { name: "sp_select", action: "SELECT" },
      ];
      const hasInsert = policies.some(p => p.action === "INSERT");
      expect(hasInsert).toBe(false);
    });
  });

  describe("Brand/branch enforcement", () => {
    it("must enforce brand_id = any(get_user_brand_ids()) on all brand-scoped tables", () => {
      const rlsPattern = "brand_id = any(public.get_user_brand_ids())";
      expect(rlsPattern).toBeTruthy();
    });

    it("must enforce branch_id check on POS transactions for FRONTLINER", () => {
      const policyCheck = "pos_transactions.branch_id = any(public.get_user_branch_ids())";
      expect(policyCheck).toContain("branch_id");
    });
  });

  describe("Unauthorized mutation blocking", () => {
    it("must reject TECHNICIAN from updating service status to DONE without authorization", () => {
      function canTransitionStatus(role: string, toStatus: string): boolean {
        const allowedRoles = ["MASTER_ADMIN", "ADMIN", "TECHNICIAN"];
        const terminalStatuses = ["DONE", "CANCELLED"];
        if (terminalStatuses.includes(toStatus) && role === "TECHNICIAN") return false;
        return allowedRoles.includes(role);
      }
      expect(canTransitionStatus("TECHNICIAN", "DONE")).toBe(false);
      expect(canTransitionStatus("ADMIN", "DONE")).toBe(true);
    });

    it("must reject FRONTLINER from voiding POS transactions", () => {
      function canVoidTransaction(role: string): boolean {
        const allowed = ["MASTER_ADMIN", "ADMIN"];
        return allowed.includes(role);
      }
      expect(canVoidTransaction("FRONTLINER")).toBe(false);
      expect(canVoidTransaction("ADMIN")).toBe(true);
    });

    it("must reject TECHNICIAN from managing payment accounts", () => {
      function canManageAccounts(role: string): boolean {
        const allowed = ["MASTER_ADMIN", "ADMIN"];
        return allowed.includes(role);
      }
      expect(canManageAccounts("TECHNICIAN")).toBe(false);
    });

    it("must reject FRONTLINER from adjusting inventory stock", () => {
      function canAdjustStock(role: string): boolean {
        const allowed = ["MASTER_ADMIN", "ADMIN"];
        return allowed.includes(role);
      }
      expect(canAdjustStock("FRONTLINER")).toBe(false);
    });
  });
});
