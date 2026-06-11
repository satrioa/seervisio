-- 015_brand_theme.sql
-- Add brand theme customization columns to brands table

alter table if exists public.brands
  add column if not exists theme_primary_color text not null default '#F59E0B',
  add column if not exists theme_accent_color text not null default '#D4A017',
  add column if not exists theme_mode text not null default 'light' 
    check (theme_mode in ('light', 'dark')),
  add column if not exists theme_tokens jsonb;

-- Update existing rows with default values if any are null
update public.brands
set
  theme_primary_color = coalesce(theme_primary_color, '#F59E0B'),
  theme_accent_color = coalesce(theme_accent_color, '#D4A017'),
  theme_mode = coalesce(theme_mode, 'light')
where theme_primary_color is null
   or theme_accent_color is null
   or theme_mode is null;
