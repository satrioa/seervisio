-- Allow license_orders to be created before the brand exists
-- (profile-scoped flow: brand is created later in Welcome Wizard).

alter table public.license_orders
  alter column brand_id drop not null;
