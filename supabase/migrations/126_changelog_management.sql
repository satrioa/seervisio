-- ============================================================
-- 126_changelog_management.sql
--
-- Expands the existing changelog system for full Platform Console
-- management: status workflow, SEO, cover image, read tracking.
-- ============================================================

-- 1. Add columns to changelog_versions -----------------------

alter table if exists public.changelog_versions
  add column if not exists slug          text,
  add column if not exists cover_image   text,
  add column if not exists status        text not null default 'draft'
    check (status in ('draft', 'published', 'scheduled', 'archived')),
  add column if not exists published_at  timestamptz,
  add column if not exists created_by    uuid references public.profiles(id),
  add column if not exists meta_title    text,
  add column if not exists meta_description text,
  add column if not exists og_image      text,
  add column if not exists cta_text      text,
  add column if not exists cta_link      text;

-- Back-fill slug from version for existing rows.
update public.changelog_versions
  set slug = lower(regexp_replace(version, '[^a-zA-Z0-9]+', '-', 'g'))
  where slug is null;

-- Make slug not null + unique after back-fill.
alter table if exists public.changelog_versions
  alter column slug set not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'changelog_versions_slug_key'
  ) then
    alter table public.changelog_versions add constraint changelog_versions_slug_key unique (slug);
  end if;
end $$;

-- 2. Add columns to changelog_items -------------------------

alter table if exists public.changelog_items
  add column if not exists media_url   text,
  add column if not exists media_type  text check (media_type in ('image', 'video'));

-- 3. Create changelog_read_logs table -----------------------

create table if not exists public.changelog_read_logs (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id),
  release_id  uuid not null references public.changelog_versions(id) on delete cascade,
  read_at     timestamptz not null default now()
);

create index if not exists idx_changelog_read_logs_profile
  on public.changelog_read_logs(profile_id);

-- 4. Drop old published column (moved to status) ------------

-- Policies that reference the published column must be dropped first.
drop policy if exists cv_select on public.changelog_versions;
drop policy if exists cv_all on public.changelog_versions;
drop policy if exists ci_select on public.changelog_items;
drop policy if exists ci_all on public.changelog_items;

-- Only drop after confirming all existing data uses status.
-- Since we added status with default 'draft', published data
-- must be migrated first.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'changelog_versions' and column_name = 'published'
  ) then
    update public.changelog_versions
      set status = 'published'
      where published = true and status = 'draft';

    alter table public.changelog_versions
      drop column published;
  end if;
end $$;

-- Recreate policies with status-based checks.
create policy cv_select on public.changelog_versions
  for select using (
    status = 'published'
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy cv_all on public.changelog_versions
  for all using ('PLATFORM_OWNER' = any(public.get_user_roles()));

create policy ci_select on public.changelog_items
  for select using (
    version_id in (
      select id from public.changelog_versions where status = 'published'
    )
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy ci_all on public.changelog_items
  for all using ('PLATFORM_OWNER' = any(public.get_user_roles()));

-- 5. Updated RLS ---------------------------------------------

-- Read logs: platform owner can manage, profile can read own.
alter table public.changelog_read_logs enable row level security;

drop policy if exists crl_select on public.changelog_read_logs;
create policy crl_select on public.changelog_read_logs
  for select using (
    profile_id = auth.uid()
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

drop policy if exists crl_insert on public.changelog_read_logs;
create policy crl_insert on public.changelog_read_logs
  for insert with check (true);

-- 6. Updated_at trigger --------------------------------------

drop trigger if exists trg_changelog_read_logs_updated on public.changelog_read_logs;
create trigger trg_changelog_read_logs_updated before update on public.changelog_read_logs
  for each row execute function public.touch_updated_at();

-- 7. Indexes -------------------------------------------------

create index if not exists idx_changelog_versions_status
  on public.changelog_versions(status);

create index if not exists idx_changelog_versions_slug
  on public.changelog_versions(slug);
