-- ============================================================
-- Migration 009: POS Foundation
-- Point-of-Sale sales, inventory deduction, payment, finance
-- ============================================================

-- ============================================================
-- DESIGN PRINCIPLES
-- ============================================================
-- POS_REVENUE = customer_paid_amount = gross_amount - total_discounts
-- gross_amount = sum(quantity * unit_price) before any discount
-- total_discounts = sum(item-level discounts) + sale-level discount
-- customer_paid_amount is what MDR is calculated from
-- net_amount = customer_paid_amount - mdr_amount
-- COGS uses inventory_items.cost_price at time of sale
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. pos_sale_number_counters
create table if not exists public.pos_sale_number_counters (
  brand_id    integer not null references public.brands(id) on delete cascade,
  year        integer not null,
  month       integer not null,
  last_number integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (brand_id, year, month)
);

-- 1b. pos_sales
create table if not exists public.pos_sales (
  id                              uuid primary key default gen_random_uuid(),
  brand_id                        integer not null references public.brands(id) on delete cascade,
  branch_id                       uuid not null references public.branches(id) on delete cascade,
  customer_id                     uuid references public.customers(id) on delete set null,
  sale_number                     text not null,
  sale_status                     text not null default 'COMPLETED'
                                  check (sale_status in ('COMPLETED', 'VOIDED', 'REFUNDED')),
  payment_method_id               uuid not null references public.payment_methods(id) on delete restrict,
  payment_account_id              uuid not null references public.payment_accounts(id) on delete restrict,
  payment_account_movement_id     uuid references public.payment_account_movements(id) on delete set null,
  gross_amount                    numeric(14,2) not null check (gross_amount > 0),
  discount_amount                 numeric(14,2) not null default 0 check (discount_amount >= 0),
  mdr_amount                      numeric(14,2) not null default 0 check (mdr_amount >= 0),
  net_amount                      numeric(14,2) not null check (net_amount = gross_amount - discount_amount - mdr_amount),
  idempotency_key                 text,
  notes                           text,
  metadata                        jsonb not null default '{}',
  sold_at                         timestamptz not null default now(),
  created_by                      uuid references public.profiles(id) on delete set null,
  created_at                      timestamptz not null default now(),
  constraint uq_ps_sale_number unique (brand_id, sale_number)
);

comment on table public.pos_sales is
  'POS sale transaction header. gross_amount = sum(qty*price) before discounts. discount_amount = item_discounts + sale_discount. MDR calculated from customer_paid_amount (gross - discount). net_amount = customer_paid - mdr.';

-- 1c. pos_sale_items
create table if not exists public.pos_sale_items (
  id                      uuid primary key default gen_random_uuid(),
  brand_id                integer not null references public.brands(id) on delete cascade,
  branch_id               uuid not null references public.branches(id) on delete cascade,
  pos_sale_id             uuid not null references public.pos_sales(id) on delete cascade,
  inventory_item_id       uuid not null references public.inventory_items(id) on delete restrict,
  quantity                numeric(14,2) not null check (quantity > 0),
  unit_price              numeric(14,2) not null check (unit_price >= 0),
  unit_cost               numeric(14,2) not null default 0 check (unit_cost >= 0),
  discount_amount         numeric(14,2) not null default 0 check (discount_amount >= 0),
  line_total              numeric(14,2) not null check (line_total >= 0),
  inventory_movement_id   uuid references public.inventory_movements(id) on delete set null,
  metadata                jsonb not null default '{}',
  created_at              timestamptz not null default now(),
  constraint uq_psi_line check (line_total = quantity * unit_price - discount_amount)
);

comment on table public.pos_sale_items is
  'Line items sold in a POS transaction. line_total = qty * unit_price - item_discount. Each line deducts stock via inventory_movement.';


-- ============================================================
-- 2. INDEXES
-- ============================================================

