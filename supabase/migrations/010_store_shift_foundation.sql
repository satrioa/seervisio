-- ============================================================
-- Migration 010: Store Shift Foundation
-- Open/close shift, cash management, shift cash movements
-- ============================================================

-- ============================================================
-- DESIGN PRINCIPLES
-- ============================================================
-- One active shift per branch.
-- Opening cash is user-input; compared to previous closing.
-- Closing cash is user-counted; compared to expected.
-- Cash difference is stored but NOT automatically adjusted.
-- Payment account reconciliation is a separate confirmed action.
-- Only CASH payments affect physical drawer expected cash.
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. store_shift_number_counters
create table if not exists public.store_shift_number_counters (
  brand_id    integer not null references public.brands(id) on delete cascade,
  year        integer not null,
  month       integer not null,
  last_number integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (brand_id, year, month)
);

-- 1b. store_shifts
create table if not exists public.store_shifts (
  id                      uuid primary key default gen_random_uuid(),
  brand_id                integer not null references public.brands(id) on delete cascade,
  branch_id               uuid not null references public.branches(id) on delete cascade,
  cash_account_id         uuid not null references public.payment_accounts(id) on delete restrict,
  shift_number            text not null,
  shift_status            text not null default 'OPEN'
                          check (shift_status in ('OPEN', 'CLOSED', 'CANCELLED')),
  opening_cash            numeric(14,2) not null default 0 check (opening_cash >= 0),
  previous_closing_cash   numeric(14,2) check (previous_closing_cash is null or previous_closing_cash >= 0),
  opening_difference      numeric(14,2) not null default 0,
  expected_closing_cash   numeric(14,2),
  counted_closing_cash    numeric(14,2) check (counted_closing_cash is null or counted_closing_cash >= 0),
  cash_difference         numeric(14,2),
  opened_at               timestamptz not null default now(),
  closed_at               timestamptz,
  opened_by               uuid references public.profiles(id) on delete set null,
  closed_by               uuid references public.profiles(id) on delete set null,
  opening_notes           text,
  closing_notes           text,
  metadata                jsonb not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_ss_shift_number unique (brand_id, shift_number)
);

comment on table public.store_shifts is
  'Store shift session. opening_difference = opening_cash - previous_closing_cash. cash_difference = counted_closing_cash - expected_closing_cash. cash_difference is stored but NOT automatically adjusted in payment account — requires explicit confirmation.';

-- 1c. store_shift_cash_movements
create table if not exists public.store_shift_cash_movements (
  id                          uuid primary key default gen_random_uuid(),
  brand_id                    integer not null references public.brands(id) on delete cascade,
  branch_id                   uuid not null references public.branches(id) on delete cascade,
  shift_id                    uuid not null references public.store_shifts(id) on delete cascade,
  cash_account_id             uuid not null references public.payment_accounts(id) on delete restrict,
  payment_account_movement_id uuid references public.payment_account_movements(id) on delete set null,
  finance_ledger_id           uuid references public.finance_ledger(id) on delete set null,
  movement_type               text not null check (movement_type in ('CASH_IN', 'CASH_OUT', 'CASH_ADJUSTMENT')),
  direction                   text not null check (direction in ('IN', 'OUT')),
  amount                      numeric(14,2) not null check (amount > 0),
  description                 text,
  metadata                    jsonb not null default '{}',
  created_by                  uuid references public.profiles(id) on delete set null,
  created_at                  timestamptz not null default now()
);

comment on table public.store_shift_cash_movements is
  'Manual cash drawer adjustments during an active shift. Each movement creates a payment_account_movement (OTHER_INCOME/OPERATING_EXPENSE) for the cash account.';


-- ============================================================
-- 2. INDEXES
-- ============================================================

-- store_shifts indexes
create index if not exists idx_ss_brand_id     on public.store_shifts (brand_id);
create index if not exists idx_ss_branch_id    on public.store_shifts (branch_id);
create index if not exists idx_ss_cash_account on public.store_shifts (cash_account_id);
create index if not exists idx_ss_status       on public.store_shifts (shift_status);
create index if not exists idx_ss_opened_at    on public.store_shifts (opened_at);
create index if not exists idx_ss_closed_at    on public.store_shifts (closed_at);
create index if not exists idx_ss_opened_by    on public.store_shifts (opened_by);
create index if not exists idx_ss_closed_by    on public.store_shifts (closed_by);
create unique index if not exists uq_ss_one_open_per_branch
  on public.store_shifts (branch_id)
  where shift_status = 'OPEN';

