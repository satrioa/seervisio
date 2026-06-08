-- ============================================================
-- SEERVIS V2 -- Inventory Foundation Patch
-- Migration 004: Idempotency key for inventory movements
-- ============================================================
-- Fixes the idempotency design from migration 003.
-- Replaces the restrictive unique index on (reference_type, reference_id, item_id, movement_type)
-- with a flexible idempotency_key system that supports:
--   - Multiple movements of the same item on the same reference
--   - Safe retry of failed operations
--   - No UUID suffix abuse
-- ============================================================

-- 1. ADD idempotency_key TO inventory_movements
-- ============================================================
-- Purpose: Application-generated unique key for idempotent retry.
-- Format examples:
--   SERVICE_USAGE:  "service:{service_id}:item:{item_id}:usage:{usage_record_id}"
--   POS_SALE:       "pos:{sale_id}:item:{item_id}:line:{sale_item_id}"
--   PURCHASE:       "purchase:{purchase_id}:item:{item_id}:line:{purchase_item_id}"
--   ADJUSTMENT:     "adj:{adjustment_id}:item:{item_id}"
--
-- This is separate from reference_type/reference_id which are kept
-- for business traceability only.
alter table public.inventory_movements
  add column if not exists idempotency_key text;

comment on column public.inventory_movements.idempotency_key is
  'Application-generated unique key for idempotent retry. '
  'Format: "{source_type}:{source_id}:item:{item_id}:{context}:{line_id}". '
  'Enforced unique per brand via partial unique index.';

-- 2. DROP restrictive unique index on (reference_type, reference_id, item_id, movement_type)
-- ============================================================
-- This index is too restrictive for valid business cases:
--   - A service can use the same sparepart item more than once
--   - A POS sale could have the same item on multiple lines
-- The idempotency_key replaces this as the duplicate prevention mechanism.
-- reference_type and reference_id remain as traceability columns (no uniqueness).
drop index if exists public.uq_im_reference;

-- 3. ADD unique index on (brand_id, idempotency_key)
-- ============================================================
-- Enforces idempotency: a given idempotency_key can only appear once per brand.
-- This is the core of the duplicate prevention system.
create unique index if not exists uq_im_idempotency_key
  on public.inventory_movements(brand_id, idempotency_key)
  where idempotency_key is not null;

-- 4. ADD index for fast idempotency key lookup
-- ============================================================
-- Enables efficient idempotency checks in add_inventory_movement().
create index if not exists idx_im_idempotency_key
  on public.inventory_movements(idempotency_key)
  where idempotency_key is not null;

-- 5. ADD index on (brand_id, idempotency_key) for join lookups
-- ============================================================
-- Supports the pattern: WHERE brand_id = X AND idempotency_key = Y
-- Note: the unique index uq_im_idempotency_key already covers lookups
-- by (brand_id, idempotency_key) efficiently. This extra index is
-- for cases where only idempotency_key is searched without brand_id.
-- The unique index alone is sufficient for the function lookup.
-- Keep both for different query patterns.

-- ============================================================
-- 6. UPDATE add_inventory_movement() WITH IDEMPOTENCY SUPPORT
-- ============================================================
-- Recreates the function with p_idempotency_key parameter.
-- Idempotency behavior:
--   - If key exists AND payload matches → return existing movement ID (safe retry)
--   - If key exists AND payload differs → raise exception (conflict detection)
--   - If key is null → normal flow (no idempotency check)
create or replace function public.add_inventory_movement(
  p_brand_id integer,
  p_branch_id uuid,
  p_item_id uuid,
  p_direction text,
  p_movement_type text,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_idempotency_key text default null,
  p_description text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null
) returns uuid
language plpgsql
as $func$
declare
  v_stock_id uuid;
  v_before_quantity numeric;
  v_after_quantity numeric;
  v_allow_negative boolean;
  v_item_track_stock boolean;
  v_item_brand_id integer;
  v_branch_brand_id integer;
  v_movement_id uuid;
  v_existing_id uuid;
  v_existing_item_id uuid;
  v_existing_branch_id uuid;
  v_existing_movement_type text;
  v_existing_direction text;
  v_existing_quantity numeric;
