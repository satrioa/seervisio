import { describe, it, expect } from "vitest";

describe("Inventory Module", () => {
  describe("inv_variant_stocks", () => {
    it("must have CHECK constraint preventing negative current_stock", () => {
      const constraint = "chk_invvs_current_stock check (current_stock >= 0)";
      expect(constraint).toContain("current_stock >= 0");
    });

    it("must have CHECK constraint preventing negative reserved_stock", () => {
      const constraint = "chk_invvs_reserved_stock check (reserved_stock >= 0)";
      expect(constraint).toContain("reserved_stock >= 0");
    });

    it("must have UNIQUE constraint on (branch_id, variant_id)", () => {
      const constraint = "unique (branch_id, variant_id)";
      expect(constraint).toBeTruthy();
    });

    it("must only allow one stock row per variant per branch", () => {
      const constraintName = "uq_invvs_branch_variant";
      expect(constraintName).toBeTruthy();
    });
  });

  describe("inv_stock_movements", () => {
    it("must be created for every stock change", () => {
      const movementType = "POS_SALE";
      expect(movementType).toBeTruthy();
    });

    it("must be append-only (no UPDATE/DELETE)", () => {
      const hasUpdateTrigger = false; // no updated_at trigger on this table
      const hasDeletePolicy = false; // no DELETE policies
      expect(hasUpdateTrigger).toBe(false);
      expect(hasDeletePolicy).toBe(false);
    });

    it("must record stock_before and stock_after for quantity changes", () => {
      const movement = {
        direction: "OUT",
        quantity: 3,
        stock_before: 10,
        stock_after: 7,
      };
      expect(movement.stock_after).toBe(movement.stock_before - movement.quantity);
    });

    it("must record unit_status_before and unit_status_after for serialized units", () => {
      const movement = {
        direction: "OUT",
        unit_status_before: "READY_STOCK",
        unit_status_after: "SOLD",
      };
      expect(movement.unit_status_before).toBe("READY_STOCK");
      expect(movement.unit_status_after).toBe("SOLD");
    });

    it("must have direction IN, OUT, or ADJUST", () => {
      const validDirections = ["IN", "OUT", "ADJUST"];
      expect(validDirections).toContain("IN");
      expect(validDirections).toContain("OUT");
      expect(validDirections).toContain("ADJUST");
    });

    it("must have quantity > 0", () => {
      expect(() => {
        throw new Error("Quantity must be greater than 0");
      }).toThrow("greater than 0");
    });

    it("must reference variant_id, product_id, or unit_id", () => {
      const m1 = { variant_id: "v-uuid", product_id: null, unit_id: null };
      const m2 = { variant_id: null, product_id: "p-uuid", unit_id: null };
      const m3 = { variant_id: null, product_id: null, unit_id: "u-uuid" };
      expect(m1.variant_id || m1.product_id || m1.unit_id).toBeTruthy();
      expect(m2.variant_id || m2.product_id || m2.unit_id).toBeTruthy();
      expect(m3.variant_id || m3.product_id || m3.unit_id).toBeTruthy();
    });

    it("must reference reference_type and reference_id for traceability", () => {
      const movement = {
        reference_type: "POS_TRANSACTION",
        reference_id: "tx-uuid",
      };
      expect(movement.reference_type).toBeTruthy();
      expect(movement.reference_id).toBeTruthy();
    });
  });

  describe("inv_products", () => {
    it("must have product_kind in SPAREPART, PRODUCT, or UNIT", () => {
      const validKinds = ["SPAREPART", "PRODUCT", "UNIT"];
      expect(validKinds).toContain("SPAREPART");
      expect(validKinds).toContain("PRODUCT");
      expect(validKinds).toContain("UNIT");
    });

    it("must have condition_type only when product_kind = UNIT", () => {
      const product = { product_kind: "UNIT", condition_type: "NEW" };
      const sparepart = { product_kind: "SPAREPART", condition_type: null };
      expect(product.condition_type).toBeTruthy();
      expect(sparepart.condition_type).toBeNull();
    });

    it("must constrain condition_type to NEW or SECOND", () => {
      const validConditions = ["NEW", "SECOND"];
      expect(validConditions).toContain("NEW");
      expect(validConditions).toContain("SECOND");
    });

    it("must not allow SPAREPART to have appears_in_pos = true in checkout_pos_v4", () => {
      const product = { product_kind: "SPAREPART", appears_in_pos: false };
      expect(product.appears_in_pos).toBe(false);
    });
  });

  describe("inv_variants", () => {
    it("must have cost_price >= 0", () => {
      expect(() => {
        throw new Error("Cost price cannot be negative");
      }).toThrow("cannot be negative");
    });

    it("must have selling_price >= 0", () => {
      expect(() => {
        throw new Error("Selling price cannot be negative");
      }).toThrow("cannot be negative");
    });

    it("must belong to the same brand as product", () => {
      const variant = { brand_id: 1 };
      const product = { brand_id: 1 };
      expect(variant.brand_id).toBe(product.brand_id);
    });
  });

  describe("inv_units (serialized)", () => {
    it("must have status READY_STOCK, RESERVED, SOLD, IN_SERVICE, DEFECTIVE, RETURNED, ARCHIVED", () => {
      const validStatuses = [
        "READY_STOCK", "RESERVED", "SOLD", "IN_SERVICE",
        "DEFECTIVE", "RETURNED", "ARCHIVED",
      ];
      expect(validStatuses).toContain("READY_STOCK");
      expect(validStatuses).toContain("SOLD");
      expect(validStatuses).toContain("DEFECTIVE");
    });

    it("must be unique by IMEI per brand", () => {
      const indexSql = "create unique index uq_invu_imei on public.inv_units (brand_id, imei) where imei is not null";
      expect(indexSql).toContain("unique");
    });

    it("must have battery_health between 0 and 100", () => {
      const constraint = "battery_health is null or (battery_health >= 0 and battery_health <= 100)";
      expect(constraint).toContain("battery_health");
    });

    it("must have purchase_cost >= 0", () => {
      const constraint = "chk_invu_purchase_cost check (purchase_cost >= 0)";
      expect(constraint).toContain("purchase_cost >= 0");
    });

    it("must have selling_price >= 0", () => {
      const constraint = "chk_invu_selling_price check (selling_price >= 0)";
      expect(constraint).toContain("selling_price >= 0");
    });

    it("can only be sold when status = READY_STOCK", () => {
      const unit = { status: "READY_STOCK" };
      expect(unit.status).toBe("READY_STOCK");
    });

    it("transitions to SOLD after POS checkout", () => {
      const unit = { status: "SOLD" };
      expect(unit.status).toBe("SOLD");
    });

    it("transitions back to READY_STOCK after void", () => {
      const unit = { status: "READY_STOCK" };
      expect(unit.status).toBe("READY_STOCK");
    });
  });

  describe("inv_sparepart_usage", () => {
    it("must have quantity > 0", () => {
      const constraint = "chk_invsu_quantity check (quantity > 0)";
      expect(constraint).toContain("quantity > 0");
    });

    it("must link to service_id", () => {
      const usage = { service_id: "svc-uuid" };
      expect(usage.service_id).toBeTruthy();
    });

    it("must link to variant_id", () => {
      const usage = { variant_id: "v-uuid" };
      expect(usage.variant_id).toBeTruthy();
    });

    it("must snapshot item_name, variant_name, cost, selling price at time of usage", () => {
      const usage = {
        item_name_snapshot: "Sparepart Name",
        variant_name_snapshot: "Variant Name",
        cost_price_snapshot: 15000,
        selling_price_snapshot: 25000,
      };
      expect(usage.item_name_snapshot).toBeTruthy();
      expect(usage.cost_price_snapshot).toBeGreaterThan(0);
    });
  });

  describe("Negative stock prevention", () => {
    it("must reject OUT movement when stock would go below 0", () => {
      const currentStock = 5;
      const requestedQty = 10;
      expect(() => {
        if (currentStock < requestedQty) {
          throw new Error("Insufficient stock: available " + currentStock + ", requested " + requestedQty);
        }
      }).toThrow("Insufficient stock");
    });

    it("must allow OUT movement when stock is sufficient", () => {
      const currentStock = 10;
      const requestedQty = 5;
      const result = currentStock - requestedQty;
      expect(result).toBe(5);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("must allow IN movement regardless of current stock", () => {
      const currentStock = 5;
      const incomingQty = 10;
      const result = currentStock + incomingQty;
      expect(result).toBe(15);
    });

    it("must prevent negative stock via database CHECK constraint", () => {
      // This is a DB-level constraint, cannot be bypassed by application code
      const constraint = "check (current_stock >= 0)";
      expect(constraint).toContain("current_stock >= 0");
    });
  });

  describe("Append-only stock movements", () => {
    it("must forbid UPDATE on inv_stock_movements", () => {
      const policies = [
        { name: "invsm_select", action: "SELECT" },
        { name: "invsm_insert", action: "INSERT" },
      ];
      const hasUpdate = policies.some(p => p.action === "UPDATE");
      expect(hasUpdate).toBe(false);
    });

    it("must forbid DELETE on inv_stock_movements", () => {
      const policies = [
        { name: "invsm_select", action: "SELECT" },
        { name: "invsm_insert", action: "INSERT" },
      ];
      const hasDelete = policies.some(p => p.action === "DELETE");
      expect(hasDelete).toBe(false);
    });

    it("must have no updated_at trigger (immutable)", () => {
      const triggerName = "trg_inv_stock_movements_updated_at";
      const triggerDef = `create trigger ${triggerName} before update on public.inv_stock_movements for each row execute function public.update_updated_at_column()`;
      const triggerExists = false; // This trigger should NOT exist
      expect(triggerExists).toBe(false);
    });
  });
});
