# Auth Setup Guide — Seervis V2

This guide walks through setting up Supabase Auth and linking it to the seeded demo data.

## Prerequisites

- Supabase project running
- All migrations (001–013) applied successfully
- `npm install` completed (packages: `@supabase/supabase-js`, `@supabase/ssr`)

## Step 1: Environment Variables

Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for the client.
> `SUPABASE_SERVICE_ROLE_KEY` is server-only — never expose it to the browser.

## Step 2: Enable Email/Password Auth in Supabase

1. Go to **Authentication > Providers** in Supabase Dashboard
2. Make sure **Email** is enabled
3. Disable "Confirm email" for development (or configure email service)

## Step 3: Create Auth Users

Go to **Authentication > Users > Add User** and create these users with the email/password from migration 013:

| Email | Password (example) | Role |
|---|---|---|
| owner@kasservice.com | `Test123!` | PLATFORM_OWNER |
| master@kasservice.com | `Test123!` | MASTER_ADMIN |
| admin.smg@kasservice.com | `Test123!` | ADMIN |
| frontliner.smg@kasservice.com | `Test123!` | FRONTLINER |
| tech.smg@kasservice.com | `Test123!` | TECHNICIAN |

**Important:** After creating each user, copy the `id` (UUID) from the created user row.

## Step 4: Link Auth Users to Profiles

Open **Supabase SQL Editor** and run these UPDATE statements with the UUIDs you copied:

```sql
-- Link Platform Owner
UPDATE public.profiles
SET auth_user_id = 'PASTE_UUID_HERE'
WHERE email = 'owner@kasservice.com';

-- Link Master Admin
UPDATE public.profiles
SET auth_user_id = 'PASTE_UUID_HERE'
WHERE email = 'master@kasservice.com';

-- Link Admin
UPDATE public.profiles
SET auth_user_id = 'PASTE_UUID_HERE'
WHERE email = 'admin.smg@kasservice.com';

-- Link Frontliner
UPDATE public.profiles
SET auth_user_id = 'PASTE_UUID_HERE'
WHERE email = 'frontliner.smg@kasservice.com';

-- Link Technician
UPDATE public.profiles
SET auth_user_id = 'PASTE_UUID_HERE'
WHERE email = 'tech.smg@kasservice.com';
```

### Verify:

```sql
SELECT name, email, auth_user_id IS NOT NULL AS linked
FROM public.profiles
ORDER BY created_at;
```

All rows should show `linked = true`.

## Step 5: Verify RLS is Working

Run this to check RLS policies are active:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'user_brand_memberships', 'user_branch_access')
ORDER BY tablename, policyname;
```

## Step 6: Start the Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000` — you should be redirected to the login page.

## Login Flow

1. Visit `http://localhost:3000/login`
2. Enter email/password (e.g., `admin.smg@kasservice.com` / `Test123!`)
3. Middleware redirects you to `/{brandSlug}/panel/dashboard`
4. The panel layout resolves your brand context, role, and accessible branches

## Troubleshooting

### "Akun Anda belum terhubung ke profil"
→ The auth user exists in `auth.users` but `profiles.auth_user_id` is still NULL. Run Step 4.

### "Anda belum memiliki akses ke brand manapun"
→ The profile exists but has no rows in `user_brand_memberships`. Check migration 013 ran correctly.

### "Brand ... tidak ditemukan"
→ The brand slug in the URL doesn't match any row in `public.brands`. Check the slug matches what's seeded.

### 404 on panel routes
→ If you get a 404 instead of redirect to login, check the middleware is running. Make sure `middleware.ts` is at the project root.

### CORS / redirect issues
→ In Supabase Dashboard > Authentication > URL Configuration, set Site URL to `http://localhost:3000` and add redirect URLs as needed.
