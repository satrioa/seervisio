-- ============================================================
-- Seervis V2 — Migration 013: Seed Demo Data
-- ============================================================
-- Created: 2026-06-08
-- Minimal realistic demo data for Seervis V2.
-- Idempotent where possible.
--
-- SAFETY NOTES:
-- - Profiles have NULL auth_user_id (auth.users managed by Supabase Auth)
-- - After migration, create auth users then UPDATE profiles.auth_user_id
-- - Controlled writes use existing SECURITY DEFINER functions
-- ============================================================

-- ============================================================
-- PRE-SEED COMPATIBILITY PATCH
-- Overwrite functions that were deployed with brands.deleted_at
-- validation to use brands.status = 'active' instead.
-- Remote already has old versions from migrations 008–010.
-- ============================================================

create or replace function public.add_finance_ledger_entry(
  p_brand_id integer,
  p_entry_type text,
  p_direction text,
  p_amount numeric,
  p_branch_id uuid default null,
  p_ledger_date date default current_date,
  p_occurred_at timestamptz default now(),
  p_category text default null,
  p_account_code text default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_description text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null,
  p_idempotency_key text default null
) returns uuid
language plpgsql
security definer
as $func$
declare
  v_found_id          uuid;
  v_existing_entry_type text;
  v_existing_direction text;
  v_existing_amount   numeric(14,2);
  v_existing_ref_type text;
  v_existing_ref_id   text;
  v_existing_src_tbl  text;
  v_existing_src_id   text;
  v_ledger_id         uuid;
begin
  -- Validate brand exists
  perform 1 from public.brands where id = p_brand_id and lower(status) = 'active';
  if not found then
    raise exception 'Brand % not found or deleted', p_brand_id using errcode = 'P0002';
  end if;

  -- Validate branch if provided
  if p_branch_id is not null then
    perform 1 from public.branches
    where id = p_branch_id and brand_id = p_brand_id and deleted_at is null;
    if not found then
      raise exception 'Branch % not found, deleted, or does not belong to brand %',
        p_branch_id, p_brand_id using errcode = 'P0002';
    end if;
  end if;

  -- Validate amount
  if p_amount <= 0 then
    raise exception 'Ledger amount must be positive, got %', p_amount using errcode = '22023';
  end if;

  -- Validate direction
  if p_direction not in ('DEBIT', 'CREDIT') then
    raise exception 'Invalid direction: %. Must be DEBIT or CREDIT', p_direction using errcode = 'P0004';
  end if;

  -- Validate entry_type
  if p_entry_type not in (
    'SERVICE_REVENUE','POS_REVENUE','OTHER_INCOME','MDR_EXPENSE',
    'OPERATING_EXPENSE','STOCK_PURCHASE','COGS','CASH_ADJUSTMENT',
    'PAYMENT_REFUND','VOID_REVERSAL'
  ) then
    raise exception 'Invalid entry_type: %', p_entry_type using errcode = 'P0004';
  end if;

  -- Handle idempotency
  if p_idempotency_key is not null then
    select id into v_found_id
    from public.finance_ledger
    where brand_id = p_brand_id and idempotency_key = p_idempotency_key;

    if found then
      select entry_type, direction, amount,
             reference_type, reference_id::text,
             source_table, source_id::text
      into v_existing_entry_type, v_existing_direction, v_existing_amount,
           v_existing_ref_type, v_existing_ref_id,
           v_existing_src_tbl, v_existing_src_id
      from public.finance_ledger
      where id = v_found_id;

      if v_existing_entry_type != p_entry_type
         or v_existing_direction != p_direction
         or v_existing_amount != p_amount
         or coalesce(v_existing_ref_type, '') != coalesce(p_reference_type, '')
         or coalesce(v_existing_ref_id, '') != coalesce(p_reference_id::text, '')
         or coalesce(v_existing_src_tbl, '') != coalesce(p_source_table, '')
         or coalesce(v_existing_src_id, '') != coalesce(p_source_id::text, '') then
        raise exception 'Idempotency key % already exists with different payload (entry_type=%, direction=%, amount=%)',
          p_idempotency_key, v_existing_entry_type, v_existing_direction, v_existing_amount
          using errcode = 'P0004';
      end if;

      return v_found_id;
    end if;
  end if;

  insert into public.finance_ledger (
    brand_id, branch_id, ledger_date, occurred_at,
    entry_type, direction, amount,
    category, account_code,
    reference_type, reference_id,
    source_table, source_id,
    description, idempotency_key,
    metadata, created_by, created_at
  ) values (
    p_brand_id, p_branch_id, p_ledger_date, p_occurred_at,
    p_entry_type, p_direction, p_amount,
    p_category, p_account_code,
    p_reference_type, p_reference_id,
    p_source_table, p_source_id,
    p_description, p_idempotency_key,
    p_metadata, p_created_by, now()
  )
  returning id into v_ledger_id;

  return v_ledger_id;
end;
$func$;

create or replace function public.record_pos_sale(  p_brand_id integer,
  p_branch_id uuid,
  p_payment_method_id uuid,
  p_items jsonb,
  p_customer_id uuid default null,
  p_discount_amount numeric default 0,
  p_sold_at timestamptz default now(),
  p_notes text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null,
  p_idempotency_key text default null) returns jsonb
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
  perform 1 from public.brands where id = p_brand_id and lower(status) = 'active';
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

    if v_item.quantity <= 0 then
      raise exception 'Item % quantity must be positive, got %', v_item.inventory_item_id, v_item.quantity
        using errcode = '22023';
    end if;

    v_line_total := v_item.quantity * v_item.unit_price - coalesce(v_item.discount_amount, 0);
    if v_line_total < 0 then
      raise exception 'Line total cannot be negative for item %', v_item.inventory_item_id
        using errcode = '22023';
    end if;

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
    select cost_price, name into v_inv_item
    from public.inventory_items
    where id = v_item.inventory_item_id;

    v_line_total := v_item.quantity * v_item.unit_price - coalesce(v_item.discount_amount, 0);

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

    v_movement_key := 'pos_sale:' || v_sale_id || ':item:' || v_item.inventory_item_id || ':line:' || v_sale_item_id;

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

  update public.pos_sales
  set payment_account_movement_id = v_pa_movement_id
  where id = v_sale_id;

  -- Step 14: Write finance ledger entries
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

