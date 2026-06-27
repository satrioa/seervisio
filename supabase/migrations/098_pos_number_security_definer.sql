-- ============================================================
-- Migration 098: Secure number generation with SECURITY DEFINER
--
-- Root cause: generate_pos_transaction_number() and
-- checkout_pos_v4() lacked SECURITY DEFINER, causing RLS
-- violations on pos_transaction_number_counters when called
-- from application code (function ran as invoker, RLS blocked
-- INSERT/UPDATE).
--
-- Fix: All counter-table writes must go through SECURITY DEFINER
-- functions so they bypass RLS. Drop application-facing INSERT/
-- UPDATE RLS policies on counter tables -- they should never be
-- written directly.
-- ============================================================

-- ============================================================
-- 1. Redefine generate_pos_transaction_number with SECURITY DEFINER
-- ============================================================

create or replace function public.generate_pos_transaction_number(
  p_brand_id integer,
  p_prefix text default 'POS'
) returns text
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_year     integer := extract(year from current_date);
  v_month    integer := extract(month from current_date);
  v_counter  integer;
begin
  insert into public.pos_transaction_number_counters (brand_id, prefix, year, month, last_number)
  values (p_brand_id, p_prefix, v_year, v_month, 0)
  on conflict (brand_id, prefix, year, month) do nothing;

  update public.pos_transaction_number_counters
  set last_number = last_number + 1,
      updated_at = now()
  where brand_id = p_brand_id
    and prefix = p_prefix
    and year = v_year
    and month = v_month
  returning last_number into v_counter;

  if not found then
    raise exception 'Failed to generate transaction number for brand %', p_brand_id
      using errcode = 'P0002';
  end if;

  return p_prefix || '/' || lpad(v_year::text, 4, '0') || '/' || lpad(v_month::text, 2, '0') || '/' || lpad(v_counter::text, 4, '0');
end;
$func$;

comment on function public.generate_pos_transaction_number is
  'Generates unique POS transaction numbers per brand per month. SECURITY DEFINER. Format: PREFIX/YYYY/MM/NNNN';

