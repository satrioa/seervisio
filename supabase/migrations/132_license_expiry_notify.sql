-- ============================================================
-- 132_license_expiry_notify.sql
--
-- Adds expiry_notified_at to licenses so the H-30 expiry reminder
-- (spec §4.1 / §6.4) is sent exactly once per license.
--
-- NOTE: email dispatch requires the Node runtime (Mailer/Brevo), so the
-- daily scan + email send lives in the app cron route /api/cron/billing
-- (see src/app/api/cron/billing/route.ts). That route also invokes the
-- DB-level RPCs expire_pending_orders() and apply_scheduled_downgrades()
-- (migration 130). This migration only adds the dedup column.
-- ============================================================

alter table public.licenses
  add column if not exists expiry_notified_at timestamptz;

create index if not exists idx_licenses_expiry_notify
  on public.licenses (expiry_notified_at);
