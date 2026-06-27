-- ============================================================
-- Migration 026: Add stock_type, business columns, and
-- unit_attributes for inventory restructuring
-- ============================================================

-- 1. Add business columns to inventory_items
alter table public.inventory_items
add column if not exists stock_type text;

alter table public.inventory_items
add column if not exists appears_in_pos boolean not null default false;

alter table public.inventory_items
add column if not exists service_usage_enabled boolean not null default false;

-- 2. Backfill stock_type based on existing item_type
do $$
begin
  -- SPAREPART -> SPAREPART
  update public.inventory_items
  set stock_type = 'SPAREPART',
      appears_in_pos = false,
      service_usage_enabled = true
  where stock_type is null
    and item_type = 'SPAREPART'
    and deleted_at is null;

  -- PRODUCT, ACCESSORY, CONSUMABLE, SUPPLY, OTHER -> PRODUCT
  update public.inventory_items
  set stock_type = 'PRODUCT',
      appears_in_pos = true,
      service_usage_enabled = false
  where stock_type is null
    and item_type in ('PRODUCT', 'ACCESSORY', 'CONSUMABLE', 'SUPPLY', 'OTHER')
    and deleted_at is null;

  -- DEVICE_UNIT with unit_condition = 'SECOND' or null -> UNIT (mark as SECOND)
  update public.inventory_items
  set stock_type = 'UNIT',
      appears_in_pos = true,
      service_usage_enabled = false
  where stock_type is null
    and item_type = 'DEVICE_UNIT'
    and deleted_at is null;
end $$;

-- 3. Set NOT NULL after backfill
alter table public.inventory_items
alter column stock_type set not null;

-- 4. Add check constraint
alter table public.inventory_items
add constraint chk_ii_stock_type
check (stock_type in ('SPAREPART', 'PRODUCT', 'UNIT'));

-- 5. Add indexes
create index if not exists idx_ii_stock_type
  on public.inventory_items (brand_id, stock_type)
  where deleted_at is null;

create index if not exists idx_ii_appears_in_pos
  on public.inventory_items (brand_id, appears_in_pos)
  where deleted_at is null;

create index if not exists idx_ii_service_usage
  on public.inventory_items (brand_id, service_usage_enabled)
  where deleted_at is null;

-- 6. Add unit_attributes to inventory_serialized_units
alter table public.inventory_serialized_units
add column if not exists unit_attributes jsonb not null default '{}';

-- 7. Add warranty_until to inventory_serialized_units if missing
alter table public.inventory_serialized_units
add column if not exists warranty_until date;

-- 8. Update stock_type for inventory_categories as well
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inventory_categories'
      and column_name = 'stock_type'
  ) then
    alter table public.inventory_categories
    add column stock_type text;

    -- Backfill from item_type
    update public.inventory_categories
    set stock_type = item_type
    where stock_type is null;

    alter table public.inventory_categories
    alter column stock_type set not null;

    alter table public.inventory_categories
    add constraint chk_ic_stock_type
    check (stock_type in ('SPAREPART', 'PRODUCT', 'UNIT'));

    create index if not exists idx_ic_stock_type
      on public.inventory_categories (brand_id, stock_type);
  end if;
end $$;

-- ============================================================
-- 9. Update inventory_listing VIEW to include new columns
-- ============================================================

drop view if exists public.inventory_listing cascade;

create view public.inventory_listing as
select
  ii.id,
  ii.brand_id,
  ii.category_id,
  ic.name as category_name,
  ii.item_type,
  ii.stock_type,
  ii.appears_in_pos,
  ii.service_usage_enabled,
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