create index if not exists idx_ps_brand_id       on public.pos_sales (brand_id);
create index if not exists idx_ps_branch_id      on public.pos_sales (branch_id);
create index if not exists idx_ps_customer_id    on public.pos_sales (customer_id);
create index if not exists idx_ps_payment_method on public.pos_sales (payment_method_id);
create index if not exists idx_ps_account        on public.pos_sales (payment_account_id);
create index if not exists idx_ps_movement       on public.pos_sales (payment_account_movement_id);
create index if not exists idx_ps_sold_at        on public.pos_sales (sold_at);
create index if not exists idx_ps_status         on public.pos_sales (sale_status);
create index if not exists idx_ps_sale_number    on public.pos_sales (sale_number);
create index if not exists idx_ps_created_by     on public.pos_sales (created_by);
create unique index if not exists uq_ps_idempotency_key
  on public.pos_sales (brand_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_psi_brand_id       on public.pos_sale_items (brand_id);
create index if not exists idx_psi_branch_id      on public.pos_sale_items (branch_id);
create index if not exists idx_psi_pos_sale_id    on public.pos_sale_items (pos_sale_id);
create index if not exists idx_psi_inventory_item on public.pos_sale_items (inventory_item_id);
create index if not exists idx_psi_movement       on public.pos_sale_items (inventory_movement_id);


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table public.pos_sales enable row level security;
alter table public.pos_sale_items enable row level security;

drop policy if exists ps_select on public.pos_sales;
create policy ps_select on public.pos_sales
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

drop policy if exists psi_select on public.pos_sale_items;
create policy psi_select on public.pos_sale_items
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- NOTE: No INSERT/UPDATE/DELETE policies.
-- All writes go through record_pos_sale() with SECURITY DEFINER.


-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- 4a. generate_pos_sale_number
-- Purpose: Generate unique POS/YYYY/MM/NNNN per brand per month.
-- Concurrency-safe via INSERT ... ON CONFLICT + UPDATE.
-- ------------------------------------------------------------

create or replace function public.generate_pos_sale_number(
  p_brand_id integer
) returns text
language plpgsql
as $func$
declare
  v_year     integer := extract(year from current_date);
  v_month    integer := extract(month from current_date);
  v_counter  integer;
begin
  -- Ensure counter row exists
  insert into public.pos_sale_number_counters (brand_id, year, month, last_number)
  values (p_brand_id, v_year, v_month, 0)
  on conflict (brand_id, year, month) do nothing;

  -- Lock and increment
  update public.pos_sale_number_counters
  set last_number = last_number + 1,
      updated_at = now()
  where brand_id = p_brand_id
    and year = v_year
    and month = v_month
  returning last_number into v_counter;

  if not found then
    raise exception 'Failed to generate POS sale number for brand %', p_brand_id
      using errcode = 'P0002';
  end if;

  return 'POS/' || lpad(v_year::text, 4, '0') || '/' || lpad(v_month::text, 2, '0') || '/' || lpad(v_counter::text, 4, '0');
end;
$func$;


-- ------------------------------------------------------------
-- 4b. calculate_pos_mdr
-- Purpose: Calculate MDR fee for a POS payment.
-- Rules: TRANSFER/CASH=0, QRIS threshold 500000, else mdr_pct.
-- Uses customer_paid_amount (gross - discounts) as base.
-- ------------------------------------------------------------

create or replace function public.calculate_pos_mdr(
  p_method_type text,
  p_amount numeric,
  p_mdr_percentage numeric default 0
) returns numeric
language plpgsql
stable
as $func$
declare
  v_mdr numeric(14,2);
begin
  v_mdr := case
    when p_method_type in ('TRANSFER', 'CASH') then 0
    when p_method_type = 'QRIS' then
      case
        when p_amount <= 500000 then 0
        else round(p_amount * p_mdr_percentage / 100, 2)
      end
    else
      round(p_amount * p_mdr_percentage / 100, 2)
  end;

  return v_mdr;
end;
$func$;

comment on function public.calculate_pos_mdr is
  'POS MDR: TRANSFER/CASH=0, QRIS threshold 500000, else method pct. Amount should be customer_paid_amount (gross - discount).';


-- ------------------------------------------------------------
-- 4c. resolve_pos_payment_account
-- Purpose: Resolve destination payment account for POS sale.
-- Same logic as resolve_service_payment_account.
-- ------------------------------------------------------------

create or replace function public.resolve_pos_payment_account(
  p_brand_id integer,
  p_branch_id uuid,
  p_payment_method_id uuid
) returns jsonb
language plpgsql
stable
as $func$
declare
  v_pm_type           text;
  v_pm_is_active      boolean;
  v_pm_mdr_pct        numeric(5,2);
  v_pm_default_account uuid;
  v_bpm_account_id    uuid;
  v_bpm_mdr_pct       numeric(5,2);
  v_bpm_is_active     boolean;
  v_account_id        uuid;
  v_method_type       text;
  v_mdr_pct           numeric(5,2);
begin
  -- Get payment method
  select type, is_active, mdr_percentage, default_payment_account_id
  into v_pm_type, v_pm_is_active, v_pm_mdr_pct, v_pm_default_account
  from public.payment_methods
  where id = p_payment_method_id and brand_id = p_brand_id;

  if not found then
    raise exception 'Payment method % not found for brand %', p_payment_method_id, p_brand_id
      using errcode = 'P0002';
  end if;

  if not v_pm_is_active then
    raise exception 'Payment method % is not active', p_payment_method_id
      using errcode = 'P0004';
  end if;

  v_method_type := v_pm_type;
  v_mdr_pct := v_pm_mdr_pct;

  -- Check branch_payment_methods override
  select payment_account_id, mdr_percentage, is_active
  into v_bpm_account_id, v_bpm_mdr_pct, v_bpm_is_active
  from public.branch_payment_methods
  where brand_id = p_brand_id
    and branch_id = p_branch_id
    and method_type = v_method_type;

  if found then
    if not v_bpm_is_active then
      raise exception 'Payment method % is not active for branch %', p_payment_method_id, p_branch_id
        using errcode = 'P0004';
    end if;
    if v_bpm_account_id is not null then
      v_account_id := v_bpm_account_id;
    end if;
    if v_bpm_mdr_pct is not null then
      v_mdr_pct := v_bpm_mdr_pct;
    end if;
  end if;

  -- Fallback to default account
  if v_account_id is null then
    v_account_id := v_pm_default_account;
  end if;

  -- CASH: validate or auto-resolve branch cash account
  if v_method_type = 'CASH' then
    if v_account_id is not null then
      perform 1 from public.payment_accounts
      where id = v_account_id
        and brand_id = p_brand_id
        and branch_id = p_branch_id
        and is_cash_account = true
        and is_active = true;
      if not found then
        v_account_id := null;
      end if;
    end if;

    if v_account_id is null then
      select id into v_account_id
      from public.payment_accounts
      where brand_id = p_brand_id
        and branch_id = p_branch_id
        and is_cash_account = true
        and is_active = true
      order by is_system_account desc, is_default_receiving_account desc, id
      limit 1;

      if not found then
        raise exception 'No active CASH payment account found for branch %', p_branch_id
          using errcode = 'P0002';
      end if;
    end if;
  end if;

  -- Validate resolved account
  if v_account_id is null then
    raise exception 'No payment account resolved for payment method % on branch %',
      p_payment_method_id, p_branch_id using errcode = 'P0002';
  end if;

  perform 1 from public.payment_accounts
  where id = v_account_id
    and brand_id = p_brand_id
    and is_active = true;

  if not found then
    raise exception 'Payment account % is not active or does not belong to brand %',
      v_account_id, p_brand_id using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'payment_account_id', v_account_id,
    'method_type', v_method_type,
    'mdr_percentage', v_mdr_pct
  );
