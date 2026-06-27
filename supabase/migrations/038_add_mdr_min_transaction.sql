-- ============================================================
-- Migration 038: Add mdr_min_transaction to branch_payment_methods
--
-- Adds a configurable minimum transaction threshold.
-- MDR only applies when transaction amount >= mdr_min_transaction.
-- 0 = no minimum threshold (default, backward compatible).
-- ============================================================

-- 1. Add column
alter table public.branch_payment_methods
add column if not exists mdr_min_transaction numeric not null default 0;

-- 2. Update calculate_pos_mdr to respect mdr_min_transaction
create or replace function public.calculate_pos_mdr(
  p_method_type text,
  p_amount numeric,
  p_mdr_percentage numeric default 0,
  p_mdr_min_transaction numeric default 0
) returns numeric
language plpgsql
stable
as $func$
declare
  v_mdr numeric(14,2);
begin
  -- If amount is below minimum threshold, no MDR
  if p_mdr_min_transaction > 0 and p_amount < p_mdr_min_transaction then
    return 0;
  end if;

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

comment on function public.calculate_pos_mdr(text, numeric, numeric, numeric) is
  'POS MDR: TRANSFER/CASH=0, QRIS threshold 500000, else method pct. Respects mdr_min_transaction.';

-- 3. Update resolve_pos_payment_account to return mdr_min_transaction
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
  v_bpm_mdr_min       numeric;
  v_account_id        uuid;
  v_method_type       text;
  v_mdr_pct           numeric(5,2);
  v_mdr_min           numeric := 0;
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
  select payment_account_id, mdr_percentage, is_active, mdr_min_transaction
  into v_bpm_account_id, v_bpm_mdr_pct, v_bpm_is_active, v_bpm_mdr_min
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
    v_mdr_min := v_bpm_mdr_min;
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
    'mdr_percentage', v_mdr_pct,
    'mdr_min_transaction', v_mdr_min
  );
end;
$func$;

-- 4. Update checkout_pos_v4 to use mdr_min_transaction
create or replace function public.checkout_pos_v4(
  p_brand_id integer,
  p_branch_id uuid,
  p_payment_method_id uuid,
  p_items jsonb,
  p_customer_id uuid default null,
  p_discount_amount numeric default 0,
  p_service_fee_amount numeric default 0,
  p_paid_amount numeric default 0,
  p_notes text default null,
  p_created_by uuid default auth.uid()
) returns jsonb
language plpgsql
as $func$
declare
  v_transaction_id uuid;
  v_transaction_number text;
  v_subtotal_amount numeric := 0;
  v_total_amount numeric := 0;
  v_change_amount numeric := 0;
  v_item jsonb;
  v_item_type text;
  v_variant_id uuid;
  v_unit_id uuid;
  v_variant_name text;
  v_product_name text;
  v_attributes jsonb;
  v_status text;
  v_sold_price numeric;
  v_acquisition_cost numeric;
  v_stock_row public.inv_variant_stocks%rowtype;
  v_stock_before numeric;
  v_stock_after numeric;
  v_quantity numeric;
  v_selling_price numeric;
  v_cost_price numeric;
  v_cost_snapshot numeric;
  v_movement_id uuid;
  v_movement_ids uuid[] := '{}';
  v_payment_account_id uuid;
  v_method_type text;
  v_mdr_pct numeric;
  v_mdr_min_transaction numeric := 0;
  v_mdr_amount numeric;
  v_net_amount numeric;
  v_pa_movement_id uuid;
  v_item_name_snapshot text;
  v_variant_name_snapshot text;
  v_attributes_snapshot jsonb;
