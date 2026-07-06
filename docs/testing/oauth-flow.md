# Google OAuth PKCE Flow — Test Plan

## Prerequisites
- `npm run dev` running on `http://localhost:3000`
- Supabase project with Google OAuth configured (seervisio Vercel project)
- Browser with DevTools open → Application → Cookies tab

## Test 1: First-Time Sign In (New User)

1. Open `http://localhost:3000/login`
2. Click **"Continue with Google"**
3. Expected: Redirected to Google account picker
4. Select a Google account that has **never** signed in to Seervis
5. Expected: Redirected back to `http://localhost:3000/callback?code=...`

### Watch for
- **Cookies tab**: `sb-*-auth-token` cookies should appear after `exchangeCodeForSession`
- **Network tab**: POST to `/callback` (server action) should succeed
- **URL**: After ~500ms redirect to `/onboarding`

6. Expected: Onboarding wizard appears (Company → Brand → Branch → Done)
7. Complete onboarding
8. Expected: Redirected to `/[brandSlug]/panel/dashboard`

### Failure modes
| Symptom | Likely cause |
|---|---|
| Spinning loader >5s on `/callback` | PKCE code verifier cookie missing from request |
| "Authentication failed" error | Server action `getUser()` returned no user |
| "Failed to set up your account" | Profile/brand creation threw an error |

## Test 2: Returning User Sign In

1. Sign out (clear session cookies or use a private window)
2. Go to `/login`
3. Click **"Continue with Google"**
4. Select the same Google account used in Test 1
5. Expected: Redirected to `/callback?code=...` then to `/[brandSlug]/panel/dashboard`

### Watch for
- Should skip `/onboarding` entirely
- Redirect should go directly to panel dashboard
- Check that `last_login_at` was updated in `profiles` table

## Test 3: Error Recovery — Refresh on Callback

1. Start Google sign in
2. After redirect to `/callback?code=...`, **refresh the page**
3. Expected: The callback page should detect `code` is now gone from URL, call `getUser()` to check session, and redirect if already authenticated

## Test 4: Direct Navigation to Callback (No Code)

1. Navigate directly to `http://localhost:3000/callback`
2. Expected: "Tidak ada kode autentikasi." error message with "Kembali ke halaman masuk" link

## Test 5: Email/Password Login Still Works

1. Go to `/login`
2. Fill email + password
3. Click "Sign In"
4. Expected: Redirect to `[brandSlug]/panel/dashboard`

## Debugging Tips
- Open **Network tab**, filter by `callback` — watch for the server action POST
- Open **Console tab** — middleware logs `[middleware] getUser result: ...` for panel routes
- Check **Application → Cookies** for `sb-` prefixed cookies on `/callback` page
- If stuck on spinner, check browser console for `@supabase/ssr` warnings
