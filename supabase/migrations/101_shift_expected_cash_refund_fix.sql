-- Migration 101: Fix shift expected cash calculation to include refunds
-- 
-- Problem: calculate_shift_expected_cash did not subtract SERVICE_REFUND
-- and POS_REFUND movements from expected cash. When a cash service payment
-- or POS sale was refunded, the refund OUT movement (in payment_account_movements)
-- was ignored, causing expected cash to be overstated by the refund amount.
--
-- Formula (correct):
--   expected_cash = opening_cash
--                 + CASH service payments (COMPLETED)
--                 + CASH POS sales (COMPLETED)
--                 + manual CASH_IN
--                 - manual CASH_OUT
--                 - CASH refunds (SERVICE_REFUND + POS_REFUND)
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 1. Recreate calculate_shift_expected_cash with refund handling
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
  v_refund_total       numeric(14,2);
  v_expected           numeric(14,2);
begin
  select id, branch_id, cash_account_id, opening_cash, opened_at, closed_at
  into v_shift
  from public.store_shifts
  where id = p_shift_id;

  if not found then
    raise exception 'Shift % not found', p_shift_id using errcode = 'P0002';
  end if;

  v_closed_at := coalesce(v_shift.closed_at, now());

  -- CASH service payments to this cash account during shift (COMPLETED only)
  select coalesce(sum(sp.net_amount), 0) into v_cash_service_total
  from public.service_payments sp
  join public.payment_methods pm on pm.id = sp.payment_method_id
  where sp.payment_account_id = v_shift.cash_account_id
    and sp.paid_at >= v_shift.opened_at
    and sp.paid_at <= v_closed_at
    and sp.payment_status = 'COMPLETED'
    and pm.type = 'CASH';

  -- CASH POS sales to this cash account during shift (COMPLETED only)
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

  -- CASH refunds (SERVICE_REFUND, POS_REFUND) via payment_account_movements
  -- These are OUT movements not captured in store_shift_cash_movements
  select coalesce(sum(amount), 0) into v_refund_total
  from public.payment_account_movements
  where payment_account_id = v_shift.cash_account_id
    and movement_type in ('SERVICE_REFUND', 'POS_REFUND')
    and direction = 'OUT'
    and created_at >= v_shift.opened_at
    and created_at <= v_closed_at;

  v_expected := v_shift.opening_cash
    + v_cash_service_total
    + v_cash_pos_total
    + v_manual_in
    - v_manual_out
    - v_refund_total;

  return v_expected;
end;
$func$;

comment on function public.calculate_shift_expected_cash is
  'Expected cash drawer = opening_cash + CASH payments (service+POS) + manual CASH_IN - manual CASH_OUT - CASH refunds (SERVICE_REFUND+POS_REFUND).';
