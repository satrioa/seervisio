-- ============================================================
-- 118_coupons.sql
--
-- Coupon codes for checkout discount system.
-- Coupons are managed via platform settings (admin).
-- The checkout page validates coupons against this table.
-- ============================================================

drop table if exists public.coupons cascade;

create table public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  discount_type   text not null check (discount_type in ('percent', 'fixed')),
  discount_value  bigint not null check (discount_value > 0),
  currency        text not null default 'IDR',
  max_uses        bigint,
  used_count      bigint not null default 0,
  max_uses_per_user bigint,
  min_order_amount  bigint,
  is_active       boolean not null default true,
  starts_at       timestamptz,
  expires_at      timestamptz,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_coupons_code on public.coupons (upper(code));

-- RLS
alter table public.coupons enable row level security;

-- Everyone can read active coupons (for validation).
drop policy if exists coupons_select on public.coupons;
create policy coupons_select on public.coupons
  for select using (
    is_active = true
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

-- Platform owner can manage.
drop policy if exists coupons_all on public.coupons;
create policy coupons_all on public.coupons
  for all using ('PLATFORM_OWNER' = any(public.get_user_roles()));

-- Seed coupons
insert into public.coupons (code, discount_type, discount_value, currency, description, max_uses, used_count, is_active, expires_at) values
  ('WELCOME10',  'percent', 10, 'IDR', 'Diskon 10% untuk pengguna baru',       100, 0, true, '2027-12-31 23:59:59+07'),
  ('HEMAT50',    'fixed',   50000, 'IDR', 'Diskon Rp50.000 untuk pembelian paket Professional+', 50, 0, true, '2027-12-31 23:59:59+07'),
  ('LAUNCH20',   'percent', 20, 'IDR', 'Diskon 20% spesial peluncuran',         200, 0, true, '2026-12-31 23:59:59+07'),
  ('STARTER15',  'percent', 15, 'IDR', 'Diskon 15% untuk paket Starter',        100, 0, true, '2027-06-30 23:59:59+07')
on conflict (code) do nothing;

-- updated_at trigger
create trigger trg_coupons_updated before update on public.coupons
  for each row execute function public.touch_updated_at();

-- Helper to safely increment coupon usage count
create or replace function public.increment_coupon_usage(p_code text)
returns void
language plpgsql
security definer
as $$
begin
  update public.coupons
  set used_count = used_count + 1
  where upper(code) = upper(p_code);
end;
$$;
