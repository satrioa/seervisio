-- Migration 092: Packages & subscription enforcement
-- Creates packages table and seeds default plans

/* ─── 1. Packages table ─── */

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price bigint not null default 0,
  max_branches integer not null default 1,
  max_users integer not null default 5,
  max_storage_mb integer not null default 100,
  max_transactions integer not null default 1000,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ─── 2. RLS for packages ─── */

alter table public.packages enable row level security;

drop policy if exists packages_select on public.packages;
create policy packages_select on public.packages
  for select using (true);

drop policy if exists packages_insert on public.packages;
create policy packages_insert on public.packages
  for insert with check ('PLATFORM_OWNER' = any(public.get_user_roles()));

drop policy if exists packages_update on public.packages;
create policy packages_update on public.packages
  for update using ('PLATFORM_OWNER' = any(public.get_user_roles()));

drop policy if exists packages_delete on public.packages;
create policy packages_delete on public.packages
  for delete using ('PLATFORM_OWNER' = any(public.get_user_roles()));

/* ─── 3. Trigger for updated_at ─── */

drop trigger if exists trg_packages_updated_at on public.packages;
create trigger trg_packages_updated_at before update on public.packages
  for each row execute function public.update_updated_at_column();

/* ─── 4. Seed default packages ─── */

insert into public.packages (name, slug, description, price, max_branches, max_users, max_storage_mb, max_transactions)
values
  ('Starter', 'starter', 'Paket awal untuk usaha kecil. Cocok untuk brand dengan 1 cabang.', 0, 1, 5, 100, 500),
  ('Pro', 'pro', 'Paket profesional untuk usaha berkembang. Multi-cabang dengan fitur lengkap.', 299000, 5, 20, 1000, 5000),
  ('Enterprise', 'enterprise', 'Paket enterprise untuk skala besar. Tanpa batas cabang dan prioritas support.', 999000, 999, 999, 10000, 99999)
on conflict (slug) do nothing;

/* ─── 5. Add package_id to brand_subscriptions ─── */

alter table if exists public.brand_subscriptions
  add column if not exists package_id uuid references public.packages(id);

alter table if exists public.brand_subscriptions
  add column if not exists max_users integer not null default 5;

/* ─── 6. Link existing subscriptions to correct package ─── */

update public.brand_subscriptions s
set package_id = p.id
from public.packages p
where p.slug = s.plan and s.package_id is null;

/* ─── 7. Update max_users for existing subscriptions based on package ─── */

update public.brand_subscriptions s
set max_users = p.max_users
from public.packages p
where p.id = s.package_id and s.max_users = 5;
