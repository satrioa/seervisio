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

## Next planned feature
Spreadsheet Bulk Editor (Inventory → Products): Airtable-like grid with
inline edit, Excel paste (TSV), live validation, dirty-state, preview,
transactional save (one audit batch + activity log), virtualization for 10k+
rows, mobile read-only. To be brainstormed → spec in `docs/superpowers/specs/`.

## Relevant files
- `docs/PROJECT_CONTEXT.md` — full agent reference
- `src/server/actions/action-helper.ts` — `ActionResult`, `requireActionPermission`
- `src/server/actions/license.actions.ts` — billing actions + cron orchestration
- `src/server/actions/welcome.actions.ts` — brand creation + trial assign
- `src/app/api/cron/billing/route.ts` — billing cron
- `src/server/domain/inventory-v4.types.ts`, `inventory-v4.repository.ts`,
  `inventory-v4.actions.ts` — inventory subsystem
- `supabase/migrations/130`–`136` — billing schema + cron RPCs
- `vercel.json` — cron schedule
- `src/lib/supabase/admin.ts` — service-role client
