-- ============================================================
-- Migration 027: Inventory V3 Foundation
--
-- Creates a clean, parallel inventory system.
-- Does NOT drop or alter legacy inventory tables.
-- Does NOT touch POS, Service, Dashboard, or Reports.
-- ============================================================

-- ============================================================
-- 1. inventory_product_categories
-- Category master for Inventory V3 products.
-- ============================================================
create table if not exists public.inventory_product_categories (
  id            uuid primary key default gen_random_uuid(),
  brand_id      integer not null references public.brands(id) on delete cascade,
  name          text not null,
  product_type  text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint chk_ipc_product_type
    check (product_type in ('SPAREPART', 'PRODUCT', 'UNIT'))
);

create index if not exists idx_ipc_brand_id
  on public.inventory_product_categories(brand_id);
create index if not exists idx_ipc_product_type
  on public.inventory_product_categories(product_type);
create index if not exists idx_ipc_is_active
  on public.inventory_product_categories(brand_id, is_active);
create unique index if not exists uq_ipc_brand_type_name
  on public.inventory_product_categories(brand_id, product_type, lower(name));

create trigger trg_inventory_product_categories_updated_at
  before update on public.inventory_product_categories
  for each row execute function public.update_updated_at_column();

comment on table public.inventory_product_categories is
  'Inventory V3: Product categories separated by product_type (SPAREPART/PRODUCT/UNIT)';

-- ============================================================
-- 2. inventory_products
-- Parent product/model (e.g. "iPhone 17e", "LCD iPhone 11").
-- ============================================================
create table if not exists public.inventory_products (
  id              uuid primary key default gen_random_uuid(),
  brand_id        integer not null references public.brands(id) on delete cascade,
  category_id     uuid references public.inventory_product_categories(id) on delete set null,
  name            text not null,
  product_type    text not null,
  brand_name      text,
  description     text,
  images          jsonb not null default '[]'::jsonb,
  specifications  jsonb not null default '{}'::jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_ip_product_type
    check (product_type in ('SPAREPART', 'PRODUCT', 'UNIT'))
);

create index if not exists idx_ip_brand_id
  on public.inventory_products(brand_id);
create index if not exists idx_ip_category_id
  on public.inventory_products(category_id);
create index if not exists idx_ip_product_type
  on public.inventory_products(product_type);
create index if not exists idx_ip_is_active
  on public.inventory_products(brand_id, is_active);

create trigger trg_inventory_products_updated_at
  before update on public.inventory_products
  for each row execute function public.update_updated_at_column();

comment on table public.inventory_products is
  'Inventory V3: Parent product/model records';

