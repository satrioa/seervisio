-- ============================================================
-- Migration 011: Void & Refund Foundation
-- Controlled reversal of service payments and POS sales
-- ============================================================

-- ============================================================
-- REVERSAL ACCOUNTING PRINCIPLES
-- ============================================================
-- Historical rows are NEVER mutated. Reversal entries are ADDED.
-- Reversal accounting direction:
--   Original revenue CREDIT  → reversal DEBIT  (same amount, opposite dir)
--   Original expense DEBIT   → reversal CREDIT (same amount, opposite dir)
--   Original IN movement     → reversal OUT    (same amount, opposite dir)
--
-- Example: Void QRIS payment Rp1.000.000 with MDR 7.000
--   finance_ledger ADD: SERVICE_REVENUE  DEBIT  1.000.000  (reverses revenue)
--   finance_ledger ADD: MDR_EXPENSE      CREDIT   7.000    (reverses expense)
--   payment_account_movements ADD: OUT  993.000  SERVICE_REFUND
--   service_payments UPDATE: status = VOIDED
-- ============================================================

-- ============================================================
-- 1. TABLE
-- ============================================================

create table if not exists public.transaction_reversals (
  id                          uuid primary key default gen_random_uuid(),
  brand_id                    integer not null references public.brands(id) on delete cascade,
  branch_id                   uuid references public.branches(id) on delete set null,
  reversal_type               text not null check (reversal_type in ('VOID', 'REFUND')),
  source_type                 text not null check (source_type in ('SERVICE_PAYMENT', 'POS_SALE')),
  source_id                   uuid not null,
  reason                      text not null,
  original_amount             numeric(14,2) not null check (original_amount > 0),
  reversed_amount             numeric(14,2) not null check (reversed_amount > 0),
  payment_account_movement_id uuid references public.payment_account_movements(id) on delete set null,
  idempotency_key             text,
  metadata                    jsonb not null default '{}',
  reversed_by                 uuid references public.profiles(id) on delete set null,
  reversed_at                 timestamptz not null default now(),
  created_at                  timestamptz not null default now()
);

comment on table public.transaction_reversals is
  'Tracks every void/refund reversal. original_amount = gross_amount of source. reversed_amount = net_amount returned (gross - MDR). Historical rows never mutated.';


-- ============================================================
-- 2. INDEXES
-- ============================================================

create index if not exists idx_tr_brand_id       on public.transaction_reversals (brand_id);
create index if not exists idx_tr_branch_id      on public.transaction_reversals (branch_id);
create index if not exists idx_tr_source         on public.transaction_reversals (source_type, source_id);
create index if not exists idx_tr_reversal_type  on public.transaction_reversals (reversal_type);
create index if not exists idx_tr_reversed_at    on public.transaction_reversals (reversed_at);
create index if not exists idx_tr_movement       on public.transaction_reversals (payment_account_movement_id);
create unique index if not exists uq_tr_idempotency_key
  on public.transaction_reversals (brand_id, idempotency_key)
  where idempotency_key is not null;


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table public.transaction_reversals enable row level security;

drop policy if exists tr_select on public.transaction_reversals;
create policy tr_select on public.transaction_reversals
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- NOTE: No INSERT/UPDATE/DELETE policies. All writes through SECURITY DEFINER functions.


-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- 4a. void_service_payment
-- Purpose: Void a completed service payment.
--   Status: COMPLETED → VOIDED
--   Payment account: OUT net_amount (SERVICE_REFUND)
--   Finance ledger: SERVICE_REVENUE DEBIT, MDR_EXPENSE CREDIT
-- ------------------------------------------------------------