create or replace function public.open_store_shift(
  p_brand_id integer,
  p_branch_id uuid,
  p_opening_cash numeric,
  p_opening_notes text default null,
  p_opened_by uuid default null,
  p_metadata jsonb default '{}'
) returns uuid
language plpgsql
security definer
as $func$
declare
  v_cash_account_id   uuid;
  v_prev_shift        record;
  v_opening_diff      numeric(14,2);
  v_shift_number      text;
  v_shift_id          uuid;
begin
  -- Validate brand
  perform 1 from public.brands where id = p_brand_id and lower(status) = 'active';
  if not found then
    raise exception 'Brand % not found or deleted', p_brand_id using errcode = 'P0002';
  end if;

  -- Validate branch
  perform 1 from public.branches
  where id = p_branch_id and brand_id = p_brand_id and deleted_at is null;
  if not found then
    raise exception 'Branch % not found, deleted, or does not belong to brand %',
      p_branch_id, p_brand_id using errcode = 'P0002';
  end if;

  -- Ensure no OPEN shift exists
  perform 1 from public.store_shifts
  where branch_id = p_branch_id and shift_status = 'OPEN';
  if found then
    raise exception 'Branch % already has an OPEN shift. Close it before opening a new one.',
      p_branch_id using errcode = 'P0004';
  end if;

  -- Resolve CASH payment account for this branch
  select id into v_cash_account_id
  from public.payment_accounts
  where brand_id = p_brand_id
    and branch_id = p_branch_id
    and type = 'CASH'
    and is_cash_account = true
    and is_active = true
  order by is_system_account desc, is_default_receiving_account desc, id
  limit 1;

  if not found then
    raise exception 'No active CASH payment account found for branch %', p_branch_id
      using errcode = 'P0002';
  end if;

  -- Find previous closed shift
  select counted_closing_cash into v_prev_shift
  from public.store_shifts
  where branch_id = p_branch_id and shift_status = 'CLOSED'
  order by closed_at desc
  limit 1;

  -- Calculate opening difference
  v_opening_diff := p_opening_cash - coalesce(v_prev_shift.counted_closing_cash, 0);

  -- Generate shift number
  v_shift_number := public.generate_store_shift_number(p_brand_id);

  -- Insert shift
  insert into public.store_shifts (
    brand_id, branch_id, cash_account_id,
    shift_number, shift_status,
    opening_cash, previous_closing_cash, opening_difference,
    opened_at, opened_by, opening_notes,
    metadata, created_at, updated_at
  ) values (
    p_brand_id, p_branch_id, v_cash_account_id,
    v_shift_number, 'OPEN',
    p_opening_cash, v_prev_shift.counted_closing_cash, v_opening_diff,
    now(), p_opened_by, p_opening_notes,
    p_metadata, now(), now()
  )
  returning id into v_shift_id;

  -- Audit log
  insert into public.audit_logs (brand_id, actor_id, action, target_type, target_id, target_label, description, details, created_at)
  values (
    p_brand_id, p_opened_by, 'OPEN_SHIFT', 'store_shifts', v_shift_id, v_shift_number,
    'Opened shift ' || v_shift_number || ' with opening cash ' || p_opening_cash::text,
    jsonb_build_object('shift_number', v_shift_number, 'opening_cash', p_opening_cash),
    now()
  );

  return v_shift_id;
end;
$func$;

-- ============================================================
-- BEGIN SEED
-- ============================================================
DO $$
DECLARE
  -- Brand
  v_brand_id integer;
  
  -- Branches
  v_branch_smg_id uuid;
  v_branch_salatiga_id uuid;
  v_branch_sragen_id uuid;
  
  -- Cash accounts
  v_cash_smg_id uuid;
  v_cash_salatiga_id uuid;
  v_cash_sragen_id uuid;
  
  -- Payment methods
  v_pm_cash_id uuid;
  v_pm_qris_id uuid;
  v_pm_transfer_id uuid;
  v_pm_debit_id uuid;
  
  -- Payment accounts (non-cash)
  v_pa_qris_id uuid;
  v_pa_bca_id uuid;
  v_pa_debit_id uuid;
  
  -- Profiles
  v_prof_owner_id uuid;
  v_prof_master_id uuid;
  v_prof_admin_id uuid;
  v_prof_front_id uuid;
  v_prof_tech_id uuid;
  
  -- Memberships
  v_mem_owner_id uuid;
  v_mem_master_id uuid;
  v_mem_admin_id uuid;
  v_mem_front_id uuid;
  v_mem_tech_id uuid;
  
  -- Categories
  v_cat_sparepart_id uuid;
  v_cat_produk_id uuid;
  v_cat_tools_id uuid;
  
  -- Items
  v_item_battery_id uuid;
  v_item_lcd_id uuid;
  v_item_flex_id uuid;
  v_item_charger20_id uuid;
  v_item_cable_id uuid;
  v_item_tg_id uuid;
  v_item_charger67_id uuid;
  
  -- Customers
  v_cust_budi_id uuid;
  v_cust_siti_id uuid;
  v_cust_andi_id uuid;
  
  -- Services
  v_service_a_id uuid;
  v_service_b_id uuid;
  v_service_c_id uuid;
  v_service_number text;
  
  -- Payment results
  v_payment_result jsonb;
  v_pos_result jsonb;
  
  -- Shift
  v_shift_id uuid;
  v_shift_result jsonb;
  
BEGIN

  -- ============================================================
  -- PHASE 1: BRAND + BRANCHES + CASH ACCOUNTS
  -- ============================================================

  INSERT INTO public.brands (name, slug, status, timezone, currency, owner_name, owner_email)
  VALUES ('Kasservice', 'kasservice', 'active', 'Asia/Jakarta', 'IDR', 'Demo Owner', 'owner@kasservice.com')
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_brand_id FROM public.brands WHERE slug = 'kasservice';
  RAISE NOTICE 'Brand ID: %', v_brand_id;

  -- Semarang branch
  INSERT INTO public.branches (brand_id, name, code, address, is_active)
  SELECT v_brand_id, 'Kasservice Semarang', 'SMG', 'Jl. Pandanaran No. 123, Semarang', true
  WHERE NOT EXISTS (SELECT 1 FROM public.branches WHERE brand_id = v_brand_id AND name = 'Kasservice Semarang')
  RETURNING id INTO v_branch_smg_id;
  IF v_branch_smg_id IS NULL THEN
    SELECT id INTO v_branch_smg_id FROM public.branches WHERE brand_id = v_brand_id AND name = 'Kasservice Semarang';
  END IF;

  -- Salatiga branch
  INSERT INTO public.branches (brand_id, name, code, address, is_active)
  SELECT v_brand_id, 'Kasservice Salatiga', 'SLT', 'Jl. Diponegoro No. 45, Salatiga', true
  WHERE NOT EXISTS (SELECT 1 FROM public.branches WHERE brand_id = v_brand_id AND name = 'Kasservice Salatiga')
  RETURNING id INTO v_branch_salatiga_id;
  IF v_branch_salatiga_id IS NULL THEN
    SELECT id INTO v_branch_salatiga_id FROM public.branches WHERE brand_id = v_brand_id AND name = 'Kasservice Salatiga';
  END IF;

  -- Sragen branch
  INSERT INTO public.branches (brand_id, name, code, address, is_active)
  SELECT v_brand_id, 'Kasservice Sragen', 'SRG', 'Jl. Raya Solo No. 78, Sragen', true
  WHERE NOT EXISTS (SELECT 1 FROM public.branches WHERE brand_id = v_brand_id AND name = 'Kasservice Sragen')
  RETURNING id INTO v_branch_sragen_id;
  IF v_branch_sragen_id IS NULL THEN
    SELECT id INTO v_branch_sragen_id FROM public.branches WHERE brand_id = v_brand_id AND name = 'Kasservice Sragen';
  END IF;

  RAISE NOTICE 'Branches: SMG=%, SLT=%, SRG=%', v_branch_smg_id, v_branch_salatiga_id, v_branch_sragen_id;

  -- Create CASH accounts
  v_cash_smg_id := public.create_default_cash_account_for_branch(v_brand_id, v_branch_smg_id, 'Kasservice Semarang');
  v_cash_salatiga_id := public.create_default_cash_account_for_branch(v_brand_id, v_branch_salatiga_id, 'Kasservice Salatiga');
  v_cash_sragen_id := public.create_default_cash_account_for_branch(v_brand_id, v_branch_sragen_id, 'Kasservice Sragen');

  RAISE NOTICE 'CASH accounts created';

  -- ============================================================
  -- PHASE 2: PAYMENT METHODS + BRAND ACCOUNTS
  -- ============================================================

  -- Payment methods
  INSERT INTO public.payment_methods (brand_id, type, name, mdr_percentage, is_active)
  VALUES (v_brand_id, 'CASH', 'Tunai', 0, true)
  ON CONFLICT (brand_id, name) DO NOTHING;
  SELECT id INTO v_pm_cash_id FROM public.payment_methods WHERE brand_id = v_brand_id AND name = 'Tunai';

  INSERT INTO public.payment_methods (brand_id, type, name, mdr_percentage, is_active)
  VALUES (v_brand_id, 'QRIS', 'QRIS', 0.70, true)
  ON CONFLICT (brand_id, name) DO NOTHING;
  SELECT id INTO v_pm_qris_id FROM public.payment_methods WHERE brand_id = v_brand_id AND name = 'QRIS';

  INSERT INTO public.payment_methods (brand_id, type, name, mdr_percentage, is_active)
  VALUES (v_brand_id, 'TRANSFER', 'Transfer', 0, true)
  ON CONFLICT (brand_id, name) DO NOTHING;
  SELECT id INTO v_pm_transfer_id FROM public.payment_methods WHERE brand_id = v_brand_id AND name = 'Transfer';

  INSERT INTO public.payment_methods (brand_id, type, name, mdr_percentage, is_active)
  VALUES (v_brand_id, 'DEBIT', 'Debit', 0.50, true)
  ON CONFLICT (brand_id, name) DO NOTHING;
  SELECT id INTO v_pm_debit_id FROM public.payment_methods WHERE brand_id = v_brand_id AND name = 'Debit';

  RAISE NOTICE 'Payment methods created';

  -- Brand-level non-cash payment accounts
  INSERT INTO public.payment_accounts (brand_id, account_name, type, is_cash_account, description)
  SELECT v_brand_id, 'QRIS Kasservice', 'QRIS', false, 'Brand-level QRIS settlement account'
  WHERE NOT EXISTS (SELECT 1 FROM public.payment_accounts WHERE brand_id = v_brand_id AND branch_id IS NULL AND type = 'QRIS')
  RETURNING id INTO v_pa_qris_id;
  IF v_pa_qris_id IS NULL THEN
    SELECT id INTO v_pa_qris_id FROM public.payment_accounts WHERE brand_id = v_brand_id AND branch_id IS NULL AND type = 'QRIS' LIMIT 1;
  END IF;

  INSERT INTO public.payment_accounts (brand_id, account_name, type, is_cash_account, account_holder_name, bank_name, description)
  SELECT v_brand_id, 'BCA Kasservice', 'TRANSFER', false, 'Kasservice', 'BCA', 'Brand-level BCA transfer account'
  WHERE NOT EXISTS (SELECT 1 FROM public.payment_accounts WHERE brand_id = v_brand_id AND branch_id IS NULL AND type = 'TRANSFER')
  RETURNING id INTO v_pa_bca_id;
  IF v_pa_bca_id IS NULL THEN
    SELECT id INTO v_pa_bca_id FROM public.payment_accounts WHERE brand_id = v_brand_id AND branch_id IS NULL AND type = 'TRANSFER' LIMIT 1;
  END IF;

  INSERT INTO public.payment_accounts (brand_id, account_name, type, is_cash_account, description)
  SELECT v_brand_id, 'Debit Kasservice', 'DEBIT', false, 'Brand-level debit card settlement account'
  WHERE NOT EXISTS (SELECT 1 FROM public.payment_accounts WHERE brand_id = v_brand_id AND branch_id IS NULL AND type = 'DEBIT')
  RETURNING id INTO v_pa_debit_id;
  IF v_pa_debit_id IS NULL THEN
    SELECT id INTO v_pa_debit_id FROM public.payment_accounts WHERE brand_id = v_brand_id AND branch_id IS NULL AND type = 'DEBIT' LIMIT 1;
  END IF;

  -- Set default payment accounts
  UPDATE public.payment_methods SET default_payment_account_id = v_pa_qris_id WHERE id = v_pm_qris_id;
  UPDATE public.payment_methods SET default_payment_account_id = v_pa_bca_id WHERE id = v_pm_transfer_id;
  UPDATE public.payment_methods SET default_payment_account_id = v_pa_debit_id WHERE id = v_pm_debit_id;

  -- Activate payment methods for Semarang
  INSERT INTO public.branch_payment_methods (brand_id, branch_id, method_type, payment_account_id, is_active)
  VALUES (v_brand_id, v_branch_smg_id, 'CASH', NULL, true)
  ON CONFLICT (brand_id, branch_id, method_type) DO UPDATE SET is_active = true;

  INSERT INTO public.branch_payment_methods (brand_id, branch_id, method_type, payment_account_id, is_active)
  VALUES (v_brand_id, v_branch_smg_id, 'QRIS', v_pa_qris_id, true)
  ON CONFLICT (brand_id, branch_id, method_type) DO UPDATE SET is_active = true, payment_account_id = v_pa_qris_id;

  INSERT INTO public.branch_payment_methods (brand_id, branch_id, method_type, payment_account_id, is_active)
  VALUES (v_brand_id, v_branch_smg_id, 'TRANSFER', v_pa_bca_id, true)
  ON CONFLICT (brand_id, branch_id, method_type) DO UPDATE SET is_active = true, payment_account_id = v_pa_bca_id;

  INSERT INTO public.branch_payment_methods (brand_id, branch_id, method_type, payment_account_id, is_active)
  VALUES (v_brand_id, v_branch_smg_id, 'DEBIT', v_pa_debit_id, true)
  ON CONFLICT (brand_id, branch_id, method_type) DO UPDATE SET is_active = true, payment_account_id = v_pa_debit_id;

  -- Activate CASH only for Salatiga and Sragen
  INSERT INTO public.branch_payment_methods (brand_id, branch_id, method_type, is_active)
  VALUES (v_brand_id, v_branch_salatiga_id, 'CASH', true)
  ON CONFLICT (brand_id, branch_id, method_type) DO UPDATE SET is_active = true;

  INSERT INTO public.branch_payment_methods (brand_id, branch_id, method_type, is_active)
  VALUES (v_brand_id, v_branch_sragen_id, 'CASH', true)
  ON CONFLICT (brand_id, branch_id, method_type) DO UPDATE SET is_active = true;

  RAISE NOTICE 'Branch payment methods activated';

  -- ============================================================
  -- PHASE 3: PROFILES (auth_user_id = NULL)
  -- ============================================================

  -- Platform Owner
  INSERT INTO public.profiles (name, email, is_active)
  SELECT 'Platform Owner', 'owner@kasservice.com', true
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'owner@kasservice.com')
  RETURNING id INTO v_prof_owner_id;
  IF v_prof_owner_id IS NULL THEN
    SELECT id INTO v_prof_owner_id FROM public.profiles WHERE email = 'owner@kasservice.com' AND name = 'Platform Owner';
  END IF;

  -- Master Admin
  INSERT INTO public.profiles (name, email, preferred_brand_id, is_active)
  SELECT 'Master Admin', 'master@kasservice.com', v_brand_id, true
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'master@kasservice.com')
  RETURNING id INTO v_prof_master_id;
  IF v_prof_master_id IS NULL THEN
    SELECT id INTO v_prof_master_id FROM public.profiles WHERE email = 'master@kasservice.com' AND name = 'Master Admin';
  END IF;

  -- Admin Cabang
  INSERT INTO public.profiles (name, email, preferred_brand_id, is_active)
  SELECT 'Admin Cabang', 'admin.smg@kasservice.com', v_brand_id, true
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'admin.smg@kasservice.com')
  RETURNING id INTO v_prof_admin_id;
  IF v_prof_admin_id IS NULL THEN
    SELECT id INTO v_prof_admin_id FROM public.profiles WHERE email = 'admin.smg@kasservice.com' AND name = 'Admin Cabang';
  END IF;

  -- Frontliner
  INSERT INTO public.profiles (name, email, preferred_brand_id, is_active)
  SELECT 'Frontliner', 'frontliner.smg@kasservice.com', v_brand_id, true
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'frontliner.smg@kasservice.com')
  RETURNING id INTO v_prof_front_id;
  IF v_prof_front_id IS NULL THEN
    SELECT id INTO v_prof_front_id FROM public.profiles WHERE email = 'frontliner.smg@kasservice.com' AND name = 'Frontliner';
  END IF;

  -- Technician
  INSERT INTO public.profiles (name, email, preferred_brand_id, is_active)
  SELECT 'Technician', 'tech.smg@kasservice.com', v_brand_id, true
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'tech.smg@kasservice.com')
  RETURNING id INTO v_prof_tech_id;
  IF v_prof_tech_id IS NULL THEN
    SELECT id INTO v_prof_tech_id FROM public.profiles WHERE email = 'tech.smg@kasservice.com' AND name = 'Technician';
  END IF;

  RAISE NOTICE 'Profiles created: owner=%, master=%, admin=%, front=%, tech=%',
    v_prof_owner_id, v_prof_master_id, v_prof_admin_id, v_prof_front_id, v_prof_tech_id;

  -- ============================================================
  -- PHASE 3b: USER BRAND MEMBERSHIPS + BRANCH ACCESS
  -- ============================================================

  -- Platform Owner membership (brand_id = NULL per CHECK constraint)
  IF v_prof_owner_id IS NOT NULL THEN
    INSERT INTO public.user_brand_memberships (profile_id, brand_id, role, is_active)
    SELECT v_prof_owner_id, NULL, 'PLATFORM_OWNER', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_owner_id AND brand_id IS NULL AND role = 'PLATFORM_OWNER'
    )
    RETURNING id INTO v_mem_owner_id;
    IF v_mem_owner_id IS NULL THEN
      SELECT id INTO v_mem_owner_id FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_owner_id AND brand_id IS NULL AND role = 'PLATFORM_OWNER';
    END IF;
  END IF;

  -- Master Admin membership
  IF v_prof_master_id IS NOT NULL THEN
    INSERT INTO public.user_brand_memberships (profile_id, brand_id, role, is_active)
    SELECT v_prof_master_id, v_brand_id, 'MASTER_ADMIN', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_master_id AND brand_id = v_brand_id AND role = 'MASTER_ADMIN'
    )
    RETURNING id INTO v_mem_master_id;
    IF v_mem_master_id IS NULL THEN
      SELECT id INTO v_mem_master_id FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_master_id AND brand_id = v_brand_id AND role = 'MASTER_ADMIN';
    END IF;
  END IF;

  -- Admin Cabang membership
  IF v_prof_admin_id IS NOT NULL THEN
    INSERT INTO public.user_brand_memberships (profile_id, brand_id, role, is_active)
    SELECT v_prof_admin_id, v_brand_id, 'ADMIN', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_admin_id AND brand_id = v_brand_id AND role = 'ADMIN'
    )
    RETURNING id INTO v_mem_admin_id;
    IF v_mem_admin_id IS NULL THEN
      SELECT id INTO v_mem_admin_id FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_admin_id AND brand_id = v_brand_id AND role = 'ADMIN';
    END IF;
  END IF;

  -- Frontliner membership
  IF v_prof_front_id IS NOT NULL THEN
    INSERT INTO public.user_brand_memberships (profile_id, brand_id, role, is_active)
    SELECT v_prof_front_id, v_brand_id, 'FRONTLINER', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_front_id AND brand_id = v_brand_id AND role = 'FRONTLINER'
    )
    RETURNING id INTO v_mem_front_id;
    IF v_mem_front_id IS NULL THEN
      SELECT id INTO v_mem_front_id FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_front_id AND brand_id = v_brand_id AND role = 'FRONTLINER';
    END IF;
  END IF;

  -- Technician membership
  IF v_prof_tech_id IS NOT NULL THEN
    INSERT INTO public.user_brand_memberships (profile_id, brand_id, role, is_active)
    SELECT v_prof_tech_id, v_brand_id, 'TECHNICIAN', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_tech_id AND brand_id = v_brand_id AND role = 'TECHNICIAN'
    )
    RETURNING id INTO v_mem_tech_id;
    IF v_mem_tech_id IS NULL THEN
      SELECT id INTO v_mem_tech_id FROM public.user_brand_memberships 
      WHERE profile_id = v_prof_tech_id AND brand_id = v_brand_id AND role = 'TECHNICIAN';
    END IF;
  END IF;

  RAISE NOTICE 'Memberships created';

  -- Branch access: Admin, Frontliner, Technician -> Semarang
  IF v_mem_admin_id IS NOT NULL THEN
    INSERT INTO public.user_branch_access (membership_id, branch_id, is_active)
    SELECT v_mem_admin_id, v_branch_smg_id, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_branch_access 
      WHERE membership_id = v_mem_admin_id AND branch_id = v_branch_smg_id
    );
  END IF;

  IF v_mem_front_id IS NOT NULL THEN
    INSERT INTO public.user_branch_access (membership_id, branch_id, is_active)
    SELECT v_mem_front_id, v_branch_smg_id, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_branch_access 
      WHERE membership_id = v_mem_front_id AND branch_id = v_branch_smg_id
    );
  END IF;

  IF v_mem_tech_id IS NOT NULL THEN
    INSERT INTO public.user_branch_access (membership_id, branch_id, is_active)
    SELECT v_mem_tech_id, v_branch_smg_id, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_branch_access 
      WHERE membership_id = v_mem_tech_id AND branch_id = v_branch_smg_id
    );
  END IF;

  RAISE NOTICE 'Branch access granted';

  -- ============================================================
  -- PHASE 4: INVENTORY CATEGORIES + ITEMS + STOCK
  -- ============================================================

  -- Categories
  INSERT INTO public.inventory_categories (brand_id, name, description, sort_order, is_active)
  SELECT v_brand_id, 'Sparepart', 'Sparepart service', 1, true
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE brand_id = v_brand_id AND name = 'Sparepart')
  RETURNING id INTO v_cat_sparepart_id;
  IF v_cat_sparepart_id IS NULL THEN
    SELECT id INTO v_cat_sparepart_id FROM public.inventory_categories WHERE brand_id = v_brand_id AND name = 'Sparepart';
  END IF;

  INSERT INTO public.inventory_categories (brand_id, name, description, sort_order, is_active)
  SELECT v_brand_id, 'Produk', 'Produk ritel', 2, true
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE brand_id = v_brand_id AND name = 'Produk')
  RETURNING id INTO v_cat_produk_id;
  IF v_cat_produk_id IS NULL THEN
    SELECT id INTO v_cat_produk_id FROM public.inventory_categories WHERE brand_id = v_brand_id AND name = 'Produk';
  END IF;

  INSERT INTO public.inventory_categories (brand_id, name, description, sort_order, is_active)
  SELECT v_brand_id, 'Tools', 'Tools dan perlengkapan', 3, true
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE brand_id = v_brand_id AND name = 'Tools')
  RETURNING id INTO v_cat_tools_id;
  IF v_cat_tools_id IS NULL THEN
    SELECT id INTO v_cat_tools_id FROM public.inventory_categories WHERE brand_id = v_brand_id AND name = 'Tools';
  END IF;

  -- Items - Spareparts
  INSERT INTO public.inventory_items (brand_id, category_id, item_type, name, sku, cost_price, selling_price, min_stock)
  SELECT v_brand_id, v_cat_sparepart_id, 'SPAREPART', 'Battery iPhone 11', 'SP-BAT-IP11', 200000, 450000, 3
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Battery iPhone 11')
  RETURNING id INTO v_item_battery_id;
  IF v_item_battery_id IS NULL THEN
    SELECT id INTO v_item_battery_id FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Battery iPhone 11';
  END IF;

  INSERT INTO public.inventory_items (brand_id, category_id, item_type, name, sku, cost_price, selling_price, min_stock)
  SELECT v_brand_id, v_cat_sparepart_id, 'SPAREPART', 'LCD iPhone 11', 'SP-LCD-IP11', 350000, 750000, 2
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'LCD iPhone 11')
  RETURNING id INTO v_item_lcd_id;
  IF v_item_lcd_id IS NULL THEN
    SELECT id INTO v_item_lcd_id FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'LCD iPhone 11';
  END IF;

  INSERT INTO public.inventory_items (brand_id, category_id, item_type, name, sku, cost_price, selling_price, min_stock)
  SELECT v_brand_id, v_cat_sparepart_id, 'SPAREPART', 'Flexible Charging iPhone 11', 'SP-FLX-IP11', 80000, 200000, 3
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Flexible Charging iPhone 11')
  RETURNING id INTO v_item_flex_id;
  IF v_item_flex_id IS NULL THEN
    SELECT id INTO v_item_flex_id FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Flexible Charging iPhone 11';
  END IF;

  -- Items - Products
  INSERT INTO public.inventory_items (brand_id, category_id, item_type, name, sku, cost_price, selling_price, min_stock)
  SELECT v_brand_id, v_cat_produk_id, 'PRODUCT', 'Charger 20W', 'PRD-CHG-20W', 35000, 50000, 5
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Charger 20W')
  RETURNING id INTO v_item_charger20_id;
  IF v_item_charger20_id IS NULL THEN
    SELECT id INTO v_item_charger20_id FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Charger 20W';
  END IF;

  INSERT INTO public.inventory_items (brand_id, category_id, item_type, name, sku, cost_price, selling_price, min_stock)
  SELECT v_brand_id, v_cat_produk_id, 'PRODUCT', 'Kabel Type-C', 'PRD-CBL-TPC', 10000, 20000, 10
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Kabel Type-C')
  RETURNING id INTO v_item_cable_id;
  IF v_item_cable_id IS NULL THEN
    SELECT id INTO v_item_cable_id FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Kabel Type-C';
  END IF;

  INSERT INTO public.inventory_items (brand_id, category_id, item_type, name, sku, cost_price, selling_price, min_stock)
  SELECT v_brand_id, v_cat_produk_id, 'PRODUCT', 'Tempered Glass iPhone', 'PRD-TG-IP', 8000, 25000, 10
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Tempered Glass iPhone')
  RETURNING id INTO v_item_tg_id;
  IF v_item_tg_id IS NULL THEN
    SELECT id INTO v_item_tg_id FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Tempered Glass iPhone';
  END IF;

  INSERT INTO public.inventory_items (brand_id, category_id, item_type, name, sku, cost_price, selling_price, min_stock)
  SELECT v_brand_id, v_cat_produk_id, 'PRODUCT', 'Charger Original 67W', 'PRD-CHG-67W', 350000, 600000, 2
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Charger Original 67W')
  RETURNING id INTO v_item_charger67_id;
  IF v_item_charger67_id IS NULL THEN
    SELECT id INTO v_item_charger67_id FROM public.inventory_items WHERE brand_id = v_brand_id AND name = 'Charger Original 67W';
  END IF;

  RAISE NOTICE 'Items created';

  -- Opening stock for Semarang branch via add_inventory_movement
  PERFORM public.add_inventory_movement(
    v_brand_id, v_branch_smg_id, v_item_battery_id,
    'IN', 'OPENING_STOCK', 10, 200000,
    'seed', NULL,
    'seed:inventory:battery:opening',
    'Opening stock: Battery iPhone 11', '{}', v_prof_admin_id
  );

  PERFORM public.add_inventory_movement(
    v_brand_id, v_branch_smg_id, v_item_lcd_id,
    'IN', 'OPENING_STOCK', 5, 350000,
    'seed', NULL,
    'seed:inventory:lcd:opening',
    'Opening stock: LCD iPhone 11', '{}', v_prof_admin_id
  );

  PERFORM public.add_inventory_movement(
    v_brand_id, v_branch_smg_id, v_item_flex_id,
    'IN', 'OPENING_STOCK', 8, 80000,
    'seed', NULL,
    'seed:inventory:flex:opening',
    'Opening stock: Flexible Charging iPhone 11', '{}', v_prof_admin_id
  );

  PERFORM public.add_inventory_movement(
    v_brand_id, v_branch_smg_id, v_item_charger20_id,
    'IN', 'OPENING_STOCK', 20, 35000,
    'seed', NULL,
    'seed:inventory:charger20:opening',
    'Opening stock: Charger 20W', '{}', v_prof_admin_id
  );

  PERFORM public.add_inventory_movement(
    v_brand_id, v_branch_smg_id, v_item_cable_id,
    'IN', 'OPENING_STOCK', 30, 10000,
    'seed', NULL,
    'seed:inventory:cable:opening',
    'Opening stock: Kabel Type-C', '{}', v_prof_admin_id
  );

  PERFORM public.add_inventory_movement(
    v_brand_id, v_branch_smg_id, v_item_tg_id,
    'IN', 'OPENING_STOCK', 50, 8000,
    'seed', NULL,
    'seed:inventory:tempered:opening',
    'Opening stock: Tempered Glass iPhone', '{}', v_prof_admin_id
  );

  PERFORM public.add_inventory_movement(
    v_brand_id, v_branch_smg_id, v_item_charger67_id,
    'IN', 'OPENING_STOCK', 10, 350000,
    'seed', NULL,
    'seed:inventory:charger67:opening',
    'Opening stock: Charger Original 67W', '{}', v_prof_admin_id
  );

  RAISE NOTICE 'Opening stock added for Semarang';

  -- ============================================================
  -- PHASE 5: CUSTOMERS
  -- ============================================================

  INSERT INTO public.customers (brand_id, name, phone, email)
  SELECT v_brand_id, 'Budi Santoso', '081234567890', 'budi@email.com'
  WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE brand_id = v_brand_id AND phone = '081234567890')
  RETURNING id INTO v_cust_budi_id;
  IF v_cust_budi_id IS NULL THEN
    SELECT id INTO v_cust_budi_id FROM public.customers WHERE brand_id = v_brand_id AND phone = '081234567890';
  END IF;

  INSERT INTO public.customers (brand_id, name, phone, email)
  SELECT v_brand_id, 'Siti Aminah', '081234567891', 'siti@email.com'
  WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE brand_id = v_brand_id AND phone = '081234567891')
  RETURNING id INTO v_cust_siti_id;
  IF v_cust_siti_id IS NULL THEN
    SELECT id INTO v_cust_siti_id FROM public.customers WHERE brand_id = v_brand_id AND phone = '081234567891';
  END IF;

  INSERT INTO public.customers (brand_id, name, phone, email)
  SELECT v_brand_id, 'Andi Pratama', '081234567892', 'andi@email.com'
  WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE brand_id = v_brand_id AND phone = '081234567892')
  RETURNING id INTO v_cust_andi_id;
  IF v_cust_andi_id IS NULL THEN
    SELECT id INTO v_cust_andi_id FROM public.customers WHERE brand_id = v_brand_id AND phone = '081234567892';
  END IF;

  RAISE NOTICE 'Customers created';

  -- ============================================================
  -- PHASE 6: SERVICES
  -- ============================================================

  -- ---- SERVICE A: DONE and paid (Budi Santoso, Battery replacement) ----
  v_service_number := public.generate_service_number(v_brand_id);

  INSERT INTO public.services (
    brand_id, branch_id, customer_id, service_number,
    device_type, device_brand, device_model, device_imei,
    reported_issue, diagnosis_result, solution_notes,
    current_status, final_cost, created_by
  ) VALUES (
    v_brand_id, v_branch_smg_id, v_cust_budi_id, v_service_number,
    'Smartphone', 'Apple', 'iPhone 11', 'IMEI1234567890',
    'Battery cepat habis, perlu diganti',
    'Battery health 72%, perlu replacement',
    'Ganti battery dengan sparepart original',
    'INTAKE', 450000, v_prof_admin_id
  )
  RETURNING id INTO v_service_a_id;

  -- Transition: INTAKE -> DIAGNOSIS -> WAITING_APPROVAL -> REPAIRING
  PERFORM public.transition_service_status(v_service_a_id, 'DIAGNOSIS', 'Diagnosis completed', '{}', v_prof_tech_id);
  PERFORM public.transition_service_status(v_service_a_id, 'WAITING_APPROVAL', 'Customer approved', '{}', v_prof_front_id);
  PERFORM public.transition_service_status(v_service_a_id, 'REPAIRING', 'Start repair', '{}', v_prof_tech_id);

  -- Use sparepart: Battery iPhone 11 qty 1
  PERFORM public.add_service_sparepart_usage(
    v_service_a_id, v_item_battery_id, 1, 200000, 450000,
    'Battery replacement', v_prof_tech_id,
    'seed:sparepart:service_a:battery'
  );

  -- Transition: REPAIRING -> QC -> DONE
  PERFORM public.transition_service_status(v_service_a_id, 'QC', 'QC passed', '{}', v_prof_tech_id);
  PERFORM public.transition_service_status(v_service_a_id, 'DONE', 'Completed', '{}', v_prof_admin_id);

  -- Record payment (CASH, 450000)
  v_payment_result := public.record_service_payment(
    v_service_a_id, v_pm_cash_id, 450000,
    NOW(), NULL, '{}', v_prof_front_id,
    'seed:payment:service_a'
  );
  RAISE NOTICE 'Service A payment result: %', v_payment_result;

  -- Record finance entries
  PERFORM public.record_service_payment_finance_entries(
    (v_payment_result ->> 'service_payment_id')::uuid,
    v_prof_admin_id
  );

  RAISE NOTICE 'Service A completed and paid';

  -- ---- SERVICE B: REPAIRING (Siti Aminah, LCD replacement) ----
  v_service_number := public.generate_service_number(v_brand_id);

  INSERT INTO public.services (
    brand_id, branch_id, customer_id, service_number,
    device_type, device_brand, device_model, device_imei,
    reported_issue, diagnosis_result,
    current_status, final_cost, created_by
  ) VALUES (
    v_brand_id, v_branch_smg_id, v_cust_siti_id, v_service_number,
    'Smartphone', 'Apple', 'iPhone 11', 'IMEI9876543210',
    'LCD blank, tidak ada tampilan',
    'LCD rusak, perlu replacement',
    'INTAKE', 750000, v_prof_front_id
  )
  RETURNING id INTO v_service_b_id;

  -- Transition: INTAKE -> DIAGNOSIS -> WAITING_APPROVAL -> REPAIRING
  PERFORM public.transition_service_status(v_service_b_id, 'DIAGNOSIS', 'Diagnosis completed', '{}', v_prof_tech_id);
  PERFORM public.transition_service_status(v_service_b_id, 'WAITING_APPROVAL', 'Customer approved estimate', '{}', v_prof_front_id);
  PERFORM public.transition_service_status(v_service_b_id, 'REPAIRING', 'Start repair', '{}', v_prof_tech_id);

  -- Use sparepart: LCD iPhone 11 qty 1 (cost 350000, sell 750000)
  PERFORM public.add_service_sparepart_usage(
    v_service_b_id, v_item_lcd_id, 1, 350000, 750000,
    'LCD replacement', v_prof_tech_id,
    'seed:sparepart:service_b:lcd'
  );

  RAISE NOTICE 'Service B in REPAIRING status';

  -- ---- SERVICE C: DIAGNOSIS (Andi Pratama, charging issue) ----
  v_service_number := public.generate_service_number(v_brand_id);

  INSERT INTO public.services (
    brand_id, branch_id, customer_id, service_number,
    device_type, device_brand, device_model, device_imei,
    reported_issue, current_status, created_by
  ) VALUES (
    v_brand_id, v_branch_smg_id, v_cust_andi_id, v_service_number,
    'Smartphone', 'Apple', 'iPhone 12', 'IMEI5555555555',
    'Tidak bisa charge, kabel dan adaptor sudah dicoba',
    'INTAKE', v_prof_front_id
  )
  RETURNING id INTO v_service_c_id;

  -- Transition: INTAKE -> DIAGNOSIS
  PERFORM public.transition_service_status(v_service_c_id, 'DIAGNOSIS', 'Diagnosis in progress', '{}', v_prof_tech_id);

  RAISE NOTICE 'Service C in DIAGNOSIS status';

  -- ============================================================
  -- PHASE 7: POS SALES
  -- ============================================================

  -- POS Sale 1: QRIS small (total 100.000, MDR should be 0 because <= 500.000)
  v_pos_result := public.record_pos_sale(
  p_brand_id := v_brand_id,
  p_branch_id := v_branch_smg_id,
  p_payment_method_id := v_pm_qris_id,
  p_items := jsonb_build_array(
      jsonb_build_object('inventory_item_id', v_item_charger20_id, 'quantity', 1, 'unit_price', 50000),
      jsonb_build_object('inventory_item_id', v_item_tg_id, 'quantity', 2, 'unit_price', 25000)
    ),
  p_customer_id := v_cust_budi_id,
  p_discount_amount := 0,
  p_sold_at := NOW(),
  p_notes := 'QRIS small test: under threshold',
  p_metadata := '{}',
  p_created_by := v_prof_front_id,
  p_idempotency_key := 'seed:pos:qris_small'
);
  RAISE NOTICE 'POS small QRIS sale result: %', v_pos_result;

  -- POS Sale 2: QRIS large (total 600.000, MDR should be > 0)
