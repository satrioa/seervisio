-- ============================================================
-- 107_customer_journey_checkout_license.sql
--
-- Implements the re-architected customer acquisition flow:
--
--   Landing -> Pricing -> Select Package -> Checkout Session
--   -> Login/Register -> Email Verification -> Return to Checkout
--   -> Upload Transfer Proof -> Waiting Verification
--   -> License Active -> Welcome Wizard (creates brand) -> Dashboard
--
-- Key design decision (per product spec + reconciliation choice):
--   * checkout_sessions  = PRE-BRAND cart that survives login + email verification
--   * license_payments    = canonical purchase record (pre- or post-brand via profile_id/brand_id)
--   * payment_proofs       = individual uploaded proofs for a payment
--   * license_history      = audit trail of license status changes
--   * licenses            = REFACTORED: now anchored to a PROFILE (brand_id nullable)
--                              because the brand is created LATER, in the Welcome Wizard,
--                              only AFTER the license is ACTIVE.
--   * license_orders      = DEPRECATED but kept for back-compat; linked via session_id.
--
-- Existing brands/tenants keep working: their (brand-scoped) license rows
-- simply have brand_id populated, so isDashboardAllowed() continues to pass.
-- ============================================================

-- 1. Checkout sessions (pre-brand cart) --------------------------
create table if not exists public.checkout_sessions (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique,
  profile_id      uuid references public.profiles(id) on delete cascade,
  package_id      uuid not null references public.packages(id),
  package_slug    text not null,
  package_name    text not null,
  price           bigint not null,
  billing_cycle   text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  currency        text not null default 'IDR',
  coupon_code     text,
  discount_amount bigint not null default 0,
  total_amount    bigint not null,
  status          text not null default 'active'
                    check (status in ('active','expired','converted','abandoned')),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_checkout_token on public.checkout_sessions(token);
create index if not exists idx_checkout_profile on public.checkout_sessions(profile_id);
-- one active session per profile at a time
create unique index if not exists idx_checkout_active_profile
  on public.checkout_sessions(profile_id)
  where status = 'active' and profile_id is not null;

-- 2. License payments (canonical purchase) -----------------------
create table if not exists public.license_payments (
  id                uuid primary key default gen_random_uuid(),
  checkout_session_id uuid references public.checkout_sessions(id) on delete set null,
  profile_id        uuid references public.profiles(id) on delete cascade,
  brand_id          integer references public.brands(id) on delete cascade,
  package_id        uuid not null references public.packages(id),
  price             bigint not null,
  billing_cycle     text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  currency          text not null default 'IDR',
  coupon_code       text,
  discount_amount   bigint not null default 0,
  total_amount      bigint not null,
  payment_method    text not null default 'manual_transfer',
  status            text not null default 'pending_payment'
                        check (status in ('pending_payment','waiting_verification','paid','rejected','expired','cancelled')),
  bank_name         text,
  account_number    text,
  account_holder    text,
  pic_name          text,
  pic_phone         text,
  company_address   text,
  npwp              text,
  invoice_email     text,
  invoice_number    text,
  verified_by       uuid references public.profiles(id),
  verified_at       timestamptz,
  rejected_reason   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_license_payments_profile on public.license_payments(profile_id);
create index if not exists idx_license_payments_brand on public.license_payments(brand_id);
create index if not exists idx_license_payments_status on public.license_payments(status);
-- one active (non-terminal) payment per profile/brand
create unique index if not exists idx_license_payments_active_profile
  on public.license_payments(profile_id)
  where status in ('pending_payment','waiting_verification') and profile_id is not null;
create unique index if not exists idx_license_payments_active_brand
  on public.license_payments(brand_id)
  where status in ('pending_payment','waiting_verification') and brand_id is not null;

-- 3. Payment proofs (uploaded transfer receipts) -------------------
create table if not exists public.payment_proofs (
  id                uuid primary key default gen_random_uuid(),
  license_payment_id uuid not null references public.license_payments(id) on delete cascade,
  profile_id        uuid references public.profiles(id) on delete set null,
  proof_url         text not null,
  file_name         text,
  amount_declared   bigint,
  status            text not null default 'submitted'
                        check (status in ('submitted','verified','rejected')),
  submitted_at      timestamptz not null default now(),
  verified_at       timestamptz,
  verified_by       uuid references public.profiles(id),
  rejected_reason   text
);

create index if not exists idx_payment_proofs_payment on public.payment_proofs(license_payment_id);

-- 4. License history (status-change audit) -----------------------
create table if not exists public.license_history (
  id              uuid primary key default gen_random_uuid(),
  license_id      uuid not null references public.licenses(id) on delete cascade,
  from_status     text,
  to_status       text not null,
  actor_id        uuid references public.profiles(id),
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_license_history_license on public.license_history(license_id);

-- 5. Refactor licenses: anchor to PROFILE (brand_id nullable) ----
alter table public.licenses
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

alter table public.licenses
  alter column brand_id drop not null;

-- Replace the brand-only active index with a profile/brand-aware one.
drop index if exists public.idx_licenses_active_brand;
create unique index if not exists idx_licenses_active_profile
  on public.licenses(profile_id)
  where status = 'active' and profile_id is not null;
create unique index if not exists idx_licenses_active_brand
  on public.licenses(brand_id)
  where status = 'active' and brand_id is not null;

-- 6. Deprecate license_orders (keep for back-compat) ------------
alter table public.license_orders
  add column if not exists checkout_session_id uuid references public.checkout_sessions(id) on delete set null;

comment on table public.license_orders is
  'DEPRECATED: superseded by license_payments + payment_proofs. Kept for back-compat with legacy tenants.';

-- 7. updated_at triggers ------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_checkout_sessions_updated before update on public.checkout_sessions
  for each row execute function public.touch_updated_at();
create trigger trg_license_payments_updated before update on public.license_payments
  for each row execute function public.touch_updated_at();

-- 8. RLS --------------------------------------------------------
alter table public.checkout_sessions enable row level security;
alter table public.license_payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.license_history enable row level security;

-- checkout_sessions: owner (profile) or platform owner
drop policy if exists cs_select on public.checkout_sessions;
create policy cs_select on public.checkout_sessions
  for select using (
    profile_id = public.get_user_profile_id()
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );
drop policy if exists cs_insert on public.checkout_sessions;
create policy cs_insert on public.checkout_sessions
  for insert with check (
    profile_id is null
    or profile_id = public.get_user_profile_id()
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );
drop policy if exists cs_update on public.checkout_sessions;
create policy cs_update on public.checkout_sessions
  for update using (
    profile_id = public.get_user_profile_id()
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  ) with check (true);

-- license_payments: owner / brand member / platform owner
drop policy if exists lp_select on public.license_payments;
create policy lp_select on public.license_payments
  for select using (
    profile_id = public.get_user_profile_id()
    or brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );
drop policy if exists lp_insert on public.license_payments;
create policy lp_insert on public.license_payments
  for insert with check (
    profile_id = public.get_user_profile_id()
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );
drop policy if exists lp_update on public.license_payments;
create policy lp_update on public.license_payments
  for update using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  ) with check (true);

-- payment_proofs: owner / brand member / platform owner
drop policy if exists pp_select on public.payment_proofs;
create policy pp_select on public.payment_proofs
  for select using (
    profile_id = public.get_user_profile_id()
    or license_payment_id in (
      select id from public.license_payments
      where brand_id = any(public.get_user_brand_ids())
         or profile_id = public.get_user_profile_id()
    )
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );
drop policy if exists pp_insert on public.payment_proofs;
create policy pp_insert on public.payment_proofs
  for insert with check (
    profile_id = public.get_user_profile_id()
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

-- license_history: visible to platform owner + brand members of the license
drop policy if exists lh_select on public.license_history;
create policy lh_select on public.license_history
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or license_id in (
      select l.id from public.licenses l
      where l.brand_id = any(public.get_user_brand_ids())
         or l.profile_id = public.get_user_profile_id()
    )
  );
