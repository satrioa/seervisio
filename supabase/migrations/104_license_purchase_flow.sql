-- Migration 104: License Purchase Flow
-- Creates license_orders table for purchase tracking and licenses table for entitlements

/* ─── 1. License Orders table ─── */

create table if not exists public.license_orders (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  brand_id integer not null references public.brands(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  price bigint not null,
  unique_code integer not null default floor(random() * 900 + 100)::int,
  total_amount bigint not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'waiting_verification', 'paid', 'rejected', 'expired', 'cancelled')),
  payment_deadline timestamptz not null default now() + interval '24 hours',
  payment_method text not null default 'manual_transfer',
  bank_name text,
  account_number text,
  account_holder text,
  proof_url text,
  notes text,
  brand_info jsonb,
  pic_name text,
  pic_phone text,
  company_address text,
  npwp text,
  invoice_email text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ─── 2. Licenses table (entitlements) ─── */

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  brand_id integer not null references public.brands(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  order_id uuid references public.license_orders(id) on delete set null,
  status text not null default 'pending'
    check (status in ('trial', 'active', 'expired', 'cancelled', 'pending')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  is_trial boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ─── 3. Indexes ─── */

create index if not exists idx_license_orders_brand_id on public.license_orders(brand_id);
create index if not exists idx_license_orders_status on public.license_orders(status);
create index if not exists idx_license_orders_invoice on public.license_orders(invoice_number);
create index if not exists idx_licenses_brand_id on public.licenses(brand_id);
create index if not exists idx_licenses_status on public.licenses(status);
create unique index if not exists idx_licenses_active_brand on public.licenses(brand_id) where status = 'active';

/* ─── 4. RLS for license_orders ─── */

alter table public.license_orders enable row level security;
alter table public.licenses enable row level security;

-- license_orders: brand members can see their own orders, platform owners see all
drop policy if exists license_orders_select on public.license_orders;
create policy license_orders_select on public.license_orders
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists license_orders_insert on public.license_orders;
create policy license_orders_insert on public.license_orders
  for insert with check (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists license_orders_update on public.license_orders;
create policy license_orders_update on public.license_orders
  for update using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

-- licenses: brand members can see their own license, platform owners see all
drop policy if exists licenses_select on public.licenses;
create policy licenses_select on public.licenses
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists licenses_insert on public.licenses;
create policy licenses_insert on public.licenses
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists licenses_update on public.licenses;
create policy licenses_update on public.licenses
  for update using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
  );

/* ─── 5. Triggers for updated_at ─── */

drop trigger if exists trg_license_orders_updated_at on public.license_orders;
create trigger trg_license_orders_updated_at before update on public.license_orders
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_licenses_updated_at on public.licenses;
create trigger trg_licenses_updated_at before update on public.licenses
  for each row execute function public.update_updated_at_column();

/* ─── 6. Helper: generate invoice number ─── */

create or replace function public.generate_license_invoice_number()
returns text
language plpgsql
security definer
as $$
declare
  prefix text := 'INV-';
  date_part text := to_char(now(), 'YYYYMMDD');
  seq_num int;
  invoice text;
begin
  seq_num := nextval('public.payment_number_seq'::regclass);
  invoice := prefix || date_part || '-' || lpad(seq_num::text, 3, '0');
  return invoice;
end;
$$;

/* ─── 7. Helper: get active license for brand ─── */

create or replace function public.get_active_license(brand_id integer)
returns table (
  id uuid,
  package_id uuid,
  status text,
  started_at timestamptz,
  expires_at timestamptz,
  is_trial boolean,
  package_name text,
  package_slug text
)
language sql
stable
security definer
as $$
  select
    l.id,
    l.package_id,
    l.status,
    l.started_at,
    l.expires_at,
    l.is_trial,
    p.name as package_name,
    p.slug as package_slug
  from public.licenses l
  join public.packages p on p.id = l.package_id
  where l.brand_id = get_active_license.brand_id
    and l.status in ('active', 'trial')
  order by l.created_at desc
  limit 1;
$$;
