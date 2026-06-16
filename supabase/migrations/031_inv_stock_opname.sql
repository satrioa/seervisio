-- ============================================================
-- Migration 031: V4 Stock Opname Adjustment RPC
--
-- Atomic RPC for inventory stock opname adjustments.
-- Applies only to quantity-tracked products (Sparepart, Produk,
-- Unit Baru). Rejects Unit Second numeric stock adjustments.
-- ============================================================

-- ============================================================
-- RPC: adjust_inv_variant_stock_opname
--
-- Atomically adjusts variant stock with movement ledger entries.
-- Handles batch adjustments in a single transaction.
-- ============================================================

create or replace function public.adjust_inv_variant_stock_opname(
  p_brand_id integer,
  p_branch_id uuid,
  p_notes text,
  p_adjustments jsonb,
  p_created_by uuid default auth.uid()
) returns jsonb
language plpgsql
as $func$
declare
  v_adjustment jsonb;
  v_variant_id uuid;
  v_physical_stock numeric;
  v_variant_row public.inv_variants%rowtype;
  v_product_row public.inv_products%rowtype;
  v_stock_row public.inv_variant_stocks%rowtype;
  v_stock_before numeric;
  v_stock_after numeric;
  v_diff numeric;
  v_movement_type text;
  v_direction text;
  v_quantity numeric;
  v_movement_id uuid;
  v_adjusted_count integer := 0;
  v_skipped_count integer := 0;
  v_movement_ids uuid[] := '{}';
begin
  -- Validate notes
  if p_notes is null or trim(p_notes) = '' then
    raise exception 'Catatan/alasan penyesuaian wajib diisi.'
      using errcode = 'P0001';
  end if;

  -- Validate adjustments not empty
  if p_adjustments is null or jsonb_array_length(p_adjustments) = 0 then
    raise exception 'Minimal satu item penyesuaian harus disertakan.'
      using errcode = 'P0001';
  end if;

  -- Process each adjustment
  for v_adjustment in select * from jsonb_array_elements(p_adjustments)
  loop
    v_variant_id := (v_adjustment->>'variant_id')::uuid;
    v_physical_stock := (v_adjustment->>'physical_stock')::numeric;

    -- Validate physical stock >= 0
    if v_physical_stock < 0 then
      raise exception 'Stok opname tidak boleh negatif untuk varian %', v_variant_id
        using errcode = 'P0002';
    end if;

    -- Fetch variant
    select * into v_variant_row
    from public.inv_variants
    where id = v_variant_id;

    if not found then
      raise exception 'Varian tidak ditemukan: %', v_variant_id
        using errcode = 'P0003';
    end if;

    -- Validate variant brand matches
    if v_variant_row.brand_id != p_brand_id then
      raise exception 'Varian % tidak sesuai dengan brand yang dipilih.', v_variant_id
        using errcode = 'P0004';
    end if;

    -- Fetch product
    select * into v_product_row
    from public.inv_products
    where id = v_variant_row.product_id;

    if not found then
      raise exception 'Produk tidak ditemukan untuk varian: %', v_variant_id
        using errcode = 'P0003';
    end if;

    -- Validate product_kind
    if v_product_row.product_kind not in ('SPAREPART', 'PRODUCT', 'UNIT') then
      raise exception 'Jenis produk tidak valid untuk penyesuaian stok.'
        using errcode = 'P0005';
    end if;

    -- Reject Unit Second (condition_type = SECOND)
    if v_product_row.product_kind = 'UNIT' and v_product_row.condition_type = 'SECOND' then
      raise exception 'Unit Second tidak dapat disesuaikan secara numerik. Gunakan tab Unit Second untuk mengubah status unit.'
        using errcode = 'P0006';
    end if;

    -- Lock and fetch variant stock row
    select * into v_stock_row
    from public.inv_variant_stocks
    where branch_id = p_branch_id
      and variant_id = v_variant_id
    for update;

    v_stock_before := coalesce(v_stock_row.current_stock, 0);
    v_diff := v_physical_stock - v_stock_before;

    -- Skip if no change
    if v_diff = 0 then
      v_skipped_count := v_skipped_count + 1;
      continue;
    end if;

    -- Determine direction and movement type
    if v_diff > 0 then
      v_movement_type := 'STOCK_OPNAME_IN';
      v_direction := 'IN';
      v_quantity := v_diff;
    else
      v_movement_type := 'STOCK_OPNAME_OUT';
      v_direction := 'OUT';
      v_quantity := abs(v_diff);
    end if;

    v_stock_after := v_physical_stock;

    -- Update variant stock (insert if not exists)
    if v_stock_row.id is not null then
      update public.inv_variant_stocks
      set current_stock = v_stock_after,
          updated_at = now()
      where id = v_stock_row.id;
    else
      insert into public.inv_variant_stocks (brand_id, branch_id, variant_id, current_stock, reserved_stock)
      values (p_brand_id, p_branch_id, v_variant_id, v_stock_after, 0);
    end if;

    -- Create stock movement
    insert into public.inv_stock_movements (
      brand_id, branch_id,
      product_id, variant_id,
      movement_type, direction,
      quantity, stock_before, stock_after,
      reference_type, reference_label,
      notes, created_by
    ) values (
      p_brand_id, p_branch_id,
      v_product_row.id, v_variant_id,
      v_movement_type, v_direction,
      v_quantity, v_stock_before, v_stock_after,
      'STOCK_OPNAME', 'Penyesuaian Stok',
      trim(p_notes), p_created_by
    )
    returning id into v_movement_id;

    v_movement_ids := array_append(v_movement_ids, v_movement_id);
    v_adjusted_count := v_adjusted_count + 1;
  end loop;

  -- Return result
  return jsonb_build_object(
    'adjusted_count', v_adjusted_count,
    'skipped_count', v_skipped_count,
    'movement_ids', to_jsonb(v_movement_ids)
  );
end;
$func$;

comment on function public.adjust_inv_variant_stock_opname is
  'Atomic stock opname adjustment for quantity-tracked variants. Rejects Unit Second. Requires notes.';
