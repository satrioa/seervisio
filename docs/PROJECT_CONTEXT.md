# Seervisio — Project Context (Agent Reference)

> Single source of truth for AI agents working in this repo. Read this before
> exploring. Keep it updated as the project evolves.

## What Seervisio is
Seervisio is a **multi-tenant SaaS ERP for service/repair businesses** (phone/laptop
repair shops, sparepart retailers, resellers). It is the customer's *operating
system* — POS, inventory, services, finance, customer management, and licensing
all live here. There is **no Google Sheets integration**; the product is
intentionally the single source of truth (a planned in-app Spreadsheet Bulk
Editor replaces spreadsheet workflows).

## Tech Stack
- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5.7
- **Styling:** Tailwind CSS v4, `tailwind-merge`, `tailwind-variants`
- **UI components:** In-repo component libraries under `src/components/`
  (`8starlabs-ui`, `reui`, `matos-ui`, `ui`, plus feature folders). No external
  shadcn registry is installed — **use the existing component libraries**, do not
  introduce a new UI kit without asking.
- **Backend:** Supabase (Postgres + Auth + Storage + RLS). DB schema is managed
  by SQL migrations in `supabase/migrations/` (numeric `<NNN>_name.sql` pattern;
  **two migrations cannot share a version number** — rename collisions cause
  `db push` duplicate-key failures).
- **Email:** `src/server/mail/` (Brevo). Templates are `.tsx` in
  `src/server/mail/templates/`; register new templates in `mailer.ts`'s
  `EmailTemplate` union + `TEMPLATES` map.
- **Animations:** Framer Motion (existing components use it; follow the premium,
  Apple/Linear/Notion aesthetic — no "Excel 2007" look).

## Conventions (follow these or ask first)
- **Server actions** live in `src/server/actions/*.actions.ts`. Every action
  returns `ActionResult<T>` (defined in `src/server/actions/action-helper.ts`):
  `{ success, data?, error? }`. Use `successResult(data)` / `errorResult(msg)`.
  Auth via `requireAuth()` (`src/lib/auth/require-auth.ts`) and
  `requireActionPermission(role, permission)` (`action-helper.ts`). Platform-only
  actions use `requirePlatformOwner()`.
- **Data layer:** `src/server/repositories/*` (DB queries), `src/server/domain/*`
  (types + mappers), `src/server/services/*` (orchestration). Service-role client
  for admin/backfill: `createServiceRoleSupabaseClient()` (`src/lib/supabase/admin.ts`).
- **Types** are centralized in `src/types/` and `src/server/domain/*`.
- **Testing:** `npm test` → **vitest** (NOT jest). Test files in `src/__tests__/`.
  Run a single file: `npx vitest run src/__tests__/name.test.ts`.
- **Typecheck:** `npx tsc --noEmit -p tsconfig.json`. Aim for zero errors.
- **Build:** `npm run build` (or `npx next build`).

## Routing model (important)
- Brand-scoped app lives under `src/app/[brandSlug]/panel/...` (e.g. inventory,
  licenses, pos). Most business data is **brand-scoped** (`brand_id` column, RLS).
- Platform/admin console lives under `src/app/platform/...` (packages, licenses,
  tenants, usage).
- Auth pages under `src/app/(auth)/...`; marketing/landing under `src/app/`.
- API routes under `src/app/api/...` (e.g. `api/cron/billing` — see Cron below).

## Multi-tenancy & auth
- A user has memberships (`user_brand_memberships`) with a `role`
  (MASTER_ADMIN, ADMIN, FRONTLINER, TECHNICIAN, CASHIER, PLATFORM_OWNER).
- RLS is enforced on `brand_id`. **Beware recursive RLS** — helper functions like
  `get_user_brand_ids()`, `get_user_roles()`, `get_user_branch_ids()` are
  `SECURITY DEFINER` (migration `133_fix_rls_recursion.sql`). Don't reintroduce
  non-SECURITY-DEFINER policy helpers.
- Service-role client bypasses RLS — use it sparingly, only in trusted server
  actions/repositories.

## Licensing & Billing module (recently built)
Implemented per the Billing & Subscription spec (Phases 1–5). Key files:
- `src/types/license.ts`, `src/lib/customer-journey/license-status.ts`,
  `src/lib/billing/billing-helpers.ts`
