-- ============================================================
-- 119_tour_progress.sql
--
-- Persisted guided-tour progress so a tour can resume after a
-- page refresh, a logout, or a completed onboarding step.
-- ============================================================

create table if not exists public.tour_progress (
  id              uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  tour_name      text not null,
  tour_version   integer not null default 1,
  current_step    integer not null default 0,
  completed       boolean not null default false,
  skipped         boolean not null default false,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint uq_tour_progress_profile_tour unique (profile_id, tour_name)
);

create index if not exists idx_tour_progress_profile
  on public.tour_progress(profile_id);

alter table public.tour_progress enable row level security;

drop policy if exists tp_select on public.tour_progress;
create policy tp_select on public.tour_progress
  for select using (profile_id = public.get_user_profile_id());

drop policy if exists tp_manage on public.tour_progress;
create policy tp_manage on public.tour_progress
  for all using (profile_id = public.get_user_profile_id())
  with check (profile_id = public.get_user_profile_id());

drop trigger if exists trg_tour_progress_updated on public.tour_progress;
create trigger trg_tour_progress_updated before update on public.tour_progress
  for each row execute function public.touch_updated_at();
