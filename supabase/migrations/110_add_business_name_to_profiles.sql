alter table public.profiles
  add column if not exists business_name text;

comment on column public.profiles.business_name is 'The business/company name collected at signup, used as the initial brand name during onboarding.';
