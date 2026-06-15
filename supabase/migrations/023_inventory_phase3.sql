-- ============================================================
-- SEERVIS V2 -- Inventory Phase 3
-- Migration 023: Serialized Units, Service Sparepart Snapshots
-- ============================================================
-- Phase 3 adds:
--   1. inventory_serialized_units table (device second management)
--   2. recalculateSerializedItemStock() helper + trigger
--   3. Snapshot columns on service_sparepart_usages
--   4. Updated add_service_sparepart_usage() with serialized unit support
--   5. Updated add_inventory_movement() with new column support
-- ============================================================

-- ============================================================
-- 1. INVENTORY SERIALIZED UNITS
-- ============================================================
create table if not exists public.inventory_serialized_units (
  id                          uuid primary key default gen_random_uuid(),
  brand_id                    integer not null references public.brands(id) on delete cascade,
  branch_id                   uuid not null references public.branches(id) on delete cascade,
  inventory_item_id           uuid not null references public.inventory_items(id) on delete cascade,
  serial_number               text,
  imei                        text,
  barcode                     text,
  battery_health              integer check (battery_health is null or (battery_health >= 0 and battery_health <= 100)),
  condition_grade             text check (condition_grade is null or condition_grade in ('A', 'B', 'C', 'D')),
  physical_condition_notes    text,
  functional_condition_notes  text,
  accessories_included        text,
  purchase_cost               numeric(14,2),
  selling_price               numeric(14,2),
  status                      text not null default 'READY_STOCK'
                              check (status in ('READY_STOCK','RESERVED','SOLD','IN_SERVICE','DEFECTIVE','RETURNED','ARCHIVED')),
  source_type                 text,
  source_reference_id         uuid,
  created_by                  uuid references public.profiles(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Indexes
create index if not exists idx_isu_brand_branch on public.inventory_serialized_units(brand_id, branch_id);
create index if not exists idx_isu_brand_item on public.inventory_serialized_units(brand_id, inventory_item_id);
create index if not exists idx_isu_brand_imei on public.inventory_serialized_units(brand_id, imei);
create index if not exists idx_isu_brand_serial on public.inventory_serialized_units(brand_id, serial_number);
create index if not exists idx_isu_brand_barcode on public.inventory_serialized_units(brand_id, barcode);
create index if not exists idx_isu_status on public.inventory_serialized_units(status);

-- Uniqueness (per brand, only when filled)
create unique index if not exists uq_isu_imei_per_brand on public.inventory_serialized_units(brand_id, imei)
  where imei is not null;

create unique index if not exists uq_isu_serial_per_brand on public.inventory_serialized_units(brand_id, serial_number)
  where serial_number is not null;

create unique index if not exists uq_isu_barcode_per_brand on public.inventory_serialized_units(brand_id, barcode)
  where barcode is not null;

-- Trigger for updated_at
create trigger trg_inventory_serialized_units_updated_at before update on public.inventory_serialized_units
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- 2. RECALCULATE SERIALIZED ITEM STOCK
-- ============================================================
-- For SERIALIZED tracking_type items, current_stock = count of READY_STOCK units.
-- This function syncs the cached stock to the actual count.
create or replace function public.recalculate_serialized_item_stock(
  p_item_id uuid
) returns numeric
language plpgsql
as $func$
declare
  v_new_stock numeric;
  v_item_brand_id integer;
  v_tracking_type text;
begin
  -- Get item details
  select brand_id, tracking_type into v_item_brand_id, v_tracking_type
  from public.inventory_items
  where id = p_item_id and deleted_at is null;

  if not found then
    raise exception 'Item % not found', p_item_id using errcode = 'P0002';
  end if;

  -- Only recalculate for SERIALIZED tracking
  if v_tracking_type != 'SERIALIZED' then
    return null;
  end if;

  -- Count READY_STOCK units across all branches
  select count(*) into v_new_stock
  from public.inventory_serialized_units
  where inventory_item_id = p_item_id
    and status = 'READY_STOCK';

  -- Update inventory_items cached current_stock
  update public.inventory_items
  set current_stock = v_new_stock,
      updated_at = now()
  where id = p_item_id;

  -- Also update branch_inventory_stocks for each branch that has these units
  update public.branch_inventory_stocks bis
  set current_stock = (
    select count(*)
    from public.inventory_serialized_units isu
    where isu.inventory_item_id = p_item_id
      and isu.branch_id = bis.branch_id
      and isu.status = 'READY_STOCK'
  ),
  updated_at = now()
  where bis.item_id = p_item_id;

  return v_new_stock;
end;
$func$;

-- ============================================================
-- 3. TRIGGER: Auto-recalculate on serialized unit status change
-- ============================================================
create or replace function public.trg_recalc_serialized_stock()
returns trigger
language plpgsql
as $func$
begin
  perform public.recalculate_serialized_item_stock(
    case when TG_OP = 'DELETE' then OLD.inventory_item_id else NEW.inventory_item_id end
  );
  return null;
end;
$func$;

create constraint trigger trg_serialized_unit_stock_aiud
after insert or update of status or delete
on public.inventory_serialized_units
for each row
execute function public.trg_recalc_serialized_stock();

-- ============================================================
-- 4. ADD SNAPSHOT COLUMNS TO service_sparepart_usages
-- ============================================================
do $$ begin
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'item_name_snapshot') then
    alter table public.service_sparepart_usages add column item_name_snapshot text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'variant_snapshot') then
    alter table public.service_sparepart_usages add column variant_snapshot jsonb;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'sku_snapshot') then
    alter table public.service_sparepart_usages add column sku_snapshot text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'barcode_snapshot') then
    alter table public.service_sparepart_usages add column barcode_snapshot text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'serialized_unit_id') then
    alter table public.service_sparepart_usages add column serialized_unit_id uuid
      references public.inventory_serialized_units(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'imei_snapshot') then
    alter table public.service_sparepart_usages add column imei_snapshot text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'serial_number_snapshot') then
    alter table public.service_sparepart_usages add column serial_number_snapshot text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'battery_health_snapshot') then
    alter table public.service_sparepart_usages add column battery_health_snapshot integer;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'condition_grade_snapshot') then
    alter table public.service_sparepart_usages add column condition_grade_snapshot text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'condition_notes_snapshot') then
    alter table public.service_sparepart_usages add column condition_notes_snapshot text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'unit_snapshot') then
    alter table public.service_sparepart_usages add column unit_snapshot text;
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'unit_cost_snapshot') then
    alter table public.service_sparepart_usages add column unit_cost_snapshot numeric(14,2);
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'selling_price_snapshot') then
    alter table public.service_sparepart_usages add column selling_price_snapshot numeric(14,2);
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'total_cost_snapshot') then
    alter table public.service_sparepart_usages add column total_cost_snapshot numeric(14,2);
  end if;
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_sparepart_usages'
    and column_name = 'total_price_snapshot') then
    alter table public.service_sparepart_usages add column total_price_snapshot numeric(14,2);
  end if;
