-- ============================================================
-- HOTFIX: Stop profiles RLS recursion
-- ============================================================

-- 1. Recreate helper as SECURITY DEFINER so it can read profiles
-- without triggering profiles RLS recursively.
CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

-- 2. Replace profiles SELECT policy with non-recursive self-access policy.
DROP POLICY IF EXISTS profiles_select ON public.profiles;

CREATE POLICY profiles_select
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- 3. Replace user_brand_memberships SELECT policy with safe own-membership access.
DROP POLICY IF EXISTS ubm_select ON public.user_brand_memberships;

CREATE POLICY ubm_select
ON public.user_brand_memberships
FOR SELECT
TO authenticated
USING (
  profile_id = public.get_user_profile_id()
);

-- 4. Replace user_branch_access SELECT policy with safe membership-based access.
DROP POLICY IF EXISTS uba_select ON public.user_branch_access;

CREATE POLICY uba_select
ON public.user_branch_access
FOR SELECT
TO authenticated
USING (
  membership_id IN (
    SELECT id
    FROM public.user_brand_memberships
    WHERE profile_id = public.get_user_profile_id()
      AND is_active = true
  )
);