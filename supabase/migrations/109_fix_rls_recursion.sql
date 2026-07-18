-- ============================================================
-- 109_fix_rls_recursion.sql
--
-- HOTFIX: Stack depth limit exceeded on services page.
--
-- Migration 108 re-introduced recursive RLS on
-- user_brand_memberships (ubm_select calls get_user_brand_ids()
-- which queries the same table → infinite recursion).
--
-- Fix: Make get_user_brand_ids() and get_user_roles()
-- SECURITY DEFINER so they bypass RLS when called from
-- policy evaluations, mirroring the fix in 014 for
-- get_user_profile_id().
-- ============================================================

-- 1. Recreate get_user_brand_ids as SECURITY DEFINER
-- so it bypasses RLS on user_brand_memberships.
create or replace function public.get_user_brand_ids()
returns integer[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(brand_id), array[]::integer[])
  from public.user_brand_memberships
  where profile_id = public.get_user_profile_id()
    and is_active = true
    and brand_id is not null
$$;

-- 2. Recreate get_user_roles as SECURITY DEFINER.
create or replace function public.get_user_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(role), array[]::text[])
  from public.user_brand_memberships
  where profile_id = public.get_user_profile_id()
    and is_active = true
$$;

-- 3. Recreate get_user_branch_ids as SECURITY DEFINER
-- for consistency (though not directly involved in the recursion).
create or replace function public.get_user_branch_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(uba.branch_id), array[]::uuid[])
  from public.user_branch_access uba
  join public.user_brand_memberships ubm on ubm.id = uba.membership_id
  where ubm.profile_id = public.get_user_profile_id()
    and uba.is_active = true
    and ubm.is_active = true
$$;