v_pos_result := public.record_pos_sale(
  p_brand_id := v_brand_id,
  p_branch_id := v_branch_smg_id,
  p_payment_method_id := v_pm_qris_id,
  p_items := jsonb_build_array(
      jsonb_build_object('inventory_item_id', v_item_charger67_id, 'quantity', 1, 'unit_price', 600000)
  ),
  p_customer_id := v_cust_andi_id,
  p_discount_amount := 0,
  p_sold_at := NOW(),
  p_notes := 'QRIS large test: over threshold',
  p_metadata := '{}',
  p_created_by := v_prof_front_id,
  p_idempotency_key := 'seed:pos:qris_large'
);
  RAISE NOTICE 'POS large QRIS sale result: %', v_pos_result;

  RAISE NOTICE 'POS sales completed';

  -- ============================================================
  -- PHASE 8: STORE SHIFT (Semarang)
  -- ============================================================

  -- Open shift with opening cash 1,000,000
  v_shift_id := public.open_store_shift(
    v_brand_id, v_branch_smg_id, 1000000,
    'Opening shift for demo - mencakup Service A CASH payment',
    v_prof_admin_id, '{}'
  );
  RAISE NOTICE 'Shift opened: %', v_shift_id;

  -- Close shift: expected = opening + CASH service payment (450000)
  -- Cash difference +5000 (over count)
  v_shift_result := public.close_store_shift(
    v_shift_id, 1455000,
    'Closing shift - counted 5000 more than expected (over count)',
    v_prof_admin_id, '{}'
  );
  RAISE NOTICE 'Shift closed: %', v_shift_result;

  RAISE NOTICE 'Store shift demo completed';

  -- ============================================================
  -- END SEED
  -- ============================================================

