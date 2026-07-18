create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  subject text not null,
  template text not null,
  provider text default 'brevo',
  provider_message_id text,
  status text,
  error_message text,
  metadata jsonb,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_email_logs_recipient on public.email_logs(recipient);
create index if not exists idx_email_logs_template on public.email_logs(template);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_sent_at on public.email_logs(sent_at);

alter table public.email_logs enable row level security;

-- Allow service role full access
drop policy if exists "email_logs_service_access" on public.email_logs;
create policy "email_logs_service_access"
  on public.email_logs
  for all
  to service_role
  using (true)
  with check (true);