create or replace function public.void_service_payment(
  p_service_payment_id uuid,
  p_reason text,
  p_created_by uuid default null,
  p_metadata jsonb default '{}',
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_sp record;
  v_pa_movement_id uuid;
  v_finance_key     text;
  v_tr_id           uuid;
  v_final_key       text;
  v_existing_id     uuid;
begin
  -- Idempotency check
  v_final_key := coalesce(p_idempotency_key, 'void_service_payment:' || p_service_payment_id);

  select id into v_existing_id
  from public.transaction_reversals
  where brand_id in (select brand_id from public.service_payments where id = p_service_payment_id)
    and idempotency_key = v_final_key;

  if found then
    select * into v_sp from public.service_payments where id = p_service_payment_id;
    return jsonb_build_object(
      'status', 'ALREADY_EXISTS',
      'transaction_reversal_id', v_existing_id,
      'service_payment_id', p_service_payment_id,
      'payment_status', v_sp.payment_status
    );
  end if;

  -- Lock and validate service payment
  select sp.id, sp.brand_id, sp.branch_id, sp.service_id,
         sp.payment_method_id, sp.payment_account_id,
         sp.payment_number, sp.payment_status,
         sp.gross_amount, sp.mdr_amount, sp.net_amount,
         sp.paid_at
  into v_sp
  from public.service_payments sp
  where sp.id = p_service_payment_id
  for update;

  if not found then
    raise exception 'Service payment % not found', p_service_payment_id using errcode = 'P0002';
  end if;

  if v_sp.payment_status != 'COMPLETED' then
    raise exception 'Cannot void: service payment % status is %, not COMPLETED',
      p_service_payment_id, v_sp.payment_status using errcode = 'P0004';
  end if;

  -- Update status to VOIDED
  update public.service_payments
  set payment_status = 'VOIDED',
      metadata = metadata || jsonb_build_object('voided_at', now(), 'void_reason', p_reason)
  where id = p_service_payment_id;

  -- Create payment_account_movement OUT (reversal of original IN)
  v_pa_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_sp.payment_account_id,
    p_brand_id           := v_sp.brand_id,
    p_direction          := 'OUT',
    p_amount             := v_sp.net_amount,
    p_movement_type      := 'SERVICE_REFUND',
    p_branch_id          := v_sp.branch_id,
    p_reference_type     := 'service_payment',
    p_reference_id       := p_service_payment_id::text,
    p_description        := 'Void payment ' || v_sp.payment_number || ': ' || p_reason,
    p_metadata           := jsonb_build_object(
                             'action', 'void',
                             'original_gross', v_sp.gross_amount,
                             'original_mdr', v_sp.mdr_amount
                           ) || p_metadata,
    p_created_by         := p_created_by
  );

  -- Create finance ledger reversal: SERVICE_REVENUE DEBIT (reverses CREDIT)
  v_finance_key := 'service_payment:' || p_service_payment_id || ':SERVICE_REVENUE:void';
  perform public.add_finance_ledger_entry(
    p_brand_id       := v_sp.brand_id,
    p_branch_id      := v_sp.branch_id,
    p_ledger_date    := current_date,
    p_occurred_at    := now(),
    p_entry_type     := 'SERVICE_REVENUE',
    p_direction      := 'DEBIT',
    p_amount         := v_sp.gross_amount,
    p_category       := 'service',
    p_account_code   := '4000',
    p_reference_type := 'service_payment',
    p_reference_id   := p_service_payment_id,
    p_source_table   := 'transaction_reversals',
    p_source_id      := null,
    p_description    := 'Void reversal: ' || p_reason || ' (' || v_sp.payment_number || ')',
    p_metadata       := jsonb_build_object(
                         'action', 'void',
                         'original_amount', v_sp.gross_amount,
                         'reversal_type', 'SERVICE_REVENUE'
                       ),
    p_created_by     := p_created_by,
    p_idempotency_key := v_finance_key
  );

  -- Create finance ledger reversal: MDR_EXPENSE CREDIT if MDR > 0
  if v_sp.mdr_amount > 0 then
    v_finance_key := 'service_payment:' || p_service_payment_id || ':MDR_EXPENSE:void';
    perform public.add_finance_ledger_entry(
      p_brand_id       := v_sp.brand_id,
      p_branch_id      := v_sp.branch_id,
      p_ledger_date    := current_date,
      p_occurred_at    := now(),
      p_entry_type     := 'MDR_EXPENSE',
      p_direction      := 'CREDIT',
      p_amount         := v_sp.mdr_amount,
      p_category       := 'bank_fee',
      p_account_code   := '5100',
      p_reference_type := 'service_payment',
      p_reference_id   := p_service_payment_id,
      p_source_table   := 'transaction_reversals',
      p_source_id      := null,
      p_description    := 'MDR reversal: void of ' || v_sp.payment_number,
      p_metadata       := jsonb_build_object(
                           'action', 'void',
                           'original_amount', v_sp.mdr_amount,
                           'reversal_type', 'MDR_EXPENSE'
                         ),
      p_created_by     := p_created_by,
      p_idempotency_key := v_finance_key
    );
  end if;

  -- Insert transaction_reversal record
  insert into public.transaction_reversals (
    brand_id, branch_id, reversal_type, source_type, source_id,
    reason, original_amount, reversed_amount,
    payment_account_movement_id, idempotency_key,
    metadata, reversed_by, reversed_at, created_at
  ) values (
    v_sp.brand_id, v_sp.branch_id, 'VOID', 'SERVICE_PAYMENT', p_service_payment_id,
    p_reason, v_sp.gross_amount, v_sp.net_amount,
    v_pa_movement_id, v_final_key,
    p_metadata, p_created_by, now(), now()
  )
  returning id into v_tr_id;

  -- Audit log
  insert into public.audit_logs (brand_id, actor_id, action, target_type, target_id, target_label, description, details, created_at)
  values (
    v_sp.brand_id, p_created_by, 'VOID_SERVICE_PAYMENT', 'service_payments', p_service_payment_id,
    v_sp.payment_number,
    'Voided service payment ' || v_sp.payment_number || ': ' || p_reason,
    jsonb_build_object(
      'gross_amount', v_sp.gross_amount,
      'mdr_amount', v_sp.mdr_amount,
      'net_amount', v_sp.net_amount,
      'reason', p_reason,
      'reversal_id', v_tr_id
    ),
    now()
  );

  return jsonb_build_object(
    'status', 'VOIDED',
    'service_payment_id', p_service_payment_id,
    'payment_number', v_sp.payment_number,
    'transaction_reversal_id', v_tr_id,
    'payment_account_movement_id', v_pa_movement_id,
    'gross_amount', v_sp.gross_amount,
    'mdr_amount', v_sp.mdr_amount,
    'net_amount', v_sp.net_amount,
    'reversed_amount', v_sp.net_amount
  );
end;
$func$;