-- store_shift_cash_movements indexes
create index if not exists idx_sscm_brand_id    on public.store_shift_cash_movements (brand_id);
create index if not exists idx_sscm_branch_id   on public.store_shift_cash_movements (branch_id);
create index if not exists idx_sscm_shift_id    on public.store_shift_cash_movements (shift_id);
create index if not exists idx_sscm_account     on public.store_shift_cash_movements (cash_account_id);
create index if not exists idx_sscm_movement    on public.store_shift_cash_movements (payment_account_movement_id);
create index if not exists idx_sscm_finance     on public.store_shift_cash_movements (finance_ledger_id);
create index if not exists idx_sscm_created_at  on public.store_shift_cash_movements (created_at);
create index if not exists idx_sscm_created_by  on public.store_shift_cash_movements (created_by);


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table public.store_shifts enable row level security;
alter table public.store_shift_cash_movements enable row level security;

drop policy if exists ss_select on public.store_shifts;
create policy ss_select on public.store_shifts
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

drop policy if exists sscm_select on public.store_shift_cash_movements;
create policy sscm_select on public.store_shift_cash_movements
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- NOTE: No INSERT/UPDATE/DELETE policies. All writes through functions with SECURITY DEFINER.
-- Shift lifecycle: open_store_shift() → add_shift_cash_movement() → close_store_shift()


-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- 4a. generate_store_shift_number
-- Purpose: Generate unique SHIFT/YYYY/MM/NNNN per brand.
-- ------------------------------------------------------------

create or replace function public.generate_store_shift_number(
  p_brand_id integer
) returns text
language plpgsql
as $func$
declare
  v_year     integer := extract(year from current_date);
  v_month    integer := extract(month from current_date);
  v_counter  integer;
begin
  insert into public.store_shift_number_counters (brand_id, year, month, last_number)
  values (p_brand_id, v_year, v_month, 0)
  on conflict (brand_id, year, month) do nothing;

  update public.store_shift_number_counters
  set last_number = last_number + 1, updated_at = now()
  where brand_id = p_brand_id and year = v_year and month = v_month
  returning last_number into v_counter;

  if not found then
    raise exception 'Failed to generate shift number for brand %', p_brand_id
      using errcode = 'P0002';
  end if;

  return 'SHIFT/' || lpad(v_year::text, 4, '0') || '/' || lpad(v_month::text, 2, '0') || '/' || lpad(v_counter::text, 4, '0');
end;
$func$;


-- ------------------------------------------------------------
-- 4b. get_branch_active_shift
-- Purpose: Return active OPEN shift for a branch, or null.
-- ------------------------------------------------------------

create or replace function public.get_branch_active_shift(
  p_branch_id uuid
) returns jsonb
language plpgsql
stable
as $func$
declare
  v_shift record;
begin
  select id, brand_id, branch_id, cash_account_id, shift_number,
         opening_cash, previous_closing_cash, opening_difference,
         opened_at, opened_by, opening_notes
  into v_shift
  from public.store_shifts
  where branch_id = p_branch_id and shift_status = 'OPEN'
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'shift_id', v_shift.id,
    'brand_id', v_shift.brand_id,
    'branch_id', v_shift.branch_id,
    'cash_account_id', v_shift.cash_account_id,
    'shift_number', v_shift.shift_number,
    'opening_cash', v_shift.opening_cash,
    'previous_closing_cash', v_shift.previous_closing_cash,
    'opening_difference', v_shift.opening_difference,
    'opened_at', v_shift.opened_at,
    'opened_by', v_shift.opened_by,
    'opening_notes', v_shift.opening_notes
  );
end;
$func$;


-- ------------------------------------------------------------
-- 4c. open_store_shift
-- Purpose: Open a new store shift for a branch.
-- ------------------------------------------------------------

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

