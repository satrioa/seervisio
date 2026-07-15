-- Migration 112: Create license-proofs storage bucket
-- Required by uploadLicensePaymentProofAction().

insert into storage.buckets (id, name, public)
values ('license-proofs', 'license-proofs', true)
on conflict (id) do nothing;

-- Allow public reads (proof URLs are shared with customers)
drop policy if exists "Public Read" on storage.objects;
create policy "Public Read" on storage.objects
  for select using (bucket_id = 'license-proofs');

-- Allow authenticated uploads
drop policy if exists "Service Role Upload" on storage.objects;
create policy "Service Role Upload" on storage.objects
  for insert with check (bucket_id = 'license-proofs');
