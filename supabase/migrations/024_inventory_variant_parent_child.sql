-- ============================================================
-- SEERVIS V2 -- Inventory Variant Parent-Child Model
-- Migration 024: Add parent-child variant columns, backfill
--               missing Phase 1/2 columns defensively
-- ============================================================
-- This migration is idempotent and defensive.
-- It adds missing columns from Phase 1 & 2 and adds new
-- parent-child variant columns.
--
-- Do NOT drop Phase 3 tables/functions/columns.
-- ============================================================

-- ============================================================
-- 1. ADD MISSING PHASE 1/2 COLUMNS (idempotent)
-- ============================================================

do $$ begin
  -- sku
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'sku') then
    alter table public.inventory_items add column sku text;
  end if;

  -- barcode
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'barcode') then
    alter table public.inventory_items add column barcode text;
  end if;

  -- tracking_type
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'tracking_type') then
    alter table public.inventory_items add column tracking_type text not null default 'QUANTITY';
  end if;

  -- variant_name
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'variant_name') then
    alter table public.inventory_items add column variant_name text;
  end if;

  -- variant_attributes
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'variant_attributes') then
    alter table public.inventory_items add column variant_attributes jsonb not null default '{}';
  end if;

  -- average_cost
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'average_cost') then
    alter table public.inventory_items add column average_cost numeric not null default 0;
  end if;

  -- product_id
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'product_id') then
    alter table public.inventory_items add column product_id uuid;
  end if;

  -- current_stock (may not exist on table, usually on branch_inventory_stocks)
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'current_stock') then
    alter table public.inventory_items add column current_stock numeric not null default 0;
  end if;

  -- unit_name (defensive, may already exist)
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'unit_name') then
    alter table public.inventory_items add column unit_name text not null default 'pcs';
  end if;

  -- min_stock (defensive)
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'min_stock') then
    alter table public.inventory_items add column min_stock numeric not null default 0;
  end if;

  -- cost_price (defensive)
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'cost_price') then
    alter table public.inventory_items add column cost_price numeric not null default 0;
  end if;

  -- selling_price (defensive)
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'selling_price') then
    alter table public.inventory_items add column selling_price numeric not null default 0;
  end if;

  -- item_type (defensive - enum may already exist but column might not)
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'item_type') then
    alter table public.inventory_items add column item_type text not null default 'SPAREPART';
  end if;
end $$;

-- ============================================================
-- 2. ADD PHASE 2 COLUMNS TO inventory_movements (idempotent)
-- ============================================================

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements'
    and column_name = 'unit_snapshot') then
    alter table public.inventory_movements add column unit_snapshot text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements'
    and column_name = 'total_cost_snapshot') then
    alter table public.inventory_movements add column total_cost_snapshot numeric default 0;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements'
    and column_name = 'selling_price_snapshot') then
    alter table public.inventory_movements add column selling_price_snapshot numeric default 0;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements'
    and column_name = 'total_price_snapshot') then
    alter table public.inventory_movements add column total_price_snapshot numeric default 0;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements'
    and column_name = 'reference_label') then
    alter table public.inventory_movements add column reference_label text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements'
    and column_name = 'notes') then
    alter table public.inventory_movements add column notes text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements'
    and column_name = 'serialized_unit_id') then
    alter table public.inventory_movements add column serialized_unit_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements'
    and column_name = 'unit_cost_snapshot') then
    alter table public.inventory_movements add column unit_cost_snapshot numeric;
  end if;

  -- Migrate existing description to notes if needed
  if exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements'
    and column_name = 'description') then
    update public.inventory_movements set notes = description where notes is null and description is not null;
  end if;
end $$;

-- ============================================================
-- 3. ADD NEW PARENT-CHILD VARIANT COLUMNS
-- ============================================================

do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'parent_item_id') then
    alter table public.inventory_items add column parent_item_id uuid
      references public.inventory_items(id) on delete set null;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'is_variant_parent') then
    alter table public.inventory_items add column is_variant_parent boolean not null default false;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'has_variants') then
    alter table public.inventory_items add column has_variants boolean not null default false;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'variant_option_values') then
    alter table public.inventory_items add column variant_option_values jsonb not null default '{}';
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'variant_display_name') then
    alter table public.inventory_items add column variant_display_name text;
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_items'
    and column_name = 'unit_condition') then
    alter table public.inventory_items add column unit_condition text;
  end if;