begin
  -- 1. Validate items
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Minimal satu item harus disertakan.'
      using errcode = 'P0001';
  end if;

  -- 2. Validate payment method and resolve account from branch_payment_methods
  select bpm.payment_account_id, bpm.method_type, bpm.mdr_percentage, bpm.mdr_min_transaction
  into v_payment_account_id, v_method_type, v_mdr_pct, v_mdr_min_transaction
  from public.branch_payment_methods bpm
  where bpm.id = p_payment_method_id
    and bpm.brand_id = p_brand_id
    and bpm.branch_id = p_branch_id
    and bpm.is_active = true;

  if not found then
    raise exception 'Metode pembayaran tidak aktif untuk cabang ini.'
      using errcode = 'P0002';
  end if;

  if v_payment_account_id is null then
    raise exception 'Akun pembayaran untuk metode ini belum ditautkan.'
      using errcode = 'P0002';
  end if;

  -- Validate resolved payment account
  perform 1 from public.payment_accounts pa
  where pa.id = v_payment_account_id
    and pa.brand_id = p_brand_id
    and pa.is_active = true
    and (pa.branch_id is null or pa.branch_id = p_branch_id);

  if not found then
    raise exception 'Akun pembayaran tidak valid untuk cabang ini.'
      using errcode = 'P0002';
  end if;

  v_mdr_pct := coalesce(v_mdr_pct, 0);
  v_mdr_min_transaction := coalesce(v_mdr_min_transaction, 0);

  -- 3. Generate transaction number
  v_transaction_number := public.generate_pos_transaction_number(p_brand_id);

  -- 4. Create transaction header (empty, will update)
  insert into public.pos_transactions (
    brand_id, branch_id, transaction_number,
    subtotal_amount, discount_amount, service_fee_amount, total_amount,
    paid_amount, change_amount,
    payment_method_id, payment_account_id,
    customer_id, notes, status, created_by
  ) values (
    p_brand_id, p_branch_id, v_transaction_number,
    0, 0, 0, 0,
    0, 0,
    p_payment_method_id, v_payment_account_id,
    p_customer_id, p_notes, 'completed', p_created_by
  )
  returning id into v_transaction_id;

  -- 5. Process each item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_type := v_item->>'item_type';
    v_selling_price := (v_item->>'selling_price')::numeric;

    if v_item_type = 'UNIT_SECOND_SERIALIZED' then
      v_unit_id := (v_item->>'unit_id')::uuid;

      select u.status, u.sold_price, u.acquisition_cost,
             v.name, v.attributes,
             p.name
      into strict v_status, v_sold_price, v_acquisition_cost,
             v_variant_name, v_attributes,
             v_product_name
      from public.inv_units u
      join public.inv_variants v on v.id = u.variant_id
      join public.inv_products p on p.id = v.product_id
      where u.id = v_unit_id
        and u.brand_id = p_brand_id
        and u.status = 'available'
        and u.deleted_at is null
      for update;

      v_quantity := 1;
      v_cost_snapshot := v_acquisition_cost;
      v_item_name_snapshot := v_product_name;
      v_variant_name_snapshot := v_variant_name;
      v_attributes_snapshot := v_attributes;

      -- Mark unit as sold
      update public.inv_units
      set status = 'sold',
          sold_at = now(),
          sold_price = v_selling_price,
          updated_at = now()
      where id = v_unit_id;

      -- Insert stock movement
      v_movement_id := gen_random_uuid();
      insert into public.inv_stock_movements (
        id, brand_id, branch_id, movement_type, reference_type, reference_id,
        variant_id, unit_id, quantity_before, quantity_change, quantity_after,
        movement_date, notes, created_by
      ) values (
        v_movement_id, p_brand_id, p_branch_id, 'OUT', 'pos_transaction', v_transaction_id,
        v_variant_id, v_unit_id, 1, -1, 0,
        now(), 'POS ' || v_transaction_number, p_created_by
      );
      v_movement_ids := v_movement_ids || v_movement_id;

      -- Insert transaction item
      insert into public.pos_transaction_items (
        transaction_id, item_type, variant_id, unit_id, variant_name,
        product_name, attributes_snapshot,
        selling_price, cost_price, quantity, subtotal
      ) values (
        v_transaction_id, v_item_type, v_variant_id, v_unit_id,
        v_variant_name_snapshot, v_item_name_snapshot, v_attributes_snapshot,
        v_selling_price, v_cost_snapshot, v_quantity,
        v_selling_price * v_quantity
      );

    else
      v_variant_id := (v_item->>'variant_id')::uuid;
      v_quantity := (v_item->>'quantity')::numeric;

      select v.name, v.cost_price, v.attributes,
             p.name
      into strict v_variant_name, v_cost_price, v_attributes,
             v_product_name
      from public.inv_variants v
      join public.inv_products p on p.id = v.product_id
      where v.id = v_variant_id
        and v.brand_id = p_brand_id
        and v.deleted_at is null
      for update;

      v_cost_snapshot := v_cost_price;
      v_item_name_snapshot := v_product_name;
      v_variant_name_snapshot := v_variant_name;
      v_attributes_snapshot := v_attributes;

      -- Check and deduct stock
      select * into v_stock_row
      from public.inv_variant_stocks
      where variant_id = v_variant_id
        and branch_id = p_branch_id
      for update;

      if not found then
        raise exception 'Stok % tidak ditemukan untuk cabang ini.', v_variant_name_snapshot
          using errcode = 'P0003';
      end if;

      v_stock_before := v_stock_row.quantity;
      v_stock_after := v_stock_before - v_quantity;

      if v_stock_after < 0 then
        raise exception 'Stok % tidak mencukupi. Tersedia: %, diminta: %',
          v_variant_name_snapshot, v_stock_before, v_quantity
          using errcode = 'P0003';
      end if;

      update public.inv_variant_stocks
      set quantity = v_stock_after,
          updated_at = now()
      where variant_id = v_variant_id
        and branch_id = p_branch_id;

      v_movement_id := gen_random_uuid();
      insert into public.inv_stock_movements (
        id, brand_id, branch_id, movement_type, reference_type, reference_id,
        variant_id, quantity_before, quantity_change, quantity_after,
        movement_date, notes, created_by
      ) values (
        v_movement_id, p_brand_id, p_branch_id, 'OUT', 'pos_transaction', v_transaction_id,
        v_variant_id, v_stock_before, -v_quantity, v_stock_after,
        now(), 'POS ' || v_transaction_number, p_created_by
      );
      v_movement_ids := v_movement_ids || v_movement_id;

      insert into public.pos_transaction_items (
        transaction_id, item_type, variant_id, unit_id, variant_name,
        product_name, attributes_snapshot,
        selling_price, cost_price, quantity, subtotal
      ) values (
        v_transaction_id, v_item_type, v_variant_id, null,
        v_variant_name_snapshot, v_item_name_snapshot, v_attributes_snapshot,
        v_selling_price, v_cost_snapshot, v_quantity,
        v_selling_price * v_quantity
      );
    end if;

    v_subtotal_amount := v_subtotal_amount + (v_selling_price * v_quantity);
  end loop;

  v_total_amount := v_subtotal_amount - p_discount_amount + p_service_fee_amount;

  if v_total_amount < 0 then
    raise exception 'Total tidak boleh negatif.'
      using errcode = 'P0003';
  end if;

  -- 7. Calculate MDR and net amount
  v_mdr_amount := public.calculate_pos_mdr(v_method_type, v_total_amount, v_mdr_pct, v_mdr_min_transaction);
  v_net_amount := v_total_amount - v_mdr_amount;

  -- 8. Calculate change for CASH
  if v_method_type = 'CASH' then
    if p_paid_amount < v_total_amount then
      raise exception 'Jumlah dibayar kurang. Total: %, Dibayar: %',
        v_total_amount, p_paid_amount
        using errcode = 'P0003';
    end if;
    v_change_amount := p_paid_amount - v_total_amount;
  else
    v_change_amount := 0;
  end if;

  -- 9. Create payment account movement
  v_pa_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_payment_account_id,
    p_brand_id           := p_brand_id,
    p_direction          := 'IN',
    p_amount             := v_net_amount,
    p_movement_type      := 'POS_PAYMENT',
    p_branch_id          := p_branch_id,
    p_reference_type     := 'pos_transaction',
    p_reference_id       := v_transaction_id::text,
    p_transfer_group_id  := null,
    p_description        := 'POS ' || v_transaction_number,
    p_metadata           := jsonb_build_object(
      'transaction_number', v_transaction_number,
      'subtotal_amount', v_subtotal_amount,
      'discount_amount', p_discount_amount,
      'service_fee_amount', p_service_fee_amount,
      'total_amount', v_total_amount,
      'paid_amount', p_paid_amount,
      'change_amount', v_change_amount,
      'mdr_amount', v_mdr_amount,
      'method_type', v_method_type
    ),
    p_created_by         := p_created_by
  );

  -- 10. Update transaction with computed values
  update public.pos_transactions
  set subtotal_amount = v_subtotal_amount,
      discount_amount = p_discount_amount,
      service_fee_amount = p_service_fee_amount,
      total_amount = v_total_amount,
      paid_amount = case when v_method_type = 'CASH' then p_paid_amount else v_total_amount end,
      change_amount = v_change_amount,
      updated_at = now()
  where id = v_transaction_id;

  -- 11. Return result
  return jsonb_build_object(
    'transaction_id', v_transaction_id,
    'transaction_number', v_transaction_number,
    'subtotal_amount', v_subtotal_amount,
    'discount_amount', p_discount_amount,
    'service_fee_amount', p_service_fee_amount,
    'total_amount', v_total_amount,
    'paid_amount', case when v_method_type = 'CASH' then p_paid_amount else v_total_amount end,
    'change_amount', v_change_amount,
    'mdr_amount', v_mdr_amount,
    'net_amount', v_net_amount,
    'payment_account_id', v_payment_account_id,
    'payment_account_movement_id', v_pa_movement_id,
    'movement_ids', to_jsonb(v_movement_ids)
  );
end;
$func$;

notify pgrst, 'reload schema';