begin
  -- ============================================================
  -- 1. VALIDATE INPUT
  -- ============================================================

  if p_direction not in ('IN', 'OUT') then
    raise exception 'Invalid direction: %', p_direction using errcode = '22023';
  end if;

  if p_movement_type in ('PURCHASE','SERVICE_RETURN','POS_RETURN','ADJUSTMENT_IN','OPENING_STOCK','TRANSFER_IN') and p_direction != 'IN' then
    raise exception 'Movement type % requires direction IN', p_movement_type using errcode = '22023';
  end if;
  if p_movement_type in ('SERVICE_USAGE','POS_SALE','ADJUSTMENT_OUT','DAMAGE','TRANSFER_OUT') and p_direction != 'OUT' then
    raise exception 'Movement type % requires direction OUT', p_movement_type using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive' using errcode = '22023';
  end if;

  -- ============================================================
  -- 2. IDEMPOTENCY CHECK
  -- ============================================================
  -- If p_idempotency_key is provided, check if this operation was
  -- already processed. If so, return the existing movement ID
  -- (only if payload matches — prevents accidental key reuse).

  if p_idempotency_key is not null then
    select id, item_id, branch_id, movement_type, direction, quantity
      into v_existing_id, v_existing_item_id, v_existing_branch_id,
           v_existing_movement_type, v_existing_direction, v_existing_quantity
    from public.inventory_movements
    where brand_id = p_brand_id
      and idempotency_key = p_idempotency_key;

    if found then
      -- Payload comparison
      if v_existing_item_id = p_item_id
         and v_existing_branch_id = p_branch_id
         and v_existing_movement_type = p_movement_type
         and v_existing_direction = p_direction
         and v_existing_quantity = p_quantity
      then
        -- Same operation, safe to return existing ID
        return v_existing_id;
      else
        raise exception 'Idempotency key conflict: key "%" already used for a different operation (item: %, branch: %, type: %, dir: %, qty: %). Current call: (item: %, branch: %, type: %, dir: %, qty: %).',
          p_idempotency_key,
          v_existing_item_id, v_existing_branch_id, v_existing_movement_type,
          v_existing_direction, v_existing_quantity,
          p_item_id, p_branch_id, p_movement_type, p_direction, p_quantity
          using errcode = 'P0004';
      end if;
    end if;
  end if;

  -- ============================================================
  -- 3. VALIDATE ITEM
  -- ============================================================

  select brand_id, allow_negative_stock, track_stock
    into v_item_brand_id, v_allow_negative, v_item_track_stock
  from public.inventory_items
  where id = p_item_id and deleted_at is null;

  if not found then
    raise exception 'Item % not found or deleted', p_item_id using errcode = 'P0002';
  end if;
  if v_item_brand_id != p_brand_id then
    raise exception 'Item brand mismatch: item % belongs to brand %', p_item_id, v_item_brand_id using errcode = 'P0002';
  end if;

  -- ============================================================
  -- 4. HANDLE NON-TRACKING ITEMS
  -- ============================================================

  if not v_item_track_stock then
    insert into public.inventory_movements (
      brand_id, branch_id, item_id,
      direction, movement_type, quantity,
      before_quantity, after_quantity,
      unit_cost,
      reference_type, reference_id,
      idempotency_key,
      description, metadata,
      created_by, created_at
    ) values (
      p_brand_id, p_branch_id, p_item_id,
      p_direction, p_movement_type, p_quantity,
      0, 0,
      p_unit_cost,
      p_reference_type, p_reference_id,
      p_idempotency_key,
      p_description, p_metadata,
      p_created_by, now()
    )
    returning id into v_movement_id;

    return v_movement_id;
  end if;

  -- ============================================================
  -- 5. VALIDATE BRANCH
  -- ============================================================

  select brand_id into v_branch_brand_id
  from public.branches
  where id = p_branch_id and deleted_at is null;

  if not found then
    raise exception 'Branch % not found or deleted', p_branch_id using errcode = 'P0002';
  end if;
  if v_branch_brand_id != p_brand_id then
    raise exception 'Branch brand mismatch: branch % belongs to brand %',
      p_branch_id, v_branch_brand_id using errcode = 'P0002';
  end if;

  -- ============================================================
  -- 6. LOCK AND UPDATE STOCK
  -- ============================================================

  select id, current_stock
    into v_stock_id, v_before_quantity
  from public.branch_inventory_stocks
  where branch_id = p_branch_id and item_id = p_item_id
  for update;

  if not found then
    if p_direction = 'OUT' then
      raise exception 'Cannot deduct stock: no stock record for item % in branch %',
        p_item_id, p_branch_id using errcode = 'P0002';
    end if;
    insert into public.branch_inventory_stocks (brand_id, branch_id, item_id, current_stock)
    values (p_brand_id, p_branch_id, p_item_id, 0)
    returning id into v_stock_id;
    v_before_quantity := 0;
  end if;

  if p_direction = 'IN' then
    v_after_quantity := v_before_quantity + p_quantity;
  else
    v_after_quantity := v_before_quantity - p_quantity;
  end if;

  if v_after_quantity < 0 and not v_allow_negative then
    raise exception 'Insufficient stock: item % in branch % has % but requested deduction of %',
      p_item_id, p_branch_id, v_before_quantity, p_quantity
      using errcode = '23514';
  end if;

  -- ============================================================
  -- 7. INSERT MOVEMENT
  -- ============================================================

  insert into public.inventory_movements (
    brand_id, branch_id, item_id,
    direction, movement_type, quantity,
    before_quantity, after_quantity,
    unit_cost,
    reference_type, reference_id,
    idempotency_key,
    description, metadata,
    created_by, created_at
  ) values (
    p_brand_id, p_branch_id, p_item_id,
    p_direction, p_movement_type, p_quantity,
    v_before_quantity, v_after_quantity,
    p_unit_cost,
    p_reference_type, p_reference_id,
    p_idempotency_key,
    p_description, p_metadata,
    p_created_by, now()
  )
  returning id into v_movement_id;

  -- ============================================================
  -- 8. UPDATE CACHED STOCK
  -- ============================================================

  update public.branch_inventory_stocks
  set current_stock = v_after_quantity,
      last_movement_at = now(),
      updated_at = now()
  where id = v_stock_id;

  return v_movement_id;
