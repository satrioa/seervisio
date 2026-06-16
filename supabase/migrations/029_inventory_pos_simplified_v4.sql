-- ============================================================
-- Migration 029: Inventory + POS Simplified V4
--
-- Parallel clean schema — does NOT modify protected legacy
-- tables. Drops abandoned 027 V3 tables if they exist.
-- ============================================================

-- ============================================================
-- 0. SAFELY DROP ABANDONED 027 V3 TABLES
-- These were created by migration 027 but never used.
-- CASCADE drops indexes, triggers, RLS policies owned by
-- these tables. No protected table references these tables.
-- ============================================================

drop table if exists public.inventory_import_rows cascade;
drop table if exists public.inventory_import_batches cascade;
drop table if exists public.inventory_serialized_units_v3 cascade;
drop table if exists public.inventory_stock_movements cascade;
drop table if exists public.inventory_stock_balances cascade;
drop table if exists public.inventory_variants cascade;
drop table if exists public.inventory_variant_options cascade;
drop table if exists public.inventory_variant_groups cascade;
drop table if exists public.inventory_products cascade;
drop table if exists public.inventory_product_categories cascade;

-- ============================================================
-- 0b. POS TRANSACTION NUMBER COUNTERS
-- Counter table for POS transaction number generation.
-- ============================================================

create table if not exists public.pos_transaction_number_counters (
  brand_id    integer not null references public.brands(id) on delete cascade,
  prefix      text not null,
  year        integer not null,
  month       integer not null,
  last_number integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (brand_id, prefix, year, month)
);

-- ============================================================
-- A. inv_products
-- Master product/model for all product kinds.
-- ============================================================

create table if not exists public.inv_products (
  id                     uuid primary key default gen_random_uuid(),
  brand_id               integer not null references public.brands(id) on delete cascade,
  branch_id              uuid not null references public.branches(id) on delete cascade,
  product_kind           text not null,
  condition_type         text,
  category_id            uuid,
  name                   text not null,
  description            text,
  unit                   text not null default 'pcs',
  is_active              boolean not null default true,
  appears_in_pos         boolean not null default false,
  service_usage_enabled  boolean not null default false,
  created_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint chk_invp_product_kind
    check (product_kind in ('SPAREPART', 'PRODUCT', 'UNIT')),
  constraint chk_invp_condition_type
    check (condition_type is null or condition_type in ('NEW', 'SECOND')),
  constraint chk_invp_product_kind_condition
    check (
      (product_kind = 'UNIT' and condition_type is not null)
      or (product_kind in ('SPAREPART', 'PRODUCT') and condition_type is null)
    )
);

comment on table public.inv_products is
  'Master product/model for Unit Baru, Unit Second, Produk, Sparepart';

-- ============================================================
-- B. inv_variants
-- Sellable variant rows. Manual creation only — no cartesian.
-- ============================================================

create table if not exists public.inv_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.inv_products(id) on delete cascade,
  brand_id        integer not null references public.brands(id) on delete cascade,
  branch_id       uuid not null references public.branches(id) on delete cascade,
  name            text not null,
  attributes      jsonb not null default '{}'::jsonb,
  sku             text,
  barcode         text,
  unit            text not null default 'pcs',
  min_stock       numeric not null default 0,
  cost_price      numeric not null default 0,
  average_cost    numeric not null default 0,
  selling_price   numeric not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_invv_cost_price check (cost_price >= 0),
  constraint chk_invv_selling_price check (selling_price >= 0),
  constraint chk_invv_min_stock check (min_stock >= 0)
);

comment on table public.inv_variants is
  'Stockable/sellable variant rows. For non-variant products, create one default variant.';

-- ============================================================
-- C. inv_variant_stocks
-- Branch stock balance for quantity-tracked variants.
-- ============================================================

create table if not exists public.inv_variant_stocks (
  id              uuid primary key default gen_random_uuid(),
  brand_id        integer not null references public.brands(id) on delete cascade,
  branch_id       uuid not null references public.branches(id) on delete cascade,
  variant_id      uuid not null references public.inv_variants(id) on delete cascade,
  current_stock   numeric not null default 0,
  reserved_stock  numeric not null default 0,
  updated_at      timestamptz not null default now(),
  constraint uq_invvs_branch_variant unique (branch_id, variant_id),
  constraint chk_invvs_current_stock check (current_stock >= 0),
  constraint chk_invvs_reserved_stock check (reserved_stock >= 0)
);

