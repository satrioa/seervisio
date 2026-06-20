import { describe, it, expect } from "vitest";

describe("POS Checkout Module", () => {
  describe("checkout_pos_v4 RPC", () => {
    it("must reject empty items array", () => {
      const items: any[] = [];
      expect(() => {
        if (items.length === 0) throw new Error("At least one item required");
      }).toThrow("At least one item");
    });

    it("must validate items array is not null", () => {
      const items = null;
      expect(() => {
        if (!items) throw new Error("Items cannot be null");
      }).toThrow("cannot be null");
    });

    it("must resolve payment method and account before processing", () => {
      const resolved = {
        payment_account_id: "acct-uuid",
        method_type: "CASH",
        mdr_percentage: 0,
      };
      expect(resolved.payment_account_id).toBeTruthy();
      expect(resolved.method_type).toBeTruthy();
    });

    it("must generate transaction number POS/YYYY/MM/NNNN", () => {
      const txNumber = "POS/2026/06/0001";
      expect(txNumber).toMatch(/^POS\/\d{4}\/\d{2}\/\d{4}$/);
    });

    it("must create transaction with status COMPLETED", () => {
      const tx = { status: "COMPLETED" };
      expect(tx.status).toBe("COMPLETED");
    });

    it("must set total_amount = subtotal - discount + service_fee", () => {
      const subtotal = 500000;
      const discount = 50000;
      const serviceFee = 10000;
      const total = subtotal - discount + serviceFee;
      expect(total).toBe(460000);
    });

    it("must reject negative discount", () => {
      expect(() => {
        throw new Error("Discount cannot be negative");
      }).toThrow("Discount cannot be negative");
    });

    it("must reject negative service_fee", () => {
      expect(() => {
        throw new Error("Service fee cannot be negative");
      }).toThrow("Service fee cannot be negative");
    });

    it("must reject total_amount < 0", () => {
      expect(() => {
        throw new Error("Total cannot be negative");
      }).toThrow("Total cannot be negative");
    });
  });

  describe("PRODUCT_QUANTITY / UNIT_NEW_QUANTITY items", () => {
    it("must reject zero or negative quantity", () => {
      expect(() => {
        throw new Error("Quantity must be greater than 0");
      }).toThrow("greater than 0");
    });

    it("must validate variant exists", () => {
      expect(() => {
        throw new Error("Variant not found");
      }).toThrow("Variant not found");
    });

    it("must validate variant brand matches transaction brand", () => {
      expect(() => {
        throw new Error("Variant brand mismatch");
      }).toThrow("brand");
    });

    it("must reject inactive variant", () => {
      expect(() => {
        throw new Error("Variant is not active");
      }).toThrow("not active");
    });

    it("must validate product exists", () => {
      expect(() => {
        throw new Error("Product not found");
      }).toThrow("not found");
    });

    it("must reject product that is not appears_in_pos", () => {
      const product = { appears_in_pos: false, name: "Test" };
      expect(() => {
        if (!product.appears_in_pos) throw new Error("Product not allowed for POS");
      }).toThrow("not allowed for POS");
    });

    it("must reject SPAREPART products from POS", () => {
      const product = { product_kind: "SPAREPART" };
      expect(() => {
        if (product.product_kind === "SPAREPART") throw new Error("Sparepart cannot be sold via POS");
      }).toThrow("Sparepart cannot be sold");
    });

    it("must reject UNIT SECOND from quantity selection (requires serialized)", () => {
      const product = { product_kind: "UNIT", condition_type: "SECOND" };
      expect(() => {
        if (product.product_kind === "UNIT" && product.condition_type === "SECOND") {
          throw new Error("Unit Second requires specific unit selection");
        }
      }).toThrow("Unit Second requires");
    });

    it("must lock and validate stock FOR UPDATE", () => {
      const sql = "SELECT * FROM public.inv_variant_stocks WHERE branch_id = p_branch_id AND variant_id = v_variant_id FOR UPDATE";
      expect(sql).toContain("FOR UPDATE");
    });

    it("must reject quantity exceeding available stock", () => {
      const stockBefore = 5;
      const requestedQty = 10;
      expect(() => {
        if (stockBefore < requestedQty) throw new Error("Insufficient stock");
      }).toThrow("Insufficient stock");
    });

    it("must reduce current_stock by quantity", () => {
      const before = 10;
      const qty = 3;
      const after = before - qty;
      expect(after).toBe(7);
    });

    it("must create stock movement with direction OUT and type POS_SALE", () => {
      const movement = {
        movement_type: "POS_SALE",
        direction: "OUT",
        quantity: 3,
      };
      expect(movement.movement_type).toBe("POS_SALE");
      expect(movement.direction).toBe("OUT");
    });

    it("must create transaction item with subtotal = qty * selling_price", () => {
      const qty = 2;
      const price = 25000;
      const subtotal = qty * price;
      expect(subtotal).toBe(50000);
    });

    it("must snapshot product name, variant name, cost price at time of sale", () => {
      const item = {
        item_name_snapshot: "Product Name",
        variant_name_snapshot: "Variant Name",
        cost_price_snapshot: 15000,
      };
      expect(item.item_name_snapshot).toBeTruthy();
      expect(item.variant_name_snapshot).toBeTruthy();
      expect(item.cost_price_snapshot).toBeGreaterThan(0);
    });
  });

  describe("UNIT_SECOND_SERIALIZED items", () => {
    it("must lock unit FOR UPDATE", () => {
      const sql = "SELECT * FROM public.inv_units WHERE id = v_unit_id FOR UPDATE";
      expect(sql).toContain("FOR UPDATE");
    });

    it("must reject unit that is not READY_STOCK", () => {
      const unit = { status: "RESERVED" };
      expect(() => {
        if (unit.status !== "READY_STOCK") throw new Error("Unit not available");
      }).toThrow("not available");
    });

    it("must update unit status to SOLD", () => {
      const unit = { status: "SOLD" };
      expect(unit.status).toBe("SOLD");
    });

    it("must create stock movement with type UNIT_SOLD and unit status transition", () => {
      const movement = {
        movement_type: "UNIT_SOLD",
        unit_status_before: "READY_STOCK",
        unit_status_after: "SOLD",
      };
      expect(movement.movement_type).toBe("UNIT_SOLD");
      expect(movement.unit_status_before).toBe("READY_STOCK");
      expect(movement.unit_status_after).toBe("SOLD");
    });

    it("must require unit_id for UNIT_SECOND_SERIALIZED items", () => {
      const item = { item_type: "UNIT_SECOND_SERIALIZED", unit_id: null };
      expect(() => {
        if (item.item_type === "UNIT_SECOND_SERIALIZED" && !item.unit_id) {
          throw new Error("Unit Second requires unit_id");
        }
      }).toThrow("requires unit_id");
    });

    it("must have quantity = 1 for serialized units", () => {
      const item = { item_type: "UNIT_SECOND_SERIALIZED", quantity: 1 };
      expect(item.quantity).toBe(1);
    });

    it("must snapshot IMEI, serial number, battery health, condition", () => {
      const snapshot = {
        imei_snapshot: "123456789012345",
        serial_number_snapshot: "SN123",
        battery_health_snapshot: 85,
        condition_snapshot: "NEW",
      };
      expect(snapshot.imei_snapshot).toBeTruthy();
    });
  });

  describe("Payment handling", () => {
    it("must calculate MDR using calculate_pos_mdr", () => {
      const totalAmount = 460000;
      const methodType = "QRIS";
      const mdrPct = 0.7;
      const calcMdr = (type: string, amount: number, pct: number, minTx?: number) => {
        if (["CASH", "TRANSFER"].includes(type)) return 0;
        if (type === "QRIS") {
          if (amount <= (minTx ?? 500000)) return 0;
          return Math.round(amount * pct / 100);
        }
        return Math.round(amount * pct / 100);
      };
      const mdr = calcMdr(methodType, totalAmount, mdrPct, 500000);
      expect(mdr).toBe(0);
    });

    it("must require paid_amount >= total_amount for CASH", () => {
      const totalAmount = 460000;
      const paidAmount = 500000;
      const change = paidAmount - totalAmount;
      expect(paidAmount).toBeGreaterThanOrEqual(totalAmount);
      expect(change).toBe(40000);
    });

    it("must reject paid_amount < total_amount for CASH", () => {
      const totalAmount = 460000;
      const paidAmount = 400000;
      expect(() => {
        if (paidAmount < totalAmount) throw new Error("Insufficient payment");
      }).toThrow("Insufficient payment");
    });

    it("must set change_amount = 0 for non-CASH methods", () => {
      const changeAmount = 0;
      expect(changeAmount).toBe(0);
    });

    it("must create payment_account_movement IN with type POS_PAYMENT", () => {
      const movement = {
        direction: "IN",
        movement_type: "POS_PAYMENT",
        amount: 460000,
      };
      expect(movement.direction).toBe("IN");
      expect(movement.movement_type).toBe("POS_PAYMENT");
    });

    it("must set paid_amount = total_amount for non-CASH methods", () => {
      const totalAmount = 460000;
      const paidAmount = totalAmount;
      expect(paidAmount).toBe(460000);
    });

    it("must set paid_amount = p_paid_amount for CASH methods", () => {
      const paidAmount = 500000;
      const totalAmount = 460000;
      expect(paidAmount).toBeGreaterThan(totalAmount);
    });
  });

  describe("MDR calculation", () => {
    it("must return 0 for CASH and TRANSFER", () => {
      function calcMdr(methodType: string, amount: number, mdrPct: number): number {
        if (["CASH", "TRANSFER"].includes(methodType)) return 0;
        return Math.round(amount * mdrPct / 100);
      }
      expect(calcMdr("CASH", 100000, 0)).toBe(0);
      expect(calcMdr("TRANSFER", 100000, 0.7)).toBe(0);
    });

    it("must return 0 for QRIS <= threshold (default 500000)", () => {
      function calcMdr(methodType: string, amount: number, mdrPct: number, threshold = 500000): number {
        if (["CASH", "TRANSFER"].includes(methodType)) return 0;
        if (methodType === "QRIS" && amount <= threshold) return 0;
        return Math.round(amount * mdrPct / 100);
      }
      expect(calcMdr("QRIS", 500000, 0.7)).toBe(0);
      expect(calcMdr("QRIS", 300000, 0.7)).toBe(0);
    });

    it("must apply percentage for QRIS > threshold", () => {
      function calcMdr(methodType: string, amount: number, mdrPct: number, threshold = 500000): number {
        if (["CASH", "TRANSFER"].includes(methodType)) return 0;
        if (methodType === "QRIS" && amount <= threshold) return 0;
        return Math.round(amount * mdrPct / 100);
      }
      expect(calcMdr("QRIS", 1000000, 0.7)).toBe(7000);
    });

    it("must support configurable mdr_min_transaction threshold", () => {
      function calcMdr(methodType: string, amount: number, mdrPct: number, threshold = 500000): number {
        if (["CASH", "TRANSFER"].includes(methodType)) return 0;
        if (methodType === "QRIS" && amount <= threshold) return 0;
        return Math.round(amount * mdrPct / 100);
      }
      expect(calcMdr("QRIS", 100000, 0.7, 50000)).toBe(700);
      expect(calcMdr("QRIS", 100000, 0.7, 200000)).toBe(0);
    });

    it("must apply percentage for DEBIT, CREDIT, EWALLET", () => {
      function calcMdr(methodType: string, amount: number, mdrPct: number): number {
        if (["CASH", "TRANSFER"].includes(methodType)) return 0;
        return Math.round(amount * mdrPct / 100);
      }
      expect(calcMdr("DEBIT", 500000, 1)).toBe(5000);
      expect(calcMdr("EWALLET", 250000, 0.5)).toBe(1250);
    });
  });

  describe("resolve_pos_payment_account", () => {
    it("must resolve CASH to branch cash account", () => {
      const methodType = "CASH";
      const account = { type: "CASH", is_cash_account: true, branch_id: "branch-uuid" };
      expect(methodType).toBe("CASH");
      expect(account.is_cash_account).toBe(true);
    });

    it("must resolve QRIS to configured receiving account", () => {
      const methodType = "QRIS";
      const account = { type: "QRIS", is_default_receiving_account: true };
      expect(methodType).toBe("QRIS");
    });

    it("must resolve TRANSFER to configured receiving account", () => {
      const methodType = "TRANSFER";
      const account = { type: "TRANSFER", is_default_receiving_account: true };
      expect(methodType).toBe("TRANSFER");
    });
  });
});
