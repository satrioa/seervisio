# Seervisio — Agent Memory (living summary)

> This file is read by AI agents at session start. Keep it short; the full
> reference is `docs/PROJECT_CONTEXT.md`. Update after major work.

## What this project is
Multi-tenant SaaS ERP for service/repair shops (inventory, POS, services,
finance, customers, licensing). Next.js 15 + React 19 + Supabase + Tailwind v4.
Single source of truth — **no Google Sheets integration** (an in-app
Spreadsheet Bulk Editor is planned to replace spreadsheet workflows).

## Goal of last major work (completed)
Customer portal polish + panel performance optimization + ESC/POS thermal
printing, committed as `394219f`. See Recent work below.

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
- **Customer portal** (`/t/[token]`, `portal-client.tsx`): HelpSection
  "Butuh Bantuan?" (wa.me prefilled, tel: fallback) replaces Share card;
  horizontal ProgressTimeline stepper; panel-style activity timeline via the
  exact `ServiceActivityTimeline` component with `LIGHT_TIMELINE_THEME` scoped
  raw-var override. Portal dark-theme gotcha: app default is dark and
  `@theme inline` inlines raw vars, so override raw CSS vars
  (`--card`, `--background`, `--foreground`, `--muted`, `--muted-foreground`,
  `--border`) with light oklch, not `--color-*`.
- **Portal timeline fix**: `customer-portal.repository.ts` `statusTimeline`
  was selecting phantom columns — `service_status_history` has NO
  `status`/`created_at` (only `from_status, to_status, reason, metadata,
  changed_by, changed_at`). Now selects real cols + `changed_by_profile`
  join; `status=to_status??from_status`, `timestamp=changed_at`. Portal event
  mapping mirrors `deriveEventType`/`mapTimelineRowToEvent`
  (`service.actions.ts:884-1012`).
- **Panel performance (3 phases)**: `middleware.ts` parallelized — profile
  + brand (by slug) in batch 1, then membership + license in batch 2
  (was 4 sequential). Keep license query `OR(profile_id.eq.X,brand_id.eq.Y)`
  and membership `brand_id`-scoped (multi-brand users break `.single()`
  otherwise). Added `loading.tsx` skeletons for services/customers/dashboard/
  inventory-v4. Services page: `useTransition`/`isPending` instead of
  `isLoading`, dynamic imports (`next/dynamic`) for KanbanView/DetailSheet/
  CreateOverlay/PaymentPanel/SparepartPanel. `getServiceDetailAction`
  parallelized. Revalidation (`revalidatePath` + `revalidateTag
  services:${brandId}`) on create/status/cancel. Phase 3.4 optimistic updates
  **deliberately skipped** — all status flows are confirm dialogs with
  spinners; kanban already documents "no optimistic update" for note dialog.
- **Printing**: `escpos-invoice.ts` ESC/POS thermal encoder +
  `printer-encoder.test.ts` (vitest), `print-iframe.ts` print service,
  `invoice-print-popover.tsx`, `thermal-print-mode` body class in
  `globals.css` @media print (hides only `.no-print`), dynamic island fixed
  positioning desktop + mobile.
- **Docs sidebar link**: Documentation now `<a href="/docs" target="_blank">`
  instead of internal route.
- **POS type + category filters**: POS v4 items panel now has a client-side type
  filter row (`Semua | Produk | Unit`) above the existing category tabs.
  `activeType` state + `filteredProducts` memo filter on
  `PosProductV4Row.productKind` (`PRODUCT`/`UNIT`); category remains server-side
  via `fetchProducts(catId, search)`. New "Tidak ada item untuk filter ini"
  empty state when type filter excludes everything.
- **Per-type categories (POS + inventory)**: Categories were already typed in
  DB (`inventory_categories.item_type`: SPAREPART/PRODUCT/DEVICE_UNIT). POS
  now adapts its category tabs to the active type (Produk→item_type PRODUCT,
  Unit→DEVICE_UNIT, Semua→all; `visibleCategories` memo + `handleTypeChange`
  resets category if it no longer belongs). `listPosCategoriesV4` already
  excludes SPAREPART. CategoryManagerDialog now has an explicit type selector
  (Sparepart/Produk/Unit) with type-scoped title ("Kelola Kategori — X") and
  scoped create/list. Product/UnitSecond/Edit forms label the Kategori field as
  "Kategori · {type}" to signal scoping. Mirrored in both `[brandSlug]` and
  `mockup/panel` copies.

