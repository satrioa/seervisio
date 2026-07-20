-- ============================================================
-- 131_license_payment_renewal_pref.sql
--
-- Adds renewal_preference to license_payments so the choice made at
-- checkout (spec §2.1) is persisted and copied onto the issued license.
-- ============================================================

alter table public.license_payments
  add column if not exists renewal_preference text
    check (renewal_preference is null or renewal_preference in ('auto', 'manual'));