END;
$$;

-- ============================================================
-- MANUAL AUTH LINKING INSTRUCTIONS
-- ============================================================
-- After running this migration, profiles exist but have NULL
-- auth_user_id. To link them to Supabase Auth users:
--
-- 1. Create auth users via Supabase Dashboard > Authentication > Users
--    or via the Supabase Auth signUp() API with these emails:
--
--    Email                     | Password (example)
--    --------------------------|-------------------
--    owner@kasservice.com      | demo-password-1
--    master@kasservice.com     | demo-password-2
--    admin.smg@kasservice.com  | demo-password-3
--    frontliner.smg@kasservice.com | demo-password-4
--    tech.smg@kasservice.com   | demo-password-5
--
-- 2. After creating each auth user, run:
--
--    UPDATE public.profiles
--    SET auth_user_id = '<auth_user_uuid_from_dashboard>'
--    WHERE email = '<email>';
--
-- 3. Verify with:
--
--    SELECT p.name, p.email, p.auth_user_id IS NOT NULL AS linked
--    FROM public.profiles p
--    ORDER BY p.created_at;
-- ============================================================

-- ============================================================
-- VALIDATION QUERIES (uncomment to run)
-- ============================================================

-- -- V1: Check payment account balances
-- SELECT pa.account_name, pa.type, pa.current_balance
-- FROM public.payment_accounts pa
-- WHERE pa.brand_id = (SELECT id FROM public.brands WHERE slug = 'kasservice')
-- ORDER BY pa.type, pa.account_name;

