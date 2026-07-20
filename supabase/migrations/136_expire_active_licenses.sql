-- ============================================================
-- 136_expire_active_licenses.sql
--
-- Flips time-limited licenses whose expires_at has passed to
-- status 'expired'. Lifetime and trial licenses are excluded
-- (trial expiry is handled separately as 'expired' trial state).
--
-- Called by the daily cron route /api/cron/billing. The route
-- is responsible for sending the license-expired notification
-- (in-app + email) and stamps expiry_notified_at so the H-30
-- reminder (migration 132) does not also fire.
-- ============================================================

create or replace function public.expire_active_licenses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  with to_expire as (
    select l.id
    from public.licenses l
    left join public.packages p on p.id = l.package_id
    where l.status = 'active'
      and l.expires_at is not null
      and l.expires_at < now()
      and l.expiry_notified_at is null
      -- exclude lifetime (never expire) and trial (handled separately)
      and coalesce((p.package_type = 'lifetime'), false) is false
      and coalesce(l.is_trial, false) is false
  )
  update public.licenses l2
  set status = 'expired',
      expiry_notified_at = now()
  from to_expire te
  where l2.id = te.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
