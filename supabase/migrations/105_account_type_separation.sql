-- Migration: Add account_type to profiles for platform vs customer separation
-- Platform users authenticate via /platform/login and never see customer onboarding/payment flows.
-- Customer users are the default and always follow licensing, onboarding, and payment.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'customer'
    CHECK (account_type IN ('customer', 'platform'));

-- Set existing PLATFORM_OWNER memberships to account_type = 'platform'
UPDATE profiles
SET account_type = 'platform'
WHERE id IN (
  SELECT DISTINCT profile_id
  FROM user_brand_memberships
  WHERE role = 'PLATFORM_OWNER'
);

CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
