-- Migration 113: Create brands storage bucket for brand logos
-- Required by uploadBrandLogoAction() (onboarding + brand settings).

insert into storage.buckets (id, name, public)
values ('brands', 'brands', true)
on conflict (id) do nothing;

-- Allow public reads (logos are displayed in invoices, receipts, and the app)
drop policy if exists "Brands Public Read" on storage.objects;
create policy "Brands Public Read" on storage.objects
  for select using (bucket_id = 'brands');

-- Allow authenticated uploads (service role bypasses RLS; kept for safety)
drop policy if exists "Brands Service Upload" on storage.objects;
create policy "Brands Service Upload" on storage.objects
  for insert with check (bucket_id = 'brands');
