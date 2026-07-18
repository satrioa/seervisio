# Seervisio Customer Journey — Fix Plan

## Phase 1 (today — unblock users)
1. Fix redirect loop (P0-1): Delete middleware onboarding gate at `middleware.ts:217-220`
2. Fix hero CTAs (P0-2): Change `/login` → `/signup` in `hero-section.tsx:125`, `cta-section.tsx:43,49`
3. Fix lifetime billing label (P1-2): Show "1x Bayar, Akses Selamanya" instead of "1x Bayar, 1 Bulan" for lifetime packages in `checkout-client.tsx:354`
4. Fix profile name (P1-1): Change `profile.name = input.fullName` in `auth.actions.ts:54`

## Phase 2 (tomorrow — data integrity)
5. Add duplicate license constraint (P0-3): Partial unique index on `licenses(profile_id) WHERE status IN ('active','trial')`
6. Add upgrade/downgrade action (MISS-2): `upgradeLicenseAction` and `changeBillingCycleAction` in `license.actions.ts`
7. Trial flow (MISS-3): Set `is_trial=true` for first-time Starter users, 14-day trial expiry
8. Unify payment flows (P1-5): Switch platform console to use `approveLicensePaymentAction`

## Phase 3 (next — friction removal)
9.  Forgot password (P0-4): Wire `login-form.tsx:140-146` to `resetPasswordForEmail`
10. Middleware error codes (P0-5): Map `account_disabled`, `no_brand_access` in `login-form.tsx:16-19`
11. Handle brand creation failure (P1-4): Store flag on profile, retry in welcome page
12. Legacy approval email (P1-6): Add `Mailer.send` in `verifyLicenseOrderAction`
13. Enforce impersonation read-only (MISS-4): Check `isImpersonating` in `requireActionPermission`
14. ErrorBoundary (MISS-5): Create component, wrap panel content

## Phase 4 (polish)
15. Fix Suspense fallbacks (MISS-6a): Replace `fallback={null}` on 4 routes
16. Full coupon validation (P2-2): Add `minOrderAmount`/`maxUses` at session creation
17. License expiry email cron (P2-3): Daily cron for `license-expiring`/`license-expired`
18. Password reset template wiring (P2-3): Create `sendPasswordResetAction`
19. Fix stale `/panel/licenses` route (P2-5): Change to `redirect("/license")`
20. CTA for pending payment users (P2-6): Show "Complete Payment" instead of hiding
21. Fix "Continue Setup" CTA target (P2-7): Point to `auth.dashboardHref`
22. License center section ordering (P2-8): Waiting Verification above Active License
23-28. P3 items: Delete dead code, consolidate functions, precondition checks, POS guard
