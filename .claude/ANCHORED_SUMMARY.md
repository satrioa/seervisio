## Goal
Replace React Joyride with a native Product Onboarding Platform — cross-page missions, four-div spotlight, AI coach, dashboard checklist, granular per-mission persistence.

## Constraints & Preferences
- Stack: shadcn/ui, Radix UI, Framer Motion, Tailwind CSS, Next.js 15, React 19
- No third-party tour libraries (no react-joyride, shepherd.js, intro.js)
- Tour content differs by role: PLATFORM_OWNER, MASTER_ADMIN, ADMIN, FRONTLINER, TECHNICIAN (+ CASHIER defined for future)
- Premium SaaS feel comparable to Linear, Vercel, Stripe, Notion, Arc Browser, Supabase
- Four-div spotlight (not clipPath) — better backdrop-blur, rounded corners, multiple holes
- Cross-page auto-navigation with `router.push` + `MutationObserver` wait-for-element
- Multi-level registry: Brand → Role → Feature Flags → Tour Registry → Mission Registry
- Single `tour_state` JSONB on `user_preferences` (not 4 columns on `profiles`)
- Must feel like a smart assistant, not a tooltip system
- "Create Employee Account" replaces "Invite Team" naming
- OAuth fix must follow latest official Supabase SSR documentation — no workarounds

## Progress
### Done
- All 14 implementation tasks complete
- Migration `103_user_preferences_tour_state.sql`, types `src/types/tour.ts`, storage `src/lib/tour/storage.ts`
- Server actions refactored to use `user_preferences.tour_state`
- Spotlight, Floating Card, Progress Bar, Mission definitions, Registry, Tour Engine, Tour Provider, Screens, Dashboard Checklist, Empty State CTA
- Documentation integration, `data-tour` attributes on panel components
- Cleanup: 9 old files deleted, `react-joyride` uninstalled, `onboarding/page.tsx` removed
- **TypeScript `tsc --noEmit` passes with zero errors**
- `shadcn/ui` Dialog created, completion screen `progress-ring` bug fixed, `stop-color` → `stopColor` in logo
- **BYOK/AI Settings**: Added "AI & Insight Engine" nav link under System in `app-sidebar.tsx`
- **Google OAuth PKCE deep audit**: Full flow traced with diagram — checked login page, all Supabase clients, cookie storage, callback route, middleware, landing page redirect, browser navigation, OAuth callback URL, env vars, SSR package, and multiple projects
- **Audit findings**: Root cause identified — PKCE code verifier cookie lost due to `SameSite` behavior without `Secure` flag (primary), and middleware `setAll` destroying response cookie context on session refresh (secondary). `DEFAULT_COOKIE_OPTIONS` omits `secure: true`.
- **`@supabase/ssr` upgraded**: `0.6.1` → `0.12.0` (latest stable)
- **middleware.ts**: Short-circuit early return for `/callback` routes (interim measure), `setAll` accepts 2nd arg `headers: Record<string, string>`, type errors fixed (`CookieOptions` imported from `@supabase/ssr`)
- **client.ts**: explicit `auth: { flowType: "pkce" }` in `createBrowserClient`
- **server.ts**: `setAll` accepts 2nd arg `_headers: Record<string, string>`
- **Deleted dead file**: `src/lib/supabase/middleware.ts` (zero imports)
- **Fixed**: `src/hooks/useUserSession.ts` cast using `as unknown as`
- **tsc --noEmit passes with zero errors**
- **Refactored `storage.ts`**: `loadTourState`, `saveTourState`, `resetTourState` accept optional `supabase` param (dependency injection) for testability
- **Tests written**: 22 tests for `registry.ts` (`deepMerge` + `getTourConfig`) and `storage.ts` (`loadTourState`, `saveTourState`, `resetTourState`) — all passing
- **Full test suite**: 368 tests pass, 10 test files

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- **Multi-Level Registry** over flat Role→Steps: Brand→Role→FeatureFlags→Tours→Missions — enables brand overrides and feature-gated tours
- **Mission system** replaces step groups — each mission has difficulty, estimated time, reward, AI prompt, own completion tracking
- **Four-div overlay** over clipPath polygon — native backdrop-filter support, simple integer animation, rounded corners
- **Enhanced floating card** shows current mission, overall progress, and next feature simultaneously
- **Single `tour_state` JSONB** on `user_preferences` — cleaner than 4 columns on `profiles`; stores `completed_missions[]` for granular partial replay
- **`data-tour` attribute strategy** — explicit selectors added to existing panel components (not fragile CSS classes)
- **Cross-page engine** — `router.push` → `waitForElement` (MutationObserver) → spotlight+card animation
- **Granular replay** — per-mission `completed_missions[]`; only changed missions replay on version bump, not entire onboarding
- **Upgrade to `@supabase/ssr@0.12.0`** (not v1 — latest stable is 0.12.0) — fixes PKCE code verifier handling, adds `SetAllCookies` 2nd argument for cache headers, uses `skipAutoInitialize: true` for server clients
- **Short-circuit middleware for `/callback`** kept as interim measure; proper fix is the v0.12.0 upgrade which uses `decodeChunkedCookieValue` with JSON validation for stored values