-- ============================================================
-- 2. Redefine checkout_pos_v4 with SECURITY DEFINER
-- (preserves original function body, only adds security definer)
-- ============================================================

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
security definer
set search_path = public
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
  v_variant_row public.inv_variants%rowtype;
  v_product_row public.inv_products%rowtype;
  v_stock_row public.inv_variant_stocks%rowtype;
  v_stock_before numeric;
  v_stock_after numeric;
  v_unit_row public.inv_units%rowtype;
  v_quantity numeric;
  v_selling_price numeric;
  v_cost_snapshot numeric;
  v_movement_id uuid;
  v_movement_ids uuid[] := '{}';
  v_pa_resolved jsonb;
  v_payment_account_id uuid;
  v_method_type text;
  v_mdr_pct numeric;
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

  -- 2. Validate payment method and resolve account
  begin
    v_pa_resolved := public.resolve_pos_payment_account(p_brand_id, p_branch_id, p_payment_method_id);
    v_payment_account_id := (v_pa_resolved->>'payment_account_id')::uuid;
    v_method_type := v_pa_resolved->>'method_type';
    v_mdr_pct := coalesce((v_pa_resolved->>'mdr_percentage')::numeric, 0);
  exception when others then
    raise exception 'Gagal meresolve akun pembayaran: %', sqlerrm
      using errcode = 'P0002';
  end;

  -- 3. Generate transaction number (now SECURITY DEFINER -- bypasses RLS on counter table)
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
    p_customer_id, p_notes, 'COMPLETED', p_created_by
  )
  returning id into v_transaction_id;

  -- 5. Process items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_type := v_item->>'item_type';

    if v_item_type in ('PRODUCT_QUANTITY', 'UNIT_NEW_QUANTITY') then
      -- === Quantity item ===
      v_variant_id := (v_item->>'variant_id')::uuid;
      v_quantity := (v_item->>'quantity')::numeric;
      v_selling_price := (v_item->>'selling_price')::numeric;

      if v_quantity <= 0 then
        raise exception 'Jumlah item harus lebih dari 0.'
          using errcode = 'P0003';
      end if;

      -- Validate variant
      select * into v_variant_row
      from public.inv_variants
      where id = v_variant_id;

      if not found then
        raise exception 'Varian tidak ditemukan: %', v_variant_id
          using errcode = 'P0004';
      end if;

      if v_variant_row.brand_id != p_brand_id then
        raise exception 'Varian tidak sesuai dengan brand.'
          using errcode = 'P0004';
      end if;

      if v_variant_row.is_active = false then
        raise exception 'Varian tidak aktif.'
          using errcode = 'P0005';
      end if;

      -- Validate product
      select * into v_product_row
      from public.inv_products
      where id = v_variant_row.product_id;

      if not found then
        raise exception 'Produk tidak ditemukan.'
          using errcode = 'P0004';
      end if;

      if v_product_row.appears_in_pos = false then
        raise exception 'Produk % tidak diizinkan untuk POS.', v_product_row.name
          using errcode = 'P0005';
      end if;

      if v_product_row.product_kind = 'SPAREPART' then
        raise exception 'Sparepart tidak dapat dijual melalui POS.'
          using errcode = 'P0005';
      end if;

      if v_product_row.product_kind = 'UNIT' and v_product_row.condition_type = 'SECOND' then
        raise exception 'Unit Second harus dijual dengan pemilihan unit spesifik.'
          using errcode = 'P0005';
      end if;

      -- Lock and validate stock
      select * into v_stock_row
      from public.inv_variant_stocks
      where branch_id = p_branch_id
        and variant_id = v_variant_id
      for update;

      v_stock_before := coalesce(v_stock_row.current_stock, 0);

      if v_stock_before < v_quantity then
        raise exception 'Stok % (varian %) tidak mencukupi. Tersedia: %, diminta: %',
          v_product_row.name, v_variant_row.name, v_stock_before, v_quantity
          using errcode = 'P0006';
      end if;

      v_stock_after := v_stock_before - v_quantity;

      -- Update stock
      if v_stock_row.id is not null then
        update public.inv_variant_stocks
        set current_stock = v_stock_after,
            updated_at = now()
        where id = v_stock_row.id;
      end if;

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
        'POS_SALE', 'OUT',
        v_quantity, v_stock_before, v_stock_after,
        'POS_TRANSACTION', v_transaction_id::text, v_transaction_number,
        'POS ' || v_transaction_number, p_created_by
      )
      returning id into v_movement_id;

      v_movement_ids := array_append(v_movement_ids, v_movement_id);

      -- Snapshots
      v_item_name_snapshot := v_product_row.name;
      v_variant_name_snapshot := v_variant_row.name;
      v_attributes_snapshot := v_variant_row.attributes;
      v_cost_snapshot := v_variant_row.cost_price;

      -- Insert transaction item
      insert into public.pos_transaction_items (
        transaction_id, brand_id, branch_id,
        product_id, variant_id,
        item_type,
        item_name_snapshot, variant_name_snapshot, attributes_snapshot,
        quantity, cost_price_snapshot, selling_price_snapshot, subtotal_amount,
        movement_id
      ) values (
        v_transaction_id, p_brand_id, p_branch_id,
        v_product_row.id, v_variant_id,
        v_item_type,
        v_item_name_snapshot, v_variant_name_snapshot, v_attributes_snapshot,
        v_quantity, v_cost_snapshot, v_selling_price, v_quantity * v_selling_price,
        v_movement_id
      );

      v_subtotal_amount := v_subtotal_amount + (v_quantity * v_selling_price);

    elsif v_item_type = 'UNIT_SECOND_SERIALIZED' then
      -- === Unit Second serialized item ===
      v_unit_id := (v_item->>'unit_id')::uuid;
      v_selling_price := (v_item->>'selling_price')::numeric;

      -- Lock and validate unit
      select * into v_unit_row
      from public.inv_units
      where id = v_unit_id
      for update;

      if not found then
        raise exception 'Unit tidak ditemukan.'
          using errcode = 'P0004';
      end if;

      if v_unit_row.brand_id != p_brand_id then
        raise exception 'Unit tidak sesuai dengan brand.'
          using errcode = 'P0004';
      end if;

      if v_unit_row.status != 'READY_STOCK' then
        raise exception 'Unit tidak tersedia (status: %).', v_unit_row.status
          using errcode = 'P0006';
      end if;

      -- Get product
      select * into v_product_row
      from public.inv_products
      where id = v_unit_row.product_id;

      if not found then
        raise exception 'Produk unit tidak ditemukan.'
          using errcode = 'P0004';
      end if;

      -- Get variant (nullable for units)
      if v_unit_row.variant_id is not null then
        select * into v_variant_row
        from public.inv_variants
        where id = v_unit_row.variant_id;
      end if;

      -- Update unit status to SOLD
      update public.inv_units
      set status = 'SOLD',
          updated_at = now()
      where id = v_unit_id;

      -- Create stock movement
      insert into public.inv_stock_movements (
        brand_id, branch_id,
        product_id, variant_id, unit_id,
        movement_type, direction,
        quantity,
        unit_status_before, unit_status_after,
        reference_type, reference_id, reference_label,
        notes, created_by
      ) values (
        p_brand_id, p_branch_id,
        v_product_row.id, v_unit_row.variant_id, v_unit_id,
        'UNIT_SOLD', 'OUT',
        1,
        'READY_STOCK', 'SOLD',
        'POS_TRANSACTION', v_transaction_id::text, v_transaction_number,
        'POS ' || v_transaction_number, p_created_by
      )
      returning id into v_movement_id;

      v_movement_ids := array_append(v_movement_ids, v_movement_id);

      -- Snapshots
      v_item_name_snapshot := v_product_row.name;
      v_variant_name_snapshot := coalesce(v_variant_row.name, null);
      v_attributes_snapshot := coalesce(v_unit_row.unit_attributes, '{}'::jsonb);
      v_cost_snapshot := v_unit_row.purchase_cost;

      -- Insert transaction item
      insert into public.pos_transaction_items (
        transaction_id, brand_id, branch_id,
        product_id, variant_id, unit_id,
        item_type,
        item_name_snapshot, variant_name_snapshot, attributes_snapshot,
        imei_snapshot, serial_number_snapshot, battery_health_snapshot, condition_snapshot,
        quantity, cost_price_snapshot, selling_price_snapshot, subtotal_amount,
        movement_id
      ) values (
        v_transaction_id, p_brand_id, p_branch_id,
        v_product_row.id, v_unit_row.variant_id, v_unit_id,
        v_item_type,
        v_item_name_snapshot, v_variant_name_snapshot, v_attributes_snapshot,
        v_unit_row.imei, v_unit_row.serial_number,
        v_unit_row.battery_health, v_unit_row.condition_grade,
        1, v_cost_snapshot, v_selling_price, v_selling_price,
        v_movement_id
      );

      v_subtotal_amount := v_subtotal_amount + v_selling_price;

    else
      raise exception 'Tipe item tidak dikenal: %', v_item_type
        using errcode = 'P0001';
    end if;
  end loop;

  -- 6. Validate totals
  if p_discount_amount < 0 then
    raise exception 'Diskon tidak boleh negatif.'
      using errcode = 'P0003';
  end if;

  if p_service_fee_amount < 0 then
    raise exception 'Biaya jasa tidak boleh negatif.'
      using errcode = 'P0003';
  end if;

  v_total_amount := v_subtotal_amount - p_discount_amount + p_service_fee_amount;

  if v_total_amount < 0 then
    raise exception 'Total tidak boleh negatif.'
      using errcode = 'P0003';
  end if;

  -- 7. Calculate MDR and net amount
  v_mdr_amount := public.calculate_pos_mdr(v_method_type, v_total_amount, v_mdr_pct);
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

comment on function public.checkout_pos_v4 is
  'Atomic POS V4 checkout with SECURITY DEFINER. Generates transaction number, processes items, creates stock movements and payment account movements.';

-- ============================================================
-- 3. Tighten RLS on pos_transaction_number_counters
--
-- Drop application-facing INSERT/UPDATE policies.
-- Counter table must only be writable through SECURITY DEFINER.
-- Keep SELECT policy for read access.
-- ============================================================

drop policy if exists tnc_insert on public.pos_transaction_number_counters;
drop policy if exists tnc_update on public.pos_transaction_number_counters;

-- ============================================================
-- 4. Notify PostgREST to reload schema cache
-- ============================================================

notify pgrst, 'reload schema';
