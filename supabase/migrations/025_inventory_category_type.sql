-- ============================================================
-- Migration 025: Add item_type to inventory_categories
-- Separates categories by item type for UX filtering
-- ============================================================

-- 1. Add item_type column
alter table public.inventory_categories
add column if not exists item_type text;

-- 2. Backfill existing categories based on heuristics
do $$
declare
  cat record;
begin
  for cat in select * from public.inventory_categories where item_type is null loop
    case
      when cat.name ilike any(array['%lcd%', '%battery%', '%speaker%', '%camera%', '%connector%', '%flexible%', '%ribbon%', '%konektor%', '%sensor%', '%button%', '%sparepart%', '%spare part%', '%spare part%', '%onderdil%'])
        then update public.inventory_categories set item_type = 'SPAREPART' where id = cat.id;
      when cat.name ilike any(array['%charger%', '%case%', '%casing%', '%tempered glass%', '%kabel%', '%cable%', '%adapter%', '%screen protector%', '%headset%', '%earphone%', '%accessory%', '%aksesoris%'])
        then update public.inventory_categories set item_type = 'PRODUCT' where id = cat.id;
      when cat.name ilike any(array['%unit%', '%handphone%', '%hp%', '%phone%', '%second%', '%device%', '%serial%', '%imei%'])
        then update public.inventory_categories set item_type = 'DEVICE_UNIT' where id = cat.id;
      else
        update public.inventory_categories set item_type = 'SPAREPART' where id = cat.id;
    end case;
  end loop;
end $$;

-- 3. Set NOT NULL after backfill
alter table public.inventory_categories
alter column item_type set not null;

-- 4. Add check constraint
alter table public.inventory_categories
add constraint chk_ic_item_type
check (item_type in ('SPAREPART', 'PRODUCT', 'DEVICE_UNIT'));

-- 5. Add indexes
create index if not exists idx_ic_brand_item_type
  on public.inventory_categories (brand_id, item_type);

create index if not exists idx_ic_brand_active
  on public.inventory_categories (brand_id, is_active)
  where deleted_at is null;

-- 6. Add partial unique constraint per brand + item_type + lower(name)
-- Do not apply if duplicates exist; report first
-- Instead, use a unique index that ignores deleted records
create unique index if not exists uq_ic_brand_type_name
  on public.inventory_categories (brand_id, item_type, lower(name))
  where deleted_at is null;

-- 7. Ensure is_active has a default
alter table public.inventory_categories
alter column is_active set default true;

-- 8. Add RLS policy for management
drop policy if exists ic_insert on public.inventory_categories;
create policy ic_insert on public.inventory_categories
  for insert
  with check (
    exists (
      select 1 from public.brand_memberships bm
      where bm.brand_id = inventory_categories.brand_id
        and bm.profile_id = auth.uid()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.deleted_at is null
    )
  );

drop policy if exists ic_update on public.inventory_categories;
create policy ic_update on public.inventory_categories
  for update
  using (true)
  with check (
    exists (
      select 1 from public.brand_memberships bm
      where bm.brand_id = inventory_categories.brand_id
        and bm.profile_id = auth.uid()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.deleted_at is null
    )
  );

drop policy if exists ic_delete on public.inventory_categories;
create policy ic_delete on public.inventory_categories
  for delete
  using (
    exists (
      select 1 from public.brand_memberships bm
      where bm.brand_id = inventory_categories.brand_id
        and bm.profile_id = auth.uid()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.deleted_at is null
    )
  );

-- 9. Update comment
comment on table public.inventory_categories is 'Inventory categories separated by item type (SPAREPART/PRODUCT/DEVICE_UNIT) for UX filtering';
