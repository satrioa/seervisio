-- 095: User Preferences

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  language text not null default 'id',
  theme text not null default 'system',
  timezone text not null default 'Asia/Jakarta',
  sidebar_collapsed boolean not null default false,
  date_format text not null default 'DD/MM/YYYY',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_user_preferences_user_id unique (user_id)
);

alter table public.user_preferences enable row level security;

create policy "Users can read own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

create policy "Service role full access"
  on public.user_preferences
  using (true);