## Next Steps
1. Test Google OAuth flow end-to-end (login, callback, profile creation)
2. Test all roles with the onboarding tour flow

## Critical Context
- `@supabase/ssr` upgraded: `0.6.1` → `0.12.0` (latest stable, not v1)
- `@supabase/supabase-js` remains at `2.49.0`
- OAuth PKCE root cause: `DEFAULT_COOKIE_OPTIONS` in `@supabase/ssr` does NOT include `secure: true`. On `https://seervisio.vercel.app`, `SameSite=Lax` cookies without `Secure` can be dropped by browsers on cross-site redirects from Google back to callback URL.
- Secondary cause: middleware's `setAll` creates `NextResponse.next({ request })` on token refresh, which destroys the PKCE code verifier cookie context on the response (affects returning users with existing sessions).
- Short-circuit fix in `middleware.ts:18-23` is an interim measure — the proper fix is the v0.12.0 upgrade.
- v0.12.0 API change: `SetAllCookies` now passes `headers: Record<string, string>` as 2nd argument — must be applied to response to prevent CDN caching of auth cookies.
- `src/lib/supabase/server.ts` `setAll` ignores `_headers` param (Server Components can't set response headers via `cookies()` API)
- `src/lib/supabase/middleware.ts` has been deleted (was dead code)
- TypeScript `tsc --noEmit` passes with zero errors
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `NEXT_PUBLIC_SITE_URL=https://seervisio.vercel.app`

## Relevant Files
- `middleware.ts`: Root middleware — has `/callback` short-circuit, `setAll` with `CookieOptions` type + `headers` 2nd arg
- `src/lib/supabase/server.ts`: `createServerSupabase()` — `setAll` accepts 2nd arg `_headers` (ignored)
- `src/lib/supabase/client.ts`: `createClient()` — explicit `auth: { flowType: "pkce" }`
- `src/lib/supabase/admin.ts`: Service role client (no cookie handling)
- `src/app/(auth)/callback/callback-content.tsx`: Client component doing `exchangeCodeForSession(code)` then `handleGoogleCallbackAction(code)`
- `src/app/(auth)/callback/page.tsx`: Server component wrapping callback content in `Suspense`
- `src/app/(auth)/login/login-form.tsx`: `handleGoogleSignIn` using `signInWithOAuth` + `window.location.href`
- `src/server/actions/auth.actions.ts`: `handleGoogleCallbackAction` server action
- `src/components/settings/ai-settings.tsx`: BYOK/AI settings component (now linked from sidebar)
- `src/components/layout/app-sidebar.tsx`: Added "AI & Insight Engine" nav link under System
- `src/hooks/useUserSession.ts`: Pre-existing hook, cast fixed with `as unknown as`
- `node_modules/@supabase/ssr/src/cookies.ts`: v0.12.0 — `decodeChunkedCookieValue` validates JSON (breaking from v0.6.1), `applyServerStorage` passes cache headers
- `node_modules/@supabase/ssr/src/createServerClient.ts`: v0.12.0 — uses `skipAutoInitialize: true`, has `onAuthStateChange` handler that calls `applyServerStorage`
