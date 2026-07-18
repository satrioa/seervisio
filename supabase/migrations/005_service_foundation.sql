-- ============================================================
-- SEERVIS V2 -- Service Foundation
-- Migration 005: Customers, Services, Status Flow, Sparepart Usage
-- ============================================================
-- Core service/repair module. Supports customer management,
-- service intake, status workflow, technician assignment,
-- sparepart usage with inventory integration, and audit-ready
-- service lifecycle tracking.
-- ============================================================

-- 1. ENUMS
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'service_status') then
    create type public.service_status as enum (
      'INTAKE', 'DIAGNOSIS', 'WAITING_APPROVAL',
      'REPAIRING', 'QC', 'DONE', 'CANCELLED'
    );
  end if;
end $$;

-- 2. TABLES
-- ============================================================

-- 2a. customers
-- Customer master data per brand. Reused by service and POS.
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  brand_id    integer not null references public.brands(id) on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  address     text,
  notes       text,
  metadata    jsonb not null default '{}',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2b. service_number_counters
-- Atomic counter per brand per day for sequential service number generation.
-- Locked via FOR UPDATE in generate_service_number() to prevent duplicates.
create table if not exists public.service_number_counters (
  brand_id      integer not null references public.brands(id) on delete cascade,
  counter_date  date not null default current_date,
  last_number   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (brand_id, counter_date)
);

-- 2c. services
-- Main repair/service transaction. Branch-scoped.
create table if not exists public.services (
  id                      uuid primary key default gen_random_uuid(),
  brand_id                integer not null references public.brands(id) on delete cascade,
  branch_id               uuid not null references public.branches(id) on delete cascade,
  customer_id             uuid references public.customers(id) on delete set null,
  service_number          text not null,
  device_type             text,
  device_brand            text,
  device_model            text,
  device_color            text,
  device_imei             text,
  device_serial_number    text,
  reported_issue          text not null,
  diagnosis_result        text,
  solution_notes          text,
  current_status          text not null default 'INTAKE'
                          check (current_status in ('INTAKE','DIAGNOSIS','WAITING_APPROVAL','REPAIRING','QC','DONE','CANCELLED')),
  previous_status         text
                          check (previous_status is null or previous_status in ('INTAKE','DIAGNOSIS','WAITING_APPROVAL','REPAIRING','QC','DONE','CANCELLED')),
  assigned_technician_id  uuid references public.profiles(id) on delete set null,
  estimated_cost          numeric(14,2) not null default 0 check (estimated_cost >= 0),
  final_cost              numeric(14,2) not null default 0 check (final_cost >= 0),
  warranty_until          date,
  intake_at               timestamptz not null default now(),
  diagnosis_at            timestamptz,
  waiting_approval_at     timestamptz,
  repairing_at            timestamptz,
  qc_at                   timestamptz,
  done_at                 timestamptz,
  cancelled_at            timestamptz,
  cancel_reason           text,
  metadata                jsonb not null default '{}',
  created_by              uuid references public.profiles(id) on delete set null,
  updated_by              uuid references public.profiles(id) on delete set null,
  deleted_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint uq_services_service_number unique (brand_id, service_number)
);

