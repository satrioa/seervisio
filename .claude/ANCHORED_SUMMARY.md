# Seervisio — Agent Memory (living summary)

> This file is read by AI agents at session start. Keep it short; the full
> reference is `docs/PROJECT_CONTEXT.md`. Update after major work.

## What this project is
Multi-tenant SaaS ERP for service/repair shops (inventory, POS, services,
finance, customers, licensing). Next.js 15 + React 19 + Supabase + Tailwind v4.
Single source of truth — **no Google Sheets integration** (an in-app
Spreadsheet Bulk Editor is planned to replace spreadsheet workflows).

## Goal of last major work (completed)
Billing & Subscription spec (Phases 1–5): trial auto-assign, downgrade
scheduling, renewal preference, rejected-order handling, lifetime variant, full
license status set, and a daily billing cron with in-app + email notifications.
Merged in commit `21d22de`. See `docs/PROJECT_CONTEXT.md` (Licensing section).

## Stack & non-negotiables
- Next.js 15 App Router, React 19, TS 5.7, Tailwind v4, Framer Motion.
- Supabase: migrations in `supabase/migrations/` with **unique numeric version
  numbers** (collisions break `db push`); RLS brand-scoped; service-role client
  for trusted server code.
- UI: reuse in-repo component libs (`8starlabs-ui`, `reui`, `matos-ui`, `ui`).
  Premium monochrome aesthetic (Apple/Linear/Notion). No new UI kit.
- Tests: **vitest** (`npm test`), not jest. Typecheck: `npx tsc --noEmit`.

## Conventions
- Server actions in `src/server/actions/*.actions.ts`, return
  `ActionResult<T>` (`successResult`/`errorResult` from `action-helper.ts`).
  Auth via `requireAuth()` + `requireActionPermission(role, perm)`.
- Data layer: `repositories/` (queries) + `domain/` (types/mappers) +
  `services/` (orchestration).
- Brand-scoped routes under `src/app/[brandSlug]/panel/...`; platform under
  `src/app/platform/...`.
- Email: `src/server/mail/templates/*.tsx`, register in `mailer.ts`.

## Critical context / gotchas
- **Migrations:** never duplicate a version number; rename `<NNNa>_` files to the
  next free number before `supabase db push`. Use `--include-all` if local
  migrations predate remote's last.
- **Cron:** `src/app/api/cron/billing` (GET+POST), gated by `CRON_SECRET` env
  (self-generated, set in Vercel). Daily via `vercel.json` (`0 1 * * *`).
- **RLS recursion:** `get_user_brand_ids`/`get_user_roles`/`get_user_branch_ids`
  are `SECURITY DEFINER` (migration 133). Don't add non-DEFINER policy helpers.
- **Trial:** auto-assigned 1× per tenant in `createCustomerBrandAction`
  (`welcome.actions.ts`).
- `.env.local` is gitignored; `.env.example` lists required vars. Supabase keys
  from Supabase Dashboard API settings; `CRON_SECRET` is self-made.
- Inventory V4 is the production inventory+POS subsystem (`inventory-v4.*`).
  Product → Variants model (sku/stock/cost/price/minStock per variant).

## Goal of last major work (completed)
Committed the entire large uncommitted feature set (~110 files) as 13 logical
commits (`main`). See recent-commits list below for grouping.

## Recent work (all committed; `npx tsc --noEmit` clean)
- **Auto-close shifts + reconciliation**: cron `api/cron/auto-close-shifts`,
  `ShiftReconciliationModal`, `reconciliationStatus` on `StoreShift`,
  migration `137_auto_close_reconciliation.sql`.
- **Service billing editor + receipts**: `service-billing-editor`,
  `thermal-receipt`, injected `/invoice/[serviceId]` + `/pos-receipt/[transactionId]`
  routes, printer service (`src/services/printer/*`), printer/receipt settings
  pages, `barcode.ts`, `receipt-sections.ts`, migration `138_service_billing_items`.
- **Cancel service with payment** dialog + design doc.
- **Inventory dashboard rewrite**: `InventoryOverviewTab` → 2×2 KPI grid,
  stock movements + top spareparts; `dashboard.actions.ts`; overview v2.
- **Service overview v2** dashboard: Action-required + Pickup-queue cards,
  `getServiceOverviewV2Action` (needs root `requireAuth` — currently scope-visible).
- **Inventory-v4 sparepart add/remove**: `b-autocomplete` (new), return-to-stock
  migration `139_inv_return_sparepart_from_service`.
- **Service workflow**: kanban/list views, `ServiceActivityTimeline` (replaces
  deleted `service-detail-timeline.tsx`), technician-assign banner, `b-combobox` +
  `r-switch` (new), auto-assign tech on create for TECHNICIAN role.
- **Right sidebar**: hidden in Kanban (uses detail Sheet), click-outside close
  removed (Close button + Escape only).
- **Layout/app**: content-layout default → `full-width`; language pref default
  unchanged; tour disabled in `TourContext`; branch-access added across actions.
- **Landing/onboarding**: CTA logic (`#pricing` vs dashboard); onboarding polish.
- **Panel**: branch-scoped payment accounts, POS V4, technician-performance.
- **Deps/UI**: `@base-ui/react`, `@types/web-bluetooth`; matos-ui components,
  texture-overlay, examples; dynamic island + ui/* updates.

## Next move
- (none pending — repo stable, typecheck clean. Await next task.)

## Relevant files
- `src/server/actions/*.actions.ts`, `src/server/actions/service.actions.ts`
- `src/components/services/*`, `src/components/dashboard/*`
- `src/services/printer/*`, `src/app/[brandSlug]/invoice|pos-receipt/*`
- `supabase/migrations/137_…,138_…,139_…`
