-- 049_brand_settings_theme.sql
-- Move theme columns from brands table to brand_settings table
-- so non-PLATFORM_OWNER roles can read/write theme settings via RLS.

alter table if exists public.brand_settings
  add column if not exists theme_primary_color text not null default '#F59E0B',
  add column if not exists theme_accent_color text not null default '#D4A017',
  add column if not exists theme_mode text not null default 'light'
    check (theme_mode in ('light', 'dark')),
  add column if not exists theme_tokens jsonb;

comment on column public.brand_settings.theme_primary_color is 'Brand primary color (HSL or hex)';
comment on column public.brand_settings.theme_accent_color is 'Brand accent color (HSL or hex)';
comment on column public.brand_settings.theme_mode is 'Current theme mode: light or dark';
comment on column public.brand_settings.theme_tokens is 'Full generated CSS variable tokens (JSON)';

-- Backfill existing theme data from brands table if any brand_settings row exists
update public.brand_settings bs
set
  theme_primary_color = coalesce(b.theme_primary_color, bs.theme_primary_color),
  theme_accent_color = coalesce(b.theme_accent_color, bs.theme_accent_color),
  theme_mode = coalesce(b.theme_mode, bs.theme_mode),
  theme_tokens = coalesce(b.theme_tokens, bs.theme_tokens)
from public.brands b
where bs.brand_id = b.id
  and (b.theme_primary_color is not null or b.theme_accent_color is not null or b.theme_mode is not null or b.theme_tokens is not null);

-- Ensure default rows exist for brands that have no brand_settings yet
insert into public.brand_settings (brand_id, store_name, theme_primary_color, theme_accent_color, theme_mode, theme_tokens)
select
  b.id,
  b.name,
  coalesce(b.theme_primary_color, '#F59E0B'),
  coalesce(b.theme_accent_color, '#D4A017'),
  coalesce(b.theme_mode, 'light'),
  coalesce(b.theme_tokens, '{}'::jsonb)
from public.brands b
where not exists (select 1 from public.brand_settings bs2 where bs2.brand_id = b.id);