comment on function public.open_store_shift is
  'Opens a new store shift: validates branch/cash-account, computes opening_difference vs previous closing, creates shift with OPEN status, writes audit log.';


-- ------------------------------------------------------------
-- 4d. calculate_shift_expected_cash
-- Purpose: Calculate expected cash in drawer for a shift.
-- Formula: opening_cash + CASH service payments + CASH POS sales
--          + manual CASH_IN - manual CASH_OUT
-- ------------------------------------------------------------

create or replace function public.calculate_shift_expected_cash(
  p_shift_id uuid
) returns numeric
language plpgsql
stable
as $func$
declare
  v_shift              record;
  v_closed_at          timestamptz;
  v_cash_service_total numeric(14,2);
  v_cash_pos_total     numeric(14,2);
  v_manual_in          numeric(14,2);
  v_manual_out         numeric(14,2);
  v_expected           numeric(14,2);
begin
  select id, branch_id, cash_account_id, opening_cash, opened_at, closed_at
  into v_shift
  from public.store_shifts
  where id = p_shift_id;

  if not found then
    raise exception 'Shift % not found', p_shift_id using errcode = 'P0002';
  end if;

  -- Use closed_at if set, otherwise current time (for open shifts)
  v_closed_at := coalesce(v_shift.closed_at, now());

  -- CASH service payments to this cash account during shift
  select coalesce(sum(sp.net_amount), 0) into v_cash_service_total
  from public.service_payments sp
  join public.payment_methods pm on pm.id = sp.payment_method_id
  where sp.payment_account_id = v_shift.cash_account_id
    and sp.paid_at >= v_shift.opened_at
    and sp.paid_at <= v_closed_at
    and sp.payment_status = 'COMPLETED'
    and pm.type = 'CASH';

  -- CASH POS sales to this cash account during shift
  select coalesce(sum(ps.net_amount), 0) into v_cash_pos_total
  from public.pos_sales ps
  join public.payment_methods pm on pm.id = ps.payment_method_id
  where ps.payment_account_id = v_shift.cash_account_id
    and ps.sold_at >= v_shift.opened_at
    and ps.sold_at <= v_closed_at
    and ps.sale_status = 'COMPLETED'
    and pm.type = 'CASH';

  -- Manual CASH_IN during shift
  select coalesce(sum(amount), 0) into v_manual_in
  from public.store_shift_cash_movements
  where shift_id = p_shift_id and direction = 'IN';

  -- Manual CASH_OUT during shift
  select coalesce(sum(amount), 0) into v_manual_out
  from public.store_shift_cash_movements
  where shift_id = p_shift_id and direction = 'OUT';

  v_expected := v_shift.opening_cash + v_cash_service_total + v_cash_pos_total + v_manual_in - v_manual_out;
  return v_expected;
end;
$func$;

comment on function public.calculate_shift_expected_cash is
  'Expected cash drawer = opening_cash + CASH payments (service+POS) + manual CASH_IN - manual CASH_OUT. Uses net_amount for payments (MDR=0 for CASH, so net = gross).';


-- ------------------------------------------------------------
-- 4e. close_store_shift
-- Purpose: Close an open shift with counted closing cash.
-- Stores cash_difference but does NOT auto-adjust accounts.
-- ------------------------------------------------------------

