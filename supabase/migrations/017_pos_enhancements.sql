-- 017_pos_enhancements.sql
-- Enhancements for POS / Penjualan Produk:
--   1. Add DEVICE_UNIT to item_type
--   2. Create inventory_item_units (serialized device tracking)
--   3. Create trade_ins (tukar tambah) table
--   4. RLS policies for new tables

-- ============================================================
-- PART 1: Add DEVICE_UNIT to inventory_items.item_type check
-- ============================================================

-- Drop and recreate the CHECK constraint on inventory_items.item_type
alter table public.inventory_items
  drop constraint if exists inventory_items_item_type_check;

alter table public.inventory_items
  add constraint inventory_items_item_type_check
  check (item_type in ('PRODUCT','SPAREPART','SUPPLY','DEVICE_UNIT','OTHER'));

-- ============================================================
-- PART 2: inventory_item_units (Serialized Device Tracking)
-- ============================================================

create table if not exists public.inventory_item_units (
  id                uuid primary key default gen_random_uuid(),
  brand_id          integer not null references public.brands(id) on delete cascade,
  branch_id         uuid not null references public.branches(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  imei              text,
  serial_number     text,
  device_brand      text,
  device_model      text,
  storage           text,
  color             text,
  condition_grade   text,
  battery_health    text,
  purchase_price    numeric(14,2),
  selling_price     numeric(14,2),
  warranty_until    date,
  source            text not null default 'PURCHASE'
                    check (source in ('PURCHASE','TRADE_IN','MANUAL','RETURN')),
  status            text not null default 'AVAILABLE'
                    check (status in ('AVAILABLE','SOLD','RESERVED','DEFECTIVE','RETURNED')),
  note              text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Index for fast lookups
create index if not exists idx_item_units_item_status
  on public.inventory_item_units (inventory_item_id, status);

create index if not exists idx_item_units_imei
  on public.inventory_item_units (imei)
  where imei is not null;

create index if not exists idx_item_units_serial
  on public.inventory_item_units (serial_number)
  where serial_number is not null;

-- Trigger to auto-update updated_at
create or replace function public.update_item_unit_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_item_unit_updated_at on public.inventory_item_units;
create trigger trg_item_unit_updated_at
  before update on public.inventory_item_units
  for each row execute function public.update_item_unit_timestamp();

-- ============================================================
-- PART 3: trade_ins (Tukar Tambah)
-- ============================================================

create table if not exists public.trade_ins (
  id                    uuid primary key default gen_random_uuid(),
  brand_id              integer not null references public.brands(id) on delete cascade,
  branch_id             uuid not null references public.branches(id) on delete cascade,
  pos_sale_id           uuid not null references public.pos_sales(id) on delete cascade,
  customer_id           uuid references public.customers(id) on delete set null,

  -- Received device info
  device_brand          text not null,
  device_model          text not null,
  storage               text,
  color                 text,
  imei                  text,
  serial_number         text,
  condition_grade       text,
  battery_health        text,

  -- Financial
  appraisal_value       numeric(14,2) not null check (appraisal_value > 0),

  -- Resulting inventory_item_unit (the unit created from this trade-in)
  inventory_item_id     uuid references public.inventory_items(id) on delete set null,
  inventory_item_unit_id uuid references public.inventory_item_units(id) on delete set null,

  -- Status
  status                text not null default 'APPRAISED'
                        check (status in ('APPRAISED','ACCEPTED','IN_STOCK','SOLD','REJECTED','RETURNED')),

  note                  text,
  appraised_by          uuid references public.profiles(id) on delete set null,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_trade_ins_sale
  on public.trade_ins (pos_sale_id);

create index if not exists idx_trade_ins_customer
  on public.trade_ins (customer_id)
  where customer_id is not null;

-- Trigger for trade_ins updated_at
drop trigger if exists trg_trade_in_updated_at on public.trade_ins;
create trigger trg_trade_in_updated_at
  before update on public.trade_ins
  for each row execute function public.update_item_unit_timestamp();

-- ============================================================
-- PART 4: Enable RLS
-- ============================================================

alter table public.inventory_item_units enable row level security;
alter table public.trade_ins enable row level security;

-- RLS: inventory_item_units - same brand-scoped pattern
drop policy if exists "brand_access_inventory_item_units_select" on public.inventory_item_units;
create policy "brand_access_inventory_item_units_select"
  on public.inventory_item_units for select
  using ('PLATFORM_OWNER' = any(public.get_user_roles()) or brand_id = any(public.get_user_brand_ids()));

drop policy if exists "brand_access_inventory_item_units_insert" on public.inventory_item_units;
create policy "brand_access_inventory_item_units_insert"
  on public.inventory_item_units for insert
  with check ('PLATFORM_OWNER' = any(public.get_user_roles()) or brand_id = any(public.get_user_brand_ids()));

drop policy if exists "brand_access_inventory_item_units_update" on public.inventory_item_units;
create policy "brand_access_inventory_item_units_update"
  on public.inventory_item_units for update
  using ('PLATFORM_OWNER' = any(public.get_user_roles()) or brand_id = any(public.get_user_brand_ids()))
  with check ('PLATFORM_OWNER' = any(public.get_user_roles()) or brand_id = any(public.get_user_brand_ids()));

-- RLS: trade_ins
drop policy if exists "brand_access_trade_ins_select" on public.trade_ins;
create policy "brand_access_trade_ins_select"
  on public.trade_ins for select
  using ('PLATFORM_OWNER' = any(public.get_user_roles()) or brand_id = any(public.get_user_brand_ids()));

drop policy if exists "brand_access_trade_ins_insert" on public.trade_ins;
create policy "brand_access_trade_ins_insert"
  on public.trade_ins for insert
  with check ('PLATFORM_OWNER' = any(public.get_user_roles()) or brand_id = any(public.get_user_brand_ids()));

drop policy if exists "brand_access_trade_ins_update" on public.trade_ins;
create policy "brand_access_trade_ins_update"
  on public.trade_ins for update
  using ('PLATFORM_OWNER' = any(public.get_user_roles()) or brand_id = any(public.get_user_brand_ids()))
  with check ('PLATFORM_OWNER' = any(public.get_user_roles()) or brand_id = any(public.get_user_brand_ids()));

-- ============================================================
-- PART 5: Helper function to mark DEVICE_UNIT as SOLD
-- ============================================================

create or replace function public.mark_device_unit_sold(
  p_unit_id uuid,
  p_updated_by uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit inventory_item_units%rowtype;
begin
  select * into v_unit
  from public.inventory_item_units
  where id = p_unit_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Unit tidak ditemukan.');
  end if;

  if not ('PLATFORM_OWNER' = any(public.get_user_roles()) or v_unit.brand_id = any(public.get_user_brand_ids())) then
    return jsonb_build_object('success', false, 'error', 'Akses brand tidak diizinkan.');
  end if;

  if v_unit.status != 'AVAILABLE' then
    return jsonb_build_object('success', false, 'error', 'Unit sudah tidak tersedia.');
  end if;

  update public.inventory_item_units
  set status = 'SOLD',
      updated_at = now()
  where id = p_unit_id;

  return jsonb_build_object('success', true, 'unit_id', p_unit_id);
end;
$$;

-- ============================================================
-- PART 6: Helper function to create trade-in unit in inventory
-- ============================================================

create or replace function public.create_trade_in_inventory_unit(
  p_brand_id integer,
  p_branch_id uuid,
  p_device_brand text,
  p_device_model text,
  p_storage text default null,
  p_color text default null,
  p_imei text default null,
  p_serial_number text default null,
  p_condition_grade text default null,
  p_battery_health text default null,
  p_appraisal_value numeric default 0,
  p_note text default null,
  p_created_by uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
  v_unit_id uuid;
begin
  if not ('PLATFORM_OWNER' = any(public.get_user_roles()) or p_brand_id = any(public.get_user_brand_ids())) then
    return jsonb_build_object('success', false, 'error', 'Akses brand tidak diizinkan.');
  end if;

  if not exists (
    select 1
    from public.branches
    where id = p_branch_id
      and brand_id = p_brand_id
  ) then
    return jsonb_build_object('success', false, 'error', 'Cabang tidak sesuai dengan brand.');
  end if;

  -- Find or create a generic DEVICE_UNIT inventory item for this model
  -- For MVP: we use a simple approach - look for item by name pattern
  -- This can be refined later with proper product catalog management
  select id into v_item_id
  from public.inventory_items
  where brand_id = p_brand_id
    and item_type = 'DEVICE_UNIT'
    and name ilike '%' || p_device_brand || '%' || p_device_model || '%'
    and is_active = true
  limit 1;

  -- If no matching item found, we create a placeholder or use a generic "Unknown Device"
  -- For MVP, we attempt to find ANY DEVICE_UNIT item in the brand
  if v_item_id is null then
    select id into v_item_id
    from public.inventory_items
    where brand_id = p_brand_id
      and item_type = 'DEVICE_UNIT'
      and is_active = true
    limit 1;
  end if;

  -- If still null, try to find the brand's default "Trade-in Device" or create one
  -- For MVP: if no DEVICE_UNIT exists, we return error (admin must create one first)
  if v_item_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Tidak ada produk DEVICE_UNIT. Buat produk tipe Unit terlebih dahulu.'
    );
  end if;

  -- Create the unit
  insert into public.inventory_item_units (
    brand_id, branch_id, inventory_item_id,
    imei, serial_number, device_brand, device_model,
    storage, color, condition_grade, battery_health,
    purchase_price, selling_price,
    source, status, note, created_by
  ) values (
    p_brand_id, p_branch_id, v_item_id,
    p_imei, p_serial_number, p_device_brand, p_device_model,
    p_storage, p_color, p_condition_grade, p_battery_health,
    p_appraisal_value, p_appraisal_value,
    'TRADE_IN', 'AVAILABLE', p_note, p_created_by
  )
  returning id into v_unit_id;

  -- Record inventory movement IN
  perform public.add_inventory_movement(
    p_brand_id => p_brand_id,
    p_branch_id => p_branch_id,
    p_item_id => v_item_id,
    p_direction => 'IN',
    p_movement_type => 'PURCHASE',
    p_quantity => 1,
    p_unit_cost => p_appraisal_value,
    p_reference_type => 'TRADE_IN',
    p_reference_id => v_unit_id,
    p_idempotency_key => 'trade_in_unit:' || v_unit_id::text,
    p_description => 'Trade-in: ' || p_device_brand || ' ' || p_device_model,
    p_metadata => jsonb_build_object('source', 'trade_in', 'unit_id', v_unit_id),
    p_created_by => p_created_by
  );

  return jsonb_build_object(
    'success', true,
    'item_id', v_item_id,
    'unit_id', v_unit_id
  );
end;
$$;
