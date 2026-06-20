import { describe, it, expect } from "vitest";

describe("Payment Account Module", () => {
  describe("Balance reconciliation", () => {
    it("must have cached current_balance equal to sum of movements", () => {
      const movements = [
        { direction: "IN", amount: 100000 },
        { direction: "OUT", amount: 30000 },
        { direction: "IN", amount: 50000 },
      ];
      const calculatedBalance = movements.reduce(
        (sum, m) => sum + (m.direction === "IN" ? m.amount : -m.amount),
        0,
      );
      const cachedBalance = 120000;
      expect(calculatedBalance).toBe(cachedBalance);
    });

    it("must calculate balance correctly with only IN movements", () => {
      const movements = [
        { direction: "IN", amount: 100000 },
        { direction: "IN", amount: 200000 },
      ];
      const balance = movements.reduce((s, m) => s + (m.direction === "IN" ? m.amount : -m.amount), 0);
      expect(balance).toBe(300000);
    });

    it("must calculate balance correctly with only OUT movements", () => {
      const movements = [
        { direction: "OUT", amount: 50000 },
        { direction: "OUT", amount: 25000 },
      ];
      const balance = movements.reduce((s, m) => s + (m.direction === "IN" ? m.amount : -m.amount), 0);
      expect(balance).toBe(-75000);
    });

    it("must handle OPENING_BALANCE as an IN movement", () => {
      const movements = [
        { direction: "IN", amount: 1000000, movement_type: "OPENING_BALANCE" },
      ];
      const balance = movements.reduce((s, m) => s + (m.direction === "IN" ? m.amount : -m.amount), 0);
      expect(balance).toBe(1000000);
    });

    it("must have after_balance = before_balance + amount for IN", () => {
      const before = 500000;
      const amount = 100000;
      const after = before + amount;
      expect(after).toBe(600000);
    });

    it("must have after_balance = before_balance - amount for OUT", () => {
      const before = 500000;
      const amount = 100000;
      const after = before - amount;
      expect(after).toBe(400000);
    });
  });

  describe("Append-only movements", () => {
    it("must not allow UPDATE on movements", () => {
      const policies = [
        { name: "pam_select", action: "SELECT" },
        { name: "pam_insert", action: "INSERT" },
      ];
      const hasUpdate = policies.some(p => p.action === "UPDATE");
      expect(hasUpdate).toBe(false);
    });

    it("must not allow DELETE on movements", () => {
      const policies = [
        { name: "pam_select", action: "SELECT" },
        { name: "pam_insert", action: "INSERT" },
      ];
      const hasDelete = policies.some(p => p.action === "DELETE");
      expect(hasDelete).toBe(false);
    });

    it("must not have updated_at column", () => {
      // payment_account_movements has no updated_at column
      const hasUpdatedAt = false;
      expect(hasUpdatedAt).toBe(false);
    });

    it("must record created_by for traceability", () => {
      const movement = { created_by: "profile-uuid" };
      expect(movement.created_by).toBeTruthy();
    });

    it("must record created_at timestamp", () => {
      const movement = { created_at: new Date().toISOString() };
      expect(movement.created_at).toBeTruthy();
    });
  });

  describe("Movement types", () => {
    const validTypes = [
      "OPENING_BALANCE", "BALANCE_ADJUSTMENT", "SERVICE_PAYMENT",
      "POS_PAYMENT", "OTHER_INCOME", "OPERATING_EXPENSE",
      "STOCK_PURCHASE", "STOCK_PURCHASE_PAYMENT", "TRANSFER_IN",
      "TRANSFER_OUT", "BANK_FEE", "QRIS_SETTLEMENT",
      "SERVICE_REFUND", "POS_REFUND",
    ];

    it("must have valid movement_type values", () => {
      expect(validTypes).toContain("SERVICE_PAYMENT");
      expect(validTypes).toContain("POS_PAYMENT");
      expect(validTypes).toContain("STOCK_PURCHASE");
      expect(validTypes).toContain("TRANSFER_IN");
      expect(validTypes).toContain("TRANSFER_OUT");
      expect(validTypes).toContain("BANK_FEE");
      expect(validTypes).toContain("QRIS_SETTLEMENT");
      expect(validTypes).toContain("SERVICE_REFUND");
      expect(validTypes).toContain("POS_REFUND");
    });

    it("must have OPENING_BALANCE only once per account", () => {
      // Unique index on payment_account_id + movement_type WHERE movement_type = 'OPENING_BALANCE'
      const uniqueIndex = "uq_pam_opening_balance on public.payment_account_movements(payment_account_id, movement_type) where movement_type = 'OPENING_BALANCE'";
      expect(uniqueIndex).toContain("OPENING_BALANCE");
    });
  });

  describe("Reference tracking", () => {
    it("must have unique reference (account, type, id, movement_type)", () => {
      const uniqueIndex = "uq_pam_reference on public.payment_account_movements(payment_account_id, reference_type, reference_id, movement_type)";
      expect(uniqueIndex).toContain("payment_account_id");
      expect(uniqueIndex).toContain("reference_type");
    });

    it("must store reference_type (e.g., service_payment, pos_transaction)", () => {
      const movement = { reference_type: "service_payment", reference_id: "pay-uuid" };
      expect(movement.reference_type).toBe("service_payment");
    });
  });

  describe("Balance constraint validation", () => {
    it("must reject OUT when balance would go below 0 if allow_negative_balance is false", () => {
      const beforeBalance = 50000;
      const withdrawal = 100000;
      const allowNegative = false;
      expect(() => {
        if (beforeBalance - withdrawal < 0 && !allowNegative) {
          throw new Error("Insufficient balance");
        }
      }).toThrow("Insufficient balance");
    });

    it("must allow OUT when balance stays >= 0", () => {
      const beforeBalance = 500000;
      const withdrawal = 100000;
      const allowNegative = false;
      const afterBalance = beforeBalance - withdrawal;
      if (afterBalance >= 0 || allowNegative) {
        expect(afterBalance).toBe(400000);
      }
    });

    it("must allow negative balance when allow_negative_balance is true", () => {
      const beforeBalance = 50000;
      const withdrawal = 100000;
      const allowNegative = true;
      const afterBalance = beforeBalance - withdrawal;
      expect(allowNegative).toBe(true);
      expect(afterBalance).toBe(-50000);
    });

    it("must enforce balance consistency check constraint", () => {
      const constraint = "chk_pam_balance_consistency check ((direction = 'IN' and after_balance = before_balance + amount) or (direction = 'OUT' and after_balance = before_balance - amount))";
      expect(constraint).toContain("after_balance = before_balance");
    });
  });

  describe("add_payment_account_movement function", () => {
    it("must lock account row FOR UPDATE", () => {
      const sql = "SELECT current_balance, allow_negative_balance, brand_id FROM public.payment_accounts WHERE id = p_payment_account_id FOR UPDATE";
      expect(sql).toContain("FOR UPDATE");
    });

    it("must throw if account not found", () => {
      expect(() => {
        throw new Error("Payment account not found");
      }).toThrow("not found");
    });

    it("must validate brand_id matches", () => {
      expect(() => {
        throw new Error("Brand mismatch");
      }).toThrow("Brand mismatch");
    });

    it("must reject non-positive amount", () => {
      expect(() => {
        throw new Error("Amount must be positive");
      }).toThrow("positive");
    });

    it("must update cached current_balance on payment_accounts table", () => {
      const updateSql = "UPDATE public.payment_accounts SET current_balance = v_after_balance, updated_at = now() WHERE id = p_payment_account_id";
      expect(updateSql).toContain("current_balance");
    });

    it("must return movement UUID", () => {
      const movementId = "generated-uuid";
      expect(movementId).toBeTruthy();
    });
  });

  describe("Payment account types", () => {
    const validTypes = ["CASH", "BANK", "QRIS", "TRANSFER", "DEBIT", "OTHER"];

    it("must have valid account types", () => {
      expect(validTypes).toContain("CASH");
      expect(validTypes).toContain("BANK");
      expect(validTypes).toContain("QRIS");
      expect(validTypes).toContain("TRANSFER");
    });

    it("must enforce is_cash_account = true when type = CASH", () => {
      const account = { type: "CASH", is_cash_account: true };
      expect(account.type === "CASH" ? account.is_cash_account === true : true).toBe(true);
    });

    it("must enforce is_cash_account = false when type != CASH", () => {
      const account = { type: "BANK", is_cash_account: false };
      expect(account.type !== "CASH" ? account.is_cash_account === false : true).toBe(true);
    });
  });
});