create or replace function public.close_store_shift(
  p_shift_id uuid,
  p_counted_closing_cash numeric,
  p_closing_notes text default null,
  p_closed_by uuid default null,
  p_metadata jsonb default '{}'
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_shift             record;
  v_expected_cash     numeric(14,2);
  v_cash_diff         numeric(14,2);
begin
  -- Lock shift FOR UPDATE
  select * into v_shift
  from public.store_shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'Shift % not found', p_shift_id using errcode = 'P0002';
  end if;

  if v_shift.shift_status != 'OPEN' then
    raise exception 'Shift % is not OPEN (current status: %). Cannot close.',
      p_shift_id, v_shift.shift_status using errcode = 'P0004';
  end if;

  if p_counted_closing_cash < 0 then
    raise exception 'Counted closing cash cannot be negative, got %', p_counted_closing_cash
      using errcode = '22023';
  end if;

  -- Calculate expected cash
  v_expected_cash := public.calculate_shift_expected_cash(p_shift_id);
  v_cash_diff := p_counted_closing_cash - v_expected_cash;

  -- Close shift
  update public.store_shifts
  set shift_status = 'CLOSED',
      expected_closing_cash = v_expected_cash,
      counted_closing_cash = p_counted_closing_cash,
      cash_difference = v_cash_diff,
      closed_at = now(),
      closed_by = p_closed_by,
      closing_notes = p_closing_notes,
      metadata = metadata || p_metadata,
      updated_at = now()
  where id = p_shift_id;

  -- Audit log
  insert into public.audit_logs (brand_id, actor_id, action, target_type, target_id, target_label, description, details, created_at)
  values (
    v_shift.brand_id, p_closed_by, 'CLOSE_SHIFT', 'store_shifts', v_shift.id, v_shift.shift_number,
    'Closed shift ' || v_shift.shift_number || ' counted cash ' || p_counted_closing_cash::text || ' difference ' || v_cash_diff::text,
    jsonb_build_object(
      'shift_number', v_shift.shift_number,
      'expected_closing_cash', v_expected_cash,
      'counted_closing_cash', p_counted_closing_cash,
      'cash_difference', v_cash_diff
    ),
    now()
  );

  return jsonb_build_object(
    'shift_id', v_shift.id,
    'shift_number', v_shift.shift_number,
    'status', 'CLOSED',
    'opening_cash', v_shift.opening_cash,
    'expected_closing_cash', v_expected_cash,
    'counted_closing_cash', p_counted_closing_cash,
    'cash_difference', v_cash_diff,
    'duration_minutes', extract(epoch from (now() - v_shift.opened_at)) / 60
  );
end;
$func$;

comment on function public.close_store_shift is
  'Closes an OPEN shift: calculates expected cash, stores counted cash and difference. Does NOT auto-adjust payment account — difference requires explicit confirmation.';


-- ------------------------------------------------------------
-- 4f. add_shift_cash_movement
-- Purpose: Record manual cash in/out during an active shift.
-- Creates payment_account_movement + store_shift_cash_movements.
-- ------------------------------------------------------------

create or replace function public.add_shift_cash_movement(
  p_shift_id uuid,
  p_direction text,
  p_amount numeric,
  p_description text default null,
  p_created_by uuid default null,
  p_metadata jsonb default '{}'
) returns uuid
language plpgsql
security definer
as $func$
declare
  v_shift          record;
  v_movement_type  text;
  v_pa_movement_id uuid;
  v_sscm_id        uuid;
begin
  -- Lock shift for update
  select * into v_shift
  from public.store_shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'Shift % not found', p_shift_id using errcode = 'P0002';
  end if;

  if v_shift.shift_status != 'OPEN' then
    raise exception 'Shift % is not OPEN (status: %). Cannot add cash movement.',
      p_shift_id, v_shift.shift_status using errcode = 'P0004';
  end if;

  if p_direction not in ('IN', 'OUT') then
    raise exception 'Direction must be IN or OUT, got %', p_direction using errcode = 'P0004';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive, got %', p_amount using errcode = '22023';
  end if;

  -- Determine movement_type and payment_account_movement_type
  v_movement_type := 'CASH_' || p_direction;
  -- CASH_IN → OTHER_INCOME, CASH_OUT → OPERATING_EXPENSE

  -- Create payment_account_movement
  v_pa_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_shift.cash_account_id,
    p_brand_id           := v_shift.brand_id,
    p_direction          := p_direction,
    p_amount             := p_amount,
    p_movement_type      := case when p_direction = 'IN' then 'OTHER_INCOME' else 'OPERATING_EXPENSE' end,
    p_branch_id          := v_shift.branch_id,
    p_reference_type     := 'store_shift_cash_movement',
    p_reference_id       := null,
    p_description        := coalesce(p_description, 'Shift cash movement: ' || p_direction || ' ' || p_amount),
    p_metadata           := jsonb_build_object('shift_id', p_shift_id, 'shift_number', v_shift.shift_number) || p_metadata,
    p_created_by         := p_created_by
  );

  -- Insert store_shift_cash_movements
  insert into public.store_shift_cash_movements (
    brand_id, branch_id, shift_id, cash_account_id,
    payment_account_movement_id,
    movement_type, direction, amount,
    description, metadata, created_by, created_at
  ) values (
    v_shift.brand_id, v_shift.branch_id, p_shift_id, v_shift.cash_account_id,
    v_pa_movement_id,
    v_movement_type, p_direction, p_amount,
    p_description,
    p_metadata, p_created_by, now()
  )
  returning id into v_sscm_id;

  return v_sscm_id;
