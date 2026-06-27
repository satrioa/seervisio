-- Migration 051: Branch management extensions
-- Adds contact/location columns to branches + brand_subscriptions table

/* ─── 1. Add columns to branches ─── */

alter table if exists public.branches
  add column if not exists city text;

alter table if exists public.branches
  add column if not exists province text;

alter table if exists public.branches
  add column if not exists whatsapp text;

alter table if exists public.branches
  add column if not exists email text;

create index if not exists idx_branches_city on public.branches(brand_id, city);

/* ─── 2. Brand subscriptions (package plan) ─── */

create table if not exists public.brand_subscriptions (
  id uuid primary key default gen_random_uuid(),
  brand_id integer not null unique references public.brands(id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'enterprise')),
  max_branches integer not null default 1,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled', 'trial')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default 'starter' subscription for existing brands
insert into public.brand_subscriptions (brand_id, plan, max_branches)
select id, 'starter', 1
from public.brands
where not exists (select 1 from public.brand_subscriptions bs where bs.brand_id = brands.id);

create index if not exists idx_brand_subscriptions_brand_id on public.brand_subscriptions(brand_id);

/* ─── 3. RLS for brand_subscriptions ─── */

alter table public.brand_subscriptions enable row level security;

drop policy if exists brand_subscriptions_select on public.brand_subscriptions;
create policy brand_subscriptions_select on public.brand_subscriptions
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

drop policy if exists brand_subscriptions_insert on public.brand_subscriptions;
create policy brand_subscriptions_insert on public.brand_subscriptions
  for insert with check ('PLATFORM_OWNER' = any(public.get_user_roles()));

drop policy if exists brand_subscriptions_update on public.brand_subscriptions;
create policy brand_subscriptions_update on public.brand_subscriptions
  for update using ('PLATFORM_OWNER' = any(public.get_user_roles()));

/* ─── 4. Trigger for updated_at ─── */

drop trigger if exists trg_brand_subscriptions_updated_at on public.brand_subscriptions;
create trigger trg_brand_subscriptions_updated_at before update on public.brand_subscriptions
  for each row execute function public.update_updated_at_column();
