-- ============================================================
-- Migration 030: V4 Stock Purchase Tables
--
-- Dedicated purchase tables for Inventory V4 using inv_* tables.
-- Follows the same pattern as 022 but uses new V4 schema.
-- ============================================================

-- ============================================================
-- A. inv_stock_purchase_number_counters
-- Counter table for purchase number generation.
-- ============================================================

create table if not exists public.inv_stock_purchase_number_counters (
  brand_id    integer not null references public.brands(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  year        integer not null,
  month       integer not null,
  last_number integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (brand_id, branch_id, year, month)
);

comment on table public.inv_stock_purchase_number_counters is
  'Counter for V4 stock purchase number generation per brand+branch+month.';

-- ============================================================
-- B. inv_stock_purchases
-- Purchase header for V4 Belanja Stok.
-- ============================================================

create table if not exists public.inv_stock_purchases (
  id                 uuid primary key default gen_random_uuid(),
  brand_id           integer not null references public.brands(id) on delete cascade,
  branch_id          uuid not null references public.branches(id) on delete cascade,
  purchase_number    text not null,
  purchase_date      date not null default current_date,
  supplier_name      text,
  invoice_number     text,
  payment_account_id uuid not null references public.payment_accounts(id),
  subtotal_amount    numeric not null default 0,
  total_amount       numeric not null default 0,
  notes              text,
  status             text not null default 'COMPLETED',
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint chk_isp_status
    check (status in ('DRAFT', 'COMPLETED', 'VOIDED')),
  constraint chk_isp_amounts
    check (total_amount = subtotal_amount),
  constraint uq_isp_purchase_number unique (brand_id, purchase_number)
);

comment on table public.inv_stock_purchases is
  'V4 stock purchase header. Belanja stok untuk Sparepart, Produk, Unit Baru.';

-- ============================================================
-- C. inv_stock_purchase_items
-- Line items for V4 Belanja Stok with snapshots.
-- ============================================================

create table if not exists public.inv_stock_purchase_items (
  id                        uuid primary key default gen_random_uuid(),
  brand_id                  integer not null references public.brands(id) on delete cascade,
  branch_id                 uuid not null references public.branches(id) on delete cascade,
  purchase_id               uuid not null references public.inv_stock_purchases(id) on delete cascade,
  product_id                uuid not null references public.inv_products(id),
  variant_id                uuid not null references public.inv_variants(id),
  product_name_snapshot     text not null,
  variant_name_snapshot     text,
  attributes_snapshot       jsonb not null default '{}'::jsonb,
  sku_snapshot              text,
  barcode_snapshot          text,
  unit_snapshot             text not null default 'pcs',
  quantity                  numeric not null,
  unit_cost                 numeric not null default 0,
  unit_selling_price_snapshot numeric not null default 0,
  subtotal_amount           numeric not null default 0,
  movement_id               uuid references public.inv_stock_movements(id),
  created_at                timestamptz not null default now(),
  constraint chk_ispi_quantity check (quantity > 0),
  constraint chk_ispi_unit_cost check (unit_cost >= 0)
);

comment on table public.inv_stock_purchase_items is
  'Line items for V4 stock purchase with variant snapshots and movement reference.';

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_isp_brand_branch_created
  on public.inv_stock_purchases (brand_id, branch_id, created_at desc);

create index if not exists idx_isp_purchase_number
  on public.inv_stock_purchases (brand_id, purchase_number);

create index if not exists idx_ispi_purchase_id
  on public.inv_stock_purchase_items (purchase_id);

create index if not exists idx_ispi_variant_id
  on public.inv_stock_purchase_items (variant_id);

create index if not exists idx_ispi_product_id
  on public.inv_stock_purchase_items (product_id);

-- ============================================================
-- TRIGGER: updated_at on inv_stock_purchases
-- ============================================================

drop trigger if exists trg_inv_stock_purchases_updated_at on public.inv_stock_purchases;
create trigger trg_inv_stock_purchases_updated_at
  before update on public.inv_stock_purchases
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- RLS: inv_stock_purchase_number_counters
-- ============================================================

alter table public.inv_stock_purchase_number_counters enable row level security;

create policy ispnc_select on public.inv_stock_purchase_number_counters
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy ispnc_insert on public.inv_stock_purchase_number_counters
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_stock_purchase_number_counters.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy ispnc_update on public.inv_stock_purchase_number_counters
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_stock_purchase_number_counters.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- ============================================================
-- RLS: inv_stock_purchases
-- ============================================================

alter table public.inv_stock_purchases enable row level security;

create policy isp_select on public.inv_stock_purchases
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy isp_insert on public.inv_stock_purchases
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_stock_purchases.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy isp_update on public.inv_stock_purchases
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_stock_purchases.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy isp_delete on public.inv_stock_purchases
  for delete using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_stock_purchases.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- ============================================================
-- RLS: inv_stock_purchase_items
-- ============================================================

alter table public.inv_stock_purchase_items enable row level security;

create policy ispi_select on public.inv_stock_purchase_items
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy ispi_insert on public.inv_stock_purchase_items
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_stock_purchase_items.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy ispi_update on public.inv_stock_purchase_items
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_stock_purchase_items.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy ispi_delete on public.inv_stock_purchase_items
  for delete using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_stock_purchase_items.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- ============================================================
-- RPC: generate_inv_stock_purchase_number
-- Concurrency-safe purchase number generator.
-- Format: PO/YYYY/MM/0001
-- ============================================================

create or replace function public.generate_inv_stock_purchase_number(
  p_brand_id integer,
  p_branch_id uuid
) returns text
language plpgsql
as $func$
declare
  v_year     integer := extract(year from current_date);
  v_month    integer := extract(month from current_date);
  v_counter  integer;
  v_prefix   text := 'PO';
begin
  insert into public.inv_stock_purchase_number_counters (brand_id, branch_id, year, month, last_number)
  values (p_brand_id, p_branch_id, v_year, v_month, 0)
  on conflict (brand_id, branch_id, year, month) do nothing;

  update public.inv_stock_purchase_number_counters
  set last_number = last_number + 1,
      updated_at = now()
  where brand_id = p_brand_id
    and branch_id = p_branch_id
    and year = v_year
    and month = v_month
  returning last_number into v_counter;

  if not found then
    raise exception 'Failed to generate purchase number for brand % branch %', p_brand_id, p_branch_id
      using errcode = 'P0002';
  end if;

  return v_prefix || '/' || lpad(v_year::text, 4, '0') || '/' || lpad(v_month::text, 2, '0') || '/' || lpad(v_counter::text, 4, '0');
end;
$func$;

comment on function public.generate_inv_stock_purchase_number is
  'Generates unique purchase numbers per brand+branch+month. Format: PO/YYYY/MM/NNNN';

-- ============================================================
-- RPC: create_inv_stock_purchase (atomic)
--
-- Creates purchase, purchase items, updates stock, creates
-- stock movements, and creates payment account movement.
-- All in one transaction — no partial writes.
-- ============================================================

create or replace function public.create_inv_stock_purchase(
  p_brand_id integer,
  p_branch_id uuid,
  p_payment_account_id uuid,
  p_supplier_name text,
  p_purchase_date date,
  p_notes text,
  p_created_by uuid,
  p_items jsonb
) returns jsonb
language plpgsql
as $func$
declare
  v_purchase_id uuid;
  v_purchase_number text;
  v_item jsonb;
  v_variant_id uuid;
  v_quantity numeric;
  v_unit_cost numeric;
  v_unit_selling_price numeric;
  v_note text;
  v_subtotal numeric;
  v_total_amount numeric := 0;
  v_variant_row public.inv_variants%rowtype;
  v_product_row public.inv_products%rowtype;
  v_stock_row public.inv_variant_stocks%rowtype;
  v_stock_before numeric;
  v_stock_after numeric;
  v_old_avg_cost numeric;
  v_new_avg_cost numeric;
  v_movement_id uuid;
  v_payment_account_row public.payment_accounts%rowtype;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  -- 0. Validate payment account
  select * into v_payment_account_row
  from public.payment_accounts
  where id = p_payment_account_id
    and brand_id = p_brand_id
    and is_active = true;

  if not found then
    raise exception 'Akun pembayaran tidak ditemukan atau tidak aktif.'
      using errcode = 'P0001';
  end if;

  -- 1. Generate purchase number
  select public.generate_inv_stock_purchase_number(p_brand_id, p_branch_id)
  into v_purchase_number;

  -- 2. Create purchase header
  insert into public.inv_stock_purchases (
    brand_id, branch_id, purchase_number, payment_account_id,
    supplier_name, purchase_date, notes, created_by, status
  ) values (
    p_brand_id, p_branch_id, v_purchase_number, p_payment_account_id,
    p_supplier_name, p_purchase_date, p_notes, p_created_by, 'COMPLETED'
  )
  returning id into v_purchase_id;

  -- 3. Process each item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variantId')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unitCost')::numeric;
    v_unit_selling_price := coalesce((v_item->>'unitSellingPrice')::numeric, 0);
    v_note := (v_item->>'note')::text;
    v_subtotal := v_quantity * v_unit_cost;
    v_total_amount := v_total_amount + v_subtotal;

    -- Validate variant exists
    select * into v_variant_row
    from public.inv_variants
    where id = v_variant_id;

    if not found then
      raise exception 'Varian tidak ditemukan: %', v_variant_id
        using errcode = 'P0002';
    end if;

    -- Validate variant brand matches
    if v_variant_row.brand_id != p_brand_id then
      raise exception 'Varian tidak sesuai dengan brand.'
        using errcode = 'P0003';
    end if;

    -- Fetch product to validate product_kind
    select * into v_product_row
    from public.inv_products
    where id = v_variant_row.product_id;

    if not found then
      raise exception 'Produk tidak ditemukan untuk varian: %', v_variant_id
        using errcode = 'P0002';
    end if;

    -- Reject Unit Second (condition_type = SECOND)
    if v_product_row.product_kind = 'UNIT' and v_product_row.condition_type = 'SECOND' then
      raise exception 'Unit Second tidak dapat dibeli melalui Belanja Stok biasa. Gunakan form Unit Second.'
        using errcode = 'P0004';
    end if;

    -- Fetch or create variant stock
    select * into v_stock_row
    from public.inv_variant_stocks
    where branch_id = p_branch_id
      and variant_id = v_variant_id;

    v_stock_before := coalesce(v_stock_row.current_stock, 0);
    v_stock_after := v_stock_before + v_quantity;

    -- Calculate new average cost
    v_old_avg_cost := coalesce(v_variant_row.average_cost, 0);
    if v_stock_before <= 0 then
      v_new_avg_cost := v_unit_cost;
    else
      v_new_avg_cost := ((v_stock_before * v_old_avg_cost) + (v_quantity * v_unit_cost)) / v_stock_after;
    end if;

    -- Insert purchase item with snapshots
    insert into public.inv_stock_purchase_items (
      brand_id, branch_id, purchase_id,
      product_id, variant_id,
      product_name_snapshot, variant_name_snapshot, attributes_snapshot,
      sku_snapshot, barcode_snapshot, unit_snapshot,
      quantity, unit_cost, unit_selling_price_snapshot, subtotal_amount
    ) values (
      p_brand_id, p_branch_id, v_purchase_id,
      v_product_row.id, v_variant_id,
      v_product_row.name,
      v_variant_row.name,
      v_variant_row.attributes,
      v_variant_row.sku,
      v_variant_row.barcode,
      v_variant_row.unit,
      v_quantity,
      v_unit_cost,
      v_unit_selling_price,
      v_subtotal
    );

    -- Update variant stock (insert or update)
    if v_stock_row.id is not null then
      update public.inv_variant_stocks
      set current_stock = v_stock_after,
          updated_at = now()
      where id = v_stock_row.id;
    else
      insert into public.inv_variant_stocks (brand_id, branch_id, variant_id, current_stock, reserved_stock)
      values (p_brand_id, p_branch_id, v_variant_id, v_stock_after, 0);
    end if;

    -- Update variant average_cost and cost_price
    update public.inv_variants
    set average_cost = v_new_avg_cost,
        cost_price = v_unit_cost,
        updated_at = now()
    where id = v_variant_id;

    -- Create stock movement
    insert into public.inv_stock_movements (
      brand_id, branch_id,
      product_id, variant_id,
      movement_type, direction,
      quantity, stock_before, stock_after,
      reference_type, reference_id, reference_label,
      notes, created_by
    ) values (
      p_brand_id, p_branch_id,
      v_product_row.id, v_variant_id,
      'PURCHASE_IN', 'IN',
      v_quantity, v_stock_before, v_stock_after,
      'INV_STOCK_PURCHASE', v_purchase_id, v_purchase_number,
      coalesce(v_note, 'Belanja Stok: ' || v_product_row.name), p_created_by
    )
    returning id into v_movement_id;

    -- Update purchase item with movement_id
    update public.inv_stock_purchase_items
    set movement_id = v_movement_id
    where purchase_id = v_purchase_id
      and variant_id = v_variant_id;
  end loop;

  -- 4. Update purchase totals
  update public.inv_stock_purchases
  set subtotal_amount = v_total_amount,
      total_amount = v_total_amount,
      updated_at = now()
  where id = v_purchase_id;

  -- 5. Create payment account movement (OUT)
  v_balance_before := v_payment_account_row.current_balance;
  v_balance_after := v_balance_before - v_total_amount;

  if v_balance_after < 0 and v_payment_account_row.allow_negative_balance = false then
    raise exception 'Saldo akun pembayaran tidak mencukupi. Sisa saldo: %', v_balance_before
      using errcode = 'P0005';
  end if;

  insert into public.payment_account_movements (
    payment_account_id, brand_id, branch_id,
    direction, amount, before_balance, after_balance,
    movement_type, reference_type, reference_id, description, created_by
  ) values (
    p_payment_account_id, p_brand_id, p_branch_id,
    'OUT', v_total_amount, v_balance_before, v_balance_after,
    'STOCK_PURCHASE', 'INV_STOCK_PURCHASE', v_purchase_id::text,
    'Belanja Stok: ' || v_purchase_number, p_created_by
  );

  update public.payment_accounts
  set current_balance = v_balance_after,
      updated_at = now()
  where id = p_payment_account_id;

  -- 6. Return result
  return jsonb_build_object(
    'purchase_id', v_purchase_id,
    'purchase_number', v_purchase_number,
    'total_amount', v_total_amount,
    'item_count', (select count(*) from jsonb_array_elements(p_items))
  );
end;
$func$;

comment on function public.create_inv_stock_purchase is
  'Atomic V4 stock purchase. Creates purchase, items, stock movements, and payment movement in one transaction.';
