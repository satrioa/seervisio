-- ============================================================
-- Migration 008: Finance Ledger Foundation
-- Append-only financial reporting source of truth
-- ============================================================

-- ============================================================
-- DESIGN PRINCIPLES
-- ============================================================
-- finance_ledger is a REAL APPEND-ONLY TABLE, not a materialized view.
-- It is the source of truth for revenue, expense, cost, profit/loss.
-- Materialized views may be added later as derived reporting/cache only.
--
-- Concept separation:
--   service_payments.gross_amount  → SERVICE_REVENUE (customer fulfillment)
--   service_payments.net_amount    → payment_account_movement (actual funds)
--   service_payments.mdr_amount    → MDR_EXPENSE (bank fee)
--
-- Example QRIS Rp1.000.000 with MDR 0.7%:
--   finance_ledger: SERVICE_REVENUE CREDIT 1.000.000
--   finance_ledger: MDR_EXPENSE     DEBIT      7.000
--   payment_account_movements: IN 993.000 (net settlement)
-- ============================================================

-- ============================================================
-- 1. TABLE
-- ============================================================

create table if not exists public.finance_ledger (
  id              uuid primary key default gen_random_uuid(),
  brand_id        integer not null references public.brands(id) on delete cascade,
  branch_id       uuid references public.branches(id) on delete set null,
  ledger_date     date not null default current_date,
  occurred_at     timestamptz not null default now(),
  entry_type      text not null
                  check (entry_type in (
                    'SERVICE_REVENUE',
                    'POS_REVENUE',
                    'OTHER_INCOME',
                    'MDR_EXPENSE',
                    'OPERATING_EXPENSE',
                    'STOCK_PURCHASE',
                    'COGS',
                    'CASH_ADJUSTMENT',
                    'PAYMENT_REFUND',
                    'VOID_REVERSAL'
                  )),
  direction       text not null check (direction in ('DEBIT', 'CREDIT')),
  amount          numeric(14,2) not null check (amount > 0),
  category        text,
  account_code    text,
  reference_type  text,
  reference_id    uuid,
  source_table    text,
  source_id       uuid,
  description     text,
  idempotency_key text,
  metadata        jsonb not null default '{}',
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on table public.finance_ledger is
  'Append-only financial ledger — source of truth for reporting. No UPDATE/DELETE. Corrections via reversal entries.';

comment on column public.finance_ledger.entry_type is
  'SERVICE_REVENUE|POS_REVENUE|OTHER_INCOME|MDR_EXPENSE|OPERATING_EXPENSE|STOCK_PURCHASE|COGS|CASH_ADJUSTMENT|PAYMENT_REFUND|VOID_REVERSAL';

comment on column public.finance_ledger.direction is
  'DEBIT increases expense/asset accounts. CREDIT increases revenue/liability accounts.';
-- ============================================================
-- End of comment block

-- ============================================================
-- 2. INDEXES
-- ============================================================

create index if not exists idx_fl_brand_id       on public.finance_ledger (brand_id);
create index if not exists idx_fl_branch_id      on public.finance_ledger (branch_id);
create index if not exists idx_fl_ledger_date    on public.finance_ledger (ledger_date);
create index if not exists idx_fl_occurred_at    on public.finance_ledger (occurred_at);
create index if not exists idx_fl_entry_type     on public.finance_ledger (entry_type);
create index if not exists idx_fl_direction      on public.finance_ledger (direction);
create index if not exists idx_fl_reference      on public.finance_ledger (reference_type, reference_id);
create index if not exists idx_fl_source         on public.finance_ledger (source_table, source_id);
create index if not exists idx_fl_created_by     on public.finance_ledger (created_by);
create unique index if not exists uq_fl_idempotency_key
  on public.finance_ledger (brand_id, idempotency_key)
  where idempotency_key is not null;


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table public.finance_ledger enable row level security;

drop policy if exists fl_select on public.finance_ledger;
create policy fl_select on public.finance_ledger
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- NOTE: No INSERT/UPDATE/DELETE policies.
-- All entries go through add_finance_ledger_entry() with SECURITY DEFINER.
-- Corrections via reversal entries only. No direct modifications.


-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- 4a. add_finance_ledger_entry
-- Purpose: Single controlled function to insert finance ledger
--          entries. Validates brand, branch, amount, direction,
--          entry_type. Supports idempotency.
-- ------------------------------------------------------------

create or replace function public.add_finance_ledger_entry(
  p_brand_id integer,
  p_entry_type text,
  p_direction text,
  p_amount numeric,
  p_branch_id uuid default null,
  p_ledger_date date default current_date,
  p_occurred_at timestamptz default now(),
  p_category text default null,
  p_account_code text default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_description text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null,
  p_idempotency_key text default null
) returns uuid
language plpgsql
security definer
as $func$
declare
  v_found_id          uuid;
  v_existing_entry_type text;
  v_existing_direction text;
  v_existing_amount   numeric(14,2);
  v_existing_ref_type text;
  v_existing_ref_id   text;
  v_existing_src_tbl  text;
  v_existing_src_id   text;
  v_ledger_id         uuid;
begin
  -- Validate brand exists
  perform 1 from public.brands where id = p_brand_id and deleted_at is null;
  if not found then
    raise exception 'Brand % not found or deleted', p_brand_id using errcode = 'P0002';
  end if;

  -- Validate branch if provided
  if p_branch_id is not null then
    perform 1 from public.branches
    where id = p_branch_id and brand_id = p_brand_id and deleted_at is null;
    if not found then
      raise exception 'Branch % not found, deleted, or does not belong to brand %',
        p_branch_id, p_brand_id using errcode = 'P0002';
    end if;
  end if;

  -- Validate amount
  if p_amount <= 0 then
    raise exception 'Ledger amount must be positive, got %', p_amount using errcode = '22023';
  end if;

  -- Validate direction
  if p_direction not in ('DEBIT', 'CREDIT') then
    raise exception 'Invalid direction: %. Must be DEBIT or CREDIT', p_direction using errcode = 'P0004';
  end if;

  -- Validate entry_type (will also be caught by CHECK, but early validation is cleaner)
  if p_entry_type not in (
    'SERVICE_REVENUE','POS_REVENUE','OTHER_INCOME','MDR_EXPENSE',
    'OPERATING_EXPENSE','STOCK_PURCHASE','COGS','CASH_ADJUSTMENT',
    'PAYMENT_REFUND','VOID_REVERSAL'
  ) then
    raise exception 'Invalid entry_type: %', p_entry_type using errcode = 'P0004';
  end if;

  -- Handle idempotency
  if p_idempotency_key is not null then
    select id into v_found_id
    from public.finance_ledger
    where brand_id = p_brand_id and idempotency_key = p_idempotency_key;

    if found then
      -- Key exists — validate payload match
      select entry_type, direction, amount,
             reference_type, reference_id::text,
             source_table, source_id::text
      into v_existing_entry_type, v_existing_direction, v_existing_amount,
           v_existing_ref_type, v_existing_ref_id,
           v_existing_src_tbl, v_existing_src_id
      from public.finance_ledger
      where id = v_found_id;

      if v_existing_entry_type != p_entry_type
         or v_existing_direction != p_direction
         or v_existing_amount != p_amount
         or coalesce(v_existing_ref_type, '') != coalesce(p_reference_type, '')
         or coalesce(v_existing_ref_id, '') != coalesce(p_reference_id::text, '')
         or coalesce(v_existing_src_tbl, '') != coalesce(p_source_table, '')
         or coalesce(v_existing_src_id, '') != coalesce(p_source_id::text, '') then
        raise exception 'Idempotency key % already exists with different payload (entry_type=%, direction=%, amount=%)',
          p_idempotency_key, v_existing_entry_type, v_existing_direction, v_existing_amount
          using errcode = 'P0004';
      end if;

      -- Payload matches — return existing entry
      return v_found_id;
    end if;
  end if;

  -- Insert new ledger entry
  insert into public.finance_ledger (
    brand_id, branch_id, ledger_date, occurred_at,
    entry_type, direction, amount,
    category, account_code,
    reference_type, reference_id,
    source_table, source_id,
    description, idempotency_key,
    metadata, created_by, created_at
  ) values (
    p_brand_id, p_branch_id, p_ledger_date, p_occurred_at,
    p_entry_type, p_direction, p_amount,
    p_category, p_account_code,
    p_reference_type, p_reference_id,
    p_source_table, p_source_id,
    p_description, p_idempotency_key,
    p_metadata, p_created_by, now()
  )
  returning id into v_ledger_id;

  return v_ledger_id;
end;
$func$;

comment on function public.add_finance_ledger_entry is
  'Inserts a finance ledger entry idempotently. Validates brand, branch, direction, entry_type. SECURITY DEFINER bypasses RLS.';


-- ------------------------------------------------------------
-- 4b. record_service_payment_finance_entries
-- Purpose: Generate finance ledger entries for a completed
--          service payment. Creates SERVICE_REVENUE + MDR_EXPENSE.
-- ------------------------------------------------------------

create or replace function public.record_service_payment_finance_entries(
  p_service_payment_id uuid,
  p_created_by uuid default null
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_sp record;
  v_revenue_ledger_id uuid;
  v_mdr_ledger_id     uuid;
begin
  -- Read service_payment (no FOR UPDATE needed — this reads existing completed payment)
  select sp.id, sp.brand_id, sp.branch_id, sp.service_id,
         sp.gross_amount, sp.mdr_amount, sp.net_amount,
         sp.payment_number, sp.paid_at,
         sp.payment_status
  into v_sp
  from public.service_payments sp
  where sp.id = p_service_payment_id;

  if not found then
    raise exception 'Service payment % not found', p_service_payment_id using errcode = 'P0002';
  end if;

  if v_sp.payment_status != 'COMPLETED' then
    raise exception 'Cannot create finance entries: service payment % status is %, not COMPLETED',
      p_service_payment_id, v_sp.payment_status using errcode = 'P0004';
  end if;

  -- Create SERVICE_REVENUE ledger entry (gross_amount, CREDIT)
  v_revenue_ledger_id := public.add_finance_ledger_entry(
    p_brand_id        := v_sp.brand_id,
    p_branch_id       := v_sp.branch_id,
    p_ledger_date     := v_sp.paid_at::date,
    p_occurred_at     := v_sp.paid_at,
    p_entry_type      := 'SERVICE_REVENUE',
    p_direction       := 'CREDIT',
    p_amount          := v_sp.gross_amount,
    p_category        := 'service',
    p_account_code    := '4000',
    p_reference_type  := 'service_payment',
    p_reference_id    := v_sp.id,
    p_source_table    := 'service_payments',
    p_source_id       := v_sp.id,
    p_description     := 'Service payment ' || v_sp.payment_number || ' revenue',
    p_metadata        := jsonb_build_object(
                          'service_id', v_sp.service_id,
                          'payment_number', v_sp.payment_number,
                          'net_amount', v_sp.net_amount
                        ),
    p_created_by      := p_created_by,
    p_idempotency_key := 'service_payment:' || v_sp.id || ':revenue'
  );

  -- Create MDR_EXPENSE ledger entry if MDR > 0 (DEBIT)
  if v_sp.mdr_amount > 0 then
    v_mdr_ledger_id := public.add_finance_ledger_entry(
      p_brand_id        := v_sp.brand_id,
      p_branch_id       := v_sp.branch_id,
      p_ledger_date     := v_sp.paid_at::date,
      p_occurred_at     := v_sp.paid_at,
      p_entry_type      := 'MDR_EXPENSE',
      p_direction       := 'DEBIT',
      p_amount          := v_sp.mdr_amount,
      p_category        := 'bank_fee',
      p_account_code    := '5100',
      p_reference_type  := 'service_payment',
      p_reference_id    := v_sp.id,
      p_source_table    := 'service_payments',
      p_source_id       := v_sp.id,
      p_description     := 'MDR fee for ' || v_sp.payment_number,
      p_metadata        := jsonb_build_object(
                            'service_id', v_sp.service_id,
                            'payment_number', v_sp.payment_number,
                            'gross_amount', v_sp.gross_amount,
                            'net_amount', v_sp.net_amount
                          ),
      p_created_by      := p_created_by,
      p_idempotency_key := 'service_payment:' || v_sp.id || ':mdr'
    );
  end if;

  -- Return result
  return jsonb_build_object(
    'service_payment_id', v_sp.id,
    'revenue_ledger_id', v_revenue_ledger_id,
    'mdr_ledger_id', v_mdr_ledger_id,
    'gross_amount', v_sp.gross_amount,
    'mdr_amount', v_sp.mdr_amount,
    'net_amount', v_sp.net_amount
  );
end;
$func$;

comment on function public.record_service_payment_finance_entries is
  'Creates SERVICE_REVENUE (CREDIT, gross_amount) and MDR_EXPENSE (DEBIT, mdr_amount) ledger entries for a completed service payment. Idempotent via service_payment:id:revenue and :mdr keys.';


-- ============================================================
-- 5. VALIDATION QUERIES (reference only, not executed)
-- ============================================================

-- 5a. Service payment without SERVICE_REVENUE ledger entry
-- Find completed service_payments missing their finance revenue entry.
--
-- SELECT sp.id, sp.payment_number, sp.gross_amount, sp.paid_at
-- FROM public.service_payments sp
-- WHERE sp.payment_status = 'COMPLETED'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.finance_ledger fl
--     WHERE fl.reference_type = 'service_payment'
--       AND fl.reference_id = sp.id
--       AND fl.entry_type = 'SERVICE_REVENUE'
--   )
-- ORDER BY sp.paid_at;

-- 5b. Service payment with MDR but no MDR_EXPENSE ledger entry
-- Find service_payments with mdr_amount > 0 but no MDR_EXPENSE entry.
--
-- SELECT sp.id, sp.payment_number, sp.mdr_amount, sp.paid_at
-- FROM public.service_payments sp
-- WHERE sp.payment_status = 'COMPLETED'
--   AND sp.mdr_amount > 0
--   AND NOT EXISTS (
--     SELECT 1 FROM public.finance_ledger fl
--     WHERE fl.reference_type = 'service_payment'
--       AND fl.reference_id = sp.id
--       AND fl.entry_type = 'MDR_EXPENSE'
--   )
-- ORDER BY sp.paid_at;

-- 5c. Duplicate finance entries (same idempotency_key)
-- Should return empty rows if idempotency is working.
--
-- SELECT fl.idempotency_key, fl.brand_id, fl.entry_type, fl.amount, COUNT(*) AS cnt
-- FROM public.finance_ledger fl
-- WHERE fl.idempotency_key IS NOT NULL
-- GROUP BY fl.idempotency_key, fl.brand_id, fl.entry_type, fl.amount
-- HAVING COUNT(*) > 1;

-- 5d. Ledger amount mismatch vs service_payments.gross_amount
-- Compare SERVICE_REVENUE amount with service_payments.gross_amount.
--
-- SELECT sp.id AS payment_id, sp.payment_number,
--        sp.gross_amount AS expected_revenue,
--        fl.amount AS ledger_revenue,
--        (sp.gross_amount - fl.amount) AS discrepancy
-- FROM public.service_payments sp
-- JOIN public.finance_ledger fl
--   ON fl.reference_type = 'service_payment'
--   AND fl.reference_id = sp.id
--   AND fl.entry_type = 'SERVICE_REVENUE'
-- WHERE sp.payment_status = 'COMPLETED'
--   AND sp.gross_amount != fl.amount
-- ORDER BY sp.paid_at;

-- 5e. MDR amount mismatch vs service_payments.mdr_amount
--
-- SELECT sp.id AS payment_id, sp.payment_number,
--        sp.mdr_amount AS expected_mdr,
--        fl.amount AS ledger_mdr,
--        (sp.mdr_amount - fl.amount) AS discrepancy
-- FROM public.service_payments sp
-- JOIN public.finance_ledger fl
--   ON fl.reference_type = 'service_payment'
--   AND fl.reference_id = sp.id
--   AND fl.entry_type = 'MDR_EXPENSE'
-- WHERE sp.payment_status = 'COMPLETED'
--   AND sp.mdr_amount > 0
--   AND sp.mdr_amount != fl.amount
-- ORDER BY sp.paid_at;

-- 5f. Branch mismatch between finance_ledger and source service_payment
-- finance_ledger.branch_id should match service_payments.branch_id.
--
-- SELECT fl.id AS ledger_id, sp.id AS payment_id, sp.payment_number,
--        sp.branch_id AS payment_branch,
--        fl.branch_id AS ledger_branch
-- FROM public.finance_ledger fl
-- JOIN public.service_payments sp
--   ON fl.reference_type = 'service_payment'
--   AND fl.reference_id = sp.id
-- WHERE (fl.branch_id IS DISTINCT FROM sp.branch_id)
-- ORDER BY sp.paid_at;


-- ============================================================
-- End of Migration 008
-- ============================================================
