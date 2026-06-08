-- SEERVIS V2 - Core Foundation
-- Migration 001: Brands, Branches, Users, Access,
--               Payment Accounts, Payment Methods, Audit Logs

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- 1. ENUMS
do $$ begin if not exists (select 1 from pg_type where typname = 'payment_account_type') then create type public.payment_account_type as enum ('CASH','BANK','QRIS','TRANSFER','DEBIT','OTHER'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'payment_account_movement_type') then create type public.payment_account_movement_type as enum ('OPENING_BALANCE','BALANCE_ADJUSTMENT','SERVICE_PAYMENT','POS_PAYMENT','OTHER_INCOME','OPERATING_EXPENSE','STOCK_PURCHASE','STOCK_PURCHASE_PAYMENT','TRANSFER_IN','TRANSFER_OUT','BANK_FEE','QRIS_SETTLEMENT','SERVICE_REFUND','POS_REFUND'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'payment_account_direction') then create type public.payment_account_direction as enum ('IN','OUT'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'user_role') then create type public.user_role as enum ('PLATFORM_OWNER','MASTER_ADMIN','ADMIN','FRONTLINER','TECHNICIAN'); end if; end $$;
do $$ begin if not exists (select 1 from pg_type where typname = 'payment_method_type') then create type public.payment_method_type as enum ('CASH','QRIS','TRANSFER','DEBIT','CREDIT','EWALLET'); end if; end $$;

