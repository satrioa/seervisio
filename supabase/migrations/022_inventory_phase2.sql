-- Inventory Phase 2: stock movement audit trail, stock adjustment, belanja stok, purchase history
-- 022_inventory_phase2.sql

-- ============================================================
-- 1. ENUM EXTENSIONS
-- ============================================================

ALTER TYPE inventory_movement_type ADD VALUE IF NOT EXISTS 'PURCHASE_IN';
ALTER TYPE inventory_movement_type ADD VALUE IF NOT EXISTS 'STOCK_OPNAME_ADJUSTMENT';
ALTER TYPE inventory_movement_type ADD VALUE IF NOT EXISTS 'DAMAGE_OUT';

-- ============================================================
-- 2. NEW COLUMNS ON inventory_movements
-- ============================================================

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS unit_snapshot text,
  ADD COLUMN IF NOT EXISTS total_cost_snapshot numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price_snapshot numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price_snapshot numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reference_label text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS serialized_unit_id uuid;

COMMENT ON COLUMN inventory_movements.unit_snapshot IS 'Unit name snapshot at time of movement (e.g. pcs)';
COMMENT ON COLUMN inventory_movements.total_cost_snapshot IS 'quantity * unit_cost_snapshot at time of movement';
COMMENT ON COLUMN inventory_movements.selling_price_snapshot IS 'Selling price per unit at time of movement';
COMMENT ON COLUMN inventory_movements.total_price_snapshot IS 'quantity * selling_price_snapshot at time of movement';
COMMENT ON COLUMN inventory_movements.reference_label IS 'Human-readable reference (e.g. PO/2026/06/0001)';
COMMENT ON COLUMN inventory_movements.notes IS 'User-provided notes for this movement';
COMMENT ON COLUMN inventory_movements.serialized_unit_id IS 'References serialized unit (future use)';

-- Migrate existing description to notes
UPDATE inventory_movements SET notes = description WHERE notes IS NULL AND description IS NOT NULL;

-- ============================================================
-- 3. PURCHASES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id integer NOT NULL REFERENCES brands(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  purchase_number text NOT NULL,
  supplier_name text,
  payment_account_id uuid REFERENCES payment_accounts(id),
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PAID',
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_brand ON purchases(brand_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_purchases_number ON purchases(brand_id, purchase_number);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(brand_id, purchase_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_number_unique ON purchases(brand_id, purchase_number);

-- RLS: Enable on purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchases
CREATE POLICY "Users can view purchases in their brand"
  ON purchases FOR SELECT
  USING (
    brand_id IN (SELECT get_user_brand_ids())
  );

CREATE POLICY "Users can insert purchases in their brand"
  ON purchases FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
    AND branch_id IN (SELECT get_user_branch_ids())
  );

-- ============================================================
-- 4. PURCHASE_ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  serialized_unit_id uuid,
  item_name_snapshot text NOT NULL,
  variant_snapshot jsonb,
  sku_snapshot text,
  barcode_snapshot text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_snapshot text NOT NULL DEFAULT 'pcs',
  unit_cost_snapshot numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_item ON purchase_items(item_id);

-- RLS: Enable on purchase_items
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_items
CREATE POLICY "Users can view purchase items via purchase"
  ON purchase_items FOR SELECT
  USING (
    purchase_id IN (SELECT id FROM purchases WHERE brand_id IN (SELECT get_user_brand_ids()))
  );

CREATE POLICY "Users can insert purchase items"
  ON purchase_items FOR INSERT
  WITH CHECK (
    purchase_id IN (SELECT id FROM purchases WHERE brand_id IN (SELECT get_user_brand_ids()))
  );

-- ============================================================
-- 5. PURCHASE NUMBER COUNTER
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_number_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id integer NOT NULL REFERENCES brands(id),
  year integer NOT NULL,
  month integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, year, month)
);

-- RLS for counter (visible to brand users)
ALTER TABLE purchase_number_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view counters in their brand"
  ON purchase_number_counters FOR SELECT
  USING (brand_id IN (SELECT get_user_brand_ids()));
CREATE POLICY "Users can insert counters in their brand"
  ON purchase_number_counters FOR INSERT
  WITH CHECK (brand_id IN (SELECT get_user_brand_ids()));
CREATE POLICY "Users can update counters in their brand"
  ON purchase_number_counters FOR UPDATE
  USING (brand_id IN (SELECT get_user_brand_ids()));

-- ============================================================
-- 6. INVENTORY MOVEMENTS NEW COLUMNS RLS UPDATE
-- ============================================================

-- Drop and recreate the movement insert policy to include new columns
DROP POLICY IF EXISTS "Users can insert movements in their branch" ON inventory_movements;

CREATE POLICY "Users can insert movements in their branch"
  ON inventory_movements FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT get_user_brand_ids())
    AND branch_id IN (SELECT get_user_branch_ids())
  );

-- ============================================================
-- 7. FUNCTION: generate_purchase_number
-- ============================================================