comment on function public.void_service_payment is
  'Voids a COMPLETED service payment. Reverses payment account (OUT SERVICE_REFUND) and finance ledger entries (SERVICE_REVENUE DEBIT + MDR_EXPENSE CREDIT). Idempotent via idempotency key.';


-- ------------------------------------------------------------
-- 4b. refund_service_payment
-- Purpose: Refund a completed service payment.
-- Same as void, but sets status REFUNDED instead of VOIDED.
-- ------------------------------------------------------------

create or replace function public.refund_service_payment(
  p_service_payment_id uuid,
  p_reason text,
  p_created_by uuid default null,
  p_metadata jsonb default '{}',
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_sp record;
  v_pa_movement_id uuid;
  v_finance_key     text;
  v_tr_id           uuid;
  v_final_key       text;
  v_existing_id     uuid;
begin
  -- Idempotency check
  v_final_key := coalesce(p_idempotency_key, 'refund_service_payment:' || p_service_payment_id);

  select id into v_existing_id
  from public.transaction_reversals
  where brand_id in (select brand_id from public.service_payments where id = p_service_payment_id)
    and idempotency_key = v_final_key;

  if found then
    select * into v_sp from public.service_payments where id = p_service_payment_id;
    return jsonb_build_object(
      'status', 'ALREADY_EXISTS',
      'transaction_reversal_id', v_existing_id,
      'service_payment_id', p_service_payment_id,
      'payment_status', v_sp.payment_status
    );
  end if;

  -- Lock and validate
  select sp.id, sp.brand_id, sp.branch_id, sp.service_id,
         sp.payment_number, sp.payment_status,
         sp.gross_amount, sp.mdr_amount, sp.net_amount,
         sp.payment_account_id, sp.paid_at
  into v_sp
  from public.service_payments sp
  where sp.id = p_service_payment_id
  for update;

  if not found then
    raise exception 'Service payment % not found', p_service_payment_id using errcode = 'P0002';
  end if;

  if v_sp.payment_status != 'COMPLETED' then
    raise exception 'Cannot refund: service payment % status is %, not COMPLETED',
      p_service_payment_id, v_sp.payment_status using errcode = 'P0004';
  end if;

  -- Update status to REFUNDED
  update public.service_payments
  set payment_status = 'REFUNDED',
      metadata = metadata || jsonb_build_object('refunded_at', now(), 'refund_reason', p_reason)
  where id = p_service_payment_id;

  -- Payment account movement OUT (SERVICE_REFUND)
  v_pa_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_sp.payment_account_id,
    p_brand_id           := v_sp.brand_id,
    p_direction          := 'OUT',
    p_amount             := v_sp.net_amount,
    p_movement_type      := 'SERVICE_REFUND',
    p_branch_id          := v_sp.branch_id,
    p_reference_type     := 'service_payment',
    p_reference_id       := p_service_payment_id::text,
    p_description        := 'Refund payment ' || v_sp.payment_number || ': ' || p_reason,
    p_metadata           := jsonb_build_object(
                             'action', 'refund',
                             'original_gross', v_sp.gross_amount,
                             'original_mdr', v_sp.mdr_amount
                           ) || p_metadata,
    p_created_by         := p_created_by
  );

  -- Finance ledger reversal: SERVICE_REVENUE DEBIT
  v_finance_key := 'service_payment:' || p_service_payment_id || ':SERVICE_REVENUE:refund';
  perform public.add_finance_ledger_entry(
    p_brand_id := v_sp.brand_id, p_branch_id := v_sp.branch_id,
    p_ledger_date := current_date, p_occurred_at := now(),
    p_entry_type := 'SERVICE_REVENUE', p_direction := 'DEBIT',
    p_amount := v_sp.gross_amount,
    p_category := 'service', p_account_code := '4000',
    p_reference_type := 'service_payment', p_reference_id := p_service_payment_id,
    p_source_table := 'transaction_reversals',
    p_description := 'Refund reversal: ' || p_reason || ' (' || v_sp.payment_number || ')',
    p_metadata := jsonb_build_object('action', 'refund', 'original_amount', v_sp.gross_amount),
    p_created_by := p_created_by,
    p_idempotency_key := v_finance_key
  );

  -- Finance ledger reversal: MDR_EXPENSE CREDIT if MDR > 0
  if v_sp.mdr_amount > 0 then
    v_finance_key := 'service_payment:' || p_service_payment_id || ':MDR_EXPENSE:refund';
    perform public.add_finance_ledger_entry(
      p_brand_id := v_sp.brand_id, p_branch_id := v_sp.branch_id,
      p_ledger_date := current_date, p_occurred_at := now(),
      p_entry_type := 'MDR_EXPENSE', p_direction := 'CREDIT',
      p_amount := v_sp.mdr_amount,
      p_category := 'bank_fee', p_account_code := '5100',
      p_reference_type := 'service_payment', p_reference_id := p_service_payment_id,
      p_source_table := 'transaction_reversals',
      p_description := 'MDR reversal: refund of ' || v_sp.payment_number,
      p_metadata := jsonb_build_object('action', 'refund', 'original_amount', v_sp.mdr_amount),
      p_created_by := p_created_by,
      p_idempotency_key := v_finance_key
    );
  end if;

  -- Insert transaction_reversal
  insert into public.transaction_reversals (
    brand_id, branch_id, reversal_type, source_type, source_id,
    reason, original_amount, reversed_amount,
    payment_account_movement_id, idempotency_key,
    metadata, reversed_by, reversed_at, created_at
  ) values (
    v_sp.brand_id, v_sp.branch_id, 'REFUND', 'SERVICE_PAYMENT', p_service_payment_id,
    p_reason, v_sp.gross_amount, v_sp.net_amount,
    v_pa_movement_id, v_final_key,
    p_metadata, p_created_by, now(), now()
  )
  returning id into v_tr_id;

  -- Audit log
  insert into public.audit_logs (brand_id, actor_id, action, target_type, target_id, target_label, description, details, created_at)
  values (
    v_sp.brand_id, p_created_by, 'REFUND_SERVICE_PAYMENT', 'service_payments', p_service_payment_id,
    v_sp.payment_number,
    'Refunded service payment ' || v_sp.payment_number || ': ' || p_reason,
    jsonb_build_object(
      'gross_amount', v_sp.gross_amount, 'mdr_amount', v_sp.mdr_amount,
      'net_amount', v_sp.net_amount, 'reason', p_reason, 'reversal_id', v_tr_id
    ),
    now()
  );

  return jsonb_build_object(
    'status', 'REFUNDED',
    'service_payment_id', p_service_payment_id,
    'payment_number', v_sp.payment_number,
    'transaction_reversal_id', v_tr_id,
    'payment_account_movement_id', v_pa_movement_id,
    'gross_amount', v_sp.gross_amount,
    'mdr_amount', v_sp.mdr_amount,
    'net_amount', v_sp.net_amount
  );
