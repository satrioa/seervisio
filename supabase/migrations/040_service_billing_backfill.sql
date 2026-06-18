-- ============================================================
-- Migration: Service Billing Backfill
-- 
-- Fix existing services where final_cost = 0 but
-- estimated_cost > 0. 
-- 
-- Business rule:
-- Sparepart usage is stock tracking only and does NOT affect
-- service billing. final_cost is the customer-facing service
-- charge derived from estimated_cost.
-- 
--   final_cost = max(estimated_cost, total_paid, 0)
-- ============================================================

-- Phase 1: services where final_cost = 0 but estimated_cost > 0
update public.services
set
  final_cost = greatest(
    coalesce(estimated_cost, 0),
    -- payment safety: never below what was already paid
    coalesce((
      select coalesce(sum(gross_amount), 0)
      from public.service_payments
      where service_id = services.id
        and payment_status = 'COMPLETED'
    ), 0)
  ),
  updated_at = now()
where coalesce(final_cost, 0) = 0
  and coalesce(estimated_cost, 0) > 0;

-- Phase 2: services where final_cost < estimated_cost (edge case)
update public.services
set
  final_cost = greatest(
    coalesce(estimated_cost, 0),
    -- payment safety: never below what was already paid
    coalesce((
      select coalesce(sum(gross_amount), 0)
      from public.service_payments
      where service_id = services.id
        and payment_status = 'COMPLETED'
    ), 0)
  ),
  updated_at = now()
where coalesce(final_cost, 0) < coalesce(estimated_cost, 0);
