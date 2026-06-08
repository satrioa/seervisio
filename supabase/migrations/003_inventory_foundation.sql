-- ============================================================
-- SEERVIS V2 -- Inventory Foundation
-- Migration 003: Categories, Items, Branch Stock, Movements
-- ============================================================
-- Inventory system with ledger-based stock tracking.
-- Supports sparepart usage, POS sales, purchases, adjustments,
-- damage/loss, and returns. Multi-brand, multi-branch.
-- ============================================================

-- 1. ENUMS
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'inventory_item_type') then
    create type public.inventory_item_type as enum ('PRODUCT','SPAREPART','SUPPLY','OTHER');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'inventory_movement_direction') then
    create type public.inventory_movement_direction as enum ('IN','OUT');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'inventory_movement_type') then
    create type public.inventory_movement_type as enum (
      'OPENING_STOCK','PURCHASE',
      'SERVICE_USAGE','SERVICE_RETURN',
      'POS_SALE','POS_RETURN',
      'ADJUSTMENT_IN','ADJUSTMENT_OUT',
      'DAMAGE',
      'TRANSFER_IN','TRANSFER_OUT'
    );
  end if;
end $$;

-- 2. TABLES
-- ============================================================

-- 2a. inventory_categories
-- Item categories per brand. Used for grouping products and spareparts.
create table if not exists public.inventory_categories (
  id          uuid primary key default gen_random_uuid(),
  brand_id    integer not null references public.brands(id) on delete cascade,
  name        text not null,
  description text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2b. inventory_items
-- Master item catalog per brand. Supports all item types (product, sparepart, supply, other).
-- SKU and barcode are unique per brand when present.
-- Item belongs to brand, not directly to branch. Branch stock is tracked separately.
create table if not exists public.inventory_items (
  id                   uuid primary key default gen_random_uuid(),
  brand_id             integer not null references public.brands(id) on delete cascade,
  category_id          uuid references public.inventory_categories(id) on delete set null,
  item_type            text not null check (item_type in ('PRODUCT','SPAREPART','SUPPLY','OTHER')),
  name                 text not null,
  sku                  text,
  barcode              text,
  description          text,
  unit_name            text not null default 'pcs',
  cost_price           numeric not null default 0 check (cost_price >= 0),
  selling_price        numeric not null default 0 check (selling_price >= 0),
  min_stock            numeric not null default 0 check (min_stock >= 0),
  track_stock          boolean not null default true,
  allow_negative_stock boolean not null default false,
  is_active            boolean not null default true,
  metadata             jsonb not null default '{}',
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 2c. branch_inventory_stocks
-- Cached stock per item per branch.
-- SOURCE OF TRUTH is inventory_movements. current_stock is a cached value
-- updated only via add_inventory_movement() function.
-- available_stock is a generated column: current_stock - reserved_stock.
create table if not exists public.branch_inventory_stocks (
  id                uuid primary key default gen_random_uuid(),
  brand_id          integer not null references public.brands(id) on delete cascade,
  branch_id         uuid not null references public.branches(id) on delete cascade,
  item_id           uuid not null references public.inventory_items(id) on delete cascade,
  current_stock     numeric not null default 0,
  reserved_stock    numeric not null default 0 check (reserved_stock >= 0),
  available_stock   numeric generated always as (current_stock - reserved_stock) stored,
  last_movement_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint uq_bis_branch_item unique (branch_id, item_id)
);

-- 2d. inventory_movements
-- APPEND-ONLY ledger. SOURCE OF TRUTH for all stock changes.
-- No UPDATE, no DELETE. No updated_at column.
create table if not exists public.inventory_movements (
  id              uuid primary key default gen_random_uuid(),
  brand_id        integer not null references public.brands(id) on delete cascade,
  branch_id       uuid not null references public.branches(id) on delete cascade,
  item_id         uuid not null references public.inventory_items(id) on delete cascade,
  direction       text not null check (direction in ('IN','OUT')),
  movement_type   text not null check (movement_type in (
    'OPENING_STOCK','PURCHASE',
    'SERVICE_USAGE','SERVICE_RETURN',
    'POS_SALE','POS_RETURN',
    'ADJUSTMENT_IN','ADJUSTMENT_OUT',
    'DAMAGE',
    'TRANSFER_IN','TRANSFER_OUT'
  )),
  quantity        numeric not null check (quantity > 0),
  before_quantity numeric not null,
  after_quantity  numeric not null,
  unit_cost       numeric,
  reference_type  text,
  reference_id    uuid,
  description     text,
  metadata        jsonb not null default '{}',
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint chk_im_balance_consistency check (
    (direction = 'IN' and after_quantity = before_quantity + quantity) or
    (direction = 'OUT' and after_quantity = before_quantity - quantity)
  ),
  constraint chk_im_direction_movement check (
    (movement_type in ('PURCHASE','SERVICE_RETURN','POS_RETURN','ADJUSTMENT_IN','OPENING_STOCK','TRANSFER_IN') and direction = 'IN') or
    (movement_type in ('SERVICE_USAGE','POS_SALE','ADJUSTMENT_OUT','DAMAGE','TRANSFER_OUT') and direction = 'OUT')
  )
);

-- 3. INDEXES
-- ============================================================

-- inventory_categories
create index if not exists idx_ic_brand_id on public.inventory_categories(brand_id);
create index if not exists idx_ic_active on public.inventory_categories(brand_id, is_active) where deleted_at is null;

-- inventory_items
create index if not exists idx_ii_brand_id on public.inventory_items(brand_id);
create index if not exists idx_ii_category_id on public.inventory_items(category_id);
create index if not exists idx_ii_item_type on public.inventory_items(item_type);
create index if not exists idx_ii_active on public.inventory_items(brand_id, is_active) where deleted_at is null;
create unique index if not exists uq_ii_sku on public.inventory_items(brand_id, sku) where sku is not null and deleted_at is null;
create unique index if not exists uq_ii_barcode on public.inventory_items(brand_id, barcode) where barcode is not null and deleted_at is null;

-- branch_inventory_stocks
create index if not exists idx_bis_brand_id on public.branch_inventory_stocks(brand_id);
create index if not exists idx_bis_branch_id on public.branch_inventory_stocks(branch_id);
create index if not exists idx_bis_item_id on public.branch_inventory_stocks(item_id);
create index if not exists idx_bis_low_stock on public.branch_inventory_stocks(branch_id, item_id)
  where current_stock >= 0;

-- inventory_movements
create index if not exists idx_im_brand_id on public.inventory_movements(brand_id);
create index if not exists idx_im_branch_id on public.inventory_movements(branch_id);
create index if not exists idx_im_item_id on public.inventory_movements(item_id);
create index if not exists idx_im_created_at on public.inventory_movements(item_id, created_at desc);
create index if not exists idx_im_reference on public.inventory_movements(reference_type, reference_id);
create index if not exists idx_im_created_by on public.inventory_movements(created_by);
create index if not exists idx_im_movement_type on public.inventory_movements(movement_type);

-- Idempotency: unique reference prevents duplicate movements
-- NOTE: SERVICE_USAGE may need multiple entries for the same item on the same service.
-- In that case, append a sequence suffix to reference_id (e.g., service_uuid + '_1', '_2').
create unique index if not exists uq_im_reference
  on public.inventory_movements(reference_type, reference_id, item_id, movement_type)
  where reference_type is not null and reference_id is not null;

-- ============================================================
-- 4. DB FUNCTIONS
-- ============================================================

-- 4a. add_inventory_movement()
-- Single controlled function for ALL stock changes.
-- LOCKS branch_inventory_stocks row FOR UPDATE.
-- Creates stock row if IN and no row exists.
-- Validates: brand, branch, item, direction/type consistency, negative stock.
-- Inserts movement, updates cached stock.
-- Returns movement UUID.
create or replace function public.add_inventory_movement(
  p_brand_id integer,
  p_branch_id uuid,
  p_item_id uuid,
  p_direction text,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_description text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null
) returns uuid
language plpgsql
as $func$
declare
  v_stock_id uuid;
  v_before_quantity numeric;
  v_after_quantity numeric;
  v_allow_negative boolean;
  v_item_track_stock boolean;
  v_movement_id uuid;
  v_item_brand_id integer;
  v_branch_brand_id integer;
begin
  -- Validate direction
  if p_direction not in ('IN', 'OUT') then
    raise exception 'Invalid direction: %', p_direction using errcode = '22023';
  end if;

  -- Validate movement_type/direction consistency
  if p_movement_type in ('PURCHASE','SERVICE_RETURN','POS_RETURN','ADJUSTMENT_IN','OPENING_STOCK','TRANSFER_IN') and p_direction != 'IN' then
    raise exception 'Movement type % requires direction IN', p_movement_type using errcode = '22023';
  end if;
  if p_movement_type in ('SERVICE_USAGE','POS_SALE','ADJUSTMENT_OUT','DAMAGE','TRANSFER_OUT') and p_direction != 'OUT' then
    raise exception 'Movement type % requires direction OUT', p_movement_type using errcode = '22023';
  end if;

  -- Validate quantity
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive' using errcode = '22023';
  end if;

  -- Validate item exists and belongs to brand
  select brand_id, allow_negative_stock, track_stock
    into v_item_brand_id, v_allow_negative, v_item_track_stock
  from public.inventory_items
  where id = p_item_id and deleted_at is null;

  if not found then
    raise exception 'Item % not found or deleted', p_item_id using errcode = 'P0002';
  end if;
  if v_item_brand_id != p_brand_id then
    raise exception 'Item brand mismatch: item % belongs to brand %', p_item_id, v_item_brand_id using errcode = 'P0002';
  end if;

  -- Skip stock tracking if item does not track stock
  if not v_item_track_stock then
    insert into public.inventory_movements (
      brand_id, branch_id, item_id,
      direction, movement_type, quantity,
      before_quantity, after_quantity,
      unit_cost,
      reference_type, reference_id,
      description, metadata,
      created_by, created_at
    ) values (
      p_brand_id, p_branch_id, p_item_id,
      p_direction, p_movement_type, p_quantity,
      0, 0,
      p_unit_cost,
      p_reference_type, p_reference_id,
      p_description, p_metadata,
      p_created_by, now()
    )
    returning id into v_movement_id;

    return v_movement_id;
  end if;

  -- Validate branch belongs to brand and is not deleted
  select brand_id into v_branch_brand_id
  from public.branches
  where id = p_branch_id and deleted_at is null;

  if not found then
    raise exception 'Branch % not found or deleted', p_branch_id using errcode = 'P0002';
  end if;
  if v_branch_brand_id != p_brand_id then
    raise exception 'Branch brand mismatch: branch % belongs to brand %',
      p_branch_id, v_branch_brand_id using errcode = 'P0002';
  end if;

  -- Lock stock row, or create if IN and missing
  select id, current_stock
    into v_stock_id, v_before_quantity
  from public.branch_inventory_stocks
  where branch_id = p_branch_id and item_id = p_item_id
  for update;

  if not found then
    if p_direction = 'OUT' then
      raise exception 'Cannot deduct stock: no stock record for item % in branch %',
        p_item_id, p_branch_id using errcode = 'P0002';
    end if;
    -- Auto-create stock row for IN movement
    insert into public.branch_inventory_stocks (brand_id, branch_id, item_id, current_stock)
    values (p_brand_id, p_branch_id, p_item_id, 0)
    returning id into v_stock_id;

    v_before_quantity := 0;
  end if;

  -- Compute after_quantity
  if p_direction = 'IN' then
    v_after_quantity := v_before_quantity + p_quantity;
  else
    v_after_quantity := v_before_quantity - p_quantity;
  end if;

  -- Validate negative stock
  if v_after_quantity < 0 and not v_allow_negative then
    raise exception 'Insufficient stock: item % in branch % has % but requested deduction of %',
      p_item_id, p_branch_id, v_before_quantity, p_quantity
      using errcode = '23514';
  end if;

  -- Insert movement
  insert into public.inventory_movements (
    brand_id, branch_id, item_id,
    direction, movement_type, quantity,
    before_quantity, after_quantity,
    unit_cost,
    reference_type, reference_id,
    description, metadata,
    created_by, created_at
  ) values (
    p_brand_id, p_branch_id, p_item_id,
    p_direction, p_movement_type, p_quantity,
    v_before_quantity, v_after_quantity,
    p_unit_cost,
    p_reference_type, p_reference_id,
    p_description, p_metadata,
    p_created_by, now()
  )
  returning id into v_movement_id;

  -- Update cached stock
  update public.branch_inventory_stocks
  set current_stock = v_after_quantity,
      last_movement_at = now(),
      updated_at = now()
  where id = v_stock_id;

  return v_movement_id;
end;
$func$;

-- 4b. calculate_branch_item_stock()
-- Recalculates stock from inventory_movements for one branch + item.
-- Useful for verification or repair if cache is corrupted.
create or replace function public.calculate_branch_item_stock(
  p_branch_id uuid,
  p_item_id uuid
) returns numeric
language plpgsql
stable
as $func$
declare
  v_stock numeric;
begin
  select coalesce(sum(case when direction = 'IN' then quantity else -quantity end), 0)
    into v_stock
  from public.inventory_movements
  where branch_id = p_branch_id and item_id = p_item_id;

  return v_stock;
end;
$func$;

-- 4c. sync_branch_inventory_stock()
-- Rebuilds cached stock from movements for one branch + item.
-- Returns the synced stock value.
create or replace function public.sync_branch_inventory_stock(
  p_branch_id uuid,
  p_item_id uuid
) returns numeric
language plpgsql
as $func$
declare
  v_stock numeric;
begin
  select coalesce(sum(case when direction = 'IN' then quantity else -quantity end), 0)
    into v_stock
  from public.inventory_movements
  where branch_id = p_branch_id and item_id = p_item_id;

  update public.branch_inventory_stocks
  set current_stock = v_stock,
      updated_at = now()
  where branch_id = p_branch_id and item_id = p_item_id;

  return v_stock;
end;
$func$;

-- 5. TRIGGERS (updated_at)
-- ============================================================
create trigger trg_ic_updated_at before update on public.inventory_categories
  for each row execute function public.update_updated_at_column();
create trigger trg_ii_updated_at before update on public.inventory_items
  for each row execute function public.update_updated_at_column();
create trigger trg_bis_updated_at before update on public.branch_inventory_stocks
  for each row execute function public.update_updated_at_column();
-- inventory_movements has no updated_at trigger (append-only)


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- inventory_categories
alter table public.inventory_categories enable row level security;
drop policy if exists ic_select on public.inventory_categories;
create policy ic_select on public.inventory_categories
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- TODO: Add INSERT/UPDATE/DELETE policies with role checks later

-- inventory_items
alter table public.inventory_items enable row level security;
drop policy if exists ii_select on public.inventory_items;
create policy ii_select on public.inventory_items
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- TODO: Add INSERT/UPDATE/DELETE policies with role checks later

-- branch_inventory_stocks
alter table public.branch_inventory_stocks enable row level security;
drop policy if exists bis_select on public.branch_inventory_stocks;
create policy bis_select on public.branch_inventory_stocks
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- TODO: Add INSERT/UPDATE/DELETE policies with role checks later

-- inventory_movements (append-only: SELECT + INSERT only)
alter table public.inventory_movements enable row level security;
drop policy if exists im_select on public.inventory_movements;
create policy im_select on public.inventory_movements
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
drop policy if exists im_insert on public.inventory_movements;
create policy im_insert on public.inventory_movements
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- NOTE: inventory_movements is append-only. No UPDATE or DELETE policies.
-- This prevents accidental or malicious modification of the movement ledger.


-- ============================================================
-- 7. VALIDATION QUERIES (reference only, not executed)
-- ============================================================

-- 7a. Verify current_stock cache matches movement sum
-- Expected: Returns 0 rows (all stock cache is consistent).
--
-- SELECT bis.id,
--        bis.current_stock AS cached_stock,
--        COALESCE(SUM(CASE WHEN im.direction = 'IN' THEN im.quantity ELSE -im.quantity END), 0) AS ledger_stock,
--        bis.current_stock - COALESCE(SUM(CASE WHEN im.direction = 'IN' THEN im.quantity ELSE -im.quantity END), 0) AS difference
-- FROM public.branch_inventory_stocks bis
-- LEFT JOIN public.inventory_movements im ON im.branch_id = bis.branch_id AND im.item_id = bis.item_id
-- GROUP BY bis.id, bis.current_stock
-- HAVING bis.current_stock != COALESCE(SUM(CASE WHEN im.direction = 'IN' THEN im.quantity ELSE -im.quantity END), 0);

-- 7b. Verify movement balance chain for each item per branch
-- Expected: Returns 0 rows (no gaps in balance chain).
--
-- SELECT im1.id,
--        im1.item_id,
--        im1.branch_id,
--        im1.created_at,
--        im1.before_quantity,
--        im1.after_quantity,
--        prev.after_quantity AS previous_after
-- FROM public.inventory_movements im1
-- LEFT JOIN LATERAL (
--   SELECT im2.after_quantity
--   FROM public.inventory_movements im2
--   WHERE im2.item_id = im1.item_id
--     AND im2.branch_id = im1.branch_id
--     AND (im2.created_at, im2.id) < (im1.created_at, im1.id)
--   ORDER BY im2.created_at DESC, im2.id DESC
--   LIMIT 1
-- ) prev ON true
-- WHERE im1.before_quantity != COALESCE(prev.after_quantity, 0);

-- 7c. Find items with active branches but no stock record
-- Expected: Items without stock records (may need opening stock).
--
-- SELECT ii.id, ii.name, ii.item_type, b.id AS branch_id, b.name AS branch_name
-- FROM public.inventory_items ii
-- CROSS JOIN public.branches b
-- WHERE ii.brand_id = b.brand_id
--   AND b.deleted_at IS NULL
--   AND ii.deleted_at IS NULL
--   AND ii.is_active = true
--   AND ii.track_stock = true
--   AND NOT EXISTS (
--     SELECT 1 FROM public.branch_inventory_stocks bis
--     WHERE bis.item_id = ii.id AND bis.branch_id = b.id
--   )
-- ORDER BY ii.name, b.name;

-- 7d. Find duplicate reference movements (should never return rows)
--
-- SELECT reference_type, reference_id, item_id, movement_type, COUNT(*) AS dup_count
-- FROM public.inventory_movements
-- WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL
-- GROUP BY reference_type, reference_id, item_id, movement_type
-- HAVING COUNT(*) > 1;

-- 7e. Find negative stock where not allowed
--
-- SELECT bis.id, bis.branch_id, bis.item_id, bis.current_stock, ii.allow_negative_stock
-- FROM public.branch_inventory_stocks bis
-- JOIN public.inventory_items ii ON ii.id = bis.item_id
-- WHERE bis.current_stock < 0 AND ii.allow_negative_stock = false;

-- ============================================================
-- End of Migration 003
-- ============================================================