end;
$func$;


-- ------------------------------------------------------------
-- 4d. record_pos_sale
-- Purpose: Complete POS sale in one transaction:
--   1. Validate brand, branch, items
--   2. Calculate amounts (gross, discounts, MDR, net)
--   3. Generate sale number
--   4. Insert sale header
--   5. Process each item: insert line, deduct stock
--   6. Record payment movement (IN, net_amount)
--   7. Write finance entries (POS_REVENUE, COGS, MDR_EXPENSE)
-- ------------------------------------------------------------

create or replace function public.record_pos_sale(
  p_brand_id integer,
  p_branch_id uuid,
  p_payment_method_id uuid,
  p_items jsonb,
  p_customer_id uuid default null,
  p_discount_amount numeric default 0,
  p_sold_at timestamptz default now(),
  p_notes text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_branch_valid      boolean;
  v_item              record;
  v_inv_item          record;
  v_stock_check       record;
  v_resolved          jsonb;
  v_account_id        uuid;
  v_method_type       text;
  v_mdr_pct           numeric(5,2);
  v_gross_amount      numeric(14,2) := 0;
  v_total_item_disc   numeric(14,2) := 0;
  v_total_discount    numeric(14,2);
  v_customer_paid     numeric(14,2);
  v_mdr_amount        numeric(14,2);
  v_net_amount        numeric(14,2);
  v_sale_number       text;
  v_final_key         text;
  v_sale_id           uuid;
  v_sale_item_id      uuid;
  v_movement_key      text;
  v_movement_id       uuid;
  v_pa_movement_id    uuid;
  v_total_cogs        numeric(14,2) := 0;
  v_line_total        numeric(14,2);
  v_revenue_ledger_id uuid;
  v_cogs_ledger_id    uuid;
  v_mdr_ledger_id     uuid;
  v_existing_id       uuid;
begin
  -- Step 1: Validate brand
  perform 1 from public.brands where id = p_brand_id and deleted_at is null;
  if not found then
    raise exception 'Brand % not found or deleted', p_brand_id using errcode = 'P0002';
  end if;

  -- Step 2: Validate branch
  perform 1 from public.branches
  where id = p_branch_id and brand_id = p_brand_id and deleted_at is null;
  if not found then
    raise exception 'Branch % not found, deleted, or does not belong to brand %',
      p_branch_id, p_brand_id using errcode = 'P0002';
  end if;

  -- Step 3: Validate items array
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Items array is empty' using errcode = 'P0004';
  end if;

  -- Step 4: Idempotency check (before any work)
  if p_idempotency_key is not null then
    select id into v_existing_id
    from public.pos_sales
    where brand_id = p_brand_id and idempotency_key = p_idempotency_key;

    if found then
      return jsonb_build_object(
        'pos_sale_id', v_existing_id,
        'status', 'ALREADY_EXISTS'
      );
    end if;
  end if;

  -- Step 5: First pass — validate items, lock stock, calculate totals
  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(
      inventory_item_id uuid,
      quantity numeric,
      unit_price numeric,
      discount_amount numeric
    )
  loop
    -- Validate item exists, same brand, item_type = PRODUCT
    select id, brand_id, item_type, cost_price, name
    into v_inv_item
    from public.inventory_items
    where id = v_item.inventory_item_id and deleted_at is null;

    if not found then
      raise exception 'Inventory item % not found', v_item.inventory_item_id using errcode = 'P0002';
    end if;

    if v_inv_item.brand_id != p_brand_id then
      raise exception 'Inventory item % does not belong to brand %', v_item.inventory_item_id, p_brand_id
        using errcode = 'P0002';
    end if;

    if v_inv_item.item_type != 'PRODUCT' then
      raise exception 'Item % has type %, not PRODUCT. Only PRODUCT items can be sold via POS.',
        v_item.inventory_item_id, v_inv_item.item_type using errcode = 'P0004';
    end if;

    -- Validate quantity
    if v_item.quantity <= 0 then
      raise exception 'Item % quantity must be positive, got %', v_item.inventory_item_id, v_item.quantity
        using errcode = '22023';
    end if;

    -- Calculate line total
    v_line_total := v_item.quantity * v_item.unit_price - coalesce(v_item.discount_amount, 0);
    if v_line_total < 0 then
      raise exception 'Line total cannot be negative for item %', v_item.inventory_item_id
        using errcode = '22023';
    end if;

    -- Accumulate
    v_gross_amount := v_gross_amount + (v_item.quantity * v_item.unit_price);
    v_total_item_disc := v_total_item_disc + coalesce(v_item.discount_amount, 0);
    v_total_cogs := v_total_cogs + (v_item.quantity * coalesce(v_inv_item.cost_price, 0));
  end loop;

  -- Step 6: Calculate final amounts
  v_total_discount := v_total_item_disc + p_discount_amount;
  v_customer_paid := v_gross_amount - v_total_discount;

  if v_customer_paid <= 0 then
    raise exception 'Customer paid amount must be positive after discounts, got %', v_customer_paid
      using errcode = '22023';
  end if;

  -- Step 7: Resolve payment account
  v_resolved := public.resolve_pos_payment_account(p_brand_id, p_branch_id, p_payment_method_id);
  v_account_id  := (v_resolved ->> 'payment_account_id')::uuid;
  v_method_type := v_resolved ->> 'method_type';
  v_mdr_pct     := (v_resolved ->> 'mdr_percentage')::numeric(5,2);

  -- Step 8: Calculate MDR from customer_paid_amount
  v_mdr_amount := public.calculate_pos_mdr(v_method_type, v_customer_paid, v_mdr_pct);
  v_net_amount := v_customer_paid - v_mdr_amount;

  -- Step 9: Generate sale number
  v_sale_number := public.generate_pos_sale_number(p_brand_id);

  -- Step 10: Generate idempotency key if not provided
  v_final_key := coalesce(p_idempotency_key, 'pos_sale:' || p_brand_id || ':' || v_sale_number);

  -- Step 11: Insert POS sale header
  insert into public.pos_sales (
    brand_id, branch_id, customer_id,
    sale_number, sale_status,
    payment_method_id, payment_account_id,
    gross_amount, discount_amount, mdr_amount, net_amount,
    idempotency_key, notes, metadata,
    sold_at, created_by, created_at
  ) values (
    p_brand_id, p_branch_id, p_customer_id,
    v_sale_number, 'COMPLETED',
    p_payment_method_id, v_account_id,
    v_gross_amount, v_total_discount, v_mdr_amount, v_net_amount,
    v_final_key, p_notes, p_metadata,
    p_sold_at, p_created_by, now()
  )
  returning id into v_sale_id;

  -- Step 12: Process each item — insert line and deduct stock
  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(
      inventory_item_id uuid,
      quantity numeric,
      unit_price numeric,
      discount_amount numeric
    )
  loop
    -- Get cost price and name for this item
    select cost_price, name into v_inv_item
    from public.inventory_items
    where id = v_item.inventory_item_id;

    v_line_total := v_item.quantity * v_item.unit_price - coalesce(v_item.discount_amount, 0);

    -- Insert line item
    insert into public.pos_sale_items (
      brand_id, branch_id, pos_sale_id,
      inventory_item_id, quantity,
      unit_price, unit_cost,
      discount_amount, line_total,
      metadata
    ) values (
      p_brand_id, p_branch_id, v_sale_id,
      v_item.inventory_item_id, v_item.quantity,
      v_item.unit_price, coalesce(v_inv_item.cost_price, 0),
      coalesce(v_item.discount_amount, 0), v_line_total,
      '{}'
    )
    returning id into v_sale_item_id;

    -- Generate idempotency key for the inventory movement
    v_movement_key := 'pos_sale:' || v_sale_id || ':item:' || v_item.inventory_item_id || ':line:' || v_sale_item_id;

    -- Deduct stock
    v_movement_id := public.add_inventory_movement(
      p_brand_id       := p_brand_id,
      p_branch_id      := p_branch_id,
      p_item_id        := v_item.inventory_item_id,
      p_direction      := 'OUT',
      p_movement_type  := 'POS_SALE',
      p_quantity       := v_item.quantity,
      p_unit_cost      := coalesce(v_inv_item.cost_price, 0),
      p_reference_type := 'pos_sale',
      p_reference_id   := v_sale_id,
      p_idempotency_key := v_movement_key,
      p_description    := 'POS sale ' || v_sale_number,
      p_metadata       := jsonb_build_object(
                            'sale_item_id', v_sale_item_id,
                            'item_name', v_inv_item.name
                          ),
      p_created_by     := p_created_by
    );

    -- Link movement to line item
    update public.pos_sale_items
    set inventory_movement_id = v_movement_id
    where id = v_sale_item_id;
  end loop;

  -- Step 13: Create payment account movement (IN, net_amount)
  v_pa_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_account_id,
    p_brand_id           := p_brand_id,
    p_direction          := 'IN',
    p_amount             := v_net_amount,
    p_movement_type      := 'POS_PAYMENT',
    p_branch_id          := p_branch_id,
    p_reference_type     := 'pos_sale',
    p_reference_id       := v_sale_id::text,
    p_description        := 'POS sale ' || v_sale_number,
    p_metadata           := jsonb_build_object(
                             'sale_number', v_sale_number,
                             'gross_amount', v_gross_amount,
                             'discount_amount', v_total_discount,
                             'mdr_amount', v_mdr_amount,
                             'method_type', v_method_type
                           ),
    p_created_by         := p_created_by
  );

  -- Link movement to sale
  update public.pos_sales
  set payment_account_movement_id = v_pa_movement_id
  where id = v_sale_id;

  -- Step 14: Write finance ledger entries

  -- 14a: POS_REVENUE CREDIT customer_paid_amount
  v_revenue_ledger_id := public.add_finance_ledger_entry(
    p_brand_id       := p_brand_id,
    p_branch_id      := p_branch_id,
    p_ledger_date    := p_sold_at::date,
    p_occurred_at    := p_sold_at,
    p_entry_type     := 'POS_REVENUE',
    p_direction      := 'CREDIT',
    p_amount         := v_customer_paid,
    p_category       := 'pos',
    p_account_code   := '4000',
    p_reference_type := 'pos_sale',
    p_reference_id   := v_sale_id,
    p_source_table   := 'pos_sales',
    p_source_id      := v_sale_id,
    p_description    := 'POS sale ' || v_sale_number || ' revenue',
    p_metadata       := jsonb_build_object(
                         'sale_number', v_sale_number,
                         'gross_amount', v_gross_amount,
                         'discount_amount', v_total_discount
                       ),
    p_created_by     := p_created_by,
    p_idempotency_key := 'pos_sale:' || v_sale_id || ':revenue'
  );

  -- 14b: COGS DEBIT total_cogs (if > 0)
  if v_total_cogs > 0 then
    v_cogs_ledger_id := public.add_finance_ledger_entry(
      p_brand_id       := p_brand_id,
      p_branch_id      := p_branch_id,
      p_ledger_date    := p_sold_at::date,
      p_occurred_at    := p_sold_at,
      p_entry_type     := 'COGS',
      p_direction      := 'DEBIT',
      p_amount         := v_total_cogs,
      p_category       := 'pos',
      p_account_code   := '5000',
      p_reference_type := 'pos_sale',
      p_reference_id   := v_sale_id,
      p_source_table   := 'pos_sales',
      p_source_id      := v_sale_id,
      p_description    := 'COGS for ' || v_sale_number,
      p_metadata       := jsonb_build_object('sale_number', v_sale_number),
      p_created_by     := p_created_by,
      p_idempotency_key := 'pos_sale:' || v_sale_id || ':cogs'
    );
  end if;

  -- 14c: MDR_EXPENSE DEBIT mdr_amount (if > 0)
  if v_mdr_amount > 0 then
    v_mdr_ledger_id := public.add_finance_ledger_entry(
      p_brand_id       := p_brand_id,
      p_branch_id      := p_branch_id,
      p_ledger_date    := p_sold_at::date,
      p_occurred_at    := p_sold_at,
      p_entry_type     := 'MDR_EXPENSE',
      p_direction      := 'DEBIT',
      p_amount         := v_mdr_amount,
      p_category       := 'bank_fee',
      p_account_code   := '5100',
      p_reference_type := 'pos_sale',
      p_reference_id   := v_sale_id,
      p_source_table   := 'pos_sales',
      p_source_id      := v_sale_id,
      p_description    := 'MDR fee for ' || v_sale_number,
      p_metadata       := jsonb_build_object(
                           'sale_number', v_sale_number,
                           'customer_paid', v_customer_paid,
                           'method_type', v_method_type
                         ),
      p_created_by     := p_created_by,
      p_idempotency_key := 'pos_sale:' || v_sale_id || ':mdr'
    );
  end if;

  -- Step 15: Return result
  return jsonb_build_object(
    'pos_sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'status', 'COMPLETED',
    'gross_amount', v_gross_amount,
    'discount_amount', v_total_discount,
    'customer_paid_amount', v_customer_paid,
    'mdr_amount', v_mdr_amount,
    'net_amount', v_net_amount,
    'total_cogs', v_total_cogs,
    'gross_profit', v_customer_paid - v_total_cogs - v_mdr_amount
  );
