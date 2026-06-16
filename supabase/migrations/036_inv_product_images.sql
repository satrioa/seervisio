-- Add image_url columns to V4 inventory tables

alter table public.inv_products
  add column if not exists image_url text null;

alter table public.inv_variants
  add column if not exists image_url text null;

alter table public.inv_units
  add column if not exists image_url text null;
