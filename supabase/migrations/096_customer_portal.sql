-- Customer Portal & WhatsApp Sharing
-- Adds tracking_token to services, brand_faqs, testimonials tables

-- ============================================================
-- 1. Tracking Token untuk layanan
-- ============================================================

-- Generate random URL-safe tracking token (12 chars, no ambiguous chars)
create or replace function generate_tracking_token()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..12 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Add tracking_token column
alter table public.services
add column tracking_token text;

-- Generate tokens for existing records
update public.services
set tracking_token = generate_tracking_token()
where tracking_token is null;

-- Make it NOT NULL and UNIQUE
alter table public.services
alter column tracking_token set not null;

alter table public.services
add constraint services_tracking_token_unique unique (tracking_token);

create unique index idx_services_tracking_token on public.services (tracking_token);

-- Auto-generate token on insert
create or replace function public.set_service_tracking_token()
returns trigger
language plpgsql
as $$
declare
  token text;
  done bool;
begin
  if new.tracking_token is not null then
    return new;
  end if;

  done := false;
  while not done loop
    token := generate_tracking_token();
    perform 1 from public.services where tracking_token = token;
    if not found then
      new.tracking_token := token;
      done := true;
    end if;
  end loop;

  return new;
end;
$$;

create trigger trg_set_service_tracking_token
  before insert on public.services
  for each row
  execute function public.set_service_tracking_token();

-- ============================================================
-- 2. Brand FAQ
-- ============================================================

create table if not exists public.brand_faqs (
  id uuid not null default gen_random_uuid(),
  brand_id int not null references public.brands(id),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brand_faqs
add constraint brand_faqs_pkey primary key (id);

create index idx_brand_faqs_brand_id on public.brand_faqs (brand_id);

alter table public.brand_faqs enable row level security;

create policy "Brand FAQ public read"
  on public.brand_faqs for select
  using (true);

-- ============================================================
-- 3. Testimonials
-- ============================================================

create table if not exists public.testimonials (
  id uuid not null default gen_random_uuid(),
  brand_id int not null references public.brands(id),
  service_id uuid not null references public.services(id),
  customer_name text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.testimonials
add constraint testimonials_pkey primary key (id);

create index idx_testimonials_brand_id on public.testimonials (brand_id);
create index idx_testimonials_service_id on public.testimonials (service_id);

alter table public.testimonials enable row level security;

create policy "Testimonials public read approved"
  on public.testimonials for select
  using (is_approved = true);

create policy "Testimonials insert"
  on public.testimonials for insert
  with check (true);