comment on table public.inv_variant_stocks is
  'Branch stock balance for quantity-tracked variants (Sparepart, Produk, Unit Baru).';

-- ============================================================
-- D. inv_units
-- Physical serialized unit records (IMEI/serial-based).
-- ============================================================

create table if not exists public.inv_units (
  id                          uuid primary key default gen_random_uuid(),
  brand_id                    integer not null references public.brands(id) on delete cascade,
  branch_id                   uuid not null references public.branches(id) on delete cascade,
  product_id                  uuid not null references public.inv_products(id),
  variant_id                  uuid references public.inv_variants(id),
  unit_attributes             jsonb not null default '{}'::jsonb,
  imei                        text,
  serial_number               text,
  barcode                     text,
  battery_health              integer,
  condition_grade             text,
  physical_condition_notes    text,
  functional_condition_notes  text,
  accessories_included        text,
  warranty_until              date,
  warranty_notes              text,
  purchase_cost               numeric not null default 0,
  selling_price               numeric not null default 0,
  status                      text not null default 'READY_STOCK',
  source_type                 text,
  source_reference_id         uuid,
  created_by                  uuid references public.profiles(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint chk_invu_status
    check (status in ('READY_STOCK', 'RESERVED', 'SOLD', 'IN_SERVICE', 'DEFECTIVE', 'RETURNED', 'ARCHIVED')),
  constraint chk_invu_battery_health
    check (battery_health is null or (battery_health >= 0 and battery_health <= 100)),
  constraint chk_invu_purchase_cost check (purchase_cost >= 0),
  constraint chk_invu_selling_price check (selling_price >= 0)
);

create unique index if not exists uq_invu_imei
  on public.inv_units (brand_id, imei)
  where imei is not null;

create unique index if not exists uq_invu_serial_number
  on public.inv_units (brand_id, serial_number)
  where serial_number is not null;

create unique index if not exists uq_invu_barcode
  on public.inv_units (brand_id, barcode)
  where barcode is not null;

comment on table public.inv_units is
  'Physical serialized unit records for Unit Second (IMEI/serial). Stock count = COUNT WHERE status = READY_STOCK.';

-- ============================================================
-- E. inv_stock_movements
-- Append-only stock ledger.
-- ============================================================

create table if not exists public.inv_stock_movements (
  id                  uuid primary key default gen_random_uuid(),
  brand_id            integer not null references public.brands(id) on delete cascade,
  branch_id           uuid not null references public.branches(id) on delete cascade,
  product_id          uuid references public.inv_products(id),
  variant_id          uuid references public.inv_variants(id),
  unit_id             uuid references public.inv_units(id),
  movement_type       text not null,
  direction           text not null,
  quantity            numeric not null,
  stock_before        numeric,
  stock_after         numeric,
  unit_status_before  text,
  unit_status_after   text,
  reference_type      text,
  reference_id        uuid,
  reference_label     text,
  notes               text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  constraint chk_invsm_direction
    check (direction in ('IN', 'OUT', 'ADJUST')),
  constraint chk_invsm_quantity
    check (quantity > 0)
);

comment on table public.inv_stock_movements is
  'Append-only stock movement ledger. All stock changes create a row.';

-- ============================================================
-- F. inv_sparepart_usage
-- Service sparepart consumption tracking.
-- ============================================================

create table if not exists public.inv_sparepart_usage (
  id                      uuid primary key default gen_random_uuid(),
  brand_id                integer not null references public.brands(id) on delete cascade,
  branch_id               uuid not null references public.branches(id) on delete cascade,
  service_id              uuid not null references public.services(id),
  product_id              uuid not null references public.inv_products(id),
  variant_id              uuid not null references public.inv_variants(id),
  quantity                numeric not null,
  cost_price_snapshot     numeric not null default 0,
  selling_price_snapshot  numeric not null default 0,
  item_name_snapshot      text not null,
  variant_name_snapshot   text,
  attributes_snapshot     jsonb not null default '{}'::jsonb,
  movement_id             uuid references public.inv_stock_movements(id),
  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  constraint chk_invsu_quantity check (quantity > 0)
);

comment on table public.inv_sparepart_usage is
  'Service sparepart usage records. Links service usage to variant stock deduction.';

-- ============================================================
-- G. pos_transactions
-- New POS transaction header (decoupled from legacy pos_sales).
-- ============================================================

create table if not exists public.pos_transactions (
  id                  uuid primary key default gen_random_uuid(),
  brand_id            integer not null references public.brands(id) on delete cascade,
  branch_id           uuid not null references public.branches(id) on delete cascade,
  transaction_number  text not null,
  customer_id         uuid,
  subtotal_amount     numeric not null default 0,
  discount_amount     numeric not null default 0,
  service_fee_amount  numeric not null default 0,
  total_amount        numeric not null default 0,
  paid_amount         numeric not null default 0,
  change_amount       numeric not null default 0,
  payment_method_id   uuid references public.payment_methods(id),
  payment_account_id  uuid references public.payment_accounts(id),
  status              text not null default 'COMPLETED',
  notes               text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint chk_pt_status
    check (status in ('DRAFT', 'COMPLETED', 'VOIDED', 'REFUNDED')),
  constraint chk_pt_amounts
    check (total_amount = subtotal_amount + service_fee_amount - discount_amount),
  constraint uq_pt_transaction_number unique (brand_id, transaction_number)
);

comment on table public.pos_transactions is
  'New POS transaction header. total = subtotal + service_fee - discount.';

-- ============================================================
-- H. pos_transaction_items
-- Items sold in POS transaction.
-- ============================================================

create table if not exists public.pos_transaction_items (
  id                        uuid primary key default gen_random_uuid(),
  transaction_id            uuid not null references public.pos_transactions(id) on delete cascade,
  brand_id                  integer not null references public.brands(id) on delete cascade,
  branch_id                 uuid not null references public.branches(id) on delete cascade,
  product_id                uuid not null references public.inv_products(id),
  variant_id                uuid references public.inv_variants(id),
  unit_id                   uuid references public.inv_units(id),
  item_type                 text not null,
  item_name_snapshot        text not null,
  variant_name_snapshot     text,
  attributes_snapshot       jsonb not null default '{}'::jsonb,
  imei_snapshot             text,
  serial_number_snapshot    text,
  battery_health_snapshot   integer,
  condition_snapshot        text,
  quantity                  numeric not null default 1,
  cost_price_snapshot       numeric not null default 0,
  selling_price_snapshot    numeric not null default 0,
  subtotal_amount           numeric not null default 0,
  movement_id               uuid references public.inv_stock_movements(id),
  created_at                timestamptz not null default now(),
  constraint chk_pti_item_type
    check (item_type in ('PRODUCT_QUANTITY', 'UNIT_NEW_QUANTITY', 'UNIT_SECOND_SERIALIZED')),
  constraint chk_pti_quantity check (quantity > 0)
);

comment on table public.pos_transaction_items is
  'Items sold in POS. PRODUCT_QUANTITY/UNIT_NEW_QUANTITY can have qty > 1. UNIT_SECOND_SERIALIZED must have qty=1 and unit_id not null.';

-- ============================================================
-- I. device_tac_catalog (optional IMEI prefix lookup helper)
-- ============================================================

create table if not exists public.device_tac_catalog (
  tac             text primary key,
  brand           text,
  model           text,
  marketing_name  text,
  device_type     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_device_tac_catalog_updated_at on public.device_tac_catalog;
create trigger trg_device_tac_catalog_updated_at
  before update on public.device_tac_catalog
  for each row execute function public.update_updated_at_column();

comment on table public.device_tac_catalog is
  'Optional IMEI TAC prefix lookup helper for Unit Second. Not source of truth.';

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================

drop trigger if exists trg_inv_products_updated_at on public.inv_products;
create trigger trg_inv_products_updated_at
  before update on public.inv_products
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_inv_variants_updated_at on public.inv_variants;
create trigger trg_inv_variants_updated_at
  before update on public.inv_variants
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_inv_variant_stocks_updated_at on public.inv_variant_stocks;
create trigger trg_inv_variant_stocks_updated_at
  before update on public.inv_variant_stocks
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_inv_units_updated_at on public.inv_units;
create trigger trg_inv_units_updated_at
  before update on public.inv_units
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_pos_transactions_updated_at on public.pos_transactions;
create trigger trg_pos_transactions_updated_at
  before update on public.pos_transactions
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================

-- inv_products
create index if not exists idx_invp_brand_branch_kind
  on public.inv_products (brand_id, branch_id, product_kind);
create index if not exists idx_invp_category
  on public.inv_products (brand_id, category_id)
  where category_id is not null;
create index if not exists idx_invp_is_active
  on public.inv_products (brand_id, is_active);

-- inv_variants
create index if not exists idx_invv_product_id
  on public.inv_variants (product_id);
create index if not exists idx_invv_brand_branch
  on public.inv_variants (brand_id, branch_id);
create index if not exists idx_invv_barcode
  on public.inv_variants (brand_id, barcode)
  where barcode is not null;
create index if not exists idx_invv_sku
  on public.inv_variants (brand_id, sku)
  where sku is not null;
create index if not exists idx_invv_is_active
  on public.inv_variants (brand_id, is_active);

-- inv_variant_stocks
create index if not exists idx_invvs_branch_variant
  on public.inv_variant_stocks (branch_id, variant_id);
create index if not exists idx_invvs_brand_branch
  on public.inv_variant_stocks (brand_id, branch_id);

-- inv_units
create index if not exists idx_invu_brand_branch_status
  on public.inv_units (brand_id, branch_id, status);
create index if not exists idx_invu_imei
  on public.inv_units (brand_id, imei)
  where imei is not null;
create index if not exists idx_invu_serial_number
  on public.inv_units (brand_id, serial_number)
  where serial_number is not null;
create index if not exists idx_invu_barcode
  on public.inv_units (brand_id, barcode)
  where barcode is not null;
create index if not exists idx_invu_product_id
  on public.inv_units (product_id);
create index if not exists idx_invu_variant_id
  on public.inv_units (variant_id)
  where variant_id is not null;

-- inv_stock_movements
create index if not exists idx_invsm_brand_branch_created
  on public.inv_stock_movements (brand_id, branch_id, created_at desc);
create index if not exists idx_invsm_variant_id
  on public.inv_stock_movements (variant_id)
  where variant_id is not null;
create index if not exists idx_invsm_unit_id
  on public.inv_stock_movements (unit_id)
  where unit_id is not null;
create index if not exists idx_invsm_product_id
  on public.inv_stock_movements (product_id)
  where product_id is not null;
create index if not exists idx_invsm_reference
  on public.inv_stock_movements (reference_type, reference_id)
  where reference_type is not null and reference_id is not null;

-- inv_sparepart_usage
create index if not exists idx_invsu_service_id
  on public.inv_sparepart_usage (service_id);
create index if not exists idx_invsu_variant_id
  on public.inv_sparepart_usage (variant_id);

-- pos_transactions
create index if not exists idx_pt_brand_branch_created
  on public.pos_transactions (brand_id, branch_id, created_at desc);
create index if not exists idx_pt_status
  on public.pos_transactions (brand_id, status);
create index if not exists idx_pt_customer
  on public.pos_transactions (customer_id)
  where customer_id is not null;

-- pos_transaction_items
create index if not exists idx_pti_transaction_id
  on public.pos_transaction_items (transaction_id);
create index if not exists idx_pti_variant_id
  on public.pos_transaction_items (variant_id)
  where variant_id is not null;
create index if not exists idx_pti_unit_id
  on public.pos_transaction_items (unit_id)
  where unit_id is not null;

-- pos_transaction_number_counters
create index if not exists idx_ptnc_brand
  on public.pos_transaction_number_counters (brand_id, prefix);

-- ============================================================
-- ROW LEVEL SECURITY
-- Follow existing project convention using user_brand_memberships
-- and helper functions from migration 001.
-- ============================================================

-- Permission helpers reused from 001_core_foundation:
--   get_user_profile_id()  → uuid
--   get_user_brand_ids()   → integer[]
--   get_user_branch_ids()  → uuid[]
--   get_user_roles()       → text[]

-- Drop all V4 policies for idempotent re-runs
do $$
declare
  pol record;
begin
  for pol in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in ('inv_products','inv_variants','inv_variant_stocks','inv_units','inv_stock_movements','inv_sparepart_usage','pos_transactions','pos_transaction_items','pos_transaction_number_counters','device_tac_catalog') loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end;
$$;

-- inv_products
alter table public.inv_products enable row level security;

create policy invp_select on public.inv_products
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy invp_insert on public.inv_products
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_products.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy invp_update on public.inv_products
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_products.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy invp_delete on public.inv_products
  for delete using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_products.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inv_variants
alter table public.inv_variants enable row level security;

create policy invv_select on public.inv_variants
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy invv_insert on public.inv_variants
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_variants.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy invv_update on public.inv_variants
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_variants.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy invv_delete on public.inv_variants
  for delete using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_variants.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inv_variant_stocks
alter table public.inv_variant_stocks enable row level security;

create policy invvs_select on public.inv_variant_stocks
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy invvs_insert on public.inv_variant_stocks
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_variant_stocks.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy invvs_update on public.inv_variant_stocks
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_variant_stocks.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy invvs_delete on public.inv_variant_stocks
  for delete using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_variant_stocks.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inv_units
alter table public.inv_units enable row level security;

create policy invu_select on public.inv_units
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy invu_insert on public.inv_units
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_units.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy invu_update on public.inv_units
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_units.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy invu_delete on public.inv_units
  for delete using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_units.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inv_stock_movements (append-only: SELECT + INSERT only)
alter table public.inv_stock_movements enable row level security;

create policy invsm_select on public.inv_stock_movements
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy invsm_insert on public.inv_stock_movements
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_stock_movements.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inv_sparepart_usage
alter table public.inv_sparepart_usage enable row level security;

create policy invsu_select on public.inv_sparepart_usage
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy invsu_insert on public.inv_sparepart_usage
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_sparepart_usage.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN', 'TECHNICIAN')
        and bm.is_active = true
    )
  );