CREATE OR REPLACE FUNCTION generate_purchase_number(p_brand_id integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year int;
  v_month int;
  v_last int;
  v_new_number text;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_month := EXTRACT(MONTH FROM CURRENT_DATE)::int;

  -- Upsert counter
  INSERT INTO purchase_number_counters (brand_id, year, month, last_number)
  VALUES (p_brand_id, v_year, v_month, 1)
  ON CONFLICT (brand_id, year, month)
  DO UPDATE SET last_number = purchase_number_counters.last_number + 1,
               updated_at = now()
  RETURNING last_number INTO v_last;

  -- Format: PO/YYYY/MM/XXXX
  v_new_number := 'PO/' || v_year::text || '/' || LPAD(v_month::text, 2, '0') || '/' || LPAD(v_last::text, 4, '0');

  RETURN v_new_number;
END;
$$;

-- ============================================================
-- 8. FUNCTION: create_purchase_with_movements (atomic)
-- ============================================================

CREATE OR REPLACE FUNCTION create_purchase_with_movements(
  p_brand_id integer,
  p_branch_id uuid,
  p_purchase_number text,
  p_supplier_name text,
  p_payment_account_id uuid,
  p_purchase_date date,
  p_notes text,
  p_created_by uuid,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_purchase_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_unit_cost numeric;
  v_subtotal numeric;
  v_total_amount numeric := 0;
  v_item_row inventory_items%ROWTYPE;
  v_stock_row branch_inventory_stocks%ROWTYPE;
  v_stock_before numeric;
  v_stock_after numeric;
  v_old_avg_cost numeric;
  v_new_avg_cost numeric;
  v_movement_id uuid;
  v_payment_account_row payment_accounts%ROWTYPE;
  v_balance_before numeric;
  v_balance_after numeric;
BEGIN
  -- 1. Create purchase
  INSERT INTO purchases (brand_id, branch_id, purchase_number, supplier_name, payment_account_id, purchase_date, notes, created_by, status)
  VALUES (p_brand_id, p_branch_id, p_purchase_number, p_supplier_name, p_payment_account_id, p_purchase_date, p_notes, p_created_by, 'PAID')
  RETURNING id INTO v_purchase_id;

  -- 2. Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item->>'itemId')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unitCost')::numeric;
    v_subtotal := v_quantity * v_unit_cost;
    v_total_amount := v_total_amount + v_subtotal;

    -- Fetch item
    SELECT * INTO v_item_row FROM inventory_items WHERE id = v_item_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item not found: %', v_item_id;
    END IF;

    -- Fetch current stock
    SELECT * INTO v_stock_row FROM branch_inventory_stocks
      WHERE branch_id = p_branch_id AND item_id = v_item_id;
    v_stock_before := COALESCE(v_stock_row.current_stock, 0);

    -- Calculate new stock
    v_stock_after := v_stock_before + v_quantity;

    -- Calculate new average cost
    v_old_avg_cost := COALESCE(v_item_row.average_cost, 0);
    IF v_stock_before <= 0 THEN
      v_new_avg_cost := v_unit_cost;
    ELSE
      v_new_avg_cost := ((v_stock_before * v_old_avg_cost) + (v_quantity * v_unit_cost)) / v_stock_after;
    END IF;

    -- Create purchase_items with snapshots
    INSERT INTO purchase_items (
      purchase_id, item_id, item_name_snapshot, variant_snapshot, sku_snapshot, barcode_snapshot,
      quantity, unit_snapshot, unit_cost_snapshot, subtotal
    ) VALUES (
      v_purchase_id, v_item_id,
      v_item_row.name,
      v_item_row.variant_attributes,
      v_item_row.sku,
      v_item_row.barcode,
      v_quantity,
      v_item_row.unit_name,
      v_unit_cost,
      v_subtotal
    );

    -- Update or create branch stock
    IF v_stock_row.id IS NOT NULL THEN
      UPDATE branch_inventory_stocks
      SET current_stock = v_stock_after,
          last_movement_at = now(),
          updated_at = now()
      WHERE id = v_stock_row.id;
    ELSE
      INSERT INTO branch_inventory_stocks (brand_id, branch_id, item_id, current_stock, reserved_stock)
      VALUES (p_brand_id, p_branch_id, v_item_id, v_stock_after, 0);
    END IF;

    -- Update item average cost and cost price
    UPDATE inventory_items
    SET average_cost = v_new_avg_cost,
        cost_price = v_unit_cost,
        updated_at = now()
    WHERE id = v_item_id;

    -- Create inventory movement
    INSERT INTO inventory_movements (
      brand_id, branch_id, item_id, movement_type, direction,
      quantity, unit_snapshot, before_quantity, after_quantity,
      unit_cost, unit_cost_snapshot, total_cost_snapshot,
      selling_price_snapshot, total_price_snapshot,
      reference_type, reference_id, reference_label, notes, created_by
    ) VALUES (
      p_brand_id, p_branch_id, v_item_id, 'PURCHASE_IN', 'IN',
      v_quantity, v_item_row.unit_name, v_stock_before, v_stock_after,
      v_unit_cost, v_unit_cost, v_subtotal,
      v_item_row.selling_price, v_quantity * v_item_row.selling_price,
      'PURCHASE', v_purchase_id, p_purchase_number, p_notes, p_created_by
    );
  END LOOP;

  -- 3. Update purchase total
  UPDATE purchases SET total_amount = v_total_amount, updated_at = now() WHERE id = v_purchase_id;

  -- 4. Create payment account movement
  SELECT * INTO v_payment_account_row FROM payment_accounts WHERE id = p_payment_account_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment account not found: %', p_payment_account_id;
  END IF;

  v_balance_before := v_payment_account_row.current_balance;
  v_balance_after := v_balance_before - v_total_amount;

  INSERT INTO payment_account_movements (
    payment_account_id, brand_id, branch_id,
    direction, amount, before_balance, after_balance,
    movement_type, reference_type, reference_id, description, created_by
  ) VALUES (
    p_payment_account_id, p_brand_id, p_branch_id,
    'OUT', v_total_amount, v_balance_before, v_balance_after,
    'STOCK_PURCHASE', 'PURCHASE', v_purchase_id, 'Belanja Stok: ' || p_purchase_number, p_created_by
  );

  UPDATE payment_accounts
  SET current_balance = v_balance_after, updated_at = now()
  WHERE id = p_payment_account_id;

  -- 5. Return purchase id
  RETURN jsonb_build_object('purchase_id', v_purchase_id);
END;
$$;
