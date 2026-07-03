-- Add brand-scoped RLS policies to notifications table

-- Drop the overly permissive service-role-only policy
drop policy if exists "Service role can manage notifications" on public.notifications;

-- Add proper brand-scoped policies

create policy "notifications_select" on public.notifications
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

create policy "notifications_insert" on public.notifications
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

create policy "notifications_update" on public.notifications
  for update using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  )
  with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

create policy "notifications_delete" on public.notifications
  for delete using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

-- Add index on brand_id for efficient filtering
create index if not exists idx_notifications_brand_id on public.notifications(brand_id);
