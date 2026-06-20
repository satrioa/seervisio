-- ============================================================
-- Migration 047: Increase payment number retry limit
--
-- Previous retry (migration 046) retried only once.
-- If the counter is off by more than 1 (e.g. starts at 0 but
-- numbers 0000 and 0001 both already exist), a single retry
-- still fails. This increases the limit to 100 so any gap is
-- found.
-- ============================================================

create or replace function public.record_service_payment(
  p_service_id uuid,
  p_payment_method_id uuid, -- stores branch_payment_methods.id
  p_amount numeric,
  p_paid_at timestamptz default now(),
  p_notes text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_service                  record;
  v_branch_payment_method_id uuid;
  v_method_type              text;
  v_bpm_payment_account_id   uuid;
  v_mdr_pct                  numeric(5,2);
  v_mdr_min_transaction      numeric;
  v_account_id               uuid;
  v_mdr_amount               numeric(14,2);
  v_net_amount               numeric(14,2);
  v_payment_number           text;
  v_final_key                text;
  v_payment_id               uuid;
  v_movement_id              uuid;
  v_existing_id              uuid;
  v_existing_payment_number  text;
  v_legacy_payment_method_id uuid;
  v_retry_count              int := 0;
begin
  -- Step 1: Lock service row and validate
  select id, brand_id, branch_id, current_status, final_cost, estimated_cost
  into v_service
  from public.services
  where id = p_service_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Service % not found or deleted', p_service_id using errcode = 'P0002';
  end if;

  if v_service.current_status = 'CANCELLED' then
    raise exception 'Cannot record payment for cancelled service %', p_service_id using errcode = 'P0004';
  end if;

  -- Step 2: Validate amount
  if p_amount <= 0 then
    raise exception 'Payment amount must be positive, got %', p_amount using errcode = '22023';
  end if;

  -- Step 3: Handle idempotency BEFORE payment number generation
  v_final_key := p_idempotency_key;

  if v_final_key is not null then
    select id, payment_number into v_existing_id, v_existing_payment_number
    from public.service_payments
    where brand_id = v_service.brand_id
      and idempotency_key = v_final_key;

    if found then
      return jsonb_build_object(
        'service_payment_id', v_existing_id,
        'payment_number', v_existing_payment_number,
        'status', 'ALREADY_EXISTS',
        'gross_amount', p_amount
      );
    end if;
  end if;

  -- Step 4: Validate branch_payment_methods
  select
    bpm.id,
    bpm.method_type,
    bpm.payment_account_id,
    coalesce(bpm.mdr_percentage, 0),
    coalesce(bpm.mdr_min_transaction, 0)
  into
    v_branch_payment_method_id,
    v_method_type,
    v_bpm_payment_account_id,
    v_mdr_pct,
    v_mdr_min_transaction
  from public.branch_payment_methods bpm
  where bpm.id = p_payment_method_id
    and bpm.brand_id = v_service.brand_id
    and bpm.branch_id = v_service.branch_id
    and bpm.is_active = true;

  if not found then
    raise exception 'Branch payment method % is not active for service branch %',
      p_payment_method_id, v_service.branch_id using errcode = 'P0002';
  end if;

  -- Step 5: Resolve payment account
  if v_method_type = 'CASH' then
    if v_bpm_payment_account_id is not null then
      perform 1 from public.payment_accounts pa
      where pa.id = v_bpm_payment_account_id
        and pa.brand_id = v_service.brand_id
        and pa.is_active = true
        and (pa.branch_id is null or pa.branch_id = v_service.branch_id);

      if found then
        v_account_id := v_bpm_payment_account_id;
      end if;
    end if;

    if v_account_id is null then
      select pa.id into v_account_id
      from public.payment_accounts pa
      where pa.brand_id = v_service.brand_id
        and pa.branch_id = v_service.branch_id
        and pa.is_cash_account = true
        and pa.is_active = true
      limit 1;
    end if;
  else
    if v_bpm_payment_account_id is null then
      raise exception 'Payment account is not configured for method % in branch %',
        v_method_type, v_service.branch_id using errcode = 'P0002';
    end if;

    perform 1 from public.payment_accounts pa
    where pa.id = v_bpm_payment_account_id
      and pa.brand_id = v_service.brand_id
      and pa.is_active = true
      and (pa.branch_id is null or pa.branch_id = v_service.branch_id);

    if not found then
      raise exception 'Payment account is not configured for method % in branch %',
        v_method_type, v_service.branch_id using errcode = 'P0002';
    end if;

    v_account_id := v_bpm_payment_account_id;
  end if;

  if v_account_id is null then
    raise exception 'Payment account is not configured for method % in branch %',
      v_method_type, v_service.branch_id using errcode = 'P0002';
  end if;

  -- Step 6: Resolve legacy payment_methods.id by type (optional, backward compat)
  select pm.id into v_legacy_payment_method_id
  from public.payment_methods pm
  where pm.brand_id = v_service.brand_id
    and pm.is_active = true
    and (pm.type = v_method_type or upper(pm.name) = upper(v_method_type))
  order by pm.created_at asc
  limit 1;

  -- Step 7: Calculate MDR
  v_mdr_amount := public.calculate_pos_mdr(v_method_type, p_amount, v_mdr_pct, v_mdr_min_transaction);
  v_net_amount := p_amount - v_mdr_amount;

  -- Step 8-10: Generate payment number and insert with defensive retry loop.
  -- If the counter gives a number that collides (e.g. counter skew from
  -- rolled-back transactions), retry up to 100 times to find a gap.
  <<retry_block>>
  loop
    v_payment_number := public.generate_service_payment_number(v_service.brand_id);

    if v_final_key is null then
      v_final_key := 'service_payment:' || p_service_id || ':' || v_payment_number;
    end if;

    begin
      insert into public.service_payments (
        brand_id, branch_id, service_id,
        payment_method_id, branch_payment_method_id, payment_account_id,
        payment_number, payment_status,
        gross_amount, mdr_amount, net_amount,
        idempotency_key, paid_at, notes,
        metadata, created_by, created_at
      ) values (
        v_service.brand_id, v_service.branch_id, p_service_id,
        v_legacy_payment_method_id, v_branch_payment_method_id, v_account_id,
        v_payment_number, 'COMPLETED',
        p_amount, v_mdr_amount, v_net_amount,
        v_final_key, p_paid_at, p_notes,
        p_metadata,
        p_created_by, now()
      )
      returning id into v_payment_id;

      exit retry_block;
    exception
      when unique_violation then
        if v_retry_count >= 100 then
          raise;
        end if;
        v_retry_count := v_retry_count + 1;
        if p_idempotency_key is null then
          v_final_key := null;
        end if;
    end;
  end loop;

  -- Step 11: Create payment_account_movement (net amount)
  v_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_account_id,
    p_brand_id           := v_service.brand_id,
    p_direction          := 'IN',
    p_amount             := v_net_amount,
    p_movement_type      := 'SERVICE_PAYMENT',
    p_branch_id          := v_service.branch_id,
    p_reference_type     := 'service_payment',
    p_reference_id       := v_payment_id::text,
    p_description        := 'Payment ' || v_payment_number || ' for service',
    p_metadata           := jsonb_build_object(
                              'service_id', p_service_id,
                              'payment_number', v_payment_number,
                              'gross_amount', p_amount,
                              'mdr_amount', v_mdr_amount,
                              'method_type', v_method_type
                            ),
    p_created_by         := p_created_by
  );

  -- Step 12: Link movement back to payment
  update public.service_payments
  set payment_account_movement_id = v_movement_id
  where id = v_payment_id;

  -- Step 13: Return result
  return jsonb_build_object(
    'service_payment_id', v_payment_id,
    'payment_number', v_payment_number,
    'payment_account_movement_id', v_movement_id,
    'status', 'COMPLETED',
    'gross_amount', p_amount,
    'mdr_amount', v_mdr_amount,
    'net_amount', v_net_amount,
    'method_type', v_method_type
  );
end;
$func$;

comment on function public.record_service_payment is
  'Records a service payment: validates branch_payment_methods, checks idempotency first, resolves account, calculates MDR (with min threshold), generates number atomically with defensive retry (up to 100), creates payment + account movement in one transaction.';

notify pgrst, 'reload schema';
