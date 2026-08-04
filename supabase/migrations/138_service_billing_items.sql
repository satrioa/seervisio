-- Create service_billing_items table for multi-line billing editor
-- Allows services to have multiple line items (SERVICE_FEE, ADDITIONAL)
-- final_cost on services table becomes a computed/synced value from sum of items

create table if not exists service_billing_items (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references services(id) on delete cascade,
  brand_id      integer not null references brands(id),
  type          text not null check (type in ('SERVICE_FEE', 'ADDITIONAL')),
  description   text not null default '',
  amount        numeric(14,2) not null default 0 check (amount >= 0),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_service_billing_items_service
  on service_billing_items(service_id);

-- Backfill: for existing services with final_cost > 0, create a single SERVICE_FEE item
insert into service_billing_items (service_id, brand_id, type, description, amount, sort_order)
select
  s.id,
  s.brand_id,
  'SERVICE_FEE'::text,
  'Biaya Jasa',
  coalesce(nullif(s.final_cost, 0), nullif(s.estimated_cost, 0), 0),
  0
from services s
where s.deleted_at is null
  and coalesce(nullif(s.final_cost, 0), nullif(s.estimated_cost, 0), 0) > 0
  and not exists (
    select 1 from service_billing_items bi where bi.service_id = s.id
  );