end;
$func$;

comment on function public.record_pos_sale is
  'Creates a complete POS sale: validates items, deducts stock via add_inventory_movement(), records payment via add_payment_account_movement(), writes finance entries via add_finance_ledger_entry(). All in one transaction.';


-- ------------------------------------------------------------
-- 4e. calculate_pos_sale_summary
-- Purpose: Return financial summary for a completed POS sale.
-- ------------------------------------------------------------

create or replace function public.calculate_pos_sale_summary(
  p_pos_sale_id uuid
) returns jsonb
language plpgsql
stable
as $func$
declare
  v_sale record;
  v_total_cogs numeric(14,2);
  v_customer_paid numeric(14,2);
begin
  select id, brand_id, sale_number, sale_status,
         gross_amount, discount_amount, mdr_amount, net_amount
  into v_sale
  from public.pos_sales
  where id = p_pos_sale_id;

  if not found then
    raise exception 'POS sale % not found', p_pos_sale_id using errcode = 'P0002';
  end if;

  -- Sum COGS from line items
  select coalesce(sum(quantity * unit_cost), 0) into v_total_cogs
  from public.pos_sale_items
  where pos_sale_id = p_pos_sale_id;

  v_customer_paid := v_sale.gross_amount - v_sale.discount_amount;

  return jsonb_build_object(
    'pos_sale_id', v_sale.id,
    'sale_number', v_sale.sale_number,
    'sale_status', v_sale.sale_status,
    'gross_amount', v_sale.gross_amount,
    'discount_amount', v_sale.discount_amount,
    'customer_paid_amount', v_customer_paid,
    'mdr_amount', v_sale.mdr_amount,
    'net_amount', v_sale.net_amount,
    'total_cogs', v_total_cogs,
    'gross_profit', v_customer_paid - v_total_cogs - v_sale.mdr_amount
  );