create policy invsu_update on public.inv_sparepart_usage
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_sparepart_usage.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy invsu_delete on public.inv_sparepart_usage
  for delete using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inv_sparepart_usage.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- pos_transactions
alter table public.pos_transactions enable row level security;

create policy pt_select on public.pos_transactions
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy pt_insert on public.pos_transactions
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = pos_transactions.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.is_active = true
        and (
          bm.role in ('MASTER_ADMIN', 'ADMIN')
          or (
            bm.role = 'FRONTLINER'
            and pos_transactions.branch_id = any(public.get_user_branch_ids())
          )
        )
    )
  );

create policy pt_update on public.pos_transactions
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = pos_transactions.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- pos_transaction_items
alter table public.pos_transaction_items enable row level security;

create policy pti_select on public.pos_transaction_items
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy pti_insert on public.pos_transaction_items
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = pos_transaction_items.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.is_active = true
        and (
          bm.role in ('MASTER_ADMIN', 'ADMIN')
          or (
            bm.role = 'FRONTLINER'
            and pos_transaction_items.branch_id = any(public.get_user_branch_ids())
          )
        )
    )
  );

-- pos_transaction_number_counters
alter table public.pos_transaction_number_counters enable row level security;

create policy tnc_select on public.pos_transaction_number_counters
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy tnc_insert on public.pos_transaction_number_counters
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = pos_transaction_number_counters.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN', 'FRONTLINER')
        and bm.is_active = true
    )
  );

