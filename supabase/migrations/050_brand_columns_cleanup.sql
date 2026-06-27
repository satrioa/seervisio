-- Migration 050: Remove duplicated columns from brands table
-- All configuration data now lives in brand_settings (per RLS requirements)

alter table if exists public.brands
  drop column if exists logo_url;

alter table if exists public.brands
  drop column if exists accent_color;

alter table if exists public.brands
  drop column if exists theme_primary_color;

alter table if exists public.brands
  drop column if exists theme_accent_color;

alter table if exists public.brands
  drop column if exists theme_mode;

alter table if exists public.brands
  drop column if exists theme_tokens;