end $$;

-- ============================================================
-- 5. UPDATE add_inventory_movement TO SUPPORT NEW COLUMNS
-- ============================================================
-- Adds optional params: p_unit_snapshot, p_notes, p_serialized_unit_id, p_reference_label
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
  p_idempotency_key text default null,
  p_description text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null,
  -- NEW params
  p_unit_snapshot text default null,
  p_notes text default null,
  p_serialized_unit_id uuid default null,
  p_reference_label text default null
) returns uuid
language plpgsql
as $func$
declare
  v_stock_id uuid;
  v_before_quantity numeric;
  v_after_quantity numeric;
  v_allow_negative boolean;
  v_item_track_stock boolean;
  v_item_brand_id integer;
  v_branch_brand_id integer;
  v_movement_id uuid;
  v_existing_id uuid;
  v_existing_item_id uuid;
  v_existing_branch_id uuid;
  v_existing_movement_type text;
  v_existing_direction text;
  v_existing_quantity numeric;
  v_item_name text;
  v_item_unit text;
  v_item_selling_price numeric;
  v_serialized_unit_id_to_use uuid;
begin
  -- ============================================================
  -- 1. VALIDATE INPUT
  -- ============================================================

  if p_direction not in ('IN', 'OUT') then
    raise exception 'Invalid direction: %', p_direction using errcode = '22023';
  end if;

  if p_movement_type in ('PURCHASE','PURCHASE_IN','SERVICE_RETURN','POS_RETURN','ADJUSTMENT_IN','OPENING_STOCK','TRANSFER_IN','SERIALIZED_UNIT_IN') and p_direction != 'IN' then
    raise exception 'Movement type % requires direction IN', p_movement_type using errcode = '22023';
  end if;
  if p_movement_type in ('SERVICE_USAGE','POS_SALE','ADJUSTMENT_OUT','DAMAGE','DAMAGE_OUT','TRANSFER_OUT','SERIALIZED_UNIT_OUT') and p_direction != 'OUT' then
    raise exception 'Movement type % requires direction OUT', p_movement_type using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive' using errcode = '22023';
  end if;

  -- ============================================================
  -- 2. IDEMPOTENCY CHECK
  -- ============================================================

  if p_idempotency_key is not null then
    select id, item_id, branch_id, movement_type, direction, quantity
      into v_existing_id, v_existing_item_id, v_existing_branch_id,
           v_existing_movement_type, v_existing_direction, v_existing_quantity
    from public.inventory_movements
    where brand_id = p_brand_id
      and idempotency_key = p_idempotency_key;

    if found then
      if v_existing_item_id = p_item_id
         and v_existing_branch_id = p_branch_id
         and v_existing_movement_type = p_movement_type
         and v_existing_direction = p_direction
         and v_existing_quantity = p_quantity
      then
        return v_existing_id;
      else
        raise exception 'Idempotency key conflict: key "%" already used for a different operation',
          p_idempotency_key using errcode = 'P0004';
      end if;
    end if;
  end if;

  -- ============================================================
  -- 3. VALIDATE ITEM & GET SNAPSHOT VALUES
  -- ============================================================

  select brand_id, allow_negative_stock, track_stock, name, unit_name, selling_price
    into v_item_brand_id, v_allow_negative, v_item_track_stock, v_item_name, v_item_unit, v_item_selling_price
  from public.inventory_items
  where id = p_item_id and deleted_at is null;

  if not found then
    raise exception 'Item % not found or deleted', p_item_id using errcode = 'P0002';
  end if;

  if v_item_brand_id != p_brand_id then
    raise exception 'Item brand mismatch: item % belongs to brand %', p_item_id, v_item_brand_id using errcode = 'P0002';
  end if;

  -- Use provided serialized_unit_id or resolve from p_metadata
  v_serialized_unit_id_to_use := p_serialized_unit_id;

  -- ============================================================
  -- 4. HANDLE NON-TRACKING ITEMS
  -- ============================================================

  if not v_item_track_stock then
    insert into public.inventory_movements (
      brand_id, branch_id, item_id,
      direction, movement_type, quantity,
      before_quantity, after_quantity,
      unit_cost,
      unit_snapshot,
      selling_price_snapshot,
      total_cost_snapshot,
      total_price_snapshot,
      reference_type, reference_id,
      reference_label,
      idempotency_key,
      description, notes, metadata,
      serialized_unit_id,
      created_by, created_at
    ) values (
      p_brand_id, p_branch_id, p_item_id,
      p_direction, p_movement_type, p_quantity,
      0, 0,
      p_unit_cost,
      coalesce(p_unit_snapshot, v_item_unit),
      v_item_selling_price,
      coalesce(p_unit_cost * p_quantity, 0),
      v_item_selling_price * p_quantity,
      p_reference_type, p_reference_id,
      p_reference_label,
      p_idempotency_key,
      p_description, p_notes, p_metadata,
      v_serialized_unit_id_to_use,
      p_created_by, now()
    )
    returning id into v_movement_id;

    return v_movement_id;
  end if;

  -- ============================================================
  -- 5. VALIDATE BRANCH
  -- ============================================================

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

  -- ============================================================
  -- 6. LOCK AND UPDATE STOCK
  -- ============================================================

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
    insert into public.branch_inventory_stocks (brand_id, branch_id, item_id, current_stock)
    values (p_brand_id, p_branch_id, p_item_id, 0)
    returning id into v_stock_id;
    v_before_quantity := 0;
  end if;

  if p_direction = 'IN' then
    v_after_quantity := v_before_quantity + p_quantity;
  else
    v_after_quantity := v_before_quantity - p_quantity;
  end if;

  if v_after_quantity < 0 and not v_allow_negative then
    raise exception 'Insufficient stock: item % in branch % has % but requested deduction of %',
      p_item_id, p_branch_id, v_before_quantity, p_quantity
      using errcode = '23514';
  end if;

  -- ============================================================
  -- 7. INSERT MOVEMENT WITH ALL COLUMNS
  -- ============================================================

  insert into public.inventory_movements (
    brand_id, branch_id, item_id,
    direction, movement_type, quantity,
    before_quantity, after_quantity,
    unit_cost,
    unit_snapshot,
    selling_price_snapshot,
    total_cost_snapshot,
    total_price_snapshot,
    reference_type, reference_id,
    reference_label,
    idempotency_key,
    description, notes, metadata,
    serialized_unit_id,
    created_by, created_at
  ) values (
    p_brand_id, p_branch_id, p_item_id,
    p_direction, p_movement_type, p_quantity,
    v_before_quantity, v_after_quantity,
    p_unit_cost,
    coalesce(p_unit_snapshot, v_item_unit),
    v_item_selling_price,
    coalesce(p_unit_cost * p_quantity, 0),
    v_item_selling_price * p_quantity,
    p_reference_type, p_reference_id,
    p_reference_label,
    p_idempotency_key,
    p_description, p_notes, p_metadata,
    v_serialized_unit_id_to_use,
    p_created_by, now()
  )
  returning id into v_movement_id;

  -- ============================================================
  -- 8. UPDATE CACHED STOCK
  -- ============================================================

  update public.branch_inventory_stocks
  set current_stock = v_after_quantity,
      last_movement_at = now(),
      updated_at = now()
  where id = v_stock_id;

  return v_movement_id;
