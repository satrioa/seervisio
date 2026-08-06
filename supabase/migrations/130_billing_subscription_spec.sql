-- ============================================================
-- 130_billing_subscription_spec.sql
--
-- Implements the Billing & Subscription UX Spec (revised).
-- Confirmed product-owner decisions:
--   Q1: No manual trial extend (extended_by/extension_reason omitted)
--   Q2: Downgrade auto-applies; excess branches -> locked, user chooses
--   Q3: Suspend is manual admin action only, with suspended_reason
--   Q4: Pending order auto-cancels after 24h if proof never uploaded
--
-- Scope: schema foundation only (Phase 1).
--   1. packages.package_type + is_default_trial
--   2. licenses: renewal_preference, suspended_reason, downgrade fields
--   3. licenses status set expansion
--   4. branches.access_status (active/locked)
--   5. helper RPCs: expire_pending_orders, apply_scheduled_downgrades
--      + get_active_license update
-- ============================================================

/* ─── 1. packages: package_type + default-trial selection ─── */

alter table public.packages
  add column if not exists package_type text not null default 'subscription'
    check (package_type in ('subscription', 'lifetime', 'trial')),
  add column if not exists is_default_trial boolean not null default false;

-- Backfill package_type from existing billing_duration configuration lives
-- in migration 135 (after billing_duration_enabled column is added there).

-- Enforce at most one active default-trial package at a time.
create unique index if not exists uq_packages_single_default_trial
  on public.packages (is_default_trial)
  where is_default_trial = true;

-- Trial packages must be free.
alter table public.packages
  drop constraint if exists chk_packages_trial_price;
alter table public.packages
  add constraint chk_packages_trial_price
  check (package_type <> 'trial' or price = 0);

/* ─── 2. licenses: renewal preference, suspend reason, downgrade ─── */

alter table public.licenses
  add column if not exists renewal_preference text
    check (renewal_preference is null or renewal_preference in ('auto', 'manual')),
  add column if not exists suspended_reason text,
  add column if not exists suspended_by uuid references public.profiles(id),
  add column if not exists suspended_at timestamptz,
  add column if not exists downgrade_to_package_id uuid references public.packages(id),
  add column if not exists downgrade_effective_at timestamptz;

/* ─── 3. licenses status set expansion ─── */
-- Existing: trial, active, expired, cancelled, pending
-- Added:    waiting_approval, payment_rejected, suspended

alter table public.licenses
  drop constraint if exists licenses_status_check;

alter table public.licenses
  add constraint licenses_status_check
  check (status in (
    'trial',
    'active',
    'expired',
    'cancelled',
    'pending',
    'waiting_approval',
    'payment_rejected',
    'suspended'
  ));

/* ─── 4. branches: access_status for downgrade excess-branch locking ─── */
-- Q2: on downgrade apply, branches beyond the new package limit are
-- locked (not deleted). is_active stays as the owner's own toggle;
-- access_status is the billing-enforced lock.

alter table public.branches
  add column if not exists access_status text not null default 'active'
    check (access_status in ('active', 'locked'));

create index if not exists idx_branches_access_status
  on public.branches (brand_id, access_status);

/* ─── 5a. RPC: expire pending orders (24h timeout, Q4) ─── */
-- Auto-cancel orders that were created but never had proof uploaded
-- within payment_deadline. Orders already at waiting_verification
-- (proof uploaded) are NOT touched — that is the admin's responsibility.

create or replace function public.expire_pending_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  with expired_orders as (
    update public.license_orders
    set status = 'expired',
        updated_at = now()
    where status = 'pending_payment'
      and proof_url is null
      and payment_deadline < now()
    returning id
  )
  update public.licenses l
  set status = 'cancelled',
      updated_at = now()
  from expired_orders eo
  where l.order_id = eo.id
    and l.status in ('pending', 'waiting_approval');

  get diagnostics affected = row_count;
  return affected;
end;
$$;

/* ─── 5b. RPC: apply scheduled downgrades (Q2) ─── */
-- Runs at/after downgrade_effective_at. Switches the license to the
-- scheduled package. Excess active branches beyond the new package's
-- max_branches are locked (oldest kept active, newest locked) so the
-- user can choose which to keep / upgrade again.

create or replace function public.apply_scheduled_downgrades()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  new_limit integer;
  affected integer := 0;
begin
  for rec in
    select l.id as license_id,
           l.brand_id,
           l.downgrade_to_package_id
    from public.licenses l
    where l.downgrade_to_package_id is not null
      and l.downgrade_effective_at is not null
      and l.downgrade_effective_at <= now()
      and l.status = 'active'
  loop
    select max_branches into new_limit
    from public.packages
    where id = rec.downgrade_to_package_id;

    -- Apply the package switch and clear the schedule.
    update public.licenses
    set package_id = rec.downgrade_to_package_id,
        downgrade_to_package_id = null,
        downgrade_effective_at = null,
        updated_at = now()
    where id = rec.license_id;

    -- Lock branches beyond the new limit (keep oldest active).
    if new_limit is not null then
      update public.branches b
      set access_status = 'locked',
          updated_at = now()
      where b.id in (
        select id
        from public.branches
        where brand_id = rec.brand_id
          and deleted_at is null
          and access_status = 'active'
        order by created_at asc
        offset new_limit
      );
    end if;

    affected := affected + 1;
  end loop;

  return affected;
end;
$$;

/* ─── 5c. Update get_active_license to expose new fields ─── */

drop function if exists public.get_active_license(integer);

create or replace function public.get_active_license(brand_id integer)
returns table (
  id uuid,
  package_id uuid,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  is_trial boolean,
  renewal_preference text,
  downgrade_to_package_id uuid,
  downgrade_effective_at timestamptz,
  suspended_reason text,
  package_name text,
  package_slug text,
  package_type text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.package_id,
    l.status,
    l.started_at,
    l.expires_at,
    l.is_trial,
    l.renewal_preference,
    l.downgrade_to_package_id,
    l.downgrade_effective_at,
    l.suspended_reason,
    p.name as package_name,
    p.slug as package_slug,
    p.package_type
  from public.licenses l
  join public.packages p on p.id = l.package_id
  where l.brand_id = get_active_license.brand_id
    and l.status in ('active', 'trial', 'suspended')
  order by l.created_at desc
  limit 1;
$$;
