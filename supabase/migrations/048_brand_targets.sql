create table if not exists public.brand_targets (
  id uuid primary key default gen_random_uuid(),
  brand_id integer not null references public.brands(id) on delete cascade,
  branch_id uuid,
  target_type text not null default 'brand',
  period text not null default 'monthly',
  monthly_amount bigint not null default 0,
  yearly_amount bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_brand_targets_brand_period
  on public.brand_targets(brand_id, period) where branch_id is null;

create unique index if not exists idx_brand_targets_branch_period
  on public.brand_targets(brand_id, branch_id, period) where branch_id is not null;

create index if not exists idx_brand_targets_brand
  on public.brand_targets(brand_id);

alter table public.brand_targets enable row level security;

create policy brand_targets_select on public.brand_targets
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

create policy brand_targets_insert on public.brand_targets
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

create policy brand_targets_update on public.brand_targets
  for update using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

create policy brand_targets_delete on public.brand_targets
  for delete using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
