-- ============================================================
-- Migration 139: Return sparepart from service (reverse usage)
--
-- Atomic RPC to reverse a sparepart usage for a service.
-- Restores stock to inv_variant_stocks, creates a reverse
-- stock movement (SERVICE_USAGE, IN), and deletes the usage
-- record.
-- ============================================================

create or replace function public.return_inv_sparepart_from_service(
  p_brand_id integer,
  p_branch_id uuid,
  p_service_id uuid,
  p_usage_id uuid,
  p_created_by uuid default auth.uid()
) returns jsonb
language plpgsql
as $func$
declare
  v_usage_row public.inv_sparepart_usage%rowtype;
  v_stock_row public.inv_variant_stocks%rowtype;
  v_stock_before numeric;
  v_stock_after numeric;
  v_movement_id uuid;
  v_service_row public.services%rowtype;
begin
  -- 1. Fetch usage record
  select * into v_usage_row
  from public.inv_sparepart_usage
  where id = p_usage_id
    and service_id = p_service_id;

  if not found then
    raise exception 'Pemakaian sparepart tidak ditemukan.'
      using errcode = 'P0001';
  end if;

  if v_usage_row.brand_id != p_brand_id then
    raise exception 'Pemakaian sparepart tidak sesuai dengan brand yang dipilih.'
      using errcode = 'P0002';
  end if;

  if v_usage_row.branch_id != p_branch_id then
    raise exception 'Pemakaian sparepart berada di cabang berbeda.'
      using errcode = 'P0002';
  end if;

  -- 2. Fetch service for reference label
  select * into v_service_row
  from public.services
  where id = p_service_id;

  -- 3. Lock and fetch variant stock
  select * into v_stock_row
  from public.inv_variant_stocks
  where branch_id = p_branch_id
    and variant_id = v_usage_row.variant_id
  for update;

  v_stock_before := coalesce(v_stock_row.current_stock, 0);
  v_stock_after := v_stock_before + v_usage_row.quantity;

  -- 4. Restore stock
  if v_stock_row.id is not null then
    update public.inv_variant_stocks
    set current_stock = v_stock_after,
        updated_at = now()
    where id = v_stock_row.id;
  else
    insert into public.inv_variant_stocks (brand_id, branch_id, variant_id, current_stock, reserved_stock)
    values (p_brand_id, p_branch_id, v_usage_row.variant_id, v_stock_after, 0);
  end if;

  -- 5. Create reverse stock movement (SERVICE_USAGE, IN)
  insert into public.inv_stock_movements (
    brand_id, branch_id,
    product_id, variant_id,
    movement_type, direction,
    quantity, stock_before, stock_after,
    reference_type, reference_id, reference_label,
    notes, created_by
  ) values (
    p_brand_id, p_branch_id,
    v_usage_row.product_id, v_usage_row.variant_id,
    'SERVICE_USAGE', 'IN',
    v_usage_row.quantity, v_stock_before, v_stock_after,
    'SERVICE', p_service_id, coalesce(v_service_row.service_number, ''),
    'Pengembalian sparepart dari servis: ' || coalesce(v_service_row.service_number, ''), p_created_by
  )
  returning id into v_movement_id;

  -- 6. Delete usage record
  delete from public.inv_sparepart_usage
  where id = p_usage_id;

  -- 7. Return result
  return jsonb_build_object(
    'usage_id', p_usage_id,
    'movement_id', v_movement_id,
    'restored_quantity', v_usage_row.quantity,
    'stock_after', v_stock_after
  );
end;
$func$;

comment on function public.return_inv_sparepart_from_service is
  'Reverse a V4 sparepart usage for service. Restores stock, creates reverse movement, deletes usage record.';