create policy tnc_update on public.pos_transaction_number_counters
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = pos_transaction_number_counters.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN', 'FRONTLINER')
        and bm.is_active = true
    )
  );

-- device_tac_catalog (read-only for app users, insert by ADMIN)
alter table public.device_tac_catalog enable row level security;

create policy dtc_select on public.device_tac_catalog
  for select using (true);

create policy dtc_insert on public.device_tac_catalog
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or exists (
      select 1 from public.user_brand_memberships bm
      where bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy dtc_update on public.device_tac_catalog
  for update using (true)
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or exists (
      select 1 from public.user_brand_memberships bm
      where bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- ============================================================
-- RPC: generate_pos_transaction_number
-- Concurrency-safe POS transaction number generator.
-- ============================================================

create or replace function public.generate_pos_transaction_number(
  p_brand_id integer,
  p_prefix text default 'POS'
) returns text
language plpgsql
as $func$
declare
  v_year     integer := extract(year from current_date);
  v_month    integer := extract(month from current_date);
  v_counter  integer;
begin
  insert into public.pos_transaction_number_counters (brand_id, prefix, year, month, last_number)
  values (p_brand_id, p_prefix, v_year, v_month, 0)
  on conflict (brand_id, prefix, year, month) do nothing;

  update public.pos_transaction_number_counters
  set last_number = last_number + 1,
      updated_at = now()
  where brand_id = p_brand_id
    and prefix = p_prefix
    and year = v_year
    and month = v_month
  returning last_number into v_counter;

  if not found then
    raise exception 'Failed to generate transaction number for brand %', p_brand_id
      using errcode = 'P0002';
  end if;

  return p_prefix || '/' || lpad(v_year::text, 4, '0') || '/' || lpad(v_month::text, 2, '0') || '/' || lpad(v_counter::text, 4, '0');
end;
$func$;

comment on function public.generate_pos_transaction_number is
  'Generates unique POS transaction numbers per brand per month. Format: PREFIX/YYYY/MM/NNNN';

-- ============================================================
-- Schema cache reload note:
-- After migration, run: notify pgrst, 'reload schema';
-- ============================================================