- **Add Varian** (inventory detail): New `AddVariantV4Dialog` opened via "Add
  Varian" button in the `VariantDetailDialog` header (both `[brandSlug]` and
  `mockup`). Backed by new `CreateVariantV4Input` type, `createVariantV4` repo
  (inserts `inv_variants` + `inv_variant_stocks` + optional OPENING_STOCK
  movement), and `createVariantV4Action` (validates product brand/branch +
  active store + branch access). Form: name, attributes JSON, SKU, barcode,
  unit, minStock, cost/selling price, image URL, initial stock.
- **Z-index fix (committed `c07796c`)**: Dialog was raised to `z-[60]` while
  Radix floating primitives (Popover/Select/DropdownMenu/Tooltip) stayed `z-50`
  and portal to `<body>` — inside a dialog they mounted below the dialog layer →
  unclickable. Reverted `ui/dialog.tsx` + service dialogs to `z-50`, dropped
  `!z-[10010]` overrides in accounts/branches dialogs (4 files). Dynamic Island
  `z-[60]` + onboarding overlays kept intentionally.
- **Belanja Stok search fix (uncommitted)**: `searchPurchaseVariantsV4`
  (`inventory-v4.repository.ts:942`) originally built a single PostgREST query
  against `inv_variants` with embedded `inv_products!inner` joins plus embedded
  filters (`.eq("inv_products.brand_id")`, `.not`, `.or`) and an embedded-column
  `.order("inv_products.name")` — the combined embedded-filter pattern failed
  silently (action caught → UI kept empty results). First attempt (in-memory
  filter on same fragile base) didn't help; rewrote it as the proven
  `listPosProductsV4` multi-step pattern: query `inv_products` directly
  (brand, is_active, not UNIT, condition_type null/NOT SECOND, order by name),
  then `inv_variants` `.in("product_id")` `.eq("is_active", true)`, then one
  batched `inv_variant_stocks` fetch (`.in("variant_id")` + branch). Search
  filter applied in-memory over product/variant name, SKU, barcode. Kills the
  old N+1 stock query too. `npx tsc --noEmit` clean. Note: `doSearch` still
  bails silently when `branchId` is empty (`activeBranchId` null = ALL_BRANCHES).
- **Belanja Stok redesign — ExpandableScreen (uncommitted)**: `BelanjaStokDialog`
  in both `[brandSlug]` and `mockup` `inventory-v4/page.tsx` converted from
  `Dialog` to the (previously unused) `ExpandableScreen` component
  (`src/components/ui/expandable-screen.tsx`). API: root `<ExpandableScreen>`
  (children, defaultExpanded, onExpandChange, layoutId="expandable-card",
  triggerRadius="100px", contentRadius="24px", animationDuration=0.3,
  lockScroll=true), `ExpandableScreenTrigger` (wraps children in clickable
  motion.div — no `asChild`, put the Button inside), `ExpandableScreenContent`
  (renders `fixed inset-0 z-[9999]` full-screen morphing card; props
  className/showCloseButton/closeButtonClassName; close button absolute
  right-6 top-6), `useExpandableScreen()` → {isExpanded, expand, collapse}.
  Layout is now side-by-side: LEFT = purchase info fields + item list with
  totals + Batal/Preview buttons (`lg:w-[46%]`, border-r, own scroll);
  RIGHT = item search + results (`lg:flex-1`, own scroll). Body scroll locked
  while expanded. Page root wrapped in `<ExpandableScreen>`, Belanja Stok
  button → `ExpandableScreenTrigger` (internal state, `belanjaOpen` state
  removed), dialog props `open`/`onOpenChange` dropped → dialog uses
  `useExpandableScreen()` (`collapse()` on Batal/save). **Select gotcha**: Radix
  `SelectContent` portals to body at `z-50` — under the `z-[9999]` overlay, so
  the account `SelectContent` got `className="z-[10010]"` (same bug class as
  `c07796c`). Preview step + all submit logic preserved. `npx tsc --noEmit`
  clean. `Dialog`/`DialogHeader` imports still used by the page's other dialogs.

## Next move
- Commit the Belanja Stok search fix on its own (user's unstaged WIP in
  `inventory-v4/page.tsx`, `pos-v4/*` stays untouched).

## Relevant files
- `src/server/actions/*.actions.ts`, `src/server/actions/service.actions.ts`
- `src/components/services/*`, `src/components/dashboard/*`
- `src/services/printer/*`, `src/app/[brandSlug]/invoice|pos-receipt/*`
- `src/app/t/[token]/portal-client.tsx`, `src/server/repositories/customer-portal.repository.ts`
- `middleware.ts`, `src/app/[brandSlug]/panel/services/page.tsx` + `loading.tsx`
- `supabase/migrations/137_…,138_…,139_…`