end;
$func$;

comment on function public.calculate_pos_sale_summary is
  'Returns POS sale financial summary: amounts, COGS, gross profit. v_customer_paid = gross - discount. gross_profit = customer_paid - cogs - mdr.';


-- ============================================================
-- 5. VALIDATION QUERIES (reference only, not executed)
-- ============================================================

-- 5a. POS sale without payment account movement
--
-- SELECT ps.id, ps.sale_number, ps.gross_amount, ps.net_amount, ps.sold_at
-- FROM public.pos_sales ps
-- WHERE ps.sale_status = 'COMPLETED'
--   AND ps.payment_account_movement_id IS NULL
-- ORDER BY ps.sold_at;

-- 5b. POS sale item without inventory movement
--
-- SELECT psi.id, psi.pos_sale_id, psi.inventory_item_id, psi.quantity
-- FROM public.pos_sale_items psi
-- WHERE psi.inventory_movement_id IS NULL
-- ORDER BY psi.created_at;

-- 5c. POS sale without POS_REVENUE ledger entry
--
-- SELECT ps.id, ps.sale_number, ps.gross_amount, ps.discount_amount
-- FROM public.pos_sales ps
-- WHERE ps.sale_status = 'COMPLETED'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.finance_ledger fl
--     WHERE fl.reference_type = 'pos_sale'
--       AND fl.reference_id = ps.id
--       AND fl.entry_type = 'POS_REVENUE'
--   )
-- ORDER BY ps.sold_at;