end;
$func$;

comment on function public.refund_service_payment is
  'Refunds a COMPLETED service payment. Same as void but sets REFUNDED status. Idempotent via idempotency key.';


-- ------------------------------------------------------------
-- 4c. void_pos_sale
-- Purpose: Void a completed POS sale.
--   Status: COMPLETED → VOIDED
--   Payment account: OUT net_amount (POS_REFUND)
--   Finance ledger: POS_REVENUE DEBIT, COGS CREDIT, MDR_EXPENSE CREDIT
--   Inventory: POS_RETURN movement for each sold item
-- ------------------------------------------------------------

create or replace function public.void_pos_sale(
  p_pos_sale_id uuid,
  p_reason text,
  p_created_by uuid default null,
  p_metadata jsonb default '{}',
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_sale      record;
  v_item      record;
  v_cogs_total numeric(14,2) := 0;
  v_customer_paid numeric(14,2);
  v_pa_movement_id uuid;
  v_finance_key    text;
  v_tr_id          uuid;
  v_ret_movement_id uuid;
  v_final_key      text;
  v_existing_id    uuid;
begin
  -- Idempotency check
  v_final_key := coalesce(p_idempotency_key, 'void_pos_sale:' || p_pos_sale_id);

  select id into v_existing_id
  from public.transaction_reversals
  where brand_id in (select brand_id from public.pos_sales where id = p_pos_sale_id)
    and idempotency_key = v_final_key;

  if found then
    select * into v_sale from public.pos_sales where id = p_pos_sale_id;
    return jsonb_build_object(
      'status', 'ALREADY_EXISTS',
      'transaction_reversal_id', v_existing_id,
      'pos_sale_id', p_pos_sale_id,
      'sale_status', v_sale.sale_status
    );
  end if;

  -- Lock and validate POS sale
  select ps.id, ps.brand_id, ps.branch_id, ps.sale_number, ps.sale_status,
         ps.gross_amount, ps.discount_amount, ps.mdr_amount, ps.net_amount,
         ps.payment_account_id, ps.sold_at
  into v_sale
  from public.pos_sales ps
  where ps.id = p_pos_sale_id
  for update;

  if not found then
    raise exception 'POS sale % not found', p_pos_sale_id using errcode = 'P0002';
  end if;

  if v_sale.sale_status != 'COMPLETED' then
    raise exception 'Cannot void: POS sale % status is %, not COMPLETED',
      p_pos_sale_id, v_sale.sale_status using errcode = 'P0004';
  end if;

  -- Calculate COGS total and customer_paid
  select coalesce(sum(quantity * unit_cost), 0) into v_cogs_total
  from public.pos_sale_items where pos_sale_id = p_pos_sale_id;

  v_customer_paid := v_sale.gross_amount - v_sale.discount_amount;

  -- Update status to VOIDED
  update public.pos_sales
  set sale_status = 'VOIDED',
      metadata = metadata || jsonb_build_object('voided_at', now(), 'void_reason', p_reason)
  where id = p_pos_sale_id;

  -- Payment account movement OUT (POS_REFUND)
  v_pa_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_sale.payment_account_id,
    p_brand_id           := v_sale.brand_id,
    p_direction          := 'OUT',
    p_amount             := v_sale.net_amount,
    p_movement_type      := 'POS_REFUND',
    p_branch_id          := v_sale.branch_id,
    p_reference_type     := 'pos_sale',
    p_reference_id       := p_pos_sale_id::text,
    p_description        := 'Void POS sale ' || v_sale.sale_number || ': ' || p_reason,
    p_metadata           := jsonb_build_object(
                             'action', 'void',
                             'original_gross', v_sale.gross_amount,
                             'original_discount', v_sale.discount_amount,
                             'original_mdr', v_sale.mdr_amount
                           ) || p_metadata,
    p_created_by         := p_created_by
  );

  -- Finance ledger reversal: POS_REVENUE DEBIT (reverses CREDIT)
  v_finance_key := 'pos_sale:' || p_pos_sale_id || ':POS_REVENUE:void';
  perform public.add_finance_ledger_entry(
    p_brand_id := v_sale.brand_id, p_branch_id := v_sale.branch_id,
    p_ledger_date := current_date, p_occurred_at := now(),
    p_entry_type := 'POS_REVENUE', p_direction := 'DEBIT',
    p_amount := v_customer_paid,
    p_category := 'pos', p_account_code := '4000',
    p_reference_type := 'pos_sale', p_reference_id := p_pos_sale_id,
    p_source_table := 'transaction_reversals',
    p_description := 'Void reversal: ' || p_reason || ' (' || v_sale.sale_number || ')',
    p_metadata := jsonb_build_object('action', 'void', 'customer_paid', v_customer_paid),
    p_created_by := p_created_by,
    p_idempotency_key := v_finance_key
  );

  -- Finance ledger reversal: COGS CREDIT if > 0
  if v_cogs_total > 0 then
    v_finance_key := 'pos_sale:' || p_pos_sale_id || ':COGS:void';
    perform public.add_finance_ledger_entry(
      p_brand_id := v_sale.brand_id, p_branch_id := v_sale.branch_id,
      p_ledger_date := current_date, p_occurred_at := now(),
      p_entry_type := 'COGS', p_direction := 'CREDIT',
      p_amount := v_cogs_total,
      p_category := 'pos', p_account_code := '5000',
      p_reference_type := 'pos_sale', p_reference_id := p_pos_sale_id,
      p_source_table := 'transaction_reversals',
      p_description := 'COGS reversal: void of ' || v_sale.sale_number,
      p_metadata := jsonb_build_object('action', 'void', 'cogs_total', v_cogs_total),
      p_created_by := p_created_by,
      p_idempotency_key := v_finance_key
    );
  end if;

  -- Finance ledger reversal: MDR_EXPENSE CREDIT if > 0
  if v_sale.mdr_amount > 0 then
    v_finance_key := 'pos_sale:' || p_pos_sale_id || ':MDR_EXPENSE:void';
    perform public.add_finance_ledger_entry(
      p_brand_id := v_sale.brand_id, p_branch_id := v_sale.branch_id,
      p_ledger_date := current_date, p_occurred_at := now(),
      p_entry_type := 'MDR_EXPENSE', p_direction := 'CREDIT',
      p_amount := v_sale.mdr_amount,
      p_category := 'bank_fee', p_account_code := '5100',
      p_reference_type := 'pos_sale', p_reference_id := p_pos_sale_id,
      p_source_table := 'transaction_reversals',
      p_description := 'MDR reversal: void of ' || v_sale.sale_number,
      p_metadata := jsonb_build_object('action', 'void', 'mdr_amount', v_sale.mdr_amount),
      p_created_by := p_created_by,
      p_idempotency_key := v_finance_key
    );
  end if;

  -- Return inventory: POS_RETURN for each sale item
  for v_item in
    select psi.id, psi.inventory_item_id, psi.quantity, psi.unit_cost
    from public.pos_sale_items psi
    where psi.pos_sale_id = p_pos_sale_id
  loop
    v_ret_movement_id := public.add_inventory_movement(
      p_brand_id       := v_sale.brand_id,
      p_branch_id      := v_sale.branch_id,
      p_item_id        := v_item.inventory_item_id,
      p_direction      := 'IN',
      p_movement_type  := 'POS_RETURN',
      p_quantity       := v_item.quantity,
      p_unit_cost      := v_item.unit_cost,
      p_reference_type := 'pos_sale',
      p_reference_id   := p_pos_sale_id,
      p_idempotency_key := 'pos_sale:' || p_pos_sale_id || ':return:item:' || v_item.inventory_item_id || ':line:' || v_item.id,
      p_description    := 'Return stock: void of ' || v_sale.sale_number,
      p_metadata       := jsonb_build_object('sale_item_id', v_item.id, 'void_reason', p_reason),
      p_created_by     := p_created_by
    );

    -- Link movement back to sale item
    update public.pos_sale_items
    set inventory_movement_id = v_ret_movement_id
    where id = v_item.id;
  end loop;

  -- Insert transaction_reversal
  insert into public.transaction_reversals (
    brand_id, branch_id, reversal_type, source_type, source_id,
    reason, original_amount, reversed_amount,
    payment_account_movement_id, idempotency_key,
    metadata, reversed_by, reversed_at, created_at
  ) values (
    v_sale.brand_id, v_sale.branch_id, 'VOID', 'POS_SALE', p_pos_sale_id,
    p_reason, v_sale.gross_amount, v_sale.net_amount,
    v_pa_movement_id, v_final_key,
    p_metadata, p_created_by, now(), now()
  )
  returning id into v_tr_id;

  -- Audit log
  insert into public.audit_logs (brand_id, actor_id, action, target_type, target_id, target_label, description, details, created_at)
  values (
    v_sale.brand_id, p_created_by, 'VOID_POS_SALE', 'pos_sales', p_pos_sale_id,
    v_sale.sale_number,
    'Voided POS sale ' || v_sale.sale_number || ': ' || p_reason,
    jsonb_build_object(
      'gross_amount', v_sale.gross_amount, 'discount_amount', v_sale.discount_amount,
      'mdr_amount', v_sale.mdr_amount, 'net_amount', v_sale.net_amount,
      'cogs_reversed', v_cogs_total, 'reason', p_reason, 'reversal_id', v_tr_id
    ),
    now()
  );

  return jsonb_build_object(
    'status', 'VOIDED',
    'pos_sale_id', p_pos_sale_id,
    'sale_number', v_sale.sale_number,
    'transaction_reversal_id', v_tr_id,
    'payment_account_movement_id', v_pa_movement_id,
    'gross_amount', v_sale.gross_amount,
    'discount_amount', v_sale.discount_amount,
    'customer_paid_amount', v_customer_paid,
    'mdr_amount', v_sale.mdr_amount,
    'net_amount', v_sale.net_amount,
    'cogs_reversed', v_cogs_total,
    'gross_profit_reversed', v_customer_paid - v_cogs_total - v_sale.mdr_amount
  );