-- 2. TABLES
create table if not exists public.brands (id integer generated always as identity primary key, name text not null, slug text not null, status text not null default 'active' check (status in ('active','suspended','trial')), owner_name text, owner_email text, owner_phone text, logo_url text, accent_color text, timezone text not null default 'Asia/Jakarta', currency text not null default 'IDR', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint uq_brands_slug unique (slug));
create table if not exists public.brand_settings (id uuid primary key default gen_random_uuid(), brand_id integer not null unique references public.brands(id) on delete cascade, store_name text not null, tagline text, logo_url text, favicon_url text, accent_color text, phone text, email text, address text, whatsapp_number text, invoice_footer text, receipt_footer text, business_hours jsonb default '{}', metadata jsonb default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.branches (id uuid primary key default gen_random_uuid(), brand_id integer not null references public.brands(id) on delete cascade, name text not null, code text, address text, phone text, is_active boolean not null default true, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.profiles (id uuid primary key default gen_random_uuid(), auth_user_id uuid unique references auth.users(id) on delete cascade, email text not null, name text not null, phone text, avatar_url text, is_active boolean not null default true, last_login_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.user_brand_memberships (id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade, brand_id integer references public.brands(id) on delete cascade, role text not null check (role in ('PLATFORM_OWNER','MASTER_ADMIN','ADMIN','FRONTLINER','TECHNICIAN')), is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint uq_ubm_profile_brand unique (profile_id, brand_id), constraint chk_ubm_platform_owner check ((role = 'PLATFORM_OWNER' and brand_id is null) or (role != 'PLATFORM_OWNER' and brand_id is not null)));
create table if not exists public.user_branch_access (id uuid primary key default gen_random_uuid(), membership_id uuid not null references public.user_brand_memberships(id) on delete cascade, branch_id uuid not null references public.branches(id) on delete cascade, is_active boolean not null default true, created_at timestamptz not null default now(), constraint uq_uba_membership_branch unique (membership_id, branch_id));

-- Payment tables
create table if not exists public.payment_accounts (id uuid primary key default gen_random_uuid(), brand_id integer not null references public.brands(id) on delete cascade, branch_id uuid references public.branches(id) on delete set null, account_name text not null, type text not null check (type in ('CASH','BANK','QRIS','TRANSFER','DEBIT','OTHER')), account_number text, account_holder_name text, bank_name text, bank_code text, is_cash_account boolean not null default false, is_system_account boolean not null default false, is_default_receiving_account boolean not null default false, is_active boolean not null default true, allow_negative_balance boolean not null default false, current_balance numeric not null default 0, description text, metadata jsonb default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint chk_pa_cash_flag check ((type = 'CASH' and is_cash_account = true) or (type != 'CASH' and is_cash_account = false)));

create table if not exists public.payment_account_movements (id uuid primary key default gen_random_uuid(), payment_account_id uuid not null references public.payment_accounts(id) on delete cascade, brand_id integer not null references public.brands(id) on delete cascade, branch_id uuid references public.branches(id) on delete set null, direction text not null check (direction in ('IN','OUT')), amount numeric not null check (amount > 0), before_balance numeric not null, after_balance numeric not null, movement_type text not null check (movement_type in ('OPENING_BALANCE','BALANCE_ADJUSTMENT','SERVICE_PAYMENT','POS_PAYMENT','OTHER_INCOME','OPERATING_EXPENSE','STOCK_PURCHASE','STOCK_PURCHASE_PAYMENT','TRANSFER_IN','TRANSFER_OUT','BANK_FEE','QRIS_SETTLEMENT','SERVICE_REFUND','POS_REFUND')), reference_type text, reference_id text, transfer_group_id uuid, description text, metadata jsonb default '{}', created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), constraint chk_pam_balance_consistency check ((direction = 'IN' and after_balance = before_balance + amount) or (direction = 'OUT' and after_balance = before_balance - amount)));

create table if not exists public.payment_methods (id uuid primary key default gen_random_uuid(), brand_id integer not null references public.brands(id) on delete cascade, type text not null check (type in ('CASH','QRIS','TRANSFER','DEBIT','CREDIT','EWALLET')), name text not null, is_active boolean not null default true, default_payment_account_id uuid references public.payment_accounts(id) on delete set null, mdr_percentage numeric(5,2) not null default 0 check (mdr_percentage >= 0 and mdr_percentage <= 100), metadata jsonb default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint uq_pm_brand_name unique (brand_id, name));

create table if not exists public.branch_payment_methods (id uuid primary key default gen_random_uuid(), brand_id integer not null references public.brands(id) on delete cascade, branch_id uuid not null references public.branches(id) on delete cascade, method_type text not null check (method_type in ('CASH','QRIS','TRANSFER','DEBIT','CREDIT','EWALLET')), payment_account_id uuid references public.payment_accounts(id) on delete set null, mdr_percentage numeric(5,2) check (mdr_percentage is null or (mdr_percentage >= 0 and mdr_percentage <= 100)), is_active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint uq_bpm_brand_branch_method unique (brand_id, branch_id, method_type));

create table if not exists public.audit_logs (id uuid primary key default gen_random_uuid(), brand_id integer references public.brands(id) on delete set null, actor_id uuid references public.profiles(id) on delete set null, actor_name text, actor_role text, action text not null, target_type text, target_id uuid, target_label text, description text, details jsonb default '{}', ip_address text, created_at timestamptz not null default now());

-- 3. INDEXES
create index if not exists idx_brands_slug on public.brands(slug);
create index if not exists idx_brands_status on public.brands(status);
create index if not exists idx_brand_settings_brand_id on public.brand_settings(brand_id);
create index if not exists idx_branches_brand_id on public.branches(brand_id);
create index if not exists idx_branches_active on public.branches(brand_id, is_active) where deleted_at is null;
create index if not exists idx_profiles_auth_user_id on public.profiles(auth_user_id);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_active on public.profiles(is_active);
create index if not exists idx_ubm_profile_id on public.user_brand_memberships(profile_id);
create index if not exists idx_ubm_brand_id on public.user_brand_memberships(brand_id);
create index if not exists idx_ubm_profile_brand_active on public.user_brand_memberships(profile_id, brand_id) where is_active = true;
create index if not exists idx_uba_membership_id on public.user_branch_access(membership_id);
create index if not exists idx_uba_branch_id on public.user_branch_access(branch_id);
create index if not exists idx_uba_active on public.user_branch_access(membership_id, is_active);
create index if not exists idx_pa_brand_id on public.payment_accounts(brand_id);
create index if not exists idx_pa_branch_id on public.payment_accounts(branch_id);
create index if not exists idx_pa_type on public.payment_accounts(type);
create index if not exists idx_pa_active on public.payment_accounts(brand_id, is_active);
create unique index if not exists uq_pa_system_cash on public.payment_accounts(brand_id, branch_id) where is_system_account = true and is_cash_account = true and branch_id is not null;
create unique index if not exists uq_pa_default_receiving_brand on public.payment_accounts(brand_id) where is_default_receiving_account = true and branch_id is null;
create unique index if not exists uq_pa_default_receiving_branch on public.payment_accounts(brand_id, branch_id) where is_default_receiving_account = true and branch_id is not null;
create index if not exists idx_pam_account_id on public.payment_account_movements(payment_account_id);
create index if not exists idx_pam_brand_id on public.payment_account_movements(brand_id);
create index if not exists idx_pam_branch_id on public.payment_account_movements(branch_id);
create index if not exists idx_pam_occurred_at on public.payment_account_movements(payment_account_id, created_at desc);
create index if not exists idx_pam_reference on public.payment_account_movements(reference_type, reference_id);
create index if not exists idx_pam_transfer_group on public.payment_account_movements(transfer_group_id);
create index if not exists idx_pam_movement_type on public.payment_account_movements(movement_type);
create unique index if not exists uq_pam_reference on public.payment_account_movements(payment_account_id, reference_type, reference_id, movement_type) where reference_type is not null and reference_id is not null;
create unique index if not exists uq_pam_opening_balance on public.payment_account_movements(payment_account_id, movement_type) where movement_type = 'OPENING_BALANCE';
create index if not exists idx_pm_brand_type on public.payment_methods(brand_id, type);
create index if not exists idx_pm_active on public.payment_methods(brand_id, is_active);
create index if not exists idx_bpm_brand_branch_method on public.branch_payment_methods(brand_id, branch_id, method_type);
create index if not exists idx_bpm_active on public.branch_payment_methods(branch_id, is_active);
create index if not exists idx_al_brand_created on public.audit_logs(brand_id, created_at desc);
create index if not exists idx_al_actor on public.audit_logs(actor_id);
create index if not exists idx_al_target on public.audit_logs(target_type, target_id);
create index if not exists idx_al_action on public.audit_logs(action);

-- ============================================================
-- 4. DB FUNCTIONS
-- ============================================================

-- 4a. Generic updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;

-- 4b. RLS Helper: get_user_profile_id
create or replace function public.get_user_profile_id()
returns uuid
language sql
stable
as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

-- 4c. RLS Helper: get_user_brand_ids
create or replace function public.get_user_brand_ids()
returns integer[]
language sql
stable
as $$
  select coalesce(array_agg(brand_id), array[]::integer[])
  from public.user_brand_memberships
  where profile_id = public.get_user_profile_id()
    and is_active = true
    and brand_id is not null
$$;

-- 4d. RLS Helper: get_user_branch_ids
create or replace function public.get_user_branch_ids()
returns uuid[]
language sql
stable
as $$
  select coalesce(array_agg(uba.branch_id), array[]::uuid[])
  from public.user_branch_access uba
  join public.user_brand_memberships ubm on ubm.id = uba.membership_id
  where ubm.profile_id = public.get_user_profile_id()
    and uba.is_active = true
    and ubm.is_active = true
$$;

-- 4e. RLS Helper: get_user_roles
create or replace function public.get_user_roles()
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(role), array[]::text[])
  from public.user_brand_memberships
  where profile_id = public.get_user_profile_id()
    and is_active = true
$$;

-- 4f. add_payment_account_movement — Atomic movement creation
-- Locks account row, computes before/after balance, inserts movement, updates cached balance
create or replace function public.add_payment_account_movement(
  p_payment_account_id uuid,
  p_brand_id integer,
  p_direction text,
  p_amount numeric,
  p_movement_type text,
  p_branch_id uuid default null,
  p_reference_type text default null,
  p_reference_id text default null,
  p_transfer_group_id uuid default null,
  p_description text default null,
  p_metadata jsonb default '{}',
  p_created_by uuid default null
)
returns uuid
language plpgsql
as $func$
declare
  v_before_balance numeric;
  v_after_balance numeric;
  v_allow_negative boolean;
  v_account_brand_id integer;
  v_movement_id uuid;
begin
  -- Lock account row and get current state
  select current_balance, allow_negative_balance, brand_id
    into v_before_balance, v_allow_negative, v_account_brand_id
  from public.payment_accounts
  where id = p_payment_account_id
  for update;

  if not found then
    raise exception 'Payment account % not found', p_payment_account_id
      using errcode = 'P0002';
  end if;

  -- Validate brand
  if v_account_brand_id != p_brand_id then
    raise exception 'Brand mismatch: account brand % != movement brand %',
      v_account_brand_id, p_brand_id
      using errcode = 'P0002';
  end if;

  -- Validate amount
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive' using errcode = '22023';
  end if;

  -- Compute after_balance
  if p_direction = 'IN' then
    v_after_balance := v_before_balance + p_amount;
  elsif p_direction = 'OUT' then
    v_after_balance := v_before_balance - p_amount;
  else
    raise exception 'Invalid direction: %', p_direction using errcode = '22023';
  end if;

  -- Validate negative balance
  if v_after_balance < 0 and not v_allow_negative then
    raise exception 'Insufficient balance: account % has % but requested % of %',
      p_payment_account_id, v_before_balance,
      case when p_direction = 'OUT' then 'withdrawal' else 'operation' end,
      p_amount
      using errcode = '23514';
  end if;

  -- Insert movement
  insert into public.payment_account_movements (
    payment_account_id, brand_id, branch_id,
    direction, amount,
    before_balance, after_balance,
    movement_type,
    reference_type, reference_id,
    transfer_group_id,
    description, metadata,
    created_by, created_at
  ) values (
    p_payment_account_id, p_brand_id, p_branch_id,
    p_direction, p_amount,
    v_before_balance, v_after_balance,
    p_movement_type,
    p_reference_type, p_reference_id,
    p_transfer_group_id,
    p_description, p_metadata,
    p_created_by, now()
  )
  returning id into v_movement_id;

  -- Update cached balance
  update public.payment_accounts
    set current_balance = v_after_balance,
        updated_at = now()
  where id = p_payment_account_id;

  return v_movement_id;
end;
$func$;

-- 4g. create_default_cash_account_for_branch — Idempotent system cash account creation
create or replace function public.create_default_cash_account_for_branch(
  p_brand_id integer,
  p_branch_id uuid,
  p_branch_name text
)
returns uuid
language plpgsql
as $func$
declare
  v_account_id uuid;
begin
  -- Check if already exists
  select id into v_account_id
  from public.payment_accounts
  where brand_id = p_brand_id
    and branch_id = p_branch_id
    and is_system_account = true
    and is_cash_account = true;

  if found then
    return v_account_id;
  end if;

  -- Create new system cash account
  insert into public.payment_accounts (
    brand_id, branch_id,
    account_name, type,
    is_cash_account, is_system_account,
    is_default_receiving_account,
    description
  ) values (
    p_brand_id, p_branch_id,
    'Kas Tunai - ' || p_branch_name, 'CASH',
    true, true,
    true,
    'System-managed cash account for ' || p_branch_name
  )
  returning id into v_account_id;

  return v_account_id;
end;
$func$;

-- 4h. calculate_payment_account_balance — Verify balance from movements
create or replace function public.calculate_payment_account_balance(p_account_id uuid)
returns numeric
language plpgsql
stable
as $func$
declare
  v_balance numeric;
begin
  select coalesce(sum(case when direction = 'IN' then amount else -amount end), 0)
    into v_balance
  from public.payment_account_movements
  where payment_account_id = p_account_id;

  return v_balance;
end;
$func$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

-- brands: public read, platform_owner write
alter table public.brands enable row level security;
drop policy if exists brands_public_read on public.brands;
create policy brands_public_read on public.brands
  for select using (true);
drop policy if exists brands_platform_write on public.brands;
create policy brands_platform_write on public.brands
  for insert with check ('PLATFORM_OWNER' = any(public.get_user_roles()));
drop policy if exists brands_platform_update on public.brands;
create policy brands_platform_update on public.brands
  for update using ('PLATFORM_OWNER' = any(public.get_user_roles()))
  with check ('PLATFORM_OWNER' = any(public.get_user_roles()));
drop policy if exists brands_platform_delete on public.brands;
create policy brands_platform_delete on public.brands
  for delete using ('PLATFORM_OWNER' = any(public.get_user_roles()));

-- brand_settings: own brand or platform_owner
alter table public.brand_settings enable row level security;
drop policy if exists brand_settings_access on public.brand_settings;
create policy brand_settings_access on public.brand_settings
  for all using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- branches: brand-scoped
alter table public.branches enable row level security;
drop policy if exists branches_access on public.branches;
create policy branches_access on public.branches
  for all using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- profiles: self-read or same brand or platform_owner
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    auth_user_id = auth.uid()
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
    or id in (
      select profile_id from public.user_brand_memberships
      where brand_id = any(public.get_user_brand_ids())
        and is_active = true
    )
  );
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using ('PLATFORM_OWNER' = any(public.get_user_roles()))
  with check ('PLATFORM_OWNER' = any(public.get_user_roles()));

