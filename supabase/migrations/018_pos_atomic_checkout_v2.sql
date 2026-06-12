-- ============================================================
-- Migration 018: POS Atomic Checkout V2
-- Full POS checkout for products, spareparts, serialized device units, and trade-ins.
-- Does not replace public.record_pos_sale(); adds public.record_pos_sale_v2().
-- ============================================================

-- ============================================================
-- 1. Additive columns for full POS totals and serialized unit linkage
-- ============================================================

alter table public.pos_sales
  add column if not exists trade_in_amount numeric(14,2) not null default 0 check (trade_in_amount >= 0),
  add column if not exists paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  add column if not exists change_amount numeric(14,2) not null default 0 check (change_amount >= 0);

alter table public.pos_sales
  drop constraint if exists pos_sales_net_amount_check;

alter table public.pos_sales
  add constraint pos_sales_net_amount_check
  check (net_amount = gross_amount - discount_amount - trade_in_amount - mdr_amount);

alter table public.pos_sale_items
  add column if not exists inventory_item_unit_id uuid references public.inventory_item_units(id) on delete set null,
  add column if not exists item_type text,
  add column if not exists name_snapshot text,
  add column if not exists sku_snapshot text;

create index if not exists idx_psi_item_unit
  on public.pos_sale_items (inventory_item_unit_id)
  where inventory_item_unit_id is not null;

-- ============================================================
-- 2. Atomic full POS checkout RPC
-- ============================================================