-- 2d. service_status_history
-- Append-only status timeline for every service.
create table if not exists public.service_status_history (
  id          uuid primary key default gen_random_uuid(),
  brand_id    integer not null references public.brands(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  from_status text
              check (from_status is null or from_status in ('INTAKE','DIAGNOSIS','WAITING_APPROVAL','REPAIRING','QC','DONE','CANCELLED')),
  to_status   text not null
              check (to_status in ('INTAKE','DIAGNOSIS','WAITING_APPROVAL','REPAIRING','QC','DONE','CANCELLED')),
  reason      text,
  metadata    jsonb not null default '{}',
  changed_by  uuid references public.profiles(id) on delete set null,
  changed_at  timestamptz not null default now()
);

-- 2e. service_sparepart_usages
-- Sparepart line items consumed during service repair.
-- Links to inventory movement for stock deduction.
create table if not exists public.service_sparepart_usages (
  id                              uuid primary key default gen_random_uuid(),
  brand_id                        integer not null references public.brands(id) on delete cascade,
  branch_id                       uuid not null references public.branches(id) on delete cascade,
  service_id                      uuid not null references public.services(id) on delete cascade,
  inventory_item_id               uuid not null references public.inventory_items(id) on delete cascade,
  quantity                        numeric(14,2) not null check (quantity > 0),
  unit_cost                       numeric(14,2),
  selling_price                   numeric(14,2),
  inventory_movement_id           uuid references public.inventory_movements(id) on delete set null,
  returned_inventory_movement_id  uuid references public.inventory_movements(id) on delete set null,
  is_returned                     boolean not null default false,
  notes                           text,
  metadata                        jsonb not null default '{}',
  created_by                      uuid references public.profiles(id) on delete set null,
  created_at                      timestamptz not null default now()
);

-- 2f. service_photos
-- Photo metadata for service evidence.
create table if not exists public.service_photos (
  id            uuid primary key default gen_random_uuid(),
  brand_id      integer not null references public.brands(id) on delete cascade,
  branch_id     uuid not null references public.branches(id) on delete cascade,
  service_id    uuid not null references public.services(id) on delete cascade,
  photo_type    text,
  storage_path  text not null,
  public_url    text,
  caption       text,
  metadata      jsonb not null default '{}',
  uploaded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- 2g. service_notes
-- Timeline notes and comments for service.
create table if not exists public.service_notes (
  id          uuid primary key default gen_random_uuid(),
  brand_id    integer not null references public.brands(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  note_type   text not null default 'GENERAL'
              check (note_type in ('GENERAL','TECHNICIAN','CUSTOMER','INTERNAL','SYSTEM')),
  content     text not null,
  metadata    jsonb not null default '{}',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 3. INDEXES
-- ============================================================

-- customers
create index if not exists idx_customers_brand_id on public.customers(brand_id);
create index if not exists idx_customers_name on public.customers(brand_id, name);
create unique index if not exists uq_customers_phone on public.customers(brand_id, phone)
  where phone is not null and deleted_at is null;
create unique index if not exists uq_customers_email on public.customers(brand_id, email)
  where email is not null and deleted_at is null;

-- services
create index if not exists idx_services_brand_id on public.services(brand_id);
create index if not exists idx_services_branch_id on public.services(branch_id);
create index if not exists idx_services_customer_id on public.services(customer_id);
create index if not exists idx_services_current_status on public.services(brand_id, branch_id, current_status);
create index if not exists idx_services_technician on public.services(assigned_technician_id);
create index if not exists idx_services_created_at on public.services(brand_id, created_at desc);
create index if not exists idx_services_device_search on public.services(device_brand, device_model)
  where deleted_at is null;

-- service_status_history
create index if not exists idx_ssh_service_id on public.service_status_history(service_id);
create index if not exists idx_ssh_brand_id on public.service_status_history(brand_id);
create index if not exists idx_ssh_branch_id on public.service_status_history(branch_id);
create index if not exists idx_ssh_changed_at on public.service_status_history(service_id, changed_at desc);

-- service_sparepart_usages
create index if not exists idx_ssu_service_id on public.service_sparepart_usages(service_id);
create index if not exists idx_ssu_inventory_item on public.service_sparepart_usages(inventory_item_id);
create index if not exists idx_ssu_inventory_movement on public.service_sparepart_usages(inventory_movement_id);
create index if not exists idx_ssu_returned_movement on public.service_sparepart_usages(returned_inventory_movement_id);

-- service_photos
create index if not exists idx_sphotos_service_id on public.service_photos(service_id);

-- service_notes
create index if not exists idx_snotes_service_id on public.service_notes(service_id);
create index if not exists idx_snotes_type on public.service_notes(service_id, note_type);

-- ============================================================
-- 4. DB FUNCTIONS
-- ============================================================

-- 4a. generate_service_number()
-- Generates a sequential service number per brand per day.
-- Format: SRV-YYYYMMDD-XXXX (e.g., SRV-20260608-0001)
-- Uses service_number_counters table with FOR UPDATE lock
-- to prevent duplicate numbers under concurrent inserts.
create or replace function public.generate_service_number(
  p_brand_id integer
) returns text
language plpgsql
as $func$
declare
  v_date date := current_date;
  v_number integer;
  v_result text;
begin
  -- Lock and increment the daily counter
  insert into public.service_number_counters (brand_id, counter_date, last_number)
  values (p_brand_id, v_date, 0)
  on conflict (brand_id, counter_date) do nothing;

  select last_number into v_number
  from public.service_number_counters
  where brand_id = p_brand_id and counter_date = v_date
  for update;

  v_number := coalesce(v_number, 0) + 1;

  update public.service_number_counters
  set last_number = v_number,
      updated_at = now()
  where brand_id = p_brand_id and counter_date = v_date;

  v_result := 'SRV-' || to_char(v_date, 'YYYYMMDD') || '-' || lpad(v_number::text, 4, '0');
  return v_result;
end;
$func$;

-- 4b. validate_service_status_transition()
-- Returns true if transition is allowed, false otherwise.
-- Pure validation — no side effects.
create or replace function public.validate_service_status_transition(
  p_from_status text,
  p_to_status text
) returns boolean
language plpgsql
stable
as $func$
begin
  -- Terminal states: no transitions out
  if p_from_status in ('DONE', 'CANCELLED') then
    return false;
  end if;

  -- Same status is a no-op (allowed, but caller should handle)
  if p_from_status = p_to_status then
    return true;
  end if;

  return case
    when p_from_status = 'INTAKE' then
      p_to_status in ('DIAGNOSIS', 'CANCELLED')
    when p_from_status = 'DIAGNOSIS' then
      p_to_status in ('WAITING_APPROVAL', 'REPAIRING', 'CANCELLED')
    when p_from_status = 'WAITING_APPROVAL' then
      p_to_status in ('REPAIRING', 'CANCELLED')
    when p_from_status = 'REPAIRING' then
      p_to_status in ('QC', 'CANCELLED')
    when p_from_status = 'QC' then
      p_to_status in ('DONE', 'REPAIRING', 'CANCELLED')
    else
      false
  end;
end;
$func$;

-- 4c. transition_service_status()
-- Controlled status transition for a service.
-- Locks the service row, validates transition, updates status,
-- sets timestamp columns, and records history.
create or replace function public.transition_service_status(
  p_service_id uuid,
  p_to_status text,
  p_reason text default null,
  p_metadata jsonb default '{}',
  p_changed_by uuid default null
) returns jsonb
language plpgsql
as $func$
declare
  v_service public.services%rowtype;
  v_transition_allowed boolean;
  v_from_status text;
begin
  -- Lock service row
  select * into v_service
  from public.services
  where id = p_service_id
  for update;

  if not found then
    raise exception 'Service % not found', p_service_id using errcode = 'P0002';
  end if;

  v_from_status := v_service.current_status;

  -- Validate transition
  v_transition_allowed := public.validate_service_status_transition(v_from_status, p_to_status);
  if not v_transition_allowed then
    raise exception 'Invalid status transition: % -> % for service %',
      v_from_status, p_to_status, p_service_id using errcode = 'P0004';
  end if;

  -- Update service status
  update public.services
  set current_status = p_to_status,
      previous_status = v_from_status,
      -- Set timestamp based on target status
      intake_at = case when p_to_status = 'INTAKE' and intake_at is null then now() else intake_at end,
      diagnosis_at = case when p_to_status = 'DIAGNOSIS' then coalesce(diagnosis_at, now()) else diagnosis_at end,
      waiting_approval_at = case when p_to_status = 'WAITING_APPROVAL' then coalesce(waiting_approval_at, now()) else waiting_approval_at end,
      repairing_at = case when p_to_status = 'REPAIRING' then coalesce(repairing_at, now()) else repairing_at end,
      qc_at = case when p_to_status = 'QC' then coalesce(qc_at, now()) else qc_at end,
      done_at = case when p_to_status = 'DONE' then coalesce(done_at, now()) else done_at end,
      cancelled_at = case when p_to_status = 'CANCELLED' then coalesce(cancelled_at, now()) else cancelled_at end,
      cancel_reason = case when p_to_status = 'CANCELLED' then coalesce(p_reason, cancel_reason) else cancel_reason end,
      updated_by = p_changed_by,
      updated_at = now()
  where id = p_service_id;

  -- Insert status history
  insert into public.service_status_history (
    brand_id, branch_id, service_id,
    from_status, to_status,
    reason, metadata,
    changed_by, changed_at
  ) values (
    v_service.brand_id, v_service.branch_id, p_service_id,
    v_from_status, p_to_status,
    p_reason, p_metadata,
    p_changed_by, now()
  );

  return jsonb_build_object(
    'service_id', p_service_id,
    'from_status', v_from_status,
    'to_status', p_to_status
  );
end;
$func$;

-- 4d. add_service_sparepart_usage()
-- Records sparepart usage and deducts inventory stock atomically.
-- Generates idempotency_key using the usage record ID.
-- All in one transaction.
create or replace function public.add_service_sparepart_usage(
  p_service_id uuid,
  p_inventory_item_id uuid,
  p_quantity numeric,
  p_unit_cost numeric default null,
  p_selling_price numeric default null,
  p_notes text default null,
  p_created_by uuid default null,
  p_idempotency_key text default null
) returns uuid
language plpgsql
as $func$
declare
  v_service public.services%rowtype;
  v_item_brand_id integer;
  v_usage_id uuid;
  v_movement_id uuid;
  v_final_key text;
begin
  -- Lock and validate service
  select * into v_service
  from public.services
  where id = p_service_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Service % not found or deleted', p_service_id using errcode = 'P0002';
  end if;

  -- Service must be in REPAIRING or QC (or DIAGNOSIS for pre-selection)
  if v_service.current_status not in ('DIAGNOSIS', 'REPAIRING', 'QC') then
    raise exception 'Cannot add sparepart usage: service % is in % status. Allowed: DIAGNOSIS, REPAIRING, QC.',
      p_service_id, v_service.current_status using errcode = 'P0004';
  end if;

  -- Validate item belongs to same brand
  select brand_id into v_item_brand_id
  from public.inventory_items
  where id = p_inventory_item_id and deleted_at is null;

  if not found then
    raise exception 'Inventory item % not found or deleted', p_inventory_item_id using errcode = 'P0002';
  end if;

  if v_item_brand_id != v_service.brand_id then
    raise exception 'Inventory item brand % does not match service brand %',
      v_item_brand_id, v_service.brand_id using errcode = 'P0002';
  end if;

  -- Insert usage record first (need id for idempotency_key)
  insert into public.service_sparepart_usages (
    brand_id, branch_id, service_id,
    inventory_item_id, quantity,
    unit_cost, selling_price,
    notes, metadata,
    created_by, created_at
  ) values (
    v_service.brand_id, v_service.branch_id, p_service_id,
    p_inventory_item_id, p_quantity,
    p_unit_cost, p_selling_price,
    p_notes, '{}',
    p_created_by, now()
  )
  returning id into v_usage_id;

  -- Generate idempotency key
  v_final_key := coalesce(
    p_idempotency_key,
    'service:' || p_service_id || ':item:' || p_inventory_item_id || ':usage:' || v_usage_id
  );

  -- Deduct inventory stock
  v_movement_id := public.add_inventory_movement(
    p_brand_id := v_service.brand_id,
    p_branch_id := v_service.branch_id,
    p_item_id := p_inventory_item_id,
    p_direction := 'OUT',
    p_movement_type := 'SERVICE_USAGE',
    p_quantity := p_quantity,
    p_unit_cost := p_unit_cost,
    p_reference_type := 'service',
    p_reference_id := p_service_id,
    p_idempotency_key := v_final_key,
    p_description := p_notes,
    p_metadata := jsonb_build_object('usage_id', v_usage_id, 'service_id', p_service_id),
    p_created_by := p_created_by
  );

  -- Link movement to usage
  update public.service_sparepart_usages
  set inventory_movement_id = v_movement_id,
      metadata = metadata || jsonb_build_object('idempotency_key', v_final_key)
  where id = v_usage_id;

  return v_usage_id;
end;
$func$;

-- 4e. return_service_sparepart_usage()
-- Returns a previously used sparepart back to inventory stock.
-- Used when service is cancelled or usage is reversed.
-- Marks usage as returned and creates SERVICE_RETURN inventory movement.
create or replace function public.return_service_sparepart_usage(
  p_usage_id uuid,
  p_reason text default null,
  p_returned_by uuid default null
) returns uuid
language plpgsql
as $func$
declare
  v_usage public.service_sparepart_usages%rowtype;
  v_service public.services%rowtype;
  v_movement_id uuid;
  v_idempotency_key text;
begin
  -- Lock usage row
  select * into v_usage
  from public.service_sparepart_usages
  where id = p_usage_id
  for update;

  if not found then
    raise exception 'Usage % not found', p_usage_id using errcode = 'P0002';
  end if;

  -- Check if already returned
  if v_usage.is_returned then
    raise exception 'Usage % has already been returned (movement: %)',
      p_usage_id, v_usage.returned_inventory_movement_id using errcode = 'P0004';
  end if;

  -- Verify original movement exists (safety check)
  if v_usage.inventory_movement_id is null then
    raise exception 'Usage % has no inventory movement — nothing to return',
      p_usage_id using errcode = 'P0002';
  end if;

  -- Get service for brand/branch context
  select * into v_service
  from public.services
  where id = v_usage.service_id;

  -- Generate return idempotency key
  v_idempotency_key := 'service:' || v_usage.service_id || ':item:' || v_usage.inventory_item_id
                       || ':return:' || p_usage_id;

  -- Return stock to inventory
  v_movement_id := public.add_inventory_movement(
    p_brand_id := v_usage.brand_id,
    p_branch_id := v_usage.branch_id,
    p_item_id := v_usage.inventory_item_id,
    p_direction := 'IN',
    p_movement_type := 'SERVICE_RETURN',
    p_quantity := v_usage.quantity,
    p_unit_cost := v_usage.unit_cost,
    p_reference_type := 'service',
    p_reference_id := v_usage.service_id,
    p_idempotency_key := v_idempotency_key,
    p_description := coalesce(p_reason, 'Return sparepart usage ' || p_usage_id),
    p_metadata := jsonb_build_object('usage_id', p_usage_id, 'service_id', v_usage.service_id),
    p_created_by := p_returned_by
  );

  -- Mark usage as returned
  update public.service_sparepart_usages
  set is_returned = true,
      returned_inventory_movement_id = v_movement_id,
      metadata = metadata || jsonb_build_object(
        'return_idempotency_key', v_idempotency_key,
        'return_reason', p_reason,
        'returned_at', now()
      )
  where id = p_usage_id;

  return p_usage_id;
end;
$func$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.update_updated_at_column();
create trigger trg_services_updated_at before update on public.services
  for each row execute function public.update_updated_at_column();
create trigger trg_snc_updated_at before update on public.service_number_counters
  for each row execute function public.update_updated_at_column();
-- service_status_history: no updated_at (append-only)
-- service_sparepart_usages: no updated_at (immutable after creation)
-- service_photos: no updated_at
-- service_notes: no updated_at

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- customers: brand-scoped, self-service later
alter table public.customers enable row level security;
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- service_number_counters: managed by generate_service_number() function
alter table public.service_number_counters enable row level security;
drop policy if exists snc_select on public.service_number_counters;
create policy snc_select on public.service_number_counters
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- TODO: INSERT/UPDATE handled by function. Restrict in later migration.

-- services: brand-scoped with branch awareness
alter table public.services enable row level security;
drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- TODO: Add INSERT/UPDATE/DELETE policies with role + branch checks

-- service_status_history: append-only, brand-scoped
alter table public.service_status_history enable row level security;
drop policy if exists ssh_select on public.service_status_history;
create policy ssh_select on public.service_status_history
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
drop policy if exists ssh_insert on public.service_status_history;
create policy ssh_insert on public.service_status_history
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- NOTE: No UPDATE or DELETE policies (append-only)

-- service_sparepart_usages: brand-scoped, managed by functions
alter table public.service_sparepart_usages enable row level security;
drop policy if exists ssu_select on public.service_sparepart_usages;
create policy ssu_select on public.service_sparepart_usages
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
drop policy if exists ssu_insert on public.service_sparepart_usages;
create policy ssu_insert on public.service_sparepart_usages
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
drop policy if exists ssu_update on public.service_sparepart_usages;
create policy ssu_update on public.service_sparepart_usages
  for update using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- NOTE: No DELETE policy. Usages can only be returned (update is_returned), not deleted.

-- service_photos: brand-scoped
alter table public.service_photos enable row level security;
drop policy if exists sphotos_select on public.service_photos;
create policy sphotos_select on public.service_photos
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- TODO: Add INSERT/DELETE policies

-- service_notes: brand-scoped
alter table public.service_notes enable row level security;
drop policy if exists snotes_select on public.service_notes;
create policy snotes_select on public.service_notes
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- TODO: Add INSERT/DELETE policies


-- ============================================================
-- 7. VALIDATION QUERIES (reference only, not executed)
-- ============================================================

-- 7a. Find services without any status history entry
--
-- SELECT s.id, s.service_number, s.current_status, s.created_at
-- FROM public.services s
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.service_status_history ssh
--   WHERE ssh.service_id = s.id
-- )
-- ORDER BY s.created_at;

-- 7b. Find sparepart usages without linked inventory movement
--
-- SELECT ssu.id, ssu.service_id, ssu.inventory_item_id, ssu.quantity, ssu.created_at
-- FROM public.service_sparepart_usages ssu
-- WHERE ssu.inventory_movement_id IS NULL
-- ORDER BY ssu.created_at;

-- 7c. Find returned usages without a return movement reference
--
-- SELECT ssu.id, ssu.service_id, ssu.inventory_item_id, ssu.quantity
-- FROM public.service_sparepart_usages ssu
-- WHERE ssu.is_returned = true
--   AND ssu.returned_inventory_movement_id IS NULL
-- ORDER BY ssu.created_at;

-- 7d. Find invalid status transitions (should never return rows)
-- This checks if any service has a status history chain with invalid jumps.
-- Manual inspection: look for transitions that violate the state machine.
--
-- SELECT ssh1.service_id,
--        ssh1.from_status,
--        ssh1.to_status,
--        ssh1.changed_at
-- FROM public.service_status_history ssh1
-- WHERE ssh1.from_status IS NOT NULL
--   AND NOT public.validate_service_status_transition(ssh1.from_status, ssh1.to_status)
-- ORDER BY ssh1.service_id, ssh1.changed_at;

-- 7e. Find service branch mismatches
-- Checks if any service has a branch_id that doesn''t match its brand_id.
-- (The brand_id on the service should be the same as brand_id on the branch.)
--
-- SELECT s.id, s.service_number, s.brand_id AS service_brand,
--        b.brand_id AS branch_brand, b.name AS branch_name
-- FROM public.services s
-- JOIN public.branches b ON b.id = s.branch_id
-- WHERE s.brand_id != b.brand_id;

-- 7f. Find sparepart usages where item brand doesn''t match service brand
--
-- SELECT ssu.id, ssu.service_id, ssu.inventory_item_id,
--        s.brand_id AS service_brand,
--        ii.brand_id AS item_brand
-- FROM public.service_sparepart_usages ssu
-- JOIN public.services s ON s.id = ssu.service_id
-- JOIN public.inventory_items ii ON ii.id = ssu.inventory_item_id
-- WHERE s.brand_id != ii.brand_id;

-- 7g. Count sparepart usage by service (for billing reference)
--
-- SELECT ssu.service_id, s.service_number,
--        COUNT(ssu.id) AS parts_used,
--        SUM(ssu.quantity) AS total_quantity,
--        SUM(COALESCE(ssu.selling_price, 0) * ssu.quantity) AS total_parts_cost
-- FROM public.service_sparepart_usages ssu
-- JOIN public.services s ON s.id = ssu.service_id
-- WHERE ssu.is_returned = false
-- GROUP BY ssu.service_id, s.service_number
-- ORDER BY s.service_number;

-- ============================================================
-- End of Migration 005
-- ============================================================
