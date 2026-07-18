-- Migration 114: Add license_payment_id to licenses for order/payment traceability
--
-- Context: there are two purchase flows.
--   * Brand-scoped (older): license_orders -> licenses.order_id (already linked).
--   * Profile-scoped (newer): checkout_sessions -> license_payments -> license,
--     but the resulting license had NO link back to the paying record
--     (order_id stays NULL because it references license_orders, not payments).
--
-- This adds the missing back-link so profile-scoped licenses can be traced to
-- the license_payment that created them, mirroring order_id for the old flow.
-- Additive and non-destructive.

alter table public.licenses
  add column if not exists license_payment_id uuid
  references public.license_payments(id) on delete set null;

create index if not exists idx_licenses_license_payment_id
  on public.licenses(license_payment_id);