end;
$func$;

comment on function public.void_pos_sale is
  'Voids a COMPLETED POS sale. Reverses payment (OUT POS_REFUND), finance entries (POS_REVENUE DEBIT, COGS CREDIT, MDR EXPENSE CREDIT), and returns inventory (POS_RETURN). Idempotent.';


-- ------------------------------------------------------------
-- 4d. refund_pos_sale
-- Purpose: Refund a completed POS sale.
-- Same as void but sets status REFUNDED.
-- ------------------------------------------------------------

create or replace function public.refund_pos_sale(
  p_pos_sale_id uuid,
  p_reason text,
  p_created_by uuid default null,
  p_metadata jsonb default '{}',
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
as $func$
declare
  v_sale      record;
  v_item      record;
  v_cogs_total numeric(14,2) := 0;
  v_customer_paid numeric(14,2);
  v_pa_movement_id uuid;
  v_finance_key    text;
  v_tr_id          uuid;
  v_ret_movement_id uuid;
  v_final_key      text;
  v_existing_id    uuid;
begin
  -- Idempotency check
  v_final_key := coalesce(p_idempotency_key, 'refund_pos_sale:' || p_pos_sale_id);

  select id into v_existing_id
  from public.transaction_reversals
  where brand_id in (select brand_id from public.pos_sales where id = p_pos_sale_id)
    and idempotency_key = v_final_key;

  if found then
    select * into v_sale from public.pos_sales where id = p_pos_sale_id;
    return jsonb_build_object(
      'status', 'ALREADY_EXISTS',
      'transaction_reversal_id', v_existing_id,
      'pos_sale_id', p_pos_sale_id,
      'sale_status', v_sale.sale_status
    );
  end if;

  -- Lock and validate
  select ps.id, ps.brand_id, ps.branch_id, ps.sale_number, ps.sale_status,
         ps.gross_amount, ps.discount_amount, ps.mdr_amount, ps.net_amount,
         ps.payment_account_id, ps.sold_at
  into v_sale
  from public.pos_sales ps
  where ps.id = p_pos_sale_id
  for update;

  if not found then
    raise exception 'POS sale % not found', p_pos_sale_id using errcode = 'P0002';
  end if;

  if v_sale.sale_status != 'COMPLETED' then
    raise exception 'Cannot refund: POS sale % status is %, not COMPLETED',
      p_pos_sale_id, v_sale.sale_status using errcode = 'P0004';
  end if;

  select coalesce(sum(quantity * unit_cost), 0) into v_cogs_total
  from public.pos_sale_items where pos_sale_id = p_pos_sale_id;

  v_customer_paid := v_sale.gross_amount - v_sale.discount_amount;

  -- Update status to REFUNDED
  update public.pos_sales
  set sale_status = 'REFUNDED',
      metadata = metadata || jsonb_build_object('refunded_at', now(), 'refund_reason', p_reason)
  where id = p_pos_sale_id;

  -- Payment account movement OUT (POS_REFUND)
  v_pa_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_sale.payment_account_id,
    p_brand_id := v_sale.brand_id, p_direction := 'OUT',
    p_amount := v_sale.net_amount, p_movement_type := 'POS_REFUND',
    p_branch_id := v_sale.branch_id,
    p_reference_type := 'pos_sale', p_reference_id := p_pos_sale_id::text,
    p_description := 'Refund POS sale ' || v_sale.sale_number || ': ' || p_reason,
    p_metadata := jsonb_build_object('action', 'refund') || p_metadata,
    p_created_by := p_created_by
  );

  -- Finance reversal: POS_REVENUE DEBIT
  v_finance_key := 'pos_sale:' || p_pos_sale_id || ':POS_REVENUE:refund';
  perform public.add_finance_ledger_entry(
    p_brand_id := v_sale.brand_id, p_branch_id := v_sale.branch_id,
    p_ledger_date := current_date, p_occurred_at := now(),
    p_entry_type := 'POS_REVENUE', p_direction := 'DEBIT',
    p_amount := v_customer_paid,
    p_category := 'pos', p_account_code := '4000',
    p_reference_type := 'pos_sale', p_reference_id := p_pos_sale_id,
    p_source_table := 'transaction_reversals',
    p_description := 'Refund reversal: ' || p_reason || ' (' || v_sale.sale_number || ')',
    p_metadata := jsonb_build_object('action', 'refund', 'customer_paid', v_customer_paid),
    p_created_by := p_created_by,
    p_idempotency_key := v_finance_key
  );

  -- Finance reversal: COGS CREDIT if > 0
  if v_cogs_total > 0 then
    v_finance_key := 'pos_sale:' || p_pos_sale_id || ':COGS:refund';
    perform public.add_finance_ledger_entry(
      p_brand_id := v_sale.brand_id, p_branch_id := v_sale.branch_id,
      p_ledger_date := current_date, p_occurred_at := now(),
      p_entry_type := 'COGS', p_direction := 'CREDIT',
      p_amount := v_cogs_total,
      p_category := 'pos', p_account_code := '5000',
      p_reference_type := 'pos_sale', p_reference_id := p_pos_sale_id,
      p_source_table := 'transaction_reversals',
      p_description := 'COGS reversal: refund of ' || v_sale.sale_number,
      p_metadata := jsonb_build_object('action', 'refund', 'cogs_total', v_cogs_total),
      p_created_by := p_created_by,
      p_idempotency_key := v_finance_key
    );
  end if;

  -- Finance reversal: MDR_EXPENSE CREDIT if > 0
  if v_sale.mdr_amount > 0 then
    v_finance_key := 'pos_sale:' || p_pos_sale_id || ':MDR_EXPENSE:refund';
    perform public.add_finance_ledger_entry(
      p_brand_id := v_sale.brand_id, p_branch_id := v_sale.branch_id,
      p_ledger_date := current_date, p_occurred_at := now(),
      p_entry_type := 'MDR_EXPENSE', p_direction := 'CREDIT',
      p_amount := v_sale.mdr_amount,
      p_category := 'bank_fee', p_account_code := '5100',
      p_reference_type := 'pos_sale', p_reference_id := p_pos_sale_id,
      p_source_table := 'transaction_reversals',
      p_description := 'MDR reversal: refund of ' || v_sale.sale_number,
      p_metadata := jsonb_build_object('action', 'refund', 'mdr_amount', v_sale.mdr_amount),
      p_created_by := p_created_by,
      p_idempotency_key := v_finance_key
    );
  end if;

  -- Return inventory
  for v_item in
    select psi.id, psi.inventory_item_id, psi.quantity, psi.unit_cost
    from public.pos_sale_items psi
    where psi.pos_sale_id = p_pos_sale_id
  loop
    v_ret_movement_id := public.add_inventory_movement(
      p_brand_id := v_sale.brand_id, p_branch_id := v_sale.branch_id,
      p_item_id := v_item.inventory_item_id,
      p_direction := 'IN', p_movement_type := 'POS_RETURN',
      p_quantity := v_item.quantity, p_unit_cost := v_item.unit_cost,
      p_reference_type := 'pos_sale', p_reference_id := p_pos_sale_id,
      p_idempotency_key := 'pos_sale:' || p_pos_sale_id || ':return:item:' || v_item.inventory_item_id || ':line:' || v_item.id,
      p_description := 'Return stock: refund of ' || v_sale.sale_number,
      p_metadata := jsonb_build_object('sale_item_id', v_item.id, 'refund_reason', p_reason),
      p_created_by := p_created_by
    );

    update public.pos_sale_items
    set inventory_movement_id = v_ret_movement_id
    where id = v_item.id;
  end loop;

  -- Insert transaction_reversal
  insert into public.transaction_reversals (
    brand_id, branch_id, reversal_type, source_type, source_id,
    reason, original_amount, reversed_amount,
    payment_account_movement_id, idempotency_key,
    metadata, reversed_by, reversed_at, created_at
  ) values (
    v_sale.brand_id, v_sale.branch_id, 'REFUND', 'POS_SALE', p_pos_sale_id,
    p_reason, v_sale.gross_amount, v_sale.net_amount,
    v_pa_movement_id, v_final_key,
    p_metadata, p_created_by, now(), now()
  )
  returning id into v_tr_id;

  -- Audit log
  insert into public.audit_logs (brand_id, actor_id, action, target_type, target_id, target_label, description, details, created_at)
  values (
    v_sale.brand_id, p_created_by, 'REFUND_POS_SALE', 'pos_sales', p_pos_sale_id,
    v_sale.sale_number,
    'Refunded POS sale ' || v_sale.sale_number || ': ' || p_reason,
    jsonb_build_object(
      'gross_amount', v_sale.gross_amount, 'discount_amount', v_sale.discount_amount,
      'mdr_amount', v_sale.mdr_amount, 'net_amount', v_sale.net_amount,
      'cogs_reversed', v_cogs_total, 'reason', p_reason, 'reversal_id', v_tr_id
    ),
    now()
  );

  return jsonb_build_object(
    'status', 'REFUNDED',
    'pos_sale_id', p_pos_sale_id,
    'sale_number', v_sale.sale_number,
    'transaction_reversal_id', v_tr_id,
    'payment_account_movement_id', v_pa_movement_id,
    'gross_amount', v_sale.gross_amount,
    'discount_amount', v_sale.discount_amount,
    'customer_paid_amount', v_customer_paid,
    'mdr_amount', v_sale.mdr_amount,
    'net_amount', v_sale.net_amount,
    'cogs_reversed', v_cogs_total
  );