-- ============================================================
-- 3. inventory_variant_groups
-- Dynamic variant group names (Color, Capacity, RAM, Storage, etc.).
-- ============================================================
create table if not exists public.inventory_variant_groups (
  id          uuid primary key default gen_random_uuid(),
  brand_id    integer not null references public.brands(id) on delete cascade,
  product_id  uuid not null references public.inventory_products(id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ivg_brand_id
  on public.inventory_variant_groups(brand_id);
create index if not exists idx_ivg_product_id
  on public.inventory_variant_groups(product_id);
create index if not exists idx_ivg_position
  on public.inventory_variant_groups(product_id, position);
create unique index if not exists uq_ivg_product_name
  on public.inventory_variant_groups(product_id, lower(name));

comment on table public.inventory_variant_groups is
  'Inventory V3: Dynamic variant group names per product';

-- ============================================================
-- 4. inventory_variant_options
-- Options inside each variant group (e.g. "Blue", "128 GB").
-- ============================================================
create table if not exists public.inventory_variant_options (
  id              uuid primary key default gen_random_uuid(),
  brand_id        integer not null references public.brands(id) on delete cascade,
  variant_group_id uuid not null references public.inventory_variant_groups(id) on delete cascade,
  value           text not null,
  image_url       text,
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_ivo_brand_id
  on public.inventory_variant_options(brand_id);
create index if not exists idx_ivo_variant_group_id
  on public.inventory_variant_options(variant_group_id);
create index if not exists idx_ivo_position
  on public.inventory_variant_options(variant_group_id, position);
create unique index if not exists uq_ivo_group_value
  on public.inventory_variant_options(variant_group_id, lower(value));

comment on table public.inventory_variant_options is
  'Inventory V3: Variant option values within a group';

-- ============================================================
-- 5. inventory_variants
-- Final sellable SKU/variant combination with price and tracking.
-- ============================================================
create table if not exists public.inventory_variants (
  id              uuid primary key default gen_random_uuid(),
  brand_id        integer not null references public.brands(id) on delete cascade,
  product_id      uuid not null references public.inventory_products(id) on delete cascade,
  sku             text,
  variant_name    text,
  attributes      jsonb not null default '{}'::jsonb,
  condition_type  text not null default 'NONE',
  tracking_type   text not null default 'QUANTITY',
  cost_price      numeric not null default 0,
  selling_price   numeric not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_iv_condition_type
    check (condition_type in ('NONE', 'NEW', 'SECOND')),
  constraint chk_iv_tracking_type
    check (tracking_type in ('QUANTITY', 'SERIALIZED', 'NON_STOCK')),
  constraint chk_iv_cost_price
    check (cost_price >= 0),
  constraint chk_iv_selling_price
    check (selling_price >= 0)
);

create index if not exists idx_iv_brand_id
  on public.inventory_variants(brand_id);
create index if not exists idx_iv_product_id
  on public.inventory_variants(product_id);
create index if not exists idx_iv_condition_type
  on public.inventory_variants(condition_type);
create index if not exists idx_iv_tracking_type
  on public.inventory_variants(tracking_type);
create index if not exists idx_iv_is_active
  on public.inventory_variants(brand_id, is_active);
create index if not exists idx_iv_sku
  on public.inventory_variants(sku)
  where sku is not null;

create trigger trg_inventory_variants_updated_at
  before update on public.inventory_variants
  for each row execute function public.update_updated_at_column();

comment on table public.inventory_variants is
  'Inventory V3: Final sellable SKU/variant combination';

-- ============================================================
-- 6. inventory_stock_balances
-- Current stock balance per branch per variant.
-- qty_available = qty_on_hand - qty_reserved (via trigger).
-- ============================================================
create table if not exists public.inventory_stock_balances (
  id            uuid primary key default gen_random_uuid(),
  brand_id      integer not null references public.brands(id) on delete cascade,
  branch_id     uuid not null references public.branches(id) on delete cascade,
  variant_id    uuid not null references public.inventory_variants(id) on delete cascade,
  qty_on_hand   integer not null default 0,
  qty_reserved  integer not null default 0,
  qty_available integer not null default 0,
  updated_at    timestamptz not null default now(),
  constraint uq_isb_branch_variant
    unique (brand_id, branch_id, variant_id),
  constraint chk_isb_qty_on_hand
    check (qty_on_hand >= 0),
  constraint chk_isb_qty_reserved
    check (qty_reserved >= 0),
  constraint chk_isb_qty_available
    check (qty_available >= 0)
);

create index if not exists idx_isb_brand_id
  on public.inventory_stock_balances(brand_id);
create index if not exists idx_isb_branch_id
  on public.inventory_stock_balances(branch_id);
create index if not exists idx_isb_variant_id
  on public.inventory_stock_balances(variant_id);

-- Trigger: maintain qty_available = qty_on_hand - qty_reserved
create or replace function public.maintain_stock_balance_available()
returns trigger
language plpgsql
as $func$
begin
  new.qty_available = new.qty_on_hand - new.qty_reserved;
  return new;
end;
$func$;

create trigger trg_isb_maintain_available
  before insert or update on public.inventory_stock_balances
  for each row execute function public.maintain_stock_balance_available();

create trigger trg_inventory_stock_balances_updated_at
  before update on public.inventory_stock_balances
  for each row execute function public.update_updated_at_column();

comment on table public.inventory_stock_balances is
  'Inventory V3: Current stock balance per branch per variant';

-- ============================================================
-- 7. inventory_stock_movements
-- Append-only stock ledger.
-- ============================================================
create table if not exists public.inventory_stock_movements (
  id              uuid primary key default gen_random_uuid(),
  brand_id        integer not null references public.brands(id) on delete cascade,
  branch_id       uuid not null references public.branches(id) on delete cascade,
  variant_id      uuid not null references public.inventory_variants(id) on delete restrict,
  movement_type   text not null,
  direction       text not null,
  qty             integer not null,
  unit_cost       numeric not null default 0,
  reference_type  text,
  reference_id    uuid,
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint chk_ism_movement_type
    check (movement_type in (
      'OPENING_STOCK', 'STOCK_IMPORT', 'PURCHASE',
      'POS_SALE', 'SERVICE_USAGE',
      'ADJUSTMENT_IN', 'ADJUSTMENT_OUT',
      'TRANSFER_IN', 'TRANSFER_OUT',
      'RETURN', 'VOID_REVERSAL'
    )),
  constraint chk_ism_direction
    check (direction in ('IN', 'OUT')),
  constraint chk_ism_qty
    check (qty > 0),
  constraint chk_ism_unit_cost
    check (unit_cost >= 0)
);

create index if not exists idx_ism_brand_id
  on public.inventory_stock_movements(brand_id);
create index if not exists idx_ism_branch_id
  on public.inventory_stock_movements(branch_id);
create index if not exists idx_ism_variant_id
  on public.inventory_stock_movements(variant_id);
create index if not exists idx_ism_movement_type
  on public.inventory_stock_movements(movement_type);
create index if not exists idx_ism_reference
  on public.inventory_stock_movements(reference_type, reference_id)
  where reference_type is not null and reference_id is not null;
create index if not exists idx_ism_created_at
  on public.inventory_stock_movements(brand_id, created_at desc);

comment on table public.inventory_stock_movements is
  'Inventory V3: Append-only stock movement ledger';

-- ============================================================
-- 8. inventory_serialized_units_v3
-- Physical serialized unit records (IMEI/serial-based).
-- Named _v3 to avoid conflict with legacy inventory_serialized_units.
-- ============================================================
create table if not exists public.inventory_serialized_units_v3 (
  id              uuid primary key default gen_random_uuid(),
  brand_id        integer not null references public.brands(id) on delete cascade,
  branch_id       uuid not null references public.branches(id) on delete cascade,
  product_id      uuid not null references public.inventory_products(id) on delete cascade,
  variant_id      uuid references public.inventory_variants(id) on delete set null,
  imei            text,
  serial_number   text,
  external_code   text,
  attributes      jsonb not null default '{}'::jsonb,
  battery_health  integer,
  condition_grade text,
  warranty_until  date,
  warranty_label  text,
  cost_price      numeric not null default 0,
  selling_price   numeric not null default 0,
  status          text not null default 'AVAILABLE',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_isuv3_status
    check (status in ('AVAILABLE', 'RESERVED', 'SOLD', 'IN_SERVICE', 'RETURNED', 'LOST')),
  constraint chk_isuv3_battery_health
    check (battery_health is null or (battery_health >= 0 and battery_health <= 100)),
  constraint chk_isuv3_cost_price
    check (cost_price >= 0),
  constraint chk_isuv3_selling_price
    check (selling_price >= 0)
);

create index if not exists idx_isuv3_brand_id
  on public.inventory_serialized_units_v3(brand_id);
create index if not exists idx_isuv3_branch_id
  on public.inventory_serialized_units_v3(branch_id);
create index if not exists idx_isuv3_product_id
  on public.inventory_serialized_units_v3(product_id);
create index if not exists idx_isuv3_variant_id
  on public.inventory_serialized_units_v3(variant_id);
create index if not exists idx_isuv3_status
  on public.inventory_serialized_units_v3(status);
create index if not exists idx_isuv3_imei
  on public.inventory_serialized_units_v3(imei)
  where imei is not null;
create index if not exists idx_isuv3_serial_number
  on public.inventory_serialized_units_v3(serial_number)
  where serial_number is not null;
create index if not exists idx_isuv3_external_code
  on public.inventory_serialized_units_v3(external_code)
  where external_code is not null;

create trigger trg_inventory_serialized_units_v3_updated_at
  before update on public.inventory_serialized_units_v3
  for each row execute function public.update_updated_at_column();

comment on table public.inventory_serialized_units_v3 is
  'Inventory V3: Physical serialized unit records (IMEI/serial-based)';

-- ============================================================
-- 9. inventory_import_batches
-- Raw WhatsApp note import batch.
-- ============================================================
create table if not exists public.inventory_import_batches (
  id            uuid primary key default gen_random_uuid(),
  brand_id      integer not null references public.brands(id) on delete cascade,
  branch_id     uuid not null references public.branches(id) on delete cascade,
  title         text not null,
  source_type   text not null default 'WHATSAPP_NOTE',
  raw_text      text not null,
  import_date   date not null,
  status        text not null default 'DRAFT',
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  committed_at  timestamptz,
  constraint chk_iib_source_type
    check (source_type in ('WHATSAPP_NOTE', 'MANUAL', 'CSV')),
  constraint chk_iib_status
    check (status in ('DRAFT', 'PARSED', 'COMMITTED', 'FAILED', 'CANCELLED'))
);

create index if not exists idx_iib_brand_id
  on public.inventory_import_batches(brand_id);
create index if not exists idx_iib_branch_id
  on public.inventory_import_batches(branch_id);
create index if not exists idx_iib_import_date
  on public.inventory_import_batches(import_date);
create index if not exists idx_iib_status
  on public.inventory_import_batches(status);
create index if not exists idx_iib_created_at
  on public.inventory_import_batches(created_at desc);

comment on table public.inventory_import_batches is
  'Inventory V3: Raw WhatsApp note import batch';

-- ============================================================
-- 10. inventory_import_rows
-- Parsed staging rows from WhatsApp note import.
-- ============================================================
create table if not exists public.inventory_import_rows (
  id                        uuid primary key default gen_random_uuid(),
  batch_id                  uuid not null references public.inventory_import_batches(id) on delete cascade,
  brand_id                  integer not null references public.brands(id) on delete cascade,
  branch_id                 uuid not null references public.branches(id) on delete cascade,
  raw_line                  text not null,
  section_name              text,
  detected_product_type     text,
  detected_condition_type   text,
  parsed_brand_name         text,
  parsed_product_name       text,
  parsed_variant_attributes jsonb not null default '{}'::jsonb,
  qty                       integer not null default 1,
  imei                      text,
  serial_number             text,
  external_code             text,
  battery_health            integer,
  warranty_label            text,
  condition_grade           text,
  notes                     text,
  parse_confidence          numeric not null default 0,
  status                    text not null default 'NEEDS_REVIEW',
  error_message             text,
  created_at                timestamptz not null default now(),
  constraint chk_iir_status
    check (status in ('READY', 'NEEDS_REVIEW', 'SKIPPED', 'COMMITTED', 'ERROR')),
  constraint chk_iir_qty
    check (qty > 0),
  constraint chk_iir_battery_health
    check (battery_health is null or (battery_health >= 0 and battery_health <= 100)),
  constraint chk_iir_confidence
    check (parse_confidence >= 0 and parse_confidence <= 1)
);

create index if not exists idx_iir_batch_id
  on public.inventory_import_rows(batch_id);
create index if not exists idx_iir_brand_id
  on public.inventory_import_rows(brand_id);
create index if not exists idx_iir_branch_id
  on public.inventory_import_rows(branch_id);
create index if not exists idx_iir_status
  on public.inventory_import_rows(status);
create index if not exists idx_iir_section_name
  on public.inventory_import_rows(section_name)
  where section_name is not null;

comment on table public.inventory_import_rows is
  'Inventory V3: Parsed staging rows from import';

-- ============================================================
-- RLS Policies
-- Follow existing project pattern using user_brand_memberships.
-- ============================================================

-- inventory_product_categories
alter table public.inventory_product_categories enable row level security;

drop policy if exists ipc_select on public.inventory_product_categories;
create policy ipc_select on public.inventory_product_categories
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists ipc_insert on public.inventory_product_categories;
create policy ipc_insert on public.inventory_product_categories
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_product_categories.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists ipc_update on public.inventory_product_categories;
create policy ipc_update on public.inventory_product_categories
  for update
  using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_product_categories.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists ipc_delete on public.inventory_product_categories;
create policy ipc_delete on public.inventory_product_categories
  for delete
  using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_product_categories.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inventory_products
alter table public.inventory_products enable row level security;

drop policy if exists ip_select on public.inventory_products;
create policy ip_select on public.inventory_products
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists ip_insert on public.inventory_products;
create policy ip_insert on public.inventory_products
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_products.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists ip_update on public.inventory_products;
create policy ip_update on public.inventory_products
  for update
  using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_products.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists ip_delete on public.inventory_products;
create policy ip_delete on public.inventory_products
  for delete
  using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_products.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inventory_variant_groups
alter table public.inventory_variant_groups enable row level security;

drop policy if exists ivg_select on public.inventory_variant_groups;
create policy ivg_select on public.inventory_variant_groups
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists ivg_insert on public.inventory_variant_groups;
create policy ivg_insert on public.inventory_variant_groups
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_variant_groups.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists ivg_update on public.inventory_variant_groups;
create policy ivg_update on public.inventory_variant_groups
  for update
  using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_variant_groups.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists ivg_delete on public.inventory_variant_groups;
create policy ivg_delete on public.inventory_variant_groups
  for delete
  using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_variant_groups.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inventory_variant_options
alter table public.inventory_variant_options enable row level security;

drop policy if exists ivo_select on public.inventory_variant_options;
create policy ivo_select on public.inventory_variant_options
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists ivo_insert on public.inventory_variant_options;
create policy ivo_insert on public.inventory_variant_options
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_variant_options.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists ivo_update on public.inventory_variant_options;
create policy ivo_update on public.inventory_variant_options
  for update
  using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_variant_options.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists ivo_delete on public.inventory_variant_options;
create policy ivo_delete on public.inventory_variant_options
  for delete
  using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_variant_options.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inventory_variants
alter table public.inventory_variants enable row level security;

drop policy if exists iv_select on public.inventory_variants;
create policy iv_select on public.inventory_variants
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists iv_insert on public.inventory_variants;
create policy iv_insert on public.inventory_variants
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_variants.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists iv_update on public.inventory_variants;
create policy iv_update on public.inventory_variants
  for update
  using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_variants.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists iv_delete on public.inventory_variants;
create policy iv_delete on public.inventory_variants
  for delete
  using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_variants.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inventory_stock_balances
alter table public.inventory_stock_balances enable row level security;

drop policy if exists isb_select on public.inventory_stock_balances;
create policy isb_select on public.inventory_stock_balances
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists isb_insert on public.inventory_stock_balances;
create policy isb_insert on public.inventory_stock_balances
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_stock_balances.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists isb_update on public.inventory_stock_balances;
create policy isb_update on public.inventory_stock_balances
  for update
  using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_stock_balances.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists isb_delete on public.inventory_stock_balances;
create policy isb_delete on public.inventory_stock_balances
  for delete
  using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_stock_balances.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inventory_stock_movements (append-only — SELECT + INSERT only)
alter table public.inventory_stock_movements enable row level security;

drop policy if exists ism_select on public.inventory_stock_movements;
create policy ism_select on public.inventory_stock_movements
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists ism_insert on public.inventory_stock_movements;
create policy ism_insert on public.inventory_stock_movements
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_stock_movements.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inventory_serialized_units_v3
alter table public.inventory_serialized_units_v3 enable row level security;

drop policy if exists isuv3_select on public.inventory_serialized_units_v3;
create policy isuv3_select on public.inventory_serialized_units_v3
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists isuv3_insert on public.inventory_serialized_units_v3;
create policy isuv3_insert on public.inventory_serialized_units_v3
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_serialized_units_v3.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists isuv3_update on public.inventory_serialized_units_v3;
create policy isuv3_update on public.inventory_serialized_units_v3
  for update
  using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_serialized_units_v3.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists isuv3_delete on public.inventory_serialized_units_v3;
create policy isuv3_delete on public.inventory_serialized_units_v3
  for delete
  using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_serialized_units_v3.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inventory_import_batches
alter table public.inventory_import_batches enable row level security;

drop policy if exists iib_select on public.inventory_import_batches;
create policy iib_select on public.inventory_import_batches
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists iib_insert on public.inventory_import_batches;
create policy iib_insert on public.inventory_import_batches
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_import_batches.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists iib_update on public.inventory_import_batches;
create policy iib_update on public.inventory_import_batches
  for update
  using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_import_batches.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists iib_delete on public.inventory_import_batches;
create policy iib_delete on public.inventory_import_batches
  for delete
  using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_import_batches.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- inventory_import_rows
alter table public.inventory_import_rows enable row level security;

drop policy if exists iir_select on public.inventory_import_rows;
create policy iir_select on public.inventory_import_rows
  for select
  using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists iir_insert on public.inventory_import_rows;
create policy iir_insert on public.inventory_import_rows
  for insert
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_import_rows.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists iir_update on public.inventory_import_rows;
create policy iir_update on public.inventory_import_rows
  for update
  using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_import_rows.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

drop policy if exists iir_delete on public.inventory_import_rows;
create policy iir_delete on public.inventory_import_rows
  for delete
  using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = inventory_import_rows.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- ============================================================
-- Schema cache reload note:
-- After migration is applied, run:
--   notify pgrst, 'reload schema';
-- ============================================================
