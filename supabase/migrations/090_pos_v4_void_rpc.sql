-- ============================================================
-- Migration 034: POS V4 Void/Refund/Reversal
--
-- Tables:
--   pos_transaction_reversals — append-only reversal audit trail
--
-- RPC:
--   void_pos_transaction_v4   — atomic full-transaction void
--
-- Does not touch legacy POS or legacy reversal tables.
-- ============================================================

-- ============================================================
-- Table: pos_transaction_reversals
-- ============================================================

create table if not exists public.pos_transaction_reversals (
  id          uuid not null default gen_random_uuid(),
  brand_id    integer not null references public.brands(id),
  branch_id   uuid not null references public.branches(id),
  transaction_id uuid not null references public.pos_transactions(id),
  reversal_number text,
  reason      text not null,
  total_amount numeric not null default 0,
  payment_reversal_movement_id uuid references public.payment_account_movements(id),
  created_by  uuid,
  created_at  timestamptz not null default now(),
  constraint pos_transaction_reversals_pkey primary key (id),
  constraint pos_transaction_reversals_transaction_unique unique (transaction_id)
);

comment on table public.pos_transaction_reversals is
  'Append-only reversal audit trail for POS V4 voids/refunds.';

-- RLS
alter table public.pos_transaction_reversals enable row level security;

drop policy if exists pos_transaction_reversals_select on public.pos_transaction_reversals;
create policy pos_transaction_reversals_select
  on public.pos_transaction_reversals for select
  using (
    brand_id = any(get_user_brand_ids())
    and (branch_id = any(get_user_branch_ids()) or get_user_roles() && array['MASTER_ADMIN'::text])
  );

drop policy if exists pos_transaction_reversals_insert on public.pos_transaction_reversals;
create policy pos_transaction_reversals_insert
  on public.pos_transaction_reversals for insert
  with check (
    brand_id = any(get_user_brand_ids())
    and (get_user_roles() && array['MASTER_ADMIN'::text, 'ADMIN'::text])
  );

-- Index
create index if not exists idx_pos_transaction_reversals_tx
  on public.pos_transaction_reversals(transaction_id);

-- ============================================================
-- RPC: void_pos_transaction_v4
--
-- Atomically voids a COMPLETED POS V4 transaction:
--   1. Validates reason is provided
--   2. Locks transaction row FOR UPDATE
--   3. Validates status = COMPLETED and no existing reversal
--   4. Loads transaction items
--   5. For each item:
--      - PRODUCT_QUANTITY / UNIT_NEW_QUANTITY: restore stock
--      - UNIT_SECOND_SERIALIZED: restore unit status
--   6. Creates VOID_REVERSAL stock movements
--   7. Creates payment account reversal movement
--   8. Inserts reversal audit record
--   9. Updates transaction status to VOIDED
-- ============================================================

create or replace function public.void_pos_transaction_v4(
  p_brand_id integer,
  p_branch_id uuid,
  p_transaction_id uuid,
  p_reason text,
  p_created_by uuid default auth.uid()
) returns jsonb
language plpgsql
as $func$
declare
  v_tx_row public.pos_transactions%rowtype;
  v_tx_items record;
  v_item record;
  v_stock_row public.inv_variant_stocks%rowtype;
  v_stock_before numeric;
  v_stock_after numeric;
  v_unit_row public.inv_units%rowtype;
  v_movement_id uuid;
  v_movement_ids uuid[] := '{}';
  v_restored_count integer := 0;
  v_pa_movement_id uuid;
  v_reversal_id uuid;
  v_reversal_number text;