end;
$func$;

-- ============================================================
-- 7. UPDATED DOCUMENTATION
-- ============================================================

-- 7a. reference_type and reference_id usage:
--   - reference_type:  Business entity type (e.g., 'service', 'pos_sale', 'purchase')
--   - reference_id:    UUID of the business entity
--   - These are for TRACEABILITY only. Do NOT enforce uniqueness on them.
--   - Use idempotency_key for duplicate prevention.

-- 7b. idempotency_key usage:
--   - Format:  "{source_type}:{source_id}:item:{item_id}:{context}:{line_id}"
--   - Examples:
--     SERVICE_USAGE:  "service:a1b2c3:item:d4e5f6:usage:g7h8i9"
--     POS_SALE:       "pos:j1k2l3:item:m4n5o6:line:p7q8r9"
--     PURCHASE:       "purchase:r1s2t3:item:u4v5w6:line:x7y8z9"
--   - Unique per brand. Prevents double-processing on retry.

-- 7c. How idempotent retry works:
--   1. Application generates a unique idempotency_key per operation.
--   2. Calls add_inventory_movement() with the key.
--   3. If the call succeeds → movement created, key stored.
--   4. On retry (e.g., timeout, network error), app sends same key.
--   5. Function detects existing key, compares payload.
--   6. If payload matches → returns existing movement ID (safe no-op).
--   7. If payload differs → raises IdempotencyKeyConflict exception.

-- 7d. How idempotency conflict is detected:
--   - Unique index uq_im_idempotency_key prevents duplicate key inserts.
--   - Function checks before insert: if key exists, compares full payload.
--   - Mismatch raises exception with both old and new payload details.
--   - This prevents accidental key reuse across different operations.

-- ============================================================
-- 8. VALIDATION QUERIES (reference only, not executed)
-- ============================================================

-- 8a. Find duplicate idempotency keys (should never return rows)
--
-- SELECT idempotency_key, COUNT(*) AS dup_count
-- FROM public.inventory_movements
-- WHERE idempotency_key IS NOT NULL
-- GROUP BY idempotency_key
-- HAVING COUNT(*) > 1;

-- 8b. Find movements with same reference but different idempotency keys
-- (expected: service usage of same item multiple times)
--
-- SELECT reference_type, reference_id, item_id, movement_type,
--        COUNT(*) AS movement_count,
--        COUNT(DISTINCT idempotency_key) AS key_count
-- FROM public.inventory_movements
-- WHERE reference_type IS NOT NULL
--   AND reference_id IS NOT NULL
-- GROUP BY reference_type, reference_id, item_id, movement_type
-- HAVING COUNT(*) > 1;

-- 8c. Verify stock cache vs movement sum (same as 003, unchanged)
--
-- SELECT bis.id,
--        bis.current_stock AS cached_stock,
--        COALESCE(SUM(CASE WHEN im.direction = 'IN' THEN im.quantity ELSE -im.quantity END), 0) AS ledger_stock,
--        bis.current_stock - COALESCE(SUM(CASE WHEN im.direction = 'IN' THEN im.quantity ELSE -im.quantity END), 0) AS difference
-- FROM public.branch_inventory_stocks bis
-- LEFT JOIN public.inventory_movements im ON im.branch_id = bis.branch_id AND im.item_id = bis.item_id
-- GROUP BY bis.id, bis.current_stock
-- HAVING bis.current_stock != COALESCE(SUM(CASE WHEN im.direction = 'IN' THEN im.quantity ELSE -im.quantity END), 0);

-- ============================================================
-- End of Migration 004
-- ============================================================
