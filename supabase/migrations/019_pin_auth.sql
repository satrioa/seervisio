-- Migration: 019_pin_auth
-- Add PIN-based staff authentication columns to profiles

alter table public.profiles
  add column if not exists pin_hash text,
  add column if not exists pin_enabled boolean not null default false,
  add column if not exists last_pin_changed_at timestamptz,
  add column if not exists pin_failed_attempts integer not null default 0,
  add column if not exists pin_locked_until timestamptz;

-- Index for PIN login lookups
create index if not exists idx_profiles_pin_enabled on public.profiles(pin_enabled) where pin_enabled = true;
