-- 099_ai_insight_engine.sql
-- AI Command Center: BYOK provider settings + insight cache

/* ── 1. Add AI provider columns to brand_settings ── */

alter table if exists public.brand_settings
  add column if not exists ai_provider text default null,
  add column if not exists ai_api_key_encrypted text default null;

comment on column public.brand_settings.ai_provider is 'LLM provider: "openai" | "openrouter" | null';
comment on column public.brand_settings.ai_api_key_encrypted is 'Encrypted API key for the AI provider';

/* ── 2. Insight cache table ── */

create table if not exists public.ai_insight_cache (
  id          uuid primary key default gen_random_uuid(),
  brand_id    integer not null references public.brands(id) on delete cascade,
  cache_key   text not null,
  cache_data  jsonb not null default '{}',
  generated_at timestamptz not null default now(),
  expires_at  timestamptz not null,
  model_used  text,
  prompt_tokens  int default 0,
  completion_tokens int default 0
);

create index if not exists idx_ai_insight_cache_brand_key
  on public.ai_insight_cache(brand_id, cache_key);

comment on table public.ai_insight_cache is 'Cached AI-generated insights per brand';
comment on column public.ai_insight_cache.cache_key is 'health | briefing | alerts | recommendations | scoreboard | forecast | insights';
comment on column public.ai_insight_cache.cache_data is 'The structured insight payload';
comment on column public.ai_insight_cache.expires_at is 'Cache TTL — UI reads only if not expired';

/* ── 3. RLS for ai_insight_cache ── */

alter table public.ai_insight_cache enable row level security;

drop policy if exists ai_insight_cache_select on public.ai_insight_cache;
create policy ai_insight_cache_select on public.ai_insight_cache
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

drop policy if exists ai_insight_cache_insert on public.ai_insight_cache;
create policy ai_insight_cache_insert on public.ai_insight_cache
  for insert with check (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

drop policy if exists ai_insight_cache_update on public.ai_insight_cache;
create policy ai_insight_cache_update on public.ai_insight_cache
  for update using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

drop policy if exists ai_insight_cache_delete on public.ai_insight_cache;
create policy ai_insight_cache_delete on public.ai_insight_cache
  for delete using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );

/* ── 4. Trigger: auto-expire old cache ── */

create or replace function public.cleanup_expired_ai_cache() returns trigger
language plpgsql as $func$
begin
  delete from public.ai_insight_cache
  where expires_at < now()
    and brand_id = new.brand_id;
  return new;
end;
$func$;

drop trigger if exists trg_cleanup_expired_ai_cache on public.ai_insight_cache;
create trigger trg_cleanup_expired_ai_cache
  after insert on public.ai_insight_cache
  for each row execute function public.cleanup_expired_ai_cache();

/* ── 5. Function: upsert insight cache ── */

create or replace function public.upsert_ai_insight_cache(
  p_brand_id integer,
  p_cache_key text,
  p_cache_data jsonb,
  p_expires_at timestamptz,
  p_model_used text default null,
  p_prompt_tokens int default 0,
  p_completion_tokens int default 0
) returns uuid
language plpgsql
security definer
as $func$
declare
  v_id uuid;
begin
  insert into public.ai_insight_cache (brand_id, cache_key, cache_data, expires_at, model_used, prompt_tokens, completion_tokens)
  values (p_brand_id, p_cache_key, p_cache_data, p_expires_at, p_model_used, p_prompt_tokens, p_completion_tokens)
  on conflict on constraint ai_insight_cache_brand_key_unique do nothing
  returning id into v_id;

  if v_id is null then
    update public.ai_insight_cache
    set cache_data = p_cache_data,
        expires_at = p_expires_at,
        model_used = p_model_used,
        prompt_tokens = p_prompt_tokens,
        completion_tokens = p_completion_tokens,
        generated_at = now()
    where brand_id = p_brand_id and cache_key = p_cache_key
    returning id into v_id;
  end if;

  return v_id;
end;
$func$;

comment on function public.upsert_ai_insight_cache is 'Inserts or updates a cached insight entry. Security definer to bypass RLS.';

/* ── 6. Unique constraint for upsert ── */

drop index if exists public.ai_insight_cache_brand_key_unique;
create unique index ai_insight_cache_brand_key_unique
  on public.ai_insight_cache(brand_id, cache_key);