end;
$func$;

comment on function public.refund_pos_sale is
  'Refunds a COMPLETED POS sale. Reverses payment, finance, and inventory. Sets REFUNDED status. Idempotent.';


-- ============================================================
-- 5. VALIDATION QUERIES (reference only, not executed)
-- ============================================================

-- 5a. Voided/Refunded service payment without transaction_reversal record
--
-- SELECT sp.id, sp.payment_number, sp.payment_status, sp.updated_at
-- FROM public.service_payments sp
-- WHERE sp.payment_status IN ('VOIDED', 'REFUNDED')
--   AND NOT EXISTS (
--     SELECT 1 FROM public.transaction_reversals tr
--     WHERE tr.source_type = 'SERVICE_PAYMENT'
--       AND tr.source_id = sp.id
--   )
-- ORDER BY sp.updated_at;

-- 5b. Refunded service payment without payment_account_movement OUT
--
-- SELECT sp.id, sp.payment_number, sp.net_amount
-- FROM public.service_payments sp
-- WHERE sp.payment_status = 'REFUNDED'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.transaction_reversals tr
--     JOIN public.payment_account_movements pam ON pam.id = tr.payment_account_movement_id
--     WHERE tr.source_type = 'SERVICE_PAYMENT'
--       AND tr.source_id = sp.id
--       AND pam.direction = 'OUT'
--   )
-- ORDER BY sp.updated_at;

