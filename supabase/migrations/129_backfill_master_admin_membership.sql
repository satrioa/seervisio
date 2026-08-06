-- Backfill: grant MASTER_ADMIN membership to every license holder who
-- does not already have an active membership for that brand. Fixes
-- existing accounts that have a license but no user_brand_memberships
-- row, which causes "Brand access denied" when opening the dashboard.
-- The approval flow (approveLicensePaymentAction) now grants this
-- automatically for new purchases.

INSERT INTO user_brand_memberships (profile_id, brand_id, role, is_active, created_at, updated_at)
SELECT
  l.profile_id,
  l.brand_id,
  'MASTER_ADMIN',
  true,
  now(),
  now()
FROM licenses l
WHERE l.brand_id IS NOT NULL
  AND l.status IN ('active', 'trial')
  AND NOT EXISTS (
    SELECT 1
    FROM user_brand_memberships m
    WHERE m.profile_id = l.profile_id
      AND m.brand_id = l.brand_id
  );

-- Reactivate any existing but inactive/deleted membership for license holders.
UPDATE user_brand_memberships m
SET is_active = true, role = 'MASTER_ADMIN', updated_at = now()
FROM licenses l
WHERE m.profile_id = l.profile_id
  AND m.brand_id = l.brand_id
  AND l.status IN ('active', 'trial')
  AND m.is_active = false;
