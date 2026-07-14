-- Migration 106: Add billing duration fields to packages
-- Enables monthly, yearly, and lifetime license models

alter table public.packages
  add column if not exists billing_duration_enabled boolean not null default true,
  add column if not exists billing_duration_type text default 'month'
    check (billing_duration_type in ('month', 'year')),
  add column if not exists billing_duration_value integer default 1;

-- Update default packages with proper billing durations
-- Starter: monthly renewable (1 month)
update public.packages
set billing_duration_enabled = true,
    billing_duration_type = 'month',
    billing_duration_value = 1
where slug = 'starter' and billing_duration_type is null;

-- Enterprise: lifetime (no expiry)
update public.packages
set billing_duration_enabled = false,
    billing_duration_type = null,
    billing_duration_value = null
where slug = 'enterprise' and billing_duration_enabled = true;

-- Pro: yearly renewable (1 year)
update public.packages
set billing_duration_enabled = true,
    billing_duration_type = 'year',
    billing_duration_value = 1
where slug = 'pro' and billing_duration_type is null;