end $$;

-- ============================================================
-- 4. ADD INDEXES SAFELY
-- ============================================================

create index if not exists idx_inventory_items_brand on public.inventory_items(brand_id);
create index if not exists idx_inventory_items_parent on public.inventory_items(parent_item_id);
create index if not exists idx_inventory_items_brand_parent on public.inventory_items(brand_id, parent_item_id);

-- barcode index (where not null)
create index if not exists idx_inventory_items_brand_barcode
  on public.inventory_items (brand_id, barcode)
  where barcode is not null and barcode <> '';

-- sku index (where not null)
create index if not exists idx_inventory_items_brand_sku
  on public.inventory_items (brand_id, sku)
  where sku is not null and sku <> '';

create index if not exists idx_inventory_items_brand_item_type
  on public.inventory_items (brand_id, item_type);

create index if not exists idx_inventory_items_brand_tracking_type
  on public.inventory_items (brand_id, tracking_type);

-- ============================================================
-- 5. UNIQUE INDEXES (defensive)
-- ============================================================

do $$
declare
  v_dup_barcodes int;
  v_dup_skus int;
begin
  -- Check for duplicate barcodes per brand
  select count(*) into v_dup_barcodes from (
    select brand_id, barcode, count(*) as cnt
    from public.inventory_items
    where barcode is not null and barcode <> ''
    group by brand_id, barcode
    having count(*) > 1
  ) dup;

  if v_dup_barcodes = 0 then
    execute 'create unique index if not exists uq_inventory_items_barcode_per_brand
      on public.inventory_items (brand_id, barcode)
      where barcode is not null and barcode <> ''''';
    raise notice 'Created unique barcode index (no duplicates found)';
  else
    raise notice 'SKIPPED unique barcode index: % duplicate barcode groups found', v_dup_barcodes;
  end if;

  -- Check for duplicate SKUs per brand
  select count(*) into v_dup_skus from (
    select brand_id, sku, count(*) as cnt
    from public.inventory_items
    where sku is not null and sku <> ''
    group by brand_id, sku
    having count(*) > 1
  ) dup;

  if v_dup_skus = 0 then
    execute 'create unique index if not exists uq_inventory_items_sku_per_brand
      on public.inventory_items (brand_id, sku)
      where sku is not null and sku <> ''''';
    raise notice 'Created unique SKU index (no duplicates found)';
  else
    raise notice 'SKIPPED unique SKU index: % duplicate SKU groups found', v_dup_skus;
  end if;
end $$;

-- ============================================================
-- 6. BACKFILL variant_display_name FROM variant_name
-- ============================================================

update public.inventory_items
set variant_display_name = variant_name
where variant_name is not null and variant_display_name is null;

-- ============================================================
-- 7. BACKFILL variant_option_values FROM variant_attributes
-- ============================================================

update public.inventory_items
set variant_option_values = variant_attributes
where variant_attributes != '{}'::jsonb
  and variant_option_values = '{}'::jsonb;

-- ============================================================
-- 8. SET UNIT CONDITION BACKFILL
-- ============================================================

-- Set unit_condition = 'SECOND' for existing DEVICE_UNIT items with SERIALIZED tracking
update public.inventory_items
set unit_condition = 'SECOND'
where item_type = 'DEVICE_UNIT'
  and unit_condition is null;

-- ============================================================
-- 9. UPDATE inventory_listing VIEW WITH NEW COLUMNS
-- ============================================================

create or replace view public.inventory_listing as
select
  ii.id,
  ii.brand_id,
  ii.category_id,
  ic.name as category_name,
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
  ii.parent_item_id,
  ii.is_variant_parent,
  ii.has_variants,
  ii.variant_option_values,
  ii.variant_display_name,
  ii.unit_condition,
  ii.created_at,
  ii.updated_at,
  coalesce(bis.current_stock, 0) as current_stock,
  coalesce(bis.reserved_stock, 0) as reserved_stock,
  coalesce(bis.available_stock, 0) as available_stock,
  bis.branch_id,
  b.name as branch_name
from public.inventory_items ii
left join public.inventory_categories ic on ic.id = ii.category_id
left join public.branch_inventory_stocks bis on bis.item_id = ii.id
left join public.branches b on b.id = bis.branch_id
where ii.deleted_at is null;

-- ============================================================
-- End of Migration 024
-- ============================================================
