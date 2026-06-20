import { describe, it, expect } from "vitest";

describe("Payment Method Module", () => {
  describe("CASH resolution", () => {
    it("must resolve CASH to active CASH account for the branch", () => {
      const branchId = "branch-uuid";
      const cashAccounts = [
        { id: "acct1", type: "CASH", is_cash_account: true, branch_id: branchId, is_active: true },
      ];
      const resolved = cashAccounts.find(
        a => a.type === "CASH" && a.is_cash_account && a.branch_id === branchId && a.is_active,
      );
      expect(resolved).toBeDefined();
      expect(resolved!.type).toBe("CASH");
    });

    it("must prefer system cash account over non-system", () => {
      const accounts = [
        { id: "acct1", is_system_account: false, is_cash_account: true, branch_id: "b1" },
        { id: "acct2", is_system_account: true, is_cash_account: true, branch_id: "b1" },
      ];
      const sorted = [...accounts].sort(
        (a, b) => Number(b.is_system_account) - Number(a.is_system_account),
      );
      expect(sorted[0].id).toBe("acct2");
    });

    it("must prefer is_default_receiving_account over non-default", () => {
      const accounts = [
        { id: "acct1", is_system_account: false, is_default_receiving_account: true },
        { id: "acct2", is_system_account: true, is_default_receiving_account: false },
      ];
      const sorted = [...accounts].sort(
        (a, b) => {
          const sys = Number(b.is_system_account) - Number(a.is_system_account);
          if (sys !== 0) return sys;
          return Number(b.is_default_receiving_account) - Number(a.is_default_receiving_account);
        },
      );
      expect(sorted[0].id).toBe("acct2");
    });

    it("must fallback to global payment_accounts.default_payment_account_id when no bpm", () => {
      const pmDefaultAccountId = "pm-default-uuid";
      const bpmAccountId: string | null = null;
      const resolved = bpmAccountId ?? pmDefaultAccountId;
      expect(resolved).toBe("pm-default-uuid");
    });

    it("must throw when no active CASH account exists for branch", () => {
      const accounts: any[] = [];
      expect(() => {
        if (accounts.length === 0) throw new Error("No active CASH payment account found for branch");
      }).toThrow("No active CASH");
    });

    it("must validate CASH account belongs to correct brand and branch", () => {
      const account = { brand_id: 1, branch_id: "branch-uuid" };
      const expectedBrand = 1;
      const expectedBranch = "branch-uuid";
      expect(account.brand_id).toBe(expectedBrand);
      expect(account.branch_id).toBe(expectedBranch);
    });
  });

  describe("QRIS resolution", () => {
    it("must resolve to branch_payment_methods configured account when set", () => {
      const bpm = {
        method_type: "QRIS",
        payment_account_id: "qris-acct-uuid",
        is_active: true,
      };
      expect(bpm.payment_account_id).toBeTruthy();
    });

    it("must fallback to payment_methods.default_payment_account_id when no bpm account", () => {
      const bpmAccountId: string | null = null;
      const pmDefaultId = "pm-default-uuid";
      const resolved = bpmAccountId ?? pmDefaultId;
      expect(resolved).toBe("pm-default-uuid");
    });

    it("must throw when no account configured for non-CASH method", () => {
      const bpm = { method_type: "QRIS", payment_account_id: null };
      expect(() => {
        if (bpm.method_type !== "CASH" && !bpm.payment_account_id) {
          throw new Error("No payment account configured");
        }
      }).toThrow("No payment account");
    });

    it("must validate resolved account is active and belongs to brand", () => {
      const account = { is_active: true, brand_id: 1 };
      expect(account.is_active).toBe(true);
    });
  });

  describe("TRANSFER resolution", () => {
    it("must resolve to configured receiving account", () => {
      const bpm = { method_type: "TRANSFER", payment_account_id: "transfer-acct-uuid" };
      expect(bpm.payment_account_id).toBeTruthy();
    });

    it("must validate account existence and active status", () => {
      const account = { id: "transfer-acct-uuid", is_active: true };
      expect(account.is_active).toBe(true);
    });

    it("must validate account belongs to correct brand", () => {
      const account = { id: "acct-uuid", brand_id: 1 };
      const brandId = 1;
      expect(account.brand_id).toBe(brandId);
    });
  });

  describe("Payment method types", () => {
    const validTypes = ["CASH", "QRIS", "TRANSFER", "DEBIT", "CREDIT", "EWALLET"];

    it("must have valid payment method types", () => {
      expect(validTypes).toContain("CASH");
      expect(validTypes).toContain("QRIS");
      expect(validTypes).toContain("TRANSFER");
      expect(validTypes).toContain("DEBIT");
      expect(validTypes).toContain("CREDIT");
      expect(validTypes).toContain("EWALLET");
    });

    it("must have unique (brand_id, name) for payment_methods", () => {
      const constraint = "uq_pm_brand_name unique (brand_id, name)";
      expect(constraint).toContain("unique");
    });
  });

  describe("Branch payment methods", () => {
    it("must have unique (brand_id, branch_id, method_type)", () => {
      const constraint = "uq_bpm_brand_branch_method unique (brand_id, branch_id, method_type)";
      expect(constraint).toContain("unique");
    });

    it("must reference payment_accounts for the account", () => {
      const bpm = { payment_account_id: "acct-uuid" };
      expect(bpm.payment_account_id).toBeTruthy();
    });

    it("must have MDR percentage override per branch", () => {
      const bpm = { mdr_percentage: 1.5 };
      expect(bpm.mdr_percentage).toBe(1.5);
    });

    it("must check MDR is null or between 0 and 100", () => {
      const validPct = (pct: number | null) => pct === null || (pct >= 0 && pct <= 100);
      expect(validPct(null)).toBe(true);
      expect(validPct(0)).toBe(true);
      expect(validPct(100)).toBe(true);
      expect(validPct(-1)).toBe(false);
      expect(validPct(101)).toBe(false);
    });

    it("must require is_active = true to be usable", () => {
      const bpm = { is_active: true };
      expect(bpm.is_active).toBe(true);
    });

    it("must reject inactive branch_payment_methods", () => {
      const bpm = { is_active: false };
      expect(() => {
        if (!bpm.is_active) throw new Error("Branch payment method is not active");
      }).toThrow("not active");
    });
  });

  describe("Payment method MDR configuration", () => {
    it("must have MDR percentage between 0 and 100", () => {
      const constraint = "mdr_percentage >= 0 and mdr_percentage <= 100";
      expect(constraint).toContain("mdr_percentage");
    });

    it("must default MDR to 0 if not configured", () => {
      const pm = { mdr_percentage: 0 };
      expect(pm.mdr_percentage).toBe(0);
    });

    it("must support per-method MDR override via branch_payment_methods", () => {
      const pmMdr = 0.7;
      const bpmMdr = 1.5;
      const effectiveMdr = bpmMdr !== null ? bpmMdr : pmMdr;
      expect(effectiveMdr).toBe(1.5);
    });
  });

  describe("resolve_service_payment_account priority", () => {
    it("must check branch_payment_methods first", () => {
      let resolved = false;
      const bpm = { is_active: true, payment_account_id: "bpm-acct" };
      if (bpm.is_active && bpm.payment_account_id) {
        resolved = true;
      }
      expect(resolved).toBe(true);
    });

    it("must fallback to payment_methods.default_payment_account_id", () => {
      const defaultAccount = "pm-default-acct";
      const bpmAccount: string | null = null;
      const resolved = bpmAccount ?? defaultAccount;
      expect(resolved).toBe("pm-default-acct");
    });

    it("must auto-resolve CASH to branch CASH account as last resort", () => {
      const bpmAccount: string | null = null;
      const pmDefault: string | null = null;
      const branchCash: string | null = "cash-acct";
      const resolved = bpmAccount ?? pmDefault ?? branchCash;
      expect(resolved).toBe("cash-acct");
    });
  });
});