-- 5c. Voided POS sale without POS_RETURN inventory movement
--
-- SELECT ps.id, ps.sale_number
-- FROM public.pos_sales ps
-- WHERE ps.sale_status = 'VOIDED'
--   AND EXISTS (
--     SELECT 1 FROM public.pos_sale_items psi
--     WHERE psi.pos_sale_id = ps.id
--       AND NOT EXISTS (
--         SELECT 1 FROM public.inventory_movements im
--         WHERE im.reference_type = 'pos_sale'
--           AND im.reference_id = ps.id
--           AND im.movement_type = 'POS_RETURN'
--       )
--   )
-- ORDER BY ps.updated_at;

-- 5d. Reversal finance entry without corresponding source
-- (Should always be empty — functions always insert both)
--
-- SELECT fl.id, fl.entry_type, fl.direction, fl.amount, fl.description
-- FROM public.finance_ledger fl
-- WHERE fl.source_table = 'transaction_reversals'
--   AND fl.source_id IS NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM public.transaction_reversals tr
--     WHERE tr.brand_id = fl.brand_id
--   );

-- 5e. Duplicate transaction_reversal idempotency key
--
-- SELECT tr.idempotency_key, tr.brand_id, tr.reversal_type, tr.source_type, COUNT(*) AS cnt
-- FROM public.transaction_reversals tr
-- WHERE tr.idempotency_key IS NOT NULL
-- GROUP BY tr.idempotency_key, tr.brand_id, tr.reversal_type, tr.source_type
-- HAVING COUNT(*) > 1;

