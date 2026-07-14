-- ============================================================
-- 108_welcome_wizard_brand_creation.sql
--
-- The Welcome Wizard (Phase 4) creates the brand FOR the customer,
-- AFTER the license is ACTIVE. To link the newly-created brand back
-- to the original customer profile (the one that owns the license /
-- checkout session), user_brand_memberships gains a profile_id column.
--
-- The license row is profile-scoped (brand_id NULL) until this step
-- back-fills brand_id, completing the journey.
-- ============================================================

alter table public.user_brand_memberships
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

create index if not exists idx_ubm_profile_brand
  on public.user_brand_memberships(profile_id);

-- Allow brand-scoped rows to coexist with the new profile-scoped rows.
-- (No constraint change needed: the platform-owner rule only cares about
--  brand_id nullability relative to role.)

-- RLS: let a profile see its own memberships.
drop policy if exists ubm_select on public.user_brand_memberships;
create policy ubm_select on public.user_brand_memberships
  for select using (
    profile_id = public.get_user_profile_id()
    or brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists ubm_manage on public.user_brand_memberships;
create policy ubm_manage on public.user_brand_memberships
  for all using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  ) with check (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );
