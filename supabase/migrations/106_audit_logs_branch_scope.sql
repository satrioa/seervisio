-- ============================================================
-- 106_audit_logs_branch_scope.sql
-- Add per-branch scoping to audit_logs.
--
-- Context: audit_logs was brand-scoped only (no branch_id column),
-- which broke the dashboard Activity Log when a specific branch was
-- selected (the query filtered on a non-existent column and returned
-- an error -> empty list). This migration:
--   1. Adds a nullable branch_id column + index.
--   2. Adds a derivation helper that infers branch_id from
--      target_type/target_id (or details->>'branch_id').
--   3. Adds a BEFORE INSERT trigger that auto-fills branch_id when a
--      caller (e.g. the shift/void/refund DB functions) does not set
--      it explicitly.
--   4. Backfills existing rows.
--
-- Branch-less (brand-level) actions such as brand settings, brand
-- profile, brand targets, user account management, tenant creation and
-- data maintenance intentionally keep branch_id = NULL. The dashboard
-- treats NULL branch_id as "applies to all branches".
-- ============================================================

-- 1. Column + index --------------------------------------------------
alter table public.audit_logs
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

create index if not exists idx_al_branch_created
  on public.audit_logs(branch_id, created_at desc);

-- 2. Derivation helper ----------------------------------------------
create or replace function public.derive_audit_log_branch_id(
  p_target_type text,
  p_target_id   uuid,
  p_details     jsonb
) returns uuid
language plpgsql
stable
as $$
declare
  v_branch        uuid;
  v_detail_branch text;
begin
  -- 2a. Prefer an explicit branch_id embedded in details.
  v_detail_branch := p_details ->> 'branch_id';
  if v_detail_branch is not null and length(v_detail_branch) > 0 then
    begin
      return v_detail_branch::uuid;
    exception when others then
      -- not a valid uuid, fall through to target-based derivation
      null;
    end;
  end if;

  if p_target_id is null then
    return null;
  end if;

  -- 2b. Derive from the referenced entity.
  case lower(coalesce(p_target_type, ''))
    when 'branch', 'branches', 'store' then
      return p_target_id;
    when 'service', 'services' then
      select branch_id into v_branch from public.services where id = p_target_id;
    when 'service_payment', 'service_payments' then
      select branch_id into v_branch from public.service_payments where id = p_target_id;
    when 'pos_sale', 'pos_sales' then
      select branch_id into v_branch from public.pos_sales where id = p_target_id;
    when 'store_shift', 'store_shifts' then
      select branch_id into v_branch from public.store_shifts where id = p_target_id;
    when 'payment_account', 'payment_accounts' then
      select branch_id into v_branch from public.payment_accounts where id = p_target_id;
    when 'payment_account_movement', 'payment_account_movements' then
      select branch_id into v_branch from public.payment_account_movements where id = p_target_id;
    else
      v_branch := null;
  end case;

  return v_branch;
end;
$$;

-- 3. BEFORE INSERT trigger ------------------------------------------
create or replace function public.audit_logs_set_branch_id()
returns trigger
language plpgsql
as $$
begin
  if new.branch_id is null then
    new.branch_id := public.derive_audit_log_branch_id(
      new.target_type, new.target_id, new.details
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_logs_set_branch on public.audit_logs;
create trigger trg_audit_logs_set_branch
  before insert on public.audit_logs
  for each row execute function public.audit_logs_set_branch_id();

-- 4. Backfill existing rows -----------------------------------------
update public.audit_logs
set branch_id = public.derive_audit_log_branch_id(target_type, target_id, details)
where branch_id is null;

comment on column public.audit_logs.branch_id is
  'Branch this audit event belongs to. NULL = brand-level / applies to all branches.';
