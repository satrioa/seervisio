-- Migration: Add onboarding guided tour fields to profiles
-- Adds fields for tracking first-login onboarding progress.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_current_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_earned_badges jsonb NOT NULL DEFAULT '[]'::jsonb;
