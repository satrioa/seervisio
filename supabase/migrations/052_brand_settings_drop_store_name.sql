-- Migration 052: Make brand_settings.store_name optional
-- brands.name is now the single source of truth for brand name
-- brand_settings.store_name was a duplicate; making it nullable to allow removal

alter table if exists public.brand_settings
  alter column store_name drop not null;
