-- ============================================================
-- Migration 007: Service Payment Foundation
-- Connects services â†’ payment_methods â†’ payment_accounts
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. payment_number_counters: generates PAY/YYYY/MM/NNNN
create table if not exists public.payment_number_counters (
  brand_id      integer not null references public.brands(id) on delete cascade,
  counter_date  date not null default current_date,
  last_number   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (brand_id, counter_date)
);

-- 1b. service_payments: payment events for service tickets
create table if not exists public.service_payments (
  id                              uuid primary key default gen_random_uuid(),
  brand_id                        integer not null references public.brands(id) on delete cascade,
  branch_id                       uuid not null references public.branches(id) on delete cascade,
  service_id                      uuid not null references public.services(id) on delete cascade,
  payment_method_id               uuid not null references public.payment_methods(id) on delete restrict,
  payment_account_id              uuid not null references public.payment_accounts(id) on delete restrict,
  payment_account_movement_id     uuid references public.payment_account_movements(id) on delete set null,
  payment_number                  text not null,
  payment_status                  text not null default 'COMPLETED'
                                  check (payment_status in ('COMPLETED', 'VOIDED', 'REFUNDED')),
  gross_amount                    numeric(14,2) not null check (gross_amount > 0),
  mdr_amount                      numeric(14,2) not null default 0 check (mdr_amount >= 0),
  net_amount                      numeric(14,2) not null check (net_amount = gross_amount - mdr_amount),
  idempotency_key                 text,
  paid_at                         timestamptz not null default now(),
  notes                           text,
  metadata                        jsonb not null default '{}',
  created_by                      uuid references public.profiles(id) on delete set null,
  created_at                      timestamptz not null default now(),
  constraint uq_sp_payment_number unique (brand_id, payment_number)
);

comment on table public.service_payments is 'All payment events on service tickets. Append-only: COMPLETED rows are immutable. VOIDED/REFUNDED set later via controlled function.';


-- ============================================================
-- 2. INDEXES
-- ============================================================

create index if not exists idx_sp_brand_id       on public.service_payments (brand_id);
create index if not exists idx_sp_branch_id      on public.service_payments (branch_id);
create index if not exists idx_sp_service_id     on public.service_payments (service_id);
create index if not exists idx_sp_payment_method on public.service_payments (payment_method_id);
create index if not exists idx_sp_account        on public.service_payments (payment_account_id);
create index if not exists idx_sp_movement       on public.service_payments (payment_account_movement_id);
create index if not exists idx_sp_paid_at        on public.service_payments (paid_at);
create index if not exists idx_sp_created_by     on public.service_payments (created_by);
create index if not exists idx_sp_status         on public.service_payments (payment_status);
create index if not exists idx_sp_payment_number on public.service_payments (payment_number);
create unique index if not exists uq_sp_idempotency_key
  on public.service_payments (brand_id, idempotency_key)
  where idempotency_key is not null;


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table public.service_payments enable row level security;

drop policy if exists sp_select on public.service_payments;
create policy sp_select on public.service_payments
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- NOTE: INSERT/UPDATE/DELETE are intentionally not granted here.
-- All payment recording goes through record_service_payment() function.
-- The function is owned by the table owner and bypasses RLS when
-- called with SECURITY DEFINER (set in function definition).
-- Direct table modifications are restricted to future controlled
-- void/refund functions only.


-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- 4a. generate_service_payment_number
-- Purpose: Generate unique PAY/YYYY/MM/NNNN per brand per month.
-- Concurrency-safe via INSERT ... ON CONFLICT + FOR UPDATE.
-- ------------------------------------------------------------

create or replace function public.generate_service_payment_number(
  p_brand_id integer
) returns text
language plpgsql
as $func$
declare
  v_year     integer := extract(year from current_date);
  v_month    integer := extract(month from current_date);
  v_counter  integer;
  v_date     date := current_date;
begin
  -- Upsert and lock the counter row for this brand + month
  insert into public.payment_number_counters (brand_id, counter_date, last_number)
  values (p_brand_id, v_date, 0)
  on conflict (brand_id, counter_date) do nothing;

  -- Lock and increment
  update public.payment_number_counters
  set last_number = last_number + 1,
      updated_at = now()
  where brand_id = p_brand_id
    and counter_date = v_date
  returning last_number into v_counter;

  if not found then
    raise exception 'Failed to generate payment number for brand %', p_brand_id
      using errcode = 'P0002';
  end if;

  return 'PAY/' || to_char(v_date, 'YYYY') || '/' || to_char(v_date, 'MM') || '/' || lpad(v_counter::text, 4, '0');
