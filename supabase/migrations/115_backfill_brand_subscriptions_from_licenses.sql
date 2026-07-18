-- Migration 115: Backfill brand_subscriptions from active licenses
--
-- The dashboard Brands page reads plan/status from brand_subscriptions, but the
-- Welcome Wizard's backfill only wrote rows for some brands. Brands created via
-- the wizard (and brands whose back-fill never ran) end up with an active
-- license but NO brand_subscriptions row, so the dashboard shows "-".
--
-- This backfills brand_subscriptions from each brand's active license so the
-- subscription status reflects reality. Plan is derived from the linked
-- package name (lowercased); limits come from the package. Idempotent: it only
-- inserts for brands that still lack a brand_subscriptions row.

insert into public.brand_subscriptions (
  brand_id,
  plan,
  max_branches,
  max_users,
  status,
  started_at,
  expires_at,
  package_id
)
select
  l.brand_id,
  lower(p.name),
  coalesce(p.max_branches, 1),
  coalesce(p.max_users, 5),
  'active',
  l.started_at,
  l.expires_at,
  l.package_id
from public.licenses l
join public.packages p on p.id = l.package_id
where l.status in ('active', 'trial')
  and l.brand_id is not null
  and not exists (
    select 1 from public.brand_subscriptions bs where bs.brand_id = l.brand_id
  )
on conflict (brand_id) do nothing;
