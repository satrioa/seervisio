-- ============================================================
-- Migration 094: Platform Settings
--
-- Single-row table for platform-wide configuration.
-- Managed exclusively by PLATFORM_OWNER via the Settings page.
-- ============================================================

create table if not exists public.platform_settings (
  id integer primary key default 1,
  maintenance_mode boolean not null default false,
  allow_new_registrations boolean not null default true,
  default_max_branches integer not null default 3,
  default_max_users integer not null default 10,
  default_trial_days integer not null default 14,
  system_name text not null default 'Seervisio',
  system_email text,
  support_email text,
  invoice_prefix text not null default 'INV',
  metadata jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  constraint platform_settings_single_row check (id = 1)
);

comment on table public.platform_settings is 'Single-row platform-wide configuration. Only PLATFORM_OWNER can modify.';

-- Insert default row
insert into public.platform_settings (id)
values (1)
on conflict (id) do nothing;

-- RLS: only service_role can read/write (platform owner uses service_role client)
alter table public.platform_settings enable row level security;

create policy platform_settings_select
  on public.platform_settings for select
  using (true);

create policy platform_settings_insert
  on public.platform_settings for insert
  with check (false);

create policy platform_settings_update
  on public.platform_settings for update
  using (false);
