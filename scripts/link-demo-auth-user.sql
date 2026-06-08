-- ============================================================
-- Seervis V2 — Link Demo Auth Users to Seeded Profiles
-- ============================================================
-- 
-- PREREQUISITE:
-- Create auth users via Supabase Dashboard first:
--   1. Go to Authentication > Users > Add User
--   2. Create each user with the email below and a password
--   3. Copy the auth.users.id (UUID) from the created user
--
-- AFTER creating an auth user, run the appropriate UPDATE:
-- ============================================================

-- Link Platform Owner
-- UPDATE public.profiles
-- SET auth_user_id = '58b36763-029f-412b-851f-2eb0cb36f972'
-- WHERE email = 'owner@kasservice.com';

-- Link Master Admin
-- UPDATE public.profiles
-- SET auth_user_id = 'da23898a-c6c2-4e2d-8aad-47f84e961d01'
-- WHERE email = 'master@kasservice.com';

-- Link Admin Cabang
-- UPDATE public.profiles
-- SET auth_user_id = '6bf6bc49-a398-4665-a944-968916f9fc7f'
-- WHERE email = 'admin.smg@kasservice.com';

-- Link Frontliner
-- UPDATE public.profiles
-- SET auth_user_id = 'fa6d157c-a181-487c-a930-57c0c8d1306b'
-- WHERE email = 'frontliner.smg@kasservice.com';

-- Link Technician
-- UPDATE public.profiles
-- SET auth_user_id = 'f9bee22e-d805-434d-8b29-cbf7a8a41f5c'
-- WHERE email = 'tech.smg@kasservice.com';

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run to check linkage status:
--
-- SELECT p.name, p.email, p.auth_user_id IS NOT NULL AS linked
-- FROM public.profiles p
-- ORDER BY p.created_at;
-- ============================================================
