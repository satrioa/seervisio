-- ============================================================
-- Migration 041: Fix payment number generation for atomic safety
--
-- Replaces generate_service_payment_number with explicit
-- FOR UPDATE row lock on the counter to prevent any possible
-- race condition in concurrent transactions.
--
-- Context: The original function relied on UPDATE's implicit
-- row lock, but INSERT ... ON CONFLICT + UPDATE can still
-- race under heavy concurrency. This version adds an explicit
-- SELECT ... FOR UPDATE lock before incrementing.
-- ============================================================

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
  -- Ensure counter row exists for this brand + date
  insert into public.payment_number_counters (brand_id, counter_date, last_number)
  values (p_brand_id, v_date, 0)
  on conflict (brand_id, counter_date) do nothing;

  -- Lock the counter row exclusively before incrementing.
  -- This serialises all concurrent callers for the same brand + date.
  select last_number into v_counter
  from public.payment_number_counters
  where brand_id = p_brand_id
    and counter_date = v_date
  for update;

  if not found then
    raise exception 'Failed to lock payment counter for brand %', p_brand_id
      using errcode = 'P0002';
  end if;

  -- Atomically increment
  update public.payment_number_counters
  set last_number = last_number + 1,
      updated_at = now()
  where brand_id = p_brand_id
    and counter_date = v_date
  returning last_number into v_counter;

  return 'PAY/' || to_char(v_date, 'YYYY') || '/' || to_char(v_date, 'MM') || '/' || lpad(v_counter::text, 4, '0');
end;
$func$;

comment on function public.generate_service_payment_number is
  'Generates unique PAY/YYYY/MM/NNNN per brand per month. Atomic via SELECT FOR UPDATE on counter table.';

-- Notify PostgREST to reload schema
notify pgrst, 'reload schema';
