-- ============================================================
-- Migration 045: Add calculate_pos_mdr 4-argument overload
--
-- The active database only has the 3-argument overload.
-- record_service_payment (migration 044) calls the 4-argument
-- version with mdr_min_transaction threshold support.
-- ============================================================

create or replace function public.calculate_pos_mdr(
  p_method_type text,
  p_amount numeric,
  p_mdr_percentage numeric default 0,
  p_mdr_min_transaction numeric default 0
) returns numeric
language plpgsql
stable
as $$
declare
  v_method text := upper(coalesce(p_method_type, ''));
  v_amount numeric := coalesce(p_amount, 0);
  v_pct numeric := coalesce(p_mdr_percentage, 0);
  v_min numeric := coalesce(p_mdr_min_transaction, 0);
begin
  if v_amount <= 0 then
    return 0;
  end if;

  if v_pct <= 0 then
    return 0;
  end if;

  -- CASH and TRANSFER always zero MDR
  if v_method in ('TRANSFER', 'CASH') then
    return 0;
  end if;

  -- QRIS: hard threshold of 500000 (minimum transaction amount for MDR)
  if v_method = 'QRIS' and v_amount <= 500000 then
    return 0;
  end if;

  -- Branch-level minimum transaction threshold (overrides QRIS hard threshold if higher)
  if v_min > 0 and v_amount < v_min then
    return 0;
  end if;

  return round((v_amount * v_pct / 100)::numeric, 2);
end;
$$;

comment on function public.calculate_pos_mdr(text, numeric, numeric, numeric) is
  'Calculates MDR fee with optional minimum transaction threshold. Used by service and POS payment flows.';

notify pgrst, 'reload schema';