-- user_brand_memberships: self or same brand
alter table public.user_brand_memberships enable row level security;
drop policy if exists ubm_select on public.user_brand_memberships;
create policy ubm_select on public.user_brand_memberships
  for select using (
    profile_id = public.get_user_profile_id()
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
drop policy if exists ubm_manage on public.user_brand_memberships;
create policy ubm_manage on public.user_brand_memberships
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
  );
-- Note: UPDATE/DELETE handled by same role check; detailed management via server actions.

-- user_branch_access: self or same brand
alter table public.user_branch_access enable row level security;
drop policy if exists uba_select on public.user_branch_access;
create policy uba_select on public.user_branch_access
  for select using (
    membership_id in (
      select id from public.user_brand_memberships
      where profile_id = public.get_user_profile_id()
    )
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );
drop policy if exists uba_manage on public.user_branch_access;
create policy uba_manage on public.user_branch_access
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
  );

-- payment_accounts: brand-scoped
alter table public.payment_accounts enable row level security;
drop policy if exists pa_access on public.payment_accounts;
create policy pa_access on public.payment_accounts
  for all using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- payment_account_movements: brand-scoped, insert allowed
alter table public.payment_account_movements enable row level security;
drop policy if exists pam_select on public.payment_account_movements;
create policy pam_select on public.payment_account_movements
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
drop policy if exists pam_insert on public.payment_account_movements;
create policy pam_insert on public.payment_account_movements
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
-- NOTE: No UPDATE or DELETE policies — movements are immutable.