-- 5f. Payment/sale with status mismatch
-- Should show VOIDED payments still in COMPLETED finance ledger
-- (Normal — original entries are preserved; check reversals exist)
--
-- SELECT sp.id, sp.payment_number, sp.payment_status
-- FROM public.service_payments sp
-- WHERE sp.payment_status = 'VOIDED'
--   AND EXISTS (
--     SELECT 1 FROM public.finance_ledger fl
--     WHERE fl.entry_type = 'SERVICE_REVENUE'
--       AND fl.direction = 'CREDIT'
--       AND fl.reference_type = 'service_payment'
--       AND fl.reference_id = sp.id
--   )
--   AND NOT EXISTS (
--     SELECT 1 FROM public.finance_ledger fl2
--     WHERE fl2.entry_type = 'SERVICE_REVENUE'
--       AND fl2.direction = 'DEBIT'
--       AND fl2.reference_type = 'service_payment'
--       AND fl2.reference_id = sp.id
--   );

-- 5g. Finance ledger reversal mismatch
-- Compare total DEBIT vs CREDIT for reversal pairs
-- (Net of DEBIT - CREDIT should be 0 for paired reversals)
--
-- SELECT fl.reference_type, fl.reference_id, fl.entry_type,
--        SUM(CASE WHEN fl.direction = 'DEBIT' THEN fl.amount ELSE 0 END) AS total_debit,
--        SUM(CASE WHEN fl.direction = 'CREDIT' THEN fl.amount ELSE 0 END) AS total_credit
-- FROM public.finance_ledger fl
-- WHERE fl.reference_type IN ('service_payment', 'pos_sale')
--   AND fl.entry_type IN ('SERVICE_REVENUE', 'MDR_EXPENSE', 'POS_REVENUE', 'COGS')
-- GROUP BY fl.reference_type, fl.reference_id, fl.entry_type
-- HAVING SUM(CASE WHEN fl.direction = 'DEBIT' THEN fl.amount ELSE 0 END)
--     != SUM(CASE WHEN fl.direction = 'CREDIT' THEN fl.amount ELSE 0 END);


-- ============================================================
-- End of Migration 011
-- ============================================================
