-- Migration: Add missing UPDATE policy for services table.
-- The SELECT policy was created in 005_service_foundation.sql but
-- the UPDATE policy was left as TODO, causing all UPDATEs to be
-- blocked by RLS default-deny behavior.

drop policy if exists services_update on public.services;

create policy services_update on public.services
  for update using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
