-- ============================================================
-- Migration 006: Service Foundation Patch
-- Fixes: enum cleanup, sparepart status restriction, doc
-- ============================================================

-- ============================================================
-- 1. SAFELY DROP UNUSED NATIVE ENUM TYPE
-- ============================================================
-- The tables use TEXT + CHECK constraints (see migration 005).
-- The native enum type public.service_status is dead code.
-- Drop only if no table column, function, or view depends on it.
-- No CASCADE. Stop if dependency exists.

do $$
declare
  v_dependency_count integer;
  v_dependency_list text;
begin
  -- Check for any dependencies on the enum type
  select count(*) into v_dependency_count
  from pg_depend d
  join pg_type t on t.oid = d.refobjid
  where t.typname = 'service_status'
    and t.typnamespace = 'public'::regnamespace
    and d.deptype != 'i';  -- exclude internal dependencies (the enum itself)

  if v_dependency_count > 0 then
    -- Collect dependency details for reporting
    select string_agg(
      case
        when c.relkind = 'r' then 'TABLE: ' || c.relname
        when c.relkind = 'v' then 'VIEW: ' || c.relname
        when c.relkind = 'm' then 'MATERIALIZED VIEW: ' || c.relname
        when p.proname is not null then 'FUNCTION: ' || p.proname
        else 'OTHER (oid=' || d.objid || ')'
      end, ', ')
    into v_dependency_list
    from pg_depend d
    join pg_type t on t.oid = d.refobjid
    left join pg_class c on c.oid = d.objid
    left join pg_proc p on p.oid = d.objid
    where t.typname = 'service_status'
      and t.typnamespace = 'public'::regnamespace
      and d.deptype != 'i';

    raise exception 'Cannot drop type public.service_status: % dependencies exist: %',
      v_dependency_count, coalesce(v_dependency_list, 'unknown')
      using errcode = 'P0004';
  end if;

  -- No dependencies found. Safe to drop.
  drop type if exists public.service_status;
  raise notice 'Dropped unused enum type public.service_status';
end $$;


-- ============================================================
-- 2. RESTRICT ADD_SERVICE_SPAREPART_USAGE()
-- ============================================================
-- Remove DIAGNOSIS from allowed statuses.
-- Stock deduction is now only allowed during:
--   - REPAIRING (standard part usage during repair)
--   - QC (additional parts needed after QC review)
-- DIAGNOSIS may still be used for cost estimation / parts pre-selection
-- but must not modify inventory stock.

create or replace function public.add_service_sparepart_usage(
  p_service_id uuid,
  p_inventory_item_id uuid,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_selling_price numeric default null,
  p_notes text default null,
  p_created_by uuid default null,
  p_idempotency_key text default null
) returns uuid
language plpgsql
as $func$
declare
  v_service public.services%rowtype;
  v_item_brand_id integer;
  v_usage_id uuid;
  v_movement_id uuid;
  v_final_key text;
begin
  -- Lock and validate service
  select * into v_service
  from public.services
  where id = p_service_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Service % not found or deleted', p_service_id using errcode = 'P0002';
  end if;

  -- Service must be in REPAIRING or QC to deduct spareparts
  -- DIAGNOSIS is intentionally excluded: analysis/pre-selection must not deduct stock.
  if v_service.current_status not in ('REPAIRING', 'QC') then
    raise exception 'Cannot add sparepart usage: service % is in % status. Allowed: REPAIRING, QC.',
      p_service_id, v_service.current_status using errcode = 'P0004';
  end if;

  -- Validate item belongs to same brand
  select brand_id into v_item_brand_id
  from public.inventory_items
  where id = p_inventory_item_id and deleted_at is null;

  if not found then
    raise exception 'Inventory item % not found or deleted', p_inventory_item_id using errcode = 'P0002';
  end if;

  if v_item_brand_id != v_service.brand_id then
    raise exception 'Inventory item brand % does not match service brand %',
      v_item_brand_id, v_service.brand_id using errcode = 'P0002';
  end if;

  -- Insert usage record first (need id for idempotency_key)
  insert into public.service_sparepart_usages (
    brand_id, branch_id, service_id,
    inventory_item_id, quantity,
    unit_cost, selling_price,
    notes, metadata,
    created_by, created_at
  ) values (
    v_service.brand_id, v_service.branch_id, p_service_id,
    p_inventory_item_id, p_quantity,
    p_unit_cost, p_selling_price,
    p_notes, '{}',
    p_created_by, now()
  )
  returning id into v_usage_id;

  -- Generate idempotency key
  v_final_key := coalesce(
    p_idempotency_key,
    'service:' || p_service_id || ':item:' || p_inventory_item_id || ':usage:' || v_usage_id
  );

  -- Deduct inventory stock
  v_movement_id := public.add_inventory_movement(
    p_brand_id := v_service.brand_id,
    p_branch_id := v_service.branch_id,
    p_item_id := p_inventory_item_id,
    p_direction := 'OUT',
    p_movement_type := 'SERVICE_USAGE',
    p_quantity := p_quantity,
    p_unit_cost := p_unit_cost,
    p_reference_type := 'service',
    p_reference_id := p_service_id,
    p_idempotency_key := v_final_key,
    p_description := p_notes,
    p_metadata := jsonb_build_object('usage_id', v_usage_id, 'service_id', p_service_id),
    p_created_by := p_created_by
  );

  -- Link movement to usage
  update public.service_sparepart_usages
  set inventory_movement_id = v_movement_id,
      metadata = metadata || jsonb_build_object('idempotency_key', v_final_key)
  where id = v_usage_id;

  return v_usage_id;
end;
$func$;


-- ============================================================
-- 3. DOCUMENT FINANCE LEDGER CORRECTION
-- ============================================================
-- CORRECTION from the original blueprint:
--
-- The finance module (future migration) must implement
-- finance_ledger as a REAL APPEND-ONLY TABLE, NOT a materialized view.
--
-- Reasons:
--   1. Source-of-truth integrity: ledger entries are financial
--      records that must never be lost or recalculated from
--      other tables (which could change retroactively).
--   2. Audit trail: append-only ledger provides an immutable
--      history of every financial event in the system.
--   3. Consistency: payment_account_movements and
--      inventory_movements already use append-only patterns.
--      finance_ledger must follow the same principle.
--
-- Materialized views may be added later ONLY as a derived
-- reporting/cache layer (e.g., daily summary, monthly P&L).
-- They must never be the source of truth for financial data.
--
-- Design requirements for the future finance migration:
--   - finance_ledger table: id, brand_id, branch_id, entry_date,
--     account_id, movement_id (FK to payment_account_movements),
--     service_id, transaction_type, debit_amount, credit_amount,
--     running_balance, description, reference_type, reference_id,
--     created_at (immutable, no UPDATE, no DELETE).
--   - All INSERT via a single function with FOR UPDATE row lock.
--   - No direct INSERT/UPDATE/DELETE privileges on the table.
--   - CHECK constraint: (debit_amount >= 0) and (credit_amount >= 0),
--     and (debit_amount = 0 or credit_amount = 0) -- no double-sided.
--
-- This migration does NOT create the finance_ledger table.
-- It only documents the correction for the future migration.

-- ============================================================
-- End of Migration 006
-- ============================================================