-- -- V2: Check inventory stock after service and POS
-- SELECT ii.name, bis.current_stock, bis.available_stock
-- FROM public.branch_inventory_stocks bis
-- JOIN public.inventory_items ii ON ii.id = bis.item_id
-- WHERE bis.brand_id = (SELECT id FROM public.brands WHERE slug = 'kasservice')
-- ORDER BY ii.name;

-- -- V3: Check service payment -> finance ledger
-- SELECT fl.entry_type, fl.direction, fl.amount, fl.description
-- FROM public.finance_ledger fl
-- WHERE fl.brand_id = (SELECT id FROM public.brands WHERE slug = 'kasservice')
-- ORDER BY fl.created_at;

-- -- V4: Check POS sale -> inventory movement + finance ledger
-- SELECT im.movement_type, im.direction, im.quantity, im.item_id
-- FROM public.inventory_movements im
-- WHERE im.brand_id = (SELECT id FROM public.brands WHERE slug = 'kasservice')
--   AND im.movement_type = 'POS_SALE'
-- ORDER BY im.created_at;

-- -- V5: Check QRIS small transaction MDR = 0
-- SELECT ps.sale_number, ps.gross_amount, ps.discount_amount,
--        ps.customer_paid_amount, ps.mdr_amount, ps.net_amount
-- FROM public.reporting_pos_sales ps
-- WHERE ps.brand_id = (SELECT id FROM public.brands WHERE slug = 'kasservice')
-- ORDER BY ps.sold_at;