end;
$func$;

-- ============================================================
-- 6. UPDATE add_service_sparepart_usage WITH SERIALIZED UNIT SUPPORT
-- ============================================================
create or replace function public.add_service_sparepart_usage(
  p_service_id uuid,
  p_inventory_item_id uuid,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_selling_price numeric default null,
  p_notes text default null,
  p_created_by uuid default null,
  p_idempotency_key text default null,
  -- NEW: serialized unit support
  p_serialized_unit_id uuid default null
) returns uuid
language plpgsql
as $func$
declare
  v_service public.services%rowtype;
  v_item public.inventory_items%rowtype;
  v_usage_id uuid;
  v_movement_id uuid;
  v_final_key text;
  v_serialized_unit public.inventory_serialized_units%rowtype;
  v_unit_cost_snapshot numeric;
  v_selling_price_snapshot numeric;
  v_total_cost_snapshot numeric;
  v_total_price_snapshot numeric;
  v_inei_snapshot text;
  v_serial_number_snapshot text;
  v_battery_health_snapshot integer;
  v_condition_grade_snapshot text;
  v_condition_notes_snapshot text;
begin
  -- Lock and validate service
  select * into v_service
  from public.services
  where id = p_service_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Service % not found or deleted', p_service_id using errcode = 'P0002';
  end if;

  if v_service.current_status not in ('DIAGNOSIS', 'REPAIRING', 'QC') then
    raise exception 'Cannot add sparepart usage: service % is in % status. Allowed: DIAGNOSIS, REPAIRING, QC.',
      p_service_id, v_service.current_status using errcode = 'P0004';
  end if;

  -- Validate item
  select * into v_item
  from public.inventory_items
  where id = p_inventory_item_id and deleted_at is null;

  if not found then
    raise exception 'Inventory item % not found or deleted', p_inventory_item_id using errcode = 'P0002';
  end if;

  if v_item.brand_id != v_service.brand_id then
    raise exception 'Inventory item brand % does not match service brand %',
      v_item.brand_id, v_service.brand_id using errcode = 'P0002';
  end if;

  -- Handle serialized unit
  if p_serialized_unit_id is not null then
    select * into v_serialized_unit
    from public.inventory_serialized_units
    where id = p_serialized_unit_id
    for update;

    if not found then
      raise exception 'Serialized unit % not found', p_serialized_unit_id using errcode = 'P0002';
    end if;

    if v_serialized_unit.status != 'READY_STOCK' then
      raise exception 'Serialized unit % is not READY_STOCK (current: %). Cannot use in service.',
        p_serialized_unit_id, v_serialized_unit.status using errcode = 'P0004';
    end if;

    if v_serialized_unit.inventory_item_id != p_inventory_item_id then
      raise exception 'Serialized unit % does not belong to item %',
        p_serialized_unit_id, p_inventory_item_id using errcode = 'P0002';
    end if;

    -- Update serialized unit status to IN_SERVICE
    update public.inventory_serialized_units
    set status = 'IN_SERVICE',
        updated_at = now()
    where id = p_serialized_unit_id;

    -- Capture snapshots from serialized unit
    v_inei_snapshot := v_serialized_unit.imei;
    v_serial_number_snapshot := v_serialized_unit.serial_number;
    v_battery_health_snapshot := v_serialized_unit.battery_health;
    v_condition_grade_snapshot := v_serialized_unit.condition_grade;
    v_condition_notes_snapshot := coalesce(
      v_serialized_unit.physical_condition_notes,
      v_serialized_unit.functional_condition_notes
    );

    -- For serialized unit, quantity is always 1
    p_quantity := 1;
  end if;

  -- Determine snapshot cost/price values
  v_unit_cost_snapshot := coalesce(p_unit_cost, v_item.cost_price, 0);
  v_selling_price_snapshot := coalesce(p_selling_price, v_item.selling_price, 0);
  v_total_cost_snapshot := v_unit_cost_snapshot * p_quantity;
  v_total_price_snapshot := v_selling_price_snapshot * p_quantity;

  -- Insert usage record with snapshots
  insert into public.service_sparepart_usages (
    brand_id, branch_id, service_id,
    inventory_item_id, quantity,
    unit_cost, selling_price,
    notes, metadata,
    -- snapshot columns
    item_name_snapshot,
    variant_snapshot,
    sku_snapshot,
    barcode_snapshot,
    serialized_unit_id,
    imei_snapshot,
    serial_number_snapshot,
    battery_health_snapshot,
    condition_grade_snapshot,
    condition_notes_snapshot,
    unit_snapshot,
    unit_cost_snapshot,
    selling_price_snapshot,
    total_cost_snapshot,
    total_price_snapshot,
    created_by, created_at
  ) values (
    v_service.brand_id, v_service.branch_id, p_service_id,
    p_inventory_item_id, p_quantity,
    v_unit_cost_snapshot, v_selling_price_snapshot,
    p_notes, '{}',
    v_item.name,
    v_item.variant_attributes,
    v_item.sku,
    v_item.barcode,
    p_serialized_unit_id,
    v_inei_snapshot,
    v_serial_number_snapshot,
    v_battery_health_snapshot,
    v_condition_grade_snapshot,
    v_condition_notes_snapshot,
    v_item.unit_name,
    v_unit_cost_snapshot,
    v_selling_price_snapshot,
    v_total_cost_snapshot,
    v_total_price_snapshot,
    p_created_by, now()
  )
  returning id into v_usage_id;

  -- Generate idempotency key
  v_final_key := coalesce(
    p_idempotency_key,
    'service:' || p_service_id || ':item:' || p_inventory_item_id || ':usage:' || v_usage_id
  );

  -- Create inventory movement
  v_movement_id := public.add_inventory_movement(
    p_brand_id := v_service.brand_id,
    p_branch_id := v_service.branch_id,
    p_item_id := p_inventory_item_id,
    p_direction := 'OUT',
    p_movement_type := 'SERVICE_USAGE',
    p_quantity := p_quantity,
    p_unit_cost := v_unit_cost_snapshot,
    p_reference_type := 'service',
    p_reference_id := p_service_id,
    p_idempotency_key := v_final_key,
    p_description := p_notes,
    p_metadata := jsonb_build_object('usage_id', v_usage_id, 'service_id', p_service_id),
    p_created_by := p_created_by,
    p_unit_snapshot := v_item.unit_name,
    p_notes := p_notes,
    p_serialized_unit_id := p_serialized_unit_id,
    p_reference_label := v_service.service_number
  );

  -- Link movement to usage
  update public.service_sparepart_usages
  set inventory_movement_id = v_movement_id,
      metadata = metadata || jsonb_build_object('idempotency_key', v_final_key)
  where id = v_usage_id;

  -- Recalculate stock for serialized items (status changed)
  if p_serialized_unit_id is not null then
    perform public.recalculate_serialized_item_stock(p_inventory_item_id);
  end if;

  return v_usage_id;