-- 5d. POS sale item with item_type not PRODUCT
-- (Should always return empty — record_pos_sale() validates this)
--
-- SELECT psi.id, psi.pos_sale_id, ii.id AS item_id, ii.name, ii.item_type
-- FROM public.pos_sale_items psi
-- JOIN public.inventory_items ii ON ii.id = psi.inventory_item_id
-- WHERE ii.item_type != 'PRODUCT';

-- 5e. CASH payment account branch mismatch
--
-- SELECT ps.id, ps.sale_number, ps.branch_id AS sale_branch,
--        pa.branch_id AS account_branch, pa.account_name
-- FROM public.pos_sales ps
-- JOIN public.payment_accounts pa ON pa.id = ps.payment_account_id
-- JOIN public.payment_methods pm ON pm.id = ps.payment_method_id
-- WHERE pm.type = 'CASH'
--   AND (pa.branch_id IS NULL OR pa.branch_id != ps.branch_id);

-- 5f. QRIS <= 500000 charged MDR
--
-- SELECT ps.id, ps.sale_number,
--        (ps.gross_amount - ps.discount_amount) AS customer_paid,
--        ps.mdr_amount
-- FROM public.pos_sales ps
-- JOIN public.payment_methods pm ON pm.id = ps.payment_method_id
-- WHERE pm.type = 'QRIS'
--   AND (ps.gross_amount - ps.discount_amount) <= 500000
--   AND ps.mdr_amount > 0;