begin
  -- 1. Validate reason
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'Alasan pembatalan wajib diisi minimal 5 karakter.'
      using errcode = 'P0001';
  end if;

  -- 2. Lock and validate transaction
  select * into v_tx_row
  from public.pos_transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'Transaksi tidak ditemukan.'
      using errcode = 'P0002';
  end if;

  if v_tx_row.brand_id != p_brand_id then
    raise exception 'Transaksi tidak sesuai dengan brand.'
      using errcode = 'P0002';
  end if;

  if v_tx_row.branch_id != p_branch_id then
    raise exception 'Transaksi berada di cabang berbeda.'
      using errcode = 'P0002';
  end if;

  if v_tx_row.status = 'VOIDED' then
    raise exception 'Transaksi sudah dibatalkan.'
      using errcode = 'P0003';
  end if;

  if v_tx_row.status = 'REFUNDED' then
    raise exception 'Transaksi sudah diretur.'
      using errcode = 'P0003';
  end if;

  if v_tx_row.status != 'COMPLETED' then
    raise exception 'Hanya transaksi dengan status COMPLETED yang dapat dibatalkan.'
      using errcode = 'P0003';
  end if;

  -- 3. Check for existing reversal
  perform 1 from public.pos_transaction_reversals
  where transaction_id = p_transaction_id;

  if found then
    raise exception 'Transaksi ini sudah memiliki reversal.'
      using errcode = 'P0003';
  end if;

  -- 4. Generate reversal number
  v_reversal_number := 'RVOID-' || v_tx_row.transaction_number;

  -- 5. Process transaction items
  for v_item in
    select * from public.pos_transaction_items
    where transaction_id = p_transaction_id
    order by created_at asc
  loop
    if v_item.item_type in ('PRODUCT_QUANTITY', 'UNIT_NEW_QUANTITY') then
      -- === Restore quantity stock ===
      select * into v_stock_row
      from public.inv_variant_stocks
      where branch_id = p_branch_id
        and variant_id = v_item.variant_id
      for update;

      v_stock_before := coalesce(v_stock_row.current_stock, 0);
      v_stock_after := v_stock_before + v_item.quantity;

      if v_stock_row.id is not null then
        update public.inv_variant_stocks
        set current_stock = v_stock_after,
            updated_at = now()
        where id = v_stock_row.id;
      end if;

      -- Create reversal movement
      insert into public.inv_stock_movements (
        brand_id, branch_id,
        product_id, variant_id,
        movement_type, direction,
        quantity, stock_before, stock_after,
        reference_type, reference_id, reference_label,
        notes, created_by
      ) values (
        p_brand_id, p_branch_id,
        v_item.product_id, v_item.variant_id,
        'VOID_REVERSAL', 'IN',
        v_item.quantity, v_stock_before, v_stock_after,
        'POS_TRANSACTION_VOID', p_transaction_id::text, v_tx_row.transaction_number,
        'Pembatalan: ' || p_reason, p_created_by
      )
      returning id into v_movement_id;

      v_movement_ids := array_append(v_movement_ids, v_movement_id);
      v_restored_count := v_restored_count + 1;

    elsif v_item.item_type = 'UNIT_SECOND_SERIALIZED' then
      -- === Restore Unit Second ===
      select * into v_unit_row
      from public.inv_units
      where id = v_item.unit_id
      for update;

      if not found then
        raise exception 'Unit Second tidak ditemukan untuk item transaksi.'
          using errcode = 'P0004';
      end if;

      if v_unit_row.status != 'SOLD' then
        raise exception 'Unit Second (IMEI: %) sudah tidak dalam status terjual (status: %).',
          coalesce(v_unit_row.imei, v_unit_row.id::text), v_unit_row.status
          using errcode = 'P0005';
      end if;

      update public.inv_units
      set status = 'READY_STOCK',
          updated_at = now()
      where id = v_item.unit_id;

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
        v_item.product_id, v_item.variant_id, v_item.unit_id,
        'VOID_REVERSAL', 'IN',
        1,
        'SOLD', 'READY_STOCK',
        'POS_TRANSACTION_VOID', p_transaction_id::text, v_tx_row.transaction_number,
        'Pembatalan: ' || p_reason, p_created_by
      )
      returning id into v_movement_id;

      v_movement_ids := array_append(v_movement_ids, v_movement_id);
      v_restored_count := v_restored_count + 1;
    end if;
  end loop;

  -- 6. Create payment account reversal movement
  v_pa_movement_id := public.add_payment_account_movement(
    p_payment_account_id := v_tx_row.payment_account_id,
    p_brand_id           := p_brand_id,
    p_direction          := 'OUT',
    p_amount             := v_tx_row.total_amount,
    p_movement_type      := 'POS_VOID',
    p_branch_id          := p_branch_id,
    p_reference_type     := 'POS_TRANSACTION_VOID',
    p_reference_id       := p_transaction_id::text,
    p_transfer_group_id  := null,
    p_description        := 'Void ' || v_tx_row.transaction_number,
    p_metadata           := jsonb_build_object(
      'transaction_number', v_tx_row.transaction_number,
      'original_status', v_tx_row.status,
      'reason', p_reason,
      'total_amount', v_tx_row.total_amount,
      'paid_amount', v_tx_row.paid_amount
    ),
    p_created_by         := p_created_by
  );

  -- 7. Insert reversal record
  insert into public.pos_transaction_reversals (
    brand_id, branch_id, transaction_id,
    reversal_number, reason, total_amount,
    payment_reversal_movement_id, created_by
  ) values (
    p_brand_id, p_branch_id, p_transaction_id,
    v_reversal_number, trim(p_reason), v_tx_row.total_amount,
    v_pa_movement_id, p_created_by
  )
  returning id into v_reversal_id;

  -- 8. Update transaction status to VOIDED
  update public.pos_transactions
  set status = 'VOIDED',
      updated_at = now()
  where id = p_transaction_id;

  -- 9. Return result
  return jsonb_build_object(
    'transaction_id', p_transaction_id,
    'transaction_number', v_tx_row.transaction_number,
    'status', 'VOIDED',
    'restored_item_count', v_restored_count,
    'stock_movement_ids', to_jsonb(v_movement_ids),
    'payment_reversal_movement_id', v_pa_movement_id,
    'reversal_id', v_reversal_id
  );
end;
$func$;

comment on function public.void_pos_transaction_v4 is
  'Atomic POS V4 transaction void. Restores stock, reverses payment, creates audit trail. Requires reason (min 5 chars). Rejects if already VOIDED/REFUNDED.';