end;
$func$;

-- ============================================================
-- 7. UPDATE return_service_sparepart_usage FOR SERIALIZED UNITS
-- ============================================================
create or replace function public.return_service_sparepart_usage(
  p_usage_id uuid,
  p_reason text default null,
  p_returned_by uuid default null
) returns uuid
language plpgsql
as $func$
declare
  v_usage public.service_sparepart_usages%rowtype;
  v_service public.services%rowtype;
  v_movement_id uuid;
  v_idempotency_key text;
begin
  -- Lock usage row
  select * into v_usage
  from public.service_sparepart_usages
  where id = p_usage_id
  for update;

  if not found then
    raise exception 'Usage % not found', p_usage_id using errcode = 'P0002';
  end if;

  if v_usage.is_returned then
    raise exception 'Usage % has already been returned (movement: %)',
      p_usage_id, v_usage.returned_inventory_movement_id using errcode = 'P0004';
  end if;

  if v_usage.inventory_movement_id is null then
    raise exception 'Usage % has no inventory movement — nothing to return',
      p_usage_id using errcode = 'P0002';
  end if;

  -- Get service
  select * into v_service
  from public.services
  where id = v_usage.service_id;

  -- Generate return idempotency key
  v_idempotency_key := 'service:' || v_usage.service_id || ':item:' || v_usage.inventory_item_id
                       || ':return:' || p_usage_id;

  -- Handle serialized unit return
  if v_usage.serialized_unit_id is not null then
    -- Set serialized unit back to READY_STOCK
    update public.inventory_serialized_units
    set status = 'READY_STOCK',
        updated_at = now()
    where id = v_usage.serialized_unit_id
      and status = 'IN_SERVICE';

    -- Recalculate parent item stock
    perform public.recalculate_serialized_item_stock(v_usage.inventory_item_id);
  end if;

  -- Return stock to inventory (for quantity items) or create reference movement for serialized units
  v_movement_id := public.add_inventory_movement(
    p_brand_id := v_usage.brand_id,
    p_branch_id := v_usage.branch_id,
    p_item_id := v_usage.inventory_item_id,
    p_direction := 'IN',
    p_movement_type := 'SERVICE_RETURN',
    p_quantity := v_usage.quantity,
    p_unit_cost := v_usage.unit_cost_snapshot,
    p_reference_type := 'service',
    p_reference_id := v_usage.service_id,
    p_idempotency_key := v_idempotency_key,
    p_description := coalesce(p_reason, 'Return sparepart usage ' || p_usage_id),
    p_metadata := jsonb_build_object('usage_id', p_usage_id, 'service_id', v_usage.service_id),
    p_created_by := p_returned_by,
    p_unit_snapshot := v_usage.unit_snapshot,
    p_notes := coalesce(p_reason, 'Return sparepart usage'),
    p_serialized_unit_id := v_usage.serialized_unit_id,
    p_reference_label := v_service.service_number
  );

  -- Mark usage as returned
  update public.service_sparepart_usages
  set is_returned = true,
      returned_inventory_movement_id = v_movement_id,
      metadata = metadata || jsonb_build_object(
        'return_idempotency_key', v_idempotency_key,
        'return_reason', p_reason,
        'returned_at', now()
      )
  where id = p_usage_id;

  return p_usage_id;
end;
$func$;

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

-- inventory_serialized_units: brand-scoped
alter table public.inventory_serialized_units enable row level security;

drop policy if exists isu_select on public.inventory_serialized_units;
create policy isu_select on public.inventory_serialized_units
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

drop policy if exists isu_insert on public.inventory_serialized_units;
create policy isu_insert on public.inventory_serialized_units
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

drop policy if exists isu_update on public.inventory_serialized_units;
create policy isu_update on public.inventory_serialized_units
  for update using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- ============================================================
-- End of Migration 023
-- ============================================================