-- 5g. TRANSFER charged MDR
--
-- SELECT ps.id, ps.sale_number, ps.mdr_amount
-- FROM public.pos_sales ps
-- JOIN public.payment_methods pm ON pm.id = ps.payment_method_id
-- WHERE pm.type = 'TRANSFER' AND ps.mdr_amount > 0;

-- 5h. POS COGS mismatch from sale items
-- Compare sale-level cogs vs computed from items.
-- (Should always match since record_pos_sale() derives cogs from items.)
--
-- SELECT ps.id, ps.sale_number,
--        COALESCE(SUM(psi.quantity * psi.unit_cost), 0) AS computed_cogs
-- FROM public.pos_sales ps
-- JOIN public.pos_sale_items psi ON psi.pos_sale_id = ps.id
-- GROUP BY ps.id, ps.sale_number;

-- 5i. Stock cache mismatch after POS sales
-- Compare branch_inventory_stocks.current_stock vs sum of movements.
--
-- SELECT bis.branch_id, bis.item_id, bis.current_stock,
--        COALESCE(SUM(
--          CASE WHEN im.direction = 'OUT' THEN -im.quantity
--               WHEN im.direction = 'IN' THEN im.quantity
--          END
--        ), 0) AS movement_balance
-- FROM public.branch_inventory_stocks bis
-- JOIN public.inventory_movements im ON im.branch_id = bis.branch_id
--                                    AND im.item_id = bis.item_id
-- GROUP BY bis.branch_id, bis.item_id, bis.current_stock
-- HAVING bis.current_stock != COALESCE(SUM(
--   CASE WHEN im.direction = 'OUT' THEN -im.quantity
--        WHEN im.direction = 'IN' THEN im.quantity
--   END
-- ), 0);

-- 5j. Duplicate idempotency key
--
-- SELECT ps.idempotency_key, ps.brand_id, COUNT(*) AS cnt
-- FROM public.pos_sales ps
-- WHERE ps.idempotency_key IS NOT NULL
-- GROUP BY ps.idempotency_key, ps.brand_id
-- HAVING COUNT(*) > 1;


-- ============================================================
-- End of Migration 009
-- ============================================================
