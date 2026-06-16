-- ============================================================
-- Migration 032: V4 Service Sparepart Usage
--
-- Atomic RPC for using V4 spareparts in service workflow.
-- Deducts stock from inv_variant_stocks, creates
-- inv_sparepart_usage records, and creates inv_stock_movements
-- with SERVICE_USAGE type.
-- Does not touch legacy tables.
-- ============================================================

-- ============================================================
-- RPC: use_inv_sparepart_for_service
--
-- Atomically deducts sparepart stock for a service.
-- Validates service existence, variant eligibility, stock
-- availability. Creates usage records and stock movements.
-- ============================================================

create or replace function public.use_inv_sparepart_for_service(
  p_brand_id integer,
  p_branch_id uuid,
  p_service_id uuid,
  p_items jsonb,
  p_notes text default null,
  p_created_by uuid default auth.uid()
) returns jsonb
language plpgsql
as $func$
declare
  v_service_row public.services%rowtype;
  v_item jsonb;
  v_variant_id uuid;
  v_quantity numeric;
  v_variant_row public.inv_variants%rowtype;
  v_product_row public.inv_products%rowtype;
  v_stock_row public.inv_variant_stocks%rowtype;
  v_stock_before numeric;
  v_stock_after numeric;
  v_movement_id uuid;
  v_usage_id uuid;
  v_usage_count integer := 0;
  v_movement_ids uuid[] := '{}';
  v_usage_ids uuid[] := '{}';
begin
  -- 1. Validate service exists and belongs to brand/branch
  select * into v_service_row
  from public.services
  where id = p_service_id;

  if not found then
    raise exception 'Servis tidak ditemukan.'
      using errcode = 'P0001';
  end if;

  if v_service_row.brand_id != p_brand_id then
    raise exception 'Servis tidak sesuai dengan brand yang dipilih.'
      using errcode = 'P0002';
  end if;

  if v_service_row.branch_id != p_branch_id then
    raise exception 'Servis berada di cabang berbeda.'
      using errcode = 'P0002';
  end if;

  -- 2. Validate items not empty
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Minimal satu item sparepart harus disertakan.'
      using errcode = 'P0001';
  end if;

  -- 3. Process each item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;

    if v_quantity <= 0 then
      raise exception 'Jumlah pemakaian harus lebih dari 0.'
        using errcode = 'P0003';
    end if;

    -- Fetch variant
    select * into v_variant_row
    from public.inv_variants
    where id = v_variant_id;

    if not found then
      raise exception 'Varian sparepart tidak ditemukan: %', v_variant_id
        using errcode = 'P0004';
    end if;

    if v_variant_row.brand_id != p_brand_id then
      raise exception 'Varian sparepart tidak sesuai dengan brand.'
        using errcode = 'P0004';
    end if;

    -- Fetch product
    select * into v_product_row
    from public.inv_products
    where id = v_variant_row.product_id;

    if not found then
      raise exception 'Produk sparepart tidak ditemukan.'
        using errcode = 'P0004';
    end if;

    -- Validate product_kind = SPAREPART
    if v_product_row.product_kind != 'SPAREPART' then
      raise exception 'Hanya sparepart yang dapat digunakan untuk servis. Produk ini adalah %.', v_product_row.product_kind
        using errcode = 'P0005';
    end if;

    -- Validate service_usage_enabled
    if v_product_row.service_usage_enabled = false then
      raise exception 'Sparepart ini tidak diizinkan untuk pemakaian servis.'
        using errcode = 'P0005';
    end if;

    -- Lock and fetch variant stock
    select * into v_stock_row
    from public.inv_variant_stocks
    where branch_id = p_branch_id
      and variant_id = v_variant_id
    for update;

    v_stock_before := coalesce(v_stock_row.current_stock, 0);

    -- Reject insufficient stock
    if v_stock_before < v_quantity then
      raise exception 'Stok sparepart % (varian %) tidak mencukupi. Tersedia: %, diminta: %',
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
    else
      -- Should not happen (stock > 0 implies row exists), but handle gracefully
      insert into public.inv_variant_stocks (brand_id, branch_id, variant_id, current_stock, reserved_stock)
      values (p_brand_id, p_branch_id, v_variant_id, v_stock_after, 0);
    end if;

    -- Create stock movement (SERVICE_USAGE, OUT)
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
      'SERVICE_USAGE', 'OUT',
      v_quantity, v_stock_before, v_stock_after,
      'SERVICE', p_service_id, v_service_row.service_number,
      coalesce(p_notes, 'Pemakaian Sparepart Servis: ' || v_service_row.service_number), p_created_by
    )
    returning id into v_movement_id;

    v_movement_ids := array_append(v_movement_ids, v_movement_id);

    -- Create inv_sparepart_usage record
    insert into public.inv_sparepart_usage (
      brand_id, branch_id, service_id,
      product_id, variant_id,
      quantity,
      cost_price_snapshot, selling_price_snapshot,
      item_name_snapshot, variant_name_snapshot, attributes_snapshot,
      movement_id, created_by
    ) values (
      p_brand_id, p_branch_id, p_service_id,
      v_product_row.id, v_variant_id,
      v_quantity,
      v_variant_row.cost_price, v_variant_row.selling_price,
      v_product_row.name, v_variant_row.name, v_variant_row.attributes,
      v_movement_id, p_created_by
    )
    returning id into v_usage_id;

    v_usage_ids := array_append(v_usage_ids, v_usage_id);
    v_usage_count := v_usage_count + 1;
  end loop;

  -- 4. Return result
  return jsonb_build_object(
    'usage_count', v_usage_count,
    'movement_ids', to_jsonb(v_movement_ids),
    'usage_ids', to_jsonb(v_usage_ids)
  );
end;
$func$;

comment on function public.use_inv_sparepart_for_service is
  'Atomic V4 sparepart usage for service. Deducts stock, creates usage record and SERVICE_USAGE movement.';