create or replace function public.record_pos_sale_v2(
  p_brand_id integer,
  p_branch_id uuid,
  p_payment_method_id uuid,
  p_items jsonb,
  p_payment_amount numeric,
  p_customer_id uuid default null,
  p_discount_amount numeric default 0,
  p_trade_in jsonb default null,
  p_sold_at timestamptz default now(),
  p_notes text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_item record;
  v_inv_item record;
  v_stock record;
  v_unit record;
  v_resolved jsonb;
  v_account_id uuid;
  v_method_type text;
  v_mdr_pct numeric(5,2);
  v_gross_amount numeric(14,2) := 0;
  v_total_item_disc numeric(14,2) := 0;
  v_total_discount numeric(14,2) := 0;
  v_subtotal_after_discount numeric(14,2) := 0;
  v_trade_in_amount numeric(14,2) := 0;
  v_amount_due numeric(14,2) := 0;
  v_payment_received numeric(14,2) := 0;
  v_change_amount numeric(14,2) := 0;
  v_mdr_amount numeric(14,2) := 0;
  v_net_amount numeric(14,2) := 0;
  v_sale_number text;
  v_final_key text;
  v_sale_id uuid;
  v_sale_item_id uuid;
  v_movement_id uuid;
  v_movement_key text;
  v_pa_movement_id uuid;
  v_line_total numeric(14,2);
  v_unit_price numeric(14,2);
  v_total_cogs numeric(14,2) := 0;
  v_trade_in_item_id uuid;
  v_trade_in_unit_id uuid;
  v_trade_in_id uuid;
  v_existing_id uuid;
begin
  -- Caller must belong to the brand unless they are platform owner.
  if not (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or p_brand_id = any(public.get_user_brand_ids())
  ) then
    raise exception 'Brand access denied for POS checkout: %', p_brand_id using errcode = '42501';
  end if;

  perform 1 from public.brands where id = p_brand_id and lower(status) = 'active';
  if not found then
    raise exception 'Brand % not found or inactive', p_brand_id using errcode = 'P0002';
  end if;

  perform 1 from public.branches
  where id = p_branch_id and brand_id = p_brand_id and deleted_at is null;
  if not found then
    raise exception 'Branch % not found, deleted, or does not belong to brand %', p_branch_id, p_brand_id
      using errcode = 'P0002';
  end if;

  perform 1 from public.payment_methods
  where id = p_payment_method_id and brand_id = p_brand_id and is_active = true;
  if not found then
    raise exception 'Payment method % not found or inactive for brand %', p_payment_method_id, p_brand_id
      using errcode = 'P0002';
  end if;

  if p_items is null or jsonb_typeof(p_items) != 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Items array is empty' using errcode = 'P0004';
  end if;

  if p_payment_amount is null or p_payment_amount < 0 then
    raise exception 'Payment amount must be zero or positive' using errcode = '22023';
  end if;

  if p_discount_amount is null or p_discount_amount < 0 then
    raise exception 'Discount amount must be zero or positive' using errcode = '22023';
  end if;

  if p_idempotency_key is not null then
    select id into v_existing_id
    from public.pos_sales
    where brand_id = p_brand_id and idempotency_key = p_idempotency_key;

    if found then
      return jsonb_build_object(
        'success', true,
        'status', 'ALREADY_EXISTS',
        'pos_sale_id', v_existing_id
      );
    end if;
  end if;

  -- First pass: validate items, lock stock/unit rows, and calculate authoritative totals.
  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(
      inventory_item_id uuid,
      inventory_item_unit_id uuid,
      quantity numeric,
      unit_price numeric,
      discount_amount numeric
    )
  loop
    if v_item.inventory_item_id is null then
      raise exception 'inventory_item_id is required' using errcode = '22023';
    end if;

    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Item % quantity must be positive', v_item.inventory_item_id using errcode = '22023';
    end if;

    if coalesce(v_item.discount_amount, 0) < 0 then
      raise exception 'Item % discount cannot be negative', v_item.inventory_item_id using errcode = '22023';
    end if;

    select id, brand_id, item_type, name, sku, cost_price, selling_price, track_stock, allow_negative_stock
    into v_inv_item
    from public.inventory_items
    where id = v_item.inventory_item_id and deleted_at is null
    for update;

    if not found then
      raise exception 'Inventory item % not found', v_item.inventory_item_id using errcode = 'P0002';
    end if;

    if v_inv_item.brand_id != p_brand_id then
      raise exception 'Inventory item % does not belong to brand %', v_item.inventory_item_id, p_brand_id
        using errcode = 'P0002';
    end if;

    if v_inv_item.item_type not in ('PRODUCT', 'SPAREPART', 'SUPPLY', 'OTHER', 'DEVICE_UNIT') then
      raise exception 'Item % has unsupported POS type %', v_item.inventory_item_id, v_inv_item.item_type
        using errcode = 'P0004';
    end if;

    if v_inv_item.item_type = 'DEVICE_UNIT' then
      if v_item.quantity != 1 then
        raise exception 'DEVICE_UNIT item % quantity must be 1', v_item.inventory_item_id using errcode = '22023';
      end if;

      if v_item.inventory_item_unit_id is null then
        raise exception 'DEVICE_UNIT item % requires inventory_item_unit_id', v_item.inventory_item_id using errcode = '22023';
      end if;

      select id, brand_id, branch_id, inventory_item_id, status, selling_price, purchase_price
      into v_unit
      from public.inventory_item_units
      where id = v_item.inventory_item_unit_id
      for update;

      if not found then
        raise exception 'Device unit % not found', v_item.inventory_item_unit_id using errcode = 'P0002';
      end if;

      if v_unit.brand_id != p_brand_id
         or v_unit.branch_id != p_branch_id
         or v_unit.inventory_item_id != v_item.inventory_item_id
      then
        raise exception 'Device unit % does not match brand, branch, or inventory item', v_item.inventory_item_unit_id
          using errcode = 'P0002';
      end if;

      if v_unit.status != 'AVAILABLE' then
        raise exception 'Device unit % is not available', v_item.inventory_item_unit_id using errcode = 'P0004';
      end if;

      v_unit_price := coalesce(v_unit.selling_price, v_inv_item.selling_price, 0);
    else
      v_unit_price := coalesce(v_inv_item.selling_price, 0);
    end if;

    if v_inv_item.track_stock then
      select current_stock, available_stock
      into v_stock
      from public.branch_inventory_stocks
      where brand_id = p_brand_id
        and branch_id = p_branch_id
        and item_id = v_item.inventory_item_id
      for update;

      if not found and not v_inv_item.allow_negative_stock then
        raise exception 'Stock row not found for item % on branch %', v_item.inventory_item_id, p_branch_id
          using errcode = 'P0002';
      end if;

      if found and v_stock.available_stock < v_item.quantity and not v_inv_item.allow_negative_stock then
        raise exception 'Insufficient stock for item %. Available %, requested %',
          v_item.inventory_item_id, v_stock.available_stock, v_item.quantity using errcode = '23514';
      end if;
    end if;

    v_line_total := v_item.quantity * v_unit_price - coalesce(v_item.discount_amount, 0);
    if v_line_total < 0 then
      raise exception 'Line total cannot be negative for item %', v_item.inventory_item_id using errcode = '22023';
    end if;

    v_gross_amount := v_gross_amount + (v_item.quantity * v_unit_price);
    v_total_item_disc := v_total_item_disc + coalesce(v_item.discount_amount, 0);
    v_total_cogs := v_total_cogs + (v_item.quantity * coalesce(v_inv_item.cost_price, 0));
  end loop;

  v_total_discount := v_total_item_disc + p_discount_amount;
  if v_total_discount > v_gross_amount then
    raise exception 'Discount cannot exceed gross amount' using errcode = '22023';
  end if;

  v_subtotal_after_discount := v_gross_amount - v_total_discount;

  if p_trade_in is not null then
    if jsonb_typeof(p_trade_in) != 'object' then
      raise exception 'trade_in must be a JSON object' using errcode = '22023';
    end if;

    v_trade_in_amount := coalesce(nullif(p_trade_in ->> 'appraisal_value', '')::numeric, 0);
    if v_trade_in_amount <= 0 then
      raise exception 'Trade-in appraisal value must be positive' using errcode = '22023';
    end if;

    if v_trade_in_amount > v_subtotal_after_discount then
      raise exception 'Trade-in value cannot exceed subtotal after discounts' using errcode = '22023';
    end if;

    if nullif(p_trade_in ->> 'device_brand', '') is null
       or nullif(p_trade_in ->> 'device_model', '') is null
    then
      raise exception 'Trade-in device_brand and device_model are required' using errcode = '22023';
    end if;
  end if;

  v_amount_due := v_subtotal_after_discount - v_trade_in_amount;

  if v_amount_due <= 0 then
    raise exception 'Amount due must be positive after discount and trade-in' using errcode = '22023';
  end if;

  if p_payment_amount < v_amount_due then
    raise exception 'Payment amount % is less than amount due %', p_payment_amount, v_amount_due using errcode = '22023';
  end if;

  v_change_amount := p_payment_amount - v_amount_due;
  v_payment_received := p_payment_amount - v_change_amount;

  v_resolved := public.resolve_pos_payment_account(p_brand_id, p_branch_id, p_payment_method_id);
  v_account_id := (v_resolved ->> 'payment_account_id')::uuid;
  v_method_type := v_resolved ->> 'method_type';
  v_mdr_pct := (v_resolved ->> 'mdr_percentage')::numeric(5,2);

  v_mdr_amount := public.calculate_pos_mdr(v_method_type, v_payment_received, v_mdr_pct);
  v_net_amount := v_payment_received - v_mdr_amount;

  v_sale_number := public.generate_pos_sale_number(p_brand_id);
  v_final_key := coalesce(p_idempotency_key, 'pos_sale_v2:' || p_brand_id || ':' || v_sale_number);

  insert into public.pos_sales (
    brand_id, branch_id, customer_id,
    sale_number, sale_status,
    payment_method_id, payment_account_id,
    gross_amount, discount_amount, trade_in_amount,
    paid_amount, change_amount, mdr_amount, net_amount,
    idempotency_key, notes, metadata,
    sold_at, created_by, created_at
  ) values (
    p_brand_id, p_branch_id, p_customer_id,
    v_sale_number, 'COMPLETED',
    p_payment_method_id, v_account_id,
    v_gross_amount, v_total_discount, v_trade_in_amount,
    v_payment_received, v_change_amount, v_mdr_amount, v_net_amount,
    v_final_key, p_notes,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'checkout_version', 'v2',
      'amount_due', v_amount_due,
      'payment_tendered', p_payment_amount,
      'method_type', v_method_type
    ),
    p_sold_at, p_created_by, now()
  )
  returning id into v_sale_id;

  -- Second pass: insert sale items, stock movements, and serialized unit status updates.
  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(
      inventory_item_id uuid,
      inventory_item_unit_id uuid,
      quantity numeric,
      unit_price numeric,
      discount_amount numeric
    )
  loop
    select id, item_type, name, sku, cost_price, selling_price
    into v_inv_item
    from public.inventory_items
    where id = v_item.inventory_item_id;

    if v_item.inventory_item_unit_id is not null then
      select coalesce(selling_price, v_inv_item.selling_price, 0)
      into v_unit_price
      from public.inventory_item_units
      where id = v_item.inventory_item_unit_id;

      v_unit_price := coalesce(v_unit_price, 0);
    else
      v_unit_price := coalesce(v_inv_item.selling_price, 0);
    end if;

    v_line_total := v_item.quantity * v_unit_price - coalesce(v_item.discount_amount, 0);

    insert into public.pos_sale_items (
      brand_id, branch_id, pos_sale_id,
      inventory_item_id, inventory_item_unit_id,
      item_type, name_snapshot, sku_snapshot,
      quantity, unit_price, unit_cost,
      discount_amount, line_total,
      metadata
    ) values (
      p_brand_id, p_branch_id, v_sale_id,
      v_item.inventory_item_id, v_item.inventory_item_unit_id,
      v_inv_item.item_type, v_inv_item.name, v_inv_item.sku,
      v_item.quantity, v_unit_price, coalesce(v_inv_item.cost_price, 0),
      coalesce(v_item.discount_amount, 0), v_line_total,
      jsonb_build_object('inventory_item_unit_id', v_item.inventory_item_unit_id)
    )
    returning id into v_sale_item_id;

    v_movement_key := 'pos_sale_v2:' || v_sale_id || ':item:' || v_item.inventory_item_id || ':line:' || v_sale_item_id;

    v_movement_id := public.add_inventory_movement(
      p_brand_id        := p_brand_id,
      p_branch_id       := p_branch_id,
      p_item_id         := v_item.inventory_item_id,
      p_direction       := 'OUT',
      p_movement_type   := 'POS_SALE',
      p_quantity        := v_item.quantity,
      p_unit_cost       := coalesce(v_inv_item.cost_price, 0),
      p_reference_type  := 'pos_sale',
      p_reference_id    := v_sale_id,
      p_idempotency_key := v_movement_key,
      p_description     := 'POS sale ' || v_sale_number,
      p_metadata        := jsonb_build_object(
                             'sale_item_id', v_sale_item_id,
                             'item_name', v_inv_item.name,
                             'item_type', v_inv_item.item_type,
                             'inventory_item_unit_id', v_item.inventory_item_unit_id
                           ),
      p_created_by      := p_created_by
    );

    update public.pos_sale_items
    set inventory_movement_id = v_movement_id
    where id = v_sale_item_id;

    if v_item.inventory_item_unit_id is not null then
      update public.inventory_item_units
      set status = 'SOLD',
          updated_at = now()
      where id = v_item.inventory_item_unit_id;
    end if;
  end loop;

  -- Trade-in: create received serialized unit, stock movement IN, and trade_ins record.
  if p_trade_in is not null then
    select id into v_trade_in_item_id
    from public.inventory_items
    where brand_id = p_brand_id
      and item_type = 'DEVICE_UNIT'
      and name ilike '%' || (p_trade_in ->> 'device_brand') || '%' || (p_trade_in ->> 'device_model') || '%'
      and is_active = true
      and deleted_at is null
    limit 1;

    if v_trade_in_item_id is null then
      select id into v_trade_in_item_id
      from public.inventory_items
      where brand_id = p_brand_id
        and item_type = 'DEVICE_UNIT'
        and is_active = true
        and deleted_at is null
      limit 1;
    end if;

    if v_trade_in_item_id is null then
      raise exception 'No active DEVICE_UNIT inventory item exists for trade-in receiving' using errcode = 'P0002';
    end if;

    insert into public.inventory_item_units (
      brand_id, branch_id, inventory_item_id,
      imei, serial_number, device_brand, device_model,
      storage, color, condition_grade, battery_health,
      purchase_price, selling_price,
      source, status, note, created_by
    ) values (
      p_brand_id, p_branch_id, v_trade_in_item_id,
      nullif(p_trade_in ->> 'imei', ''),
      nullif(p_trade_in ->> 'serial_number', ''),
      p_trade_in ->> 'device_brand',
      p_trade_in ->> 'device_model',
      nullif(p_trade_in ->> 'storage', ''),
      nullif(p_trade_in ->> 'color', ''),
      nullif(p_trade_in ->> 'condition_grade', ''),
      nullif(p_trade_in ->> 'battery_health', ''),
      v_trade_in_amount,
      v_trade_in_amount,
      'TRADE_IN', 'AVAILABLE',
      nullif(p_trade_in ->> 'notes', ''),
      p_created_by
    )
    returning id into v_trade_in_unit_id;

    perform public.add_inventory_movement(
      p_brand_id        := p_brand_id,
      p_branch_id       := p_branch_id,
      p_item_id         := v_trade_in_item_id,
      p_direction       := 'IN',
      p_movement_type   := 'PURCHASE',
      p_quantity        := 1,
      p_unit_cost       := v_trade_in_amount,
      p_reference_type  := 'trade_in',
      p_reference_id    := v_trade_in_unit_id,
      p_idempotency_key := 'pos_sale_v2:' || v_sale_id || ':trade_in_unit:' || v_trade_in_unit_id,
      p_description     := 'Trade-in for POS sale ' || v_sale_number,
      p_metadata        := jsonb_build_object(
                             'sale_id', v_sale_id,
                             'sale_number', v_sale_number,
                             'source', 'TRADE_IN',
                             'appraisal_value', v_trade_in_amount
                           ),
      p_created_by      := p_created_by
    );

    insert into public.trade_ins (
      brand_id, branch_id, pos_sale_id, customer_id,
      device_brand, device_model, storage, color,
      imei, serial_number, condition_grade, battery_health,
      appraisal_value, inventory_item_id, inventory_item_unit_id,
      status, note, appraised_by, created_by
    ) values (
      p_brand_id, p_branch_id, v_sale_id, p_customer_id,
      p_trade_in ->> 'device_brand',
      p_trade_in ->> 'device_model',
      nullif(p_trade_in ->> 'storage', ''),
      nullif(p_trade_in ->> 'color', ''),
      nullif(p_trade_in ->> 'imei', ''),
      nullif(p_trade_in ->> 'serial_number', ''),
      nullif(p_trade_in ->> 'condition_grade', ''),
      nullif(p_trade_in ->> 'battery_health', ''),
      v_trade_in_amount, v_trade_in_item_id, v_trade_in_unit_id,
      'ACCEPTED', nullif(p_trade_in ->> 'notes', ''), p_created_by, p_created_by
    )
    returning id into v_trade_in_id;
  end if;

  v_pa_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_account_id,
    p_brand_id           := p_brand_id,
    p_direction          := 'IN',
    p_amount             := v_net_amount,
    p_movement_type      := 'POS_PAYMENT',
    p_branch_id          := p_branch_id,
    p_reference_type     := 'pos_sale',
    p_reference_id       := v_sale_id::text,
    p_transfer_group_id  := null,
    p_description        := 'POS sale ' || v_sale_number,
    p_metadata           := jsonb_build_object(
                             'sale_number', v_sale_number,
                             'gross_amount', v_gross_amount,
                             'discount_amount', v_total_discount,
                             'trade_in_amount', v_trade_in_amount,
                             'paid_amount', v_payment_received,
                             'change_amount', v_change_amount,
                             'amount_due', v_amount_due,
                             'mdr_amount', v_mdr_amount,
                             'method_type', v_method_type
                           ),
    p_created_by         := p_created_by
  );

  update public.pos_sales
  set payment_account_movement_id = v_pa_movement_id
  where id = v_sale_id;

  return jsonb_build_object(
    'success', true,
    'status', 'COMPLETED',
    'pos_sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'gross_amount', v_gross_amount,
    'discount_amount', v_total_discount,
    'trade_in_amount', v_trade_in_amount,
    'amount_due', v_amount_due,
    'paid_amount', v_payment_received,
    'change_amount', v_change_amount,
    'mdr_amount', v_mdr_amount,
    'net_amount', v_net_amount,
    'payment_account_id', v_account_id,
    'payment_account_movement_id', v_pa_movement_id,
    'trade_in_id', v_trade_in_id,
    'trade_in_item_id', v_trade_in_item_id,
    'trade_in_unit_id', v_trade_in_unit_id,
    'total_cogs', v_total_cogs
  );
end;
$func$;

comment on function public.record_pos_sale_v2 is
  'Atomic full POS checkout: supports normal items, DEVICE_UNIT serialized units, trade-in receiving, stock movements, and POS_PAYMENT account movement.';

-- ============================================================
-- End of Migration 018
-- ============================================================