-- -- V6: Check QRIS large transaction MDR > 0
-- (same query as V5, look for sale with mdr_amount > 0)

-- -- V7: Check reporting_daily_finance_summary returns rows
-- SELECT * FROM public.daily_finance_summary
-- WHERE brand_id = (SELECT id FROM public.brands WHERE slug = 'kasservice')
-- ORDER BY ledger_date;

-- -- V8: Check reporting_payment_method_summary returns CASH/QRIS
-- SELECT * FROM public.payment_method_summary
-- WHERE brand_id = (SELECT id FROM public.brands WHERE slug = 'kasservice')
-- ORDER BY payment_method_type;

-- -- V9: Check reporting_store_shift_summary returns shift data
-- SELECT * FROM public.store_shift_summary
-- WHERE brand_id = (SELECT id FROM public.brands WHERE slug = 'kasservice');

-- -- V10: Check payment_account_balance_summary balance_difference = 0
-- WITH account_balance_check AS (
--   SELECT
--     pa.id,
--     pa.account_name,
--     pa.current_balance AS cached_balance,
--     COALESCE(SUM(
--       CASE WHEN pam.direction = 'IN' THEN pam.amount
--            WHEN pam.direction = 'OUT' THEN -pam.amount
--       END
--     ), 0) AS movement_balance
--   FROM public.payment_accounts pa
--   LEFT JOIN public.payment_account_movements pam ON pam.payment_account_id = pa.id
--   WHERE pa.brand_id = (SELECT id FROM public.brands WHERE slug = 'kasservice')
--   GROUP BY pa.id, pa.account_name, pa.current_balance
-- )
-- SELECT account_name, cached_balance, movement_balance,
--        (cached_balance - movement_balance) AS balance_difference
-- FROM account_balance_check
-- WHERE ABS(cached_balance - movement_balance) > 0.01;
-- ============================================================