end;
$func$;

comment on function public.add_shift_cash_movement is
  'Records manual cash in/out during an active shift. Creates payment_account_movement (OTHER_INCOME for IN, OPERATING_EXPENSE for OUT) and store_shift_cash_movements row.';


-- ============================================================
-- 5. VALIDATION QUERIES (reference only, not executed)
-- ============================================================

-- 5a. Branch with more than one OPEN shift (should return empty due to unique index)
--
-- SELECT ss.branch_id, b.name AS branch_name, COUNT(*) AS open_shift_count
-- FROM public.store_shifts ss
-- JOIN public.branches b ON b.id = ss.branch_id
-- WHERE ss.shift_status = 'OPEN'
-- GROUP BY ss.branch_id, b.name
-- HAVING COUNT(*) > 1;

-- 5b. Shift cash account branch mismatch
--
-- SELECT ss.id, ss.shift_number, ss.branch_id AS shift_branch,
--        pa.id AS account_id, pa.branch_id AS account_branch, pa.account_name
-- FROM public.store_shifts ss
-- JOIN public.payment_accounts pa ON pa.id = ss.cash_account_id
-- WHERE ss.branch_id IS DISTINCT FROM pa.branch_id;

-- 5c. Open shift without cash account
--
-- SELECT ss.id, ss.shift_number, ss.branch_id
-- FROM public.store_shifts ss
-- WHERE ss.shift_status = 'OPEN' AND ss.cash_account_id IS NULL;

-- 5d. CLOSED shift without counted_closing_cash
--
-- SELECT ss.id, ss.shift_number, ss.closed_at
-- FROM public.store_shifts ss
-- WHERE ss.shift_status = 'CLOSED' AND ss.counted_closing_cash IS NULL;

-- 5e. Shift expected cash mismatch (recalculate and compare)
--
-- SELECT ss.id, ss.shift_number, ss.opening_cash,
--        ss.expected_closing_cash AS stored_expected,
--        public.calculate_shift_expected_cash(ss.id) AS computed_expected,
--        ss.counted_closing_cash, ss.cash_difference
-- FROM public.store_shifts ss
-- WHERE ss.shift_status = 'CLOSED'
--   AND ss.expected_closing_cash IS DISTINCT FROM public.calculate_shift_expected_cash(ss.id)
-- ORDER BY ss.closed_at;

-- 5f. Cash movement without payment_account_movement
--
-- SELECT sscm.id, sscm.shift_id, sscm.movement_type, sscm.amount, sscm.created_at
-- FROM public.store_shift_cash_movements sscm
-- WHERE sscm.payment_account_movement_id IS NULL;

-- 5g. Opening difference from previous closing
-- Compare opening_cash vs previous_closing_cash.
--
-- SELECT ss.id, ss.shift_number, ss.opening_cash,
--        ss.previous_closing_cash,
--        ss.opening_difference,
--        (ss.opening_cash - COALESCE(ss.previous_closing_cash, 0)) AS computed_difference
-- FROM public.store_shifts ss
-- WHERE ss.opening_difference != (ss.opening_cash - COALESCE(ss.previous_closing_cash, 0));

-- 5h. Shift duration in hours/minutes
--
-- SELECT ss.id, ss.shift_number,
--        ss.opened_at, ss.closed_at,
--        EXTRACT(EPOCH FROM (ss.closed_at - ss.opened_at)) / 60 AS duration_minutes,
--        EXTRACT(EPOCH FROM (ss.closed_at - ss.opened_at)) / 3600 AS duration_hours
-- FROM public.store_shifts ss
-- WHERE ss.shift_status = 'CLOSED'
-- ORDER BY ss.closed_at DESC;


-- ============================================================
-- End of Migration 010
-- ============================================================