-- payment_methods: brand-scoped
alter table public.payment_methods enable row level security;
drop policy if exists pm_access on public.payment_methods;
create policy pm_access on public.payment_methods
  for all using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- branch_payment_methods: brand-scoped
alter table public.branch_payment_methods enable row level security;
drop policy if exists bpm_access on public.branch_payment_methods;
create policy bpm_access on public.branch_payment_methods
  for all using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- audit_logs: insert for all authenticated, select restricted
alter table public.audit_logs enable row level security;
drop policy if exists al_insert on public.audit_logs;
create policy al_insert on public.audit_logs
  for insert with check (auth.role() = 'authenticated');
drop policy if exists al_select on public.audit_logs;
create policy al_select on public.audit_logs
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

create trigger trg_brands_updated_at before update on public.brands
  for each row execute function public.update_updated_at_column();
create trigger trg_brand_settings_updated_at before update on public.brand_settings
  for each row execute function public.update_updated_at_column();
create trigger trg_branches_updated_at before update on public.branches
  for each row execute function public.update_updated_at_column();
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger trg_ubm_updated_at before update on public.user_brand_memberships
  for each row execute function public.update_updated_at_column();
create trigger trg_payment_accounts_updated_at before update on public.payment_accounts
  for each row execute function public.update_updated_at_column();
create trigger trg_payment_methods_updated_at before update on public.payment_methods
  for each row execute function public.update_updated_at_column();
create trigger trg_bpm_updated_at before update on public.branch_payment_methods
  for each row execute function public.update_updated_at_column();
-- NOTE: user_branch_access has no updated_at (immutable after creation).
-- NOTE: payment_account_movements has no updated_at (immutable).
-- NOTE: audit_logs has no updated_at (immutable).

-- ============================================================
-- 7. SEED NOTES
-- ============================================================
-- No seed data in this migration.
-- Seed data will be provided in a separate migration file.
-- Required seed data:
--   - At least one brand with slug 'demo'
--   - At least one branch for that brand
--   - Platform owner profile + membership
--   - System cash account for each branch (via create_default_cash_account_for_branch)
--   - Default payment methods (CASH, QRIS, TRANSFER, DEBIT)
-- ============================================================
