-- Migration: Add pickup/handover fields to services table
-- This migration adds optional columns for handover verification.

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS picked_up_by_profile_id uuid NULL,
  ADD COLUMN IF NOT EXISTS pickup_name text NULL,
  ADD COLUMN IF NOT EXISTS pickup_phone text NULL,
  ADD COLUMN IF NOT EXISTS pickup_relation text NULL,
  ADD COLUMN IF NOT EXISTS pickup_note text NULL;

-- Optional: Add indexes for faster lookups (e.g., on picked_up_at)
CREATE INDEX IF NOT EXISTS idx_services_picked_up_at ON services(picked_up_at);