- `src/server/actions/license.actions.ts` (trial assign, downgrade scheduling,
  renewal preference, reject/replace proof, suspend, **cron orchestration**)
- `src/server/repositories/license.repository.ts`
- Migrations `130`–`136` (schema, payment renewal pref, expiry notify,
  expiry RPC, RLS fix, atomic finance, billing duration, expire-active-licenses).
- **Cron:** `src/app/api/cron/billing/route.ts` (GET+POST), gated by `CRON_SECRET`
  env var, scheduled daily via `vercel.json` (`0 1 * * *`). It runs
  `expire_pending_orders()`, `apply_scheduled_downgrades()`,
  `expire_active_licenses()`, and the H-30 expiry reminder. **Set `CRON_SECRET`
  in hosting env** (Vercel) — generate with
  `[Convert]::ToBase64String([byte[]]::new(32))` style; it is self-created, not
  from Supabase/Vercel.
- Trial is auto-assigned 1× per tenant in `createCustomerBrandAction`
  (`src/server/actions/welcome.actions.ts`).

## Inventory module (mature, V4)
`inventory-v4` is the production-ready inventory + POS subsystem. Key facts:
- Data model: **Product → Variants** (each variant has sku, barcode, stock,
  costPrice, sellingPrice, minStock). Plus Categories, Branches, Movements
  (audit), Stock Purchases, Stock Opname, Service Sparepart Usage, POS V4.
- Types: `src/server/domain/inventory-v4.types.ts`; repository:
  `src/server/repositories/inventory-v4.repository.ts`; actions:
  `src/server/actions/inventory-v4.actions.ts`; service:
  `src/server/services/inventory.service.ts`.
- Routes: `src/app/[brandSlug]/panel/inventory-v4/...`, `pos-v4/...`.
- Status doc: `docs/inventory-v4-status.md`.
- **Planned:** a Spreadsheet Bulk Editor under Inventory (Products) — see
  `docs/superpowers/specs/` once brainstormed. It must reuse variant-level edits
  (sku/stock/cost/price/minStock), live validation, transactional save with one
  audit batch + activity log, paste-from-Excel (TSV parse), virtualization for
  10k+ rows.

## Environment / secrets
- `.env.local` is gitignored (contains secrets — do NOT commit).
- `.env.example` documents required vars (Supabase URL/keys, Brevo, `CRON_SECRET`).
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`,
  `NEXT_PUBLIC_SITE_URL=https://seervisio.vercel.app`.
- Supabase keys come from Supabase Dashboard (Project Settings → API). `CRON_SECRET`
  is self-generated (see Licensing section).

## Running locally
1. `npm install`
2. Copy `.env.example` → `.env.local`, fill values (Supabase URL/keys, Brevo key).
3. `npm run dev` (Next dev on :3000).
4. `supabase db push` to apply migrations to the linked remote DB (use
   `--include-all` if local migrations predate the remote's last migration, and
   **rename any `<NNNa>_` collisions** first).

## Agent gotchas (hard-won)
- **Migration version collisions** crash `db push`. Two files with the same
  numeric prefix → rename the later one to the next free number.
- **Don't use jest** — the project uses vitest. `npx jest` fails with babel errors.
- **`tsc` vs vitest**: a stray untracked test (`src/__tests__/license-duration.test.ts`)
  had a pre-existing type error; keep `tsc` clean for *project* files.
- **Server actions are not imported into client components directly** — call them
  via `import("@/...")` dynamic import inside other server actions, or pass as
  props from server components.
- **Email templates** must be added to the `EmailTemplate` union in `mailer.ts`
  or TypeScript rejects the `template` field.
- **RLS recursion**: never add non-SECURITY-DEFINER functions that read the same
  table a policy protects.
- **Premium aesthetic**: follow existing `8starlabs-ui`/`reui` components; match
  the monochrome, Apple/Linear/Notion design language.

## Where to look first by task
- New DB column/table → add a migration in `supabase/migrations/` (new version
  number), update types in `src/types/` or `src/server/domain/`.
- New UI page → look at existing `src/app/[brandSlug]/panel/*/page.tsx` for the
  pattern; reuse component libraries.
- New server action → mirror an existing `*.actions.ts`; return `ActionResult`.
- New email → add template `.tsx` + register in `mailer.ts`.
- Cron job → add RPC in a migration, call it from `src/app/api/cron/billing`.
