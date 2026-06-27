-- Customer Portal patch: add is_public to service_notes

alter table public.service_notes
add column if not exists is_public boolean not null default false;

create index if not exists idx_service_notes_is_public on public.service_notes (is_public);
