-- Inventory Phase 1: variant support, tracking type, product grouping, barcode indexing
-- 021_inventory_phase1.sql

-- 1. Add new values to inventory_item_type enum
ALTER TYPE inventory_item_type ADD VALUE IF NOT EXISTS 'ACCESSORY';
ALTER TYPE inventory_item_type ADD VALUE IF NOT EXISTS 'CONSUMABLE';
ALTER TYPE inventory_item_type ADD VALUE IF NOT EXISTS 'DEVICE_UNIT';

-- 2. Add missing columns to inventory_items
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS variant_name text,
  ADD COLUMN IF NOT EXISTS variant_attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS tracking_type text DEFAULT 'QUANTITY' NOT NULL,
  ADD COLUMN IF NOT EXISTS average_cost numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS product_id uuid;

COMMENT ON COLUMN inventory_items.variant_name IS 'Display name for the specific variant (e.g. "Black 128GB")';
COMMENT ON COLUMN inventory_items.variant_attributes IS 'Structured variant attributes like color, storage, quality';
COMMENT ON COLUMN inventory_items.tracking_type IS 'QUANTITY = tracked by count, SERIALIZED = tracked by individual unit';
COMMENT ON COLUMN inventory_items.average_cost IS 'Weighted average cost price across all purchase batches';
COMMENT ON COLUMN inventory_items.product_id IS 'Optional reference to a parent product grouping (future)';

-- 3. Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_brand_branch
  ON inventory_items (brand_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_brand_barcode
  ON inventory_items (brand_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE INDEX IF NOT EXISTS idx_inventory_items_brand_sku
  ON inventory_items (brand_id, sku)
  WHERE sku IS NOT NULL AND sku <> '';

CREATE INDEX IF NOT EXISTS idx_inventory_items_brand_item_type
  ON inventory_items (brand_id, item_type);

CREATE INDEX IF NOT EXISTS idx_inventory_items_brand_tracking_type
  ON inventory_items (brand_id, tracking_type);

-- 4. Add CHECK constraint for tracking_type values
ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_tracking_type_check
  CHECK (tracking_type IN ('QUANTITY', 'SERIALIZED'));

-- 5. Add CHECK constraint for item_type (comprehensive list)
ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_item_type_check;

-- Note: item_type uses the inventory_item_type enum which already constrains values.
-- No additional CHECK needed for enum-backed columns.

-- 6. Create view for easy inventory listing with stock
CREATE OR REPLACE VIEW inventory_listing AS
SELECT
  ii.id,
  ii.brand_id,
  ii.category_id,
  ic.name AS category_name,
  ii.item_type,
  ii.name,
  ii.sku,
  ii.barcode,
  ii.variant_name,
  ii.variant_attributes,
  ii.tracking_type,
  ii.description,
  ii.unit_name,
  ii.cost_price,
  ii.average_cost,
  ii.selling_price,
  ii.min_stock,
  ii.is_active,
  ii.metadata,
  ii.created_at,
  ii.updated_at,
  COALESCE(bis.current_stock, 0) AS current_stock,
  COALESCE(bis.reserved_stock, 0) AS reserved_stock,
  COALESCE(bis.available_stock, 0) AS available_stock,
  bis.branch_id,
  b.name AS branch_name
FROM inventory_items ii
LEFT JOIN inventory_categories ic ON ic.id = ii.category_id
LEFT JOIN branch_inventory_stocks bis ON bis.item_id = ii.id
LEFT JOIN branches b ON b.id = bis.branch_id
WHERE ii.deleted_at IS NULL;

-- 7. RLS: Ensure inventory_listing inherits from base tables
-- (RLS is handled by the base tables; views respect caller RLS by default)
