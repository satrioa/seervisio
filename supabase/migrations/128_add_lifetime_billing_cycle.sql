-- ============================================================
-- 128_add_lifetime_billing_cycle.sql
--
-- Adds "lifetime" as a valid billing_cycle value.
-- Previously only "monthly" and "yearly" were allowed.
-- ============================================================

-- 1. Update checkout_sessions.billing_cycle CHECK constraint
alter table if exists public.checkout_sessions
  drop constraint if exists checkout_sessions_billing_cycle_check;

alter table if exists public.checkout_sessions
  add constraint checkout_sessions_billing_cycle_check
  check (billing_cycle in ('monthly', 'yearly', 'lifetime'));

-- 2. Update license_payments.billing_cycle CHECK constraint
alter table if exists public.license_payments
  drop constraint if exists license_payments_billing_cycle_check;

alter table if exists public.license_payments
  add constraint license_payments_billing_cycle_check
  check (billing_cycle in ('monthly', 'yearly', 'lifetime'));

-- 3. Migrate existing "yearly" rows to "lifetime"
-- The previous convention used "yearly" to mean lifetime.
-- Going forward, "yearly" = 12-month subscription, "lifetime" = no expiry.
update public.license_payments
  set billing_cycle = 'lifetime'
  where billing_cycle = 'yearly';

update public.checkout_sessions
  set billing_cycle = 'lifetime'
  where billing_cycle = 'yearly';
