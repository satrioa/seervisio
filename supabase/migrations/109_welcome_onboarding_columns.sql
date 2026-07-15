-- ============================================================
-- 109_welcome_onboarding_columns.sql
--
-- Adds the onboarding progress columns to `profiles` so the Welcome
-- Wizard (Phase 4) can track + gate the customer journey. The brand is
-- created only AFTER the license is ACTIVE, and onboarding completion is
-- what unlocks the operational dashboard (see canEnterOperational()).
--
--   onboarding_completed    - true once the wizard is finished
--   onboarding_current_step - 0-based index of the active wizard step
-- ============================================================

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles
  add column if not exists onboarding_current_step integer not null default 0;

comment on column public.profiles.onboarding_completed is
  'True once the customer completes the Welcome Wizard. Gates dashboard access.';
comment on column public.profiles.onboarding_current_step is
  '0-based index of the active Welcome Wizard step for resumable onboarding.';