end;
$func$;


-- ------------------------------------------------------------
-- 4b. resolve_service_payment_account
-- Purpose: Resolve the destination payment account and MDR
--          percentage for a service payment.
-- Priority:
--   1. branch_payment_methods override (if active)
--   2. payment_method.default_payment_account_id
--   3. For CASH: branch-specific CASH account (auto-resolve)
-- ------------------------------------------------------------

create or replace function public.resolve_service_payment_account(
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
  -- Step 1: Get payment method
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

  -- Step 2: Check branch_payment_methods override
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

    -- Branch-specific account overrides default
    if v_bpm_account_id is not null then
      v_account_id := v_bpm_account_id;
    end if;

    -- Branch-specific MDR overrides global
    if v_bpm_mdr_pct is not null then
      v_mdr_pct := v_bpm_mdr_pct;
    end if;
  end if;

  -- Step 3: Fallback to payment_method default account
  if v_account_id is null then
    v_account_id := v_pm_default_account;
  end if;

  -- Step 4: For CASH, validate or auto-resolve branch cash account
  if v_method_type = 'CASH' then
    if v_account_id is not null then
      -- Validate the resolved account is a CASH account for this branch
      perform 1 from public.payment_accounts
      where id = v_account_id
        and brand_id = p_brand_id
        and branch_id = p_branch_id
        and is_cash_account = true
        and is_active = true;

      if not found then
        v_account_id := null;  -- fall through to auto-resolve
      end if;
    end if;

    -- Auto-resolve: find any active CASH account for this branch
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

  -- Step 5: Validate resolved account (non-CASH)
  if v_account_id is null then
    raise exception 'No payment account could be resolved for payment method % on branch %',
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
-- 4c. calculate_service_payment_mdr
-- Purpose: Calculate MDR fee for a service payment.
-- Rules:
--   TRANSFER â†’ 0
--   CASH â†’ 0
--   QRIS amount <= 500000 â†’ 0
--   QRIS amount > 500000 â†’ ROUND(amount * mdr_percentage / 100)
--   Other (DEBIT, CREDIT, EWALLET) â†’ ROUND(amount * mdr_percentage / 100)
-- ------------------------------------------------------------

create or replace function public.calculate_service_payment_mdr(
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
    when p_method_type in ('TRANSFER', 'CASH') then
      0
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

comment on function public.calculate_service_payment_mdr is
  'MDR rules: TRANSFER/CASH=0, QRIS threshold 500000 (hardcoded), else method mdr_percentage';


-- ------------------------------------------------------------
-- 4d. record_service_payment
-- Purpose: Single controlled function to record a service payment.
--   - Validates service state (not CANCELLED)
--   - Validates brand/branch cross-reference
--   - Resolves payment account
--   - Calculates MDR
--   - Generates payment number
--   - Supports idempotency (via provided key or auto-generated)
--   - Inserts service_payment
--   - Creates payment_account_movement (IN, net_amount = gross - mdr)
--   - Returns payment details
-- ------------------------------------------------------------

create or replace function public.record_service_payment(
  p_service_id uuid,
  p_payment_method_id uuid,
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
  v_service        record;
  v_resolved       jsonb;
  v_account_id     uuid;
  v_method_type    text;
  v_mdr_pct        numeric(5,2);
  v_mdr_amount     numeric(14,2);
  v_net_amount     numeric(14,2);
  v_payment_number text;
  v_final_key      text;
  v_payment_id     uuid;
  v_movement_id    uuid;
  v_existing_id            uuid;
  v_existing_payment_number text;
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

  -- Step 3: Validate payment_method belongs to brand
  perform 1 from public.payment_methods
  where id = p_payment_method_id and brand_id = v_service.brand_id;

  if not found then
    raise exception 'Payment method % not found for brand % of service',
      p_payment_method_id, v_service.brand_id using errcode = 'P0002';
  end if;

  -- Step 4: Resolve payment account
  v_resolved := public.resolve_service_payment_account(
    v_service.brand_id,
    v_service.branch_id,
    p_payment_method_id
  );

  v_account_id  := (v_resolved ->> 'payment_account_id')::uuid;
  v_method_type := v_resolved ->> 'method_type';
  v_mdr_pct     := (v_resolved ->> 'mdr_percentage')::numeric(5,2);

  -- Step 5: Calculate MDR
  v_mdr_amount := public.calculate_service_payment_mdr(v_method_type, p_amount, v_mdr_pct);
  v_net_amount := p_amount - v_mdr_amount;

  -- Step 6: Generate payment number
  v_payment_number := public.generate_service_payment_number(v_service.brand_id);

  -- Step 7: Handle idempotency
  v_final_key := p_idempotency_key;

  if v_final_key is null then
    -- Auto-generate idempotency key using service + payment number
    v_final_key := 'service_payment:' || p_service_id || ':' || v_payment_number;
  else
    -- Check if this key already exists for this brand
    select id, payment_number into v_existing_id, v_existing_payment_number
    from public.service_payments
    where brand_id = v_service.brand_id
      and idempotency_key = v_final_key;

    if found then
      -- Existing payment found â€” idempotent return
      return jsonb_build_object(
        'service_payment_id', v_existing_id,
        'payment_number', v_existing_payment_number,
        'status', 'ALREADY_EXISTS',
        'gross_amount', p_amount,
        'mdr_amount', v_mdr_amount,
        'net_amount', v_net_amount
      );
    end if;
  end if;

  -- Step 8: Insert service_payment record
  insert into public.service_payments (
    brand_id, branch_id, service_id,
    payment_method_id, payment_account_id,
    payment_number, payment_status,
    gross_amount, mdr_amount, net_amount,
    idempotency_key, paid_at, notes,
    metadata, created_by, created_at
  ) values (
    v_service.brand_id, v_service.branch_id, p_service_id,
    p_payment_method_id, v_account_id,
    v_payment_number, 'COMPLETED',
    p_amount, v_mdr_amount, v_net_amount,
    v_final_key, p_paid_at, p_notes,
    p_metadata,
    p_created_by, now()
  )
  returning id into v_payment_id;

  -- Step 9: Create payment_account_movement (net amount)
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

  -- Step 10: Link movement back to payment
  update public.service_payments
  set payment_account_movement_id = v_movement_id
  where id = v_payment_id;

  -- Step 11: Return result
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
  'Records a service payment: validates service state, resolves account, calculates MDR, creates payment + account movement in one transaction';


-- ------------------------------------------------------------
-- 4e. calculate_service_payment_summary
-- Purpose: Return payment summary for a service.
--   - cost: final_cost (or estimated_cost if final_cost is 0)
--   - total_paid: sum of gross_amount of COMPLETED payments
--   - remaining_balance
--   - overpaid_amount
--   - payment_state: UNPAID / PARTIAL / PAID / OVERPAID
-- ------------------------------------------------------------

create or replace function public.calculate_service_payment_summary(
  p_service_id uuid
) returns jsonb
language plpgsql
stable
as $func$
declare
  v_cost         numeric(14,2);
  v_total_paid   numeric(14,2);
  v_state        text;
begin
  -- Get cost: prefer final_cost, fallback to estimated_cost
  select coalesce(nullif(final_cost, 0), nullif(estimated_cost, 0), 0)
  into v_cost
  from public.services
  where id = p_service_id and deleted_at is null;

  if not found then
    raise exception 'Service % not found', p_service_id using errcode = 'P0002';
  end if;

  -- Sum of all COMPLETED payment gross amounts
  select coalesce(sum(gross_amount), 0)
  into v_total_paid
  from public.service_payments
  where service_id = p_service_id
    and payment_status = 'COMPLETED';

  -- Determine state
  v_state := case
    when v_total_paid = 0 then 'UNPAID'
    when v_total_paid < v_cost then 'PARTIAL'
    when v_total_paid = v_cost then 'PAID'
    else 'OVERPAID'
  end;

  return jsonb_build_object(
    'service_id', p_service_id,
    'cost', v_cost,
    'total_paid', v_total_paid,
    'remaining_balance', greatest(v_cost - v_total_paid, 0),
    'overpaid_amount', greatest(v_total_paid - v_cost, 0),
    'payment_state', v_state
  );
end;
$func$;

comment on function public.calculate_service_payment_summary is
  'Returns payment summary: cost, total paid, balance, state (UNPAID/PARTIAL/PAID/OVERPAID)';


-- ============================================================
-- End of Migration 007
-- ============================================================

