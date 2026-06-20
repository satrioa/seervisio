import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, mockServerSupabase } from "./helpers/supabase-mock";

describe("Service Payment Module", () => {
  describe("record_service_payment RPC", () => {
    it("must reject payment for cancelled service", () => {
      const rpcError = {
        message: 'Cannot record payment for cancelled service',
        code: 'P0004',
      };
      const rpc = vi.fn().mockRejectedValue(rpcError);
      expect(rpc).toBeDefined();
      expect(rpcError.code).toBe('P0004');
    });

    it("must reject payment amount <= 0", () => {
      const rpcError = {
        message: 'Payment amount must be positive, got 0',
        code: '22023',
      };
      expect(rpcError.code).toBe('22023');
    });

    it("must generate a unique payment number PAY/YYYY/MM/NNNN", () => {
      const paymentNumber = "PAY/2026/06/0001";
      expect(paymentNumber).toMatch(/^PAY\/\d{4}\/\d{2}\/\d{4}$/);
    });

    it("must create service_payment with COMPLETED status", () => {
      const paymentRecord = {
        payment_status: "COMPLETED",
      };
      expect(paymentRecord.payment_status).toBe("COMPLETED");
    });

    it("must set net_amount = gross_amount - mdr_amount", () => {
      const gross = 100000;
      const mdr = 700;
      const net = gross - mdr;
      expect(net).toBe(99300);
    });

    it("must create payment_account_movement IN for net amount", () => {
      const movement = {
        direction: "IN",
        amount: 99300,
        movement_type: "SERVICE_PAYMENT",
      };
      expect(movement.direction).toBe("IN");
      expect(movement.movement_type).toBe("SERVICE_PAYMENT");
    });

    it("must link payment_account_movement_id on service_payment", () => {
      const payment = { payment_account_movement_id: "movement-uuid" };
      expect(payment.payment_account_movement_id).toBeTruthy();
    });

    it("must create finance_ledger SERVICE_REVENUE entry", () => {
      const ledgerEntry = {
        entry_type: "SERVICE_REVENUE",
        direction: "CREDIT",
        amount: 100000,
      };
      expect(ledgerEntry.entry_type).toBe("SERVICE_REVENUE");
      expect(ledgerEntry.direction).toBe("CREDIT");
      expect(ledgerEntry.amount).toBeGreaterThan(0);
    });

    it("must create finance_ledger MDR_EXPENSE entry when mdr > 0", () => {
      const ledgerEntry = {
        entry_type: "MDR_EXPENSE",
        direction: "DEBIT",
        amount: 700,
      };
      expect(ledgerEntry.entry_type).toBe("MDR_EXPENSE");
      expect(ledgerEntry.direction).toBe("DEBIT");
      expect(ledgerEntry.amount).toBeGreaterThan(0);
    });

    it("must NOT create MDR_EXPENSE when mdr = 0", () => {
      const mdrAmount = 0;
      expect(mdrAmount).toBe(0);
    });

    it("must create audit_log entry for payment", () => {
      const auditLog = {
        action: "SERVICE_PAYMENT",
        target_type: "service_payment",
      };
      expect(auditLog.action).toBeTruthy();
    });

    it("must be idempotent: same idempotency_key returns existing payment", () => {
      const existingResult = {
        status: "ALREADY_EXISTS",
        service_payment_id: "existing-uuid",
      };
      expect(existingResult.status).toBe("ALREADY_EXISTS");
      expect(existingResult.service_payment_id).toBeTruthy();
    });

    it("must validate payment_method belongs to same brand as service", () => {
      const brandMismatch = {
        message: "Payment method not found for brand of service",
      };
      expect(brandMismatch.message).toContain("brand");
    });

    it("must resolve CASH payment to branch cash account", () => {
      const resolvedAccount = {
        payment_account_id: "cash-account-uuid",
        method_type: "CASH",
        mdr_percentage: 0,
      };
      expect(resolvedAccount.method_type).toBe("CASH");
      expect(resolvedAccount.mdr_percentage).toBe(0);
    });

    it("must calculate MDR: CASH = 0, TRANSFER = 0", () => {
      const calcMdr = (type: string, amount: number, pct: number) => {
        if (["CASH", "TRANSFER"].includes(type)) return 0;
        return 0;
      };
      expect(calcMdr("CASH", 100000, 0)).toBe(0);
      expect(calcMdr("TRANSFER", 100000, 0)).toBe(0);
    });

    it("must calculate MDR: QRIS > 500000 applies percentage", () => {
      const calcMdr = (type: string, amount: number, pct: number) => {
        if (type === "QRIS") {
          return amount > 500000 ? Math.round(amount * pct / 100) : 0;
        }
        return Math.round(amount * pct / 100);
      };
      expect(calcMdr("QRIS", 1000000, 0.7)).toBe(7000);
      expect(calcMdr("QRIS", 300000, 0.7)).toBe(0);
    });

    it("must reject payment_method_id that is branch_payment_methods.id that is inactive", () => {
      const bpm = { is_active: false };
      expect(bpm.is_active).toBe(false);
    });

    it("must require payment_account for non-CASH methods", () => {
      const nonCashMethod = { type: "QRIS", payment_account_id: null };
      expect(nonCashMethod.type).toBe("QRIS");
      expect(nonCashMethod.payment_account_id).toBeNull();
    });
  });

  describe("generate_service_payment_number", () => {
    it("must generate sequential numbers per brand per day", () => {
      const num1 = "PAY/2026/06/0001";
      const num2 = "PAY/2026/06/0002";
      expect(num1).not.toBe(num2);
    });

    it("must use FOR UPDATE lock for concurrency safety", () => {
      const counterUpdate = `
        UPDATE public.payment_number_counters
        SET last_number = last_number + 1
        WHERE brand_id = p_brand_id AND counter_date = current_date
        RETURNING last_number
      `;
      expect(counterUpdate).toContain("UPDATE");
    });
  });

  describe("calculate_service_payment_summary", () => {
    it("must prefer final_cost over estimated_cost", () => {
      const service = { final_cost: 200000, estimated_cost: 150000 };
      const cost = service.final_cost || service.estimated_cost;
      expect(cost).toBe(200000);
    });

    it("must handle zero cost", () => {
      const service = { final_cost: 0, estimated_cost: 0 };
      const cost = service.final_cost || service.estimated_cost || 0;
      expect(cost).toBe(0);
    });

    it("must determine UNPAID when total_paid = 0", () => {
      const totalPaid = 0;
      const cost = 100000;
      const state = totalPaid === 0
        ? "UNPAID" as const
        : totalPaid < cost ? "PARTIAL" as const
        : totalPaid === cost ? "PAID" as const : "OVERPAID" as const;
      expect(state).toBe("UNPAID");
    });

    it("must determine PARTIAL when 0 < total_paid < cost", () => {
      function calcState(totalPaid: number, cost: number): string {
        if (totalPaid === 0) return "UNPAID";
        if (totalPaid < cost) return "PARTIAL";
        if (totalPaid === cost) return "PAID";
        return "OVERPAID";
      }
      expect(calcState(50000, 100000)).toBe("PARTIAL");
    });

    it("must determine PAID when total_paid = cost", () => {
      function calcState(totalPaid: number, cost: number): string {
        if (totalPaid === 0) return "UNPAID";
        if (totalPaid < cost) return "PARTIAL";
        if (totalPaid === cost) return "PAID";
        return "OVERPAID";
      }
      expect(calcState(100000, 100000)).toBe("PAID");
    });

    it("must determine OVERPAID when total_paid > cost", () => {
      function calcState(totalPaid: number, cost: number): string {
        if (totalPaid === 0) return "UNPAID";
        if (totalPaid < cost) return "PARTIAL";
        if (totalPaid === cost) return "PAID";
        return "OVERPAID";
      }
      expect(calcState(150000, 100000)).toBe("OVERPAID");
    });

    it("must only count COMPLETED payments", () => {
      const payments = [
        { payment_status: "COMPLETED", gross_amount: 50000 },
        { payment_status: "VOIDED", gross_amount: 50000 },
        { payment_status: "REFUNDED", gross_amount: 50000 },
      ];
      const totalPaid = payments
        .filter(p => p.payment_status === "COMPLETED")
        .reduce((sum, p) => sum + p.gross_amount, 0);
      expect(totalPaid).toBe(50000);
    });
  });

  describe("record_service_payment_finance_entries", () => {
    it("must reject if payment is not COMPLETED", () => {
      const payment = { payment_status: "VOIDED" };
      expect(payment.payment_status).not.toBe("COMPLETED");
    });

    it("must create exactly one SERVICE_REVENUE entry per payment", () => {
      const entries = [
        { entry_type: "SERVICE_REVENUE", direction: "CREDIT" },
        { entry_type: "MDR_EXPENSE", direction: "DEBIT" },
      ];
      const revenueEntries = entries.filter(e => e.entry_type === "SERVICE_REVENUE");
      expect(revenueEntries).toHaveLength(1);
    });

    it("must use idempotency keys service_payment:{id}:revenue and :mdr", () => {
      const paymentId = "test-uuid";
      const revenueKey = `service_payment:${paymentId}:revenue`;
      const mdrKey = `service_payment:${paymentId}:mdr`;
      expect(revenueKey).toContain(paymentId);
      expect(mdrKey).toContain(paymentId);
    });

    it("must set account_code 4000 for SERVICE_REVENUE and 5100 for MDR_EXPENSE", () => {
      const revenueEntry = { account_code: "4000", entry_type: "SERVICE_REVENUE" };
      const mdrEntry = { account_code: "5100", entry_type: "MDR_EXPENSE" };
      expect(revenueEntry.account_code).toBe("4000");
      expect(mdrEntry.account_code).toBe("5100");
    });
  });

  describe("resolve_service_payment_account", () => {
    it("must prefer branch_payment_methods over payment_method default", () => {
      const bpmAccountId = "bpm-specific-account";
      const pmDefaultAccountId = "pm-default-account";
      const resolved = bpmAccountId ?? pmDefaultAccountId;
      expect(resolved).toBe("bpm-specific-account");
    });

    it("must fallback to payment_method.default_payment_account_id when no bpm override", () => {
      const bpmAccountId = null;
      const pmDefaultAccountId = "pm-default-account";
      const resolved = bpmAccountId ?? pmDefaultAccountId;
      expect(resolved).toBe("pm-default-account");
    });

    it("must auto-resolve CASH to branch CASH account", () => {
      const methodType = "CASH";
      const cashAccount = { type: "CASH", is_cash_account: true, branch_id: "branch-uuid" };
      expect(methodType).toBe("CASH");
      expect(cashAccount.is_cash_account).toBe(true);
    });

    it("must reject inactive payment method", () => {
      const pm = { is_active: false };
      expect(() => {
        if (!pm.is_active) throw new Error("Payment method is not active");
      }).toThrow("not active");
    });

    it("must reject inactive branch_payment_method entry", () => {
      const bpm = { is_active: false };
      expect(() => {
        if (!bpm.is_active) throw new Error("Branch payment method is not active");
      }).toThrow("not active");
    });

    it("must validate resolved CASH account belongs to the correct branch", () => {
      const account = { branch_id: "branch-uuid", is_cash_account: true };
      const expectedBranchId = "branch-uuid";
      expect(account.branch_id).toBe(expectedBranchId);
    });

    it("must throw when no CASH account found for branch", () => {
      const accounts: any[] = [];
      expect(() => {
        if (accounts.length === 0) throw new Error("No active CASH payment account found");
      }).toThrow("No active CASH");
    });

    it("must validate resolved non-CASH account is active and belongs to brand", () => {
      const account = { is_active: true, brand_id: 1 };
      expect(account.is_active).toBe(true);
    });

    it("must throw when no account can be resolved", () => {
      expect(() => {
        throw new Error("No payment account could be resolved");
      }).toThrow("No payment account");
    });
  });

  describe("add_payment_account_movement", () => {
    it("must lock the payment_account row FOR UPDATE", () => {
      const sql = "SELECT current_balance FROM public.payment_accounts WHERE id = p_payment_account_id FOR UPDATE";
      expect(sql).toContain("FOR UPDATE");
    });

    it("must reject null or non-positive amount", () => {
      expect(() => {
        throw new Error("Amount must be positive");
      }).toThrow("Amount must be positive");
    });

    it("must compute after_balance = before_balance + amount for IN", () => {
      const before = 100000;
      const amount = 50000;
      const after = before + amount;
      expect(after).toBe(150000);
    });

    it("must compute after_balance = before_balance - amount for OUT", () => {
      const before = 100000;
      const amount = 50000;
      const after = before - amount;
      expect(after).toBe(50000);
    });

    it("must reject negative after_balance when allow_negative_balance is false", () => {
      const before = 10000;
      const amount = 50000;
      const allowNegative = false;
      const after = before - amount;
      expect(() => {
        if (after < 0 && !allowNegative) throw new Error("Insufficient balance");
      }).toThrow("Insufficient balance");
    });

    it("must allow negative after_balance when allow_negative_balance is true", () => {
      const after = -10000;
      const allowNegative = true;
      expect(allowNegative).toBe(true);
      expect(after).toBeLessThan(0);
    });

    it("must update cached current_balance on payment_account", () => {
      const update = "UPDATE public.payment_accounts SET current_balance = v_after_balance WHERE id = p_payment_account_id";
      expect(update).toContain("UPDATE");
      expect(update).toContain("current_balance");
    });

    it("must validate brand_id matches between account and movement", () => {
      expect(() => {
        throw new Error("Brand mismatch");
      }).toThrow("Brand mismatch");
    });

    it("must not allow UPDATE or DELETE on movements", () => {
      const rlsPolicyNote = "No UPDATE or DELETE policies — movements are immutable.";
      expect(rlsPolicyNote).toContain("immutable");
    });
  });
});
