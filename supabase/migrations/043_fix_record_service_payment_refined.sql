-- ============================================================
-- Migration 043: Refine record_service_payment legacy resolution
--
-- Problems fixed:
-- 1. Error message missing branch_payment_methods.id and branch id.
-- 2. Legacy payment_methods.id lookup needs to prefer non-test
--    methods (e.g. prefer QRIS over QRIS Test).
-- 3. Variable names clarified for auditability.
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
  v_service                 record;
  v_method_type             text;
  v_payment_account_id      uuid;
  v_mdr_percentage          numeric(5,2);
  v_mdr_min_transaction     numeric;
  v_mdr_amount              numeric(14,2);
  v_net_amount              numeric(14,2);
  v_payment_number          text;
  v_final_key               text;
  v_payment_id              uuid;
  v_movement_id             uuid;
  v_existing_id             uuid;
  v_existing_payment_number text;
  v_legacy_payment_method_id uuid;
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
  -- This prevents duplicate payment number consumption on retry/double-submit
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

  -- Step 4: Validate branch_payment_methods (p_payment_method_id is branch_payment_methods.id)
  select
    bpm.method_type,
    bpm.payment_account_id,
    coalesce(bpm.mdr_percentage, 0),
    coalesce(bpm.mdr_min_transaction, 0)
  into
    v_method_type,
    v_payment_account_id,
    v_mdr_percentage,
    v_mdr_min_transaction
  from public.branch_payment_methods bpm
  join public.payment_accounts pa
    on pa.id = bpm.payment_account_id
  where bpm.id = p_payment_method_id
    and bpm.brand_id = v_service.brand_id
    and bpm.branch_id = v_service.branch_id
    and bpm.is_active = true
    and bpm.payment_account_id is not null
    and pa.brand_id = v_service.brand_id
    and pa.is_active = true
    and (pa.branch_id is null or pa.branch_id = v_service.branch_id);

  if not found then
    raise exception 'Branch payment method % is not active for service branch %',
      p_payment_method_id, v_service.branch_id using errcode = 'P0002';
  end if;

  -- Step 5: Resolve legacy payment_methods.id by type, not by id.
  -- Prefer non-test over test methods, then earliest created.
  select pm.id into v_legacy_payment_method_id
  from public.payment_methods pm
  where pm.brand_id = v_service.brand_id
    and pm.is_active = true
    and pm.type = v_method_type
  order by
    case when coalesce(pm.metadata->>'test', 'false') = 'true' then 1 else 0 end,
    pm.created_at asc
  limit 1;

  -- Step 6: Calculate MDR
  v_mdr_amount := public.calculate_pos_mdr(v_method_type, p_amount, v_mdr_percentage, v_mdr_min_transaction);
  v_net_amount := p_amount - v_mdr_amount;

  -- Step 7: Generate payment number (atomic via SELECT FOR UPDATE)
  v_payment_number := public.generate_service_payment_number(v_service.brand_id);

  -- Step 8: Auto-generate idempotency key if not provided
  if v_final_key is null then
    v_final_key := 'service_payment:' || p_service_id || ':' || v_payment_number;
  end if;

  -- Step 9: Insert service_payment record
  insert into public.service_payments (
    brand_id, branch_id, service_id,
    payment_method_id, branch_payment_method_id, payment_account_id,
    payment_number, payment_status,
    gross_amount, mdr_amount, net_amount,
    idempotency_key, paid_at, notes,
    metadata, created_by, created_at
  ) values (
    v_service.brand_id, v_service.branch_id, p_service_id,
    v_legacy_payment_method_id, p_payment_method_id, v_payment_account_id,
    v_payment_number, 'COMPLETED',
    p_amount, v_mdr_amount, v_net_amount,
    v_final_key, p_paid_at, p_notes,
    p_metadata,
    p_created_by, now()
  )
  returning id into v_payment_id;

  -- Step 10: Create payment_account_movement (net amount)
  v_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_payment_account_id,
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

  -- Step 11: Link movement back to payment
  update public.service_payments
  set payment_account_movement_id = v_movement_id
  where id = v_payment_id;

  -- Step 12: Return result
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
  'Records a service payment: validates branch_payment_methods, checks idempotency first, resolves account, calculates MDR (with min threshold), generates number atomically, creates payment + account movement in one transaction.';

notify pgrst, 'reload schema';
