create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  brand_id integer references public.brands(id) on delete set null,
  branch_id uuid,
  event_type text not null,
  recipient_email text not null,
  subject text,
  status text not null default 'PENDING',
  error_message text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_logs_brand_created
  on public.notification_logs(brand_id, created_at desc);

create index if not exists idx_notification_logs_event_type
  on public.notification_logs(event_type);

alter table public.notification_logs enable row level security;

create policy notification_logs_insert on public.notification_logs
  for insert with check (auth.role() = 'authenticated');

create policy notification_logs_select on public.notification_logs
  for select using (
    'PLATFORM_OWNER' = any(public.get_user_roles())
    or 'MASTER_ADMIN' = any(public.get_user_roles())
    or brand_id = any(public.get_user_brand_ids())
  );
