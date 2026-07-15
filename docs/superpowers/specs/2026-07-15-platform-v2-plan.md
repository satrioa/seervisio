# Platform v2 — Implementation Plan

- **Date:** 2026-07-15
- **Depends on:** `2026-07-15-platform-v2-design.md`
- **Repo:** BARU (terpisah), Supabase project SAMA dengan v1
- **Template:** `arhamkhnz/next-shadcn-admin-dashboard` (Next 16 + Tailwind v4 + Shadcn UI)

---

## Prinsip

- Greenfield di repo terpisah; tidak ubah v1.
- Pakai skema DB/RLS v1 (share Supabase); v2 tulis data-access layer sendiri.
- Ikuti struktur colocation template; hapus semua demo page.
- Satu modul selesai = test lulus, sebelum lanjut modul berikutnya.

---

## Phase 0 — Scaffold & Foundation

1. **Init repo v2** di lokasi yang disepakati: clone template, `npm install`,
   setup git, `.env.local` dengan credential Supabase v1 (URL/ANON/SERVICE_ROLE/JWT).
2. **Theme Seervisio** (Tailwind v4 `@theme`): ganti preset default dengan
   aksen hijau `--platform-primary: 160 68% 53%`; definisikan `--chart-1..n`,
   `--sidebar-*`, `--success/warning/info` sesuai v1. Light/dark.
3. **Supabase clients** (`lib/supabase/`): browser client + server (service-role).
4. **Auth wiring**: ganti auth screen template → Supabase email/password.
   Helper `getPlatformUser()` + guard `PLATFORM_OWNER` via `get_user_roles()`.
5. **Middleware**: lindungi `(dashboard)` → redirect `(auth)/login`.
6. **Komponen reusable** (adaptasi dari v1 → shadcn v4): `PlatformSection`,
   `PlatformStatCard`, `PlatformChartCard`, `PlatformActivityList`,
   `PlatformDashboardGrid`, `PlatformEmptyState`, `PlatformSkeleton`.

**Done saat:** bisa login sebagai PLATFORM_OWNER, shell dashboard tampil dengan
branding Seervisio, route terproteksi.

---

## Phase 1 — Dashboard Overview

- `features/dashboard`: panggil repository agregat (lihat Phase 8 untuk
  `getPlatformConsoleData` yang di-adaptasi ke v2) → 7 section
  (Welcome, Business KPI, Customer KPI, Charts, Commerce, Operations, Infra).
- Charts: Recharts/shadcn chart, palet monochrome + aksen hijau.

**Done saat:** dashboard render data real dari DB v1 (tenant/paket/lisensi sama).

---

## Phase 2 — Carry-over: Tenants, Packages, Subscriptions & Licenses

- `features/tenants`: list (TanStack Table), detail, CRUD brand, suspend/
  reactivate, **login-as-tenant** (reuse konsep `loginAsTenantAction`).
- `features/packages`: CRUD paket + limit + billing duration.
- `features/subscriptions` + `features/licenses`: status, siklus, **approval
  pembayaran manual** (verify proof → active).
- Repository/action v2 untuk masing-masing (copy-adapt dari v1).

**Done saat:** CRUD + login-as-tenant + approval pembayaran jalan, parity dengan v1.

---

## Phase 3 — Revenue, Usage + Enforcement, Health/Monitoring, Logs, Settings

- `features/revenue`: MRR/ARR, tren, breakdown (reuse `getRevenueMetrics`).
- `features/usage` + **Enforcement**: progress bar per kuota (branches/users/
  storage/tx), badge `brands.limit_status` (ok/warning/exceeded), alert +
  tulis `audit_logs` saat lewat (trigger/view baru di DB).
- `features/health`, `features/monitoring`: reuse `checkSystemHealth`.
- `features/logs`: audit + system logs (reuse `getPlatformAuditLogs`).
- `features/settings`: maintenance, signup toggle, SMTP, feature flags, branding.

**Done saat:** semua modul baca/tulis data v1 dengan benar.

---

## Phase 4 — Modul Baru: Coupons

- Migrasi `coupons` (skema di spec §7.1).
- `features/coupons`: list, create/edit, toggle active, lihat pemakaian.
- Validasi: kadaluarsa, max_uses, type percent/fixed. (Penerapan diskon di
  app tenant tetap v1 — v2 hanya master.)

**Done saat:** CRUD kupon + validitas teruji.

---

## Phase 5 — Modul Baru: Support/Tickets

- Migrasi `support_tickets` + `support_replies` (skema di spec §7.3).
- `features/support`: list (filter status/priority), detail, balas, ubah
  status/priority, assign.
- Notifikasi ke tenant terkait (opsional MVP).

**Done saat:** lifecycle tiket + reply teruji.

---

## Phase 6 — Polish, Test, Side-by-side, Cut-over

- Responsif + empty/loading states + a11y.
- Test: vitest per repository/action v2; test 3 modul baru (coupon validity,
  enforcement trigger, ticket lifecycle); smoke E2E (login → tiap modul).
- Jalankan `v2.seervisio.com` side-by-side; verifikasi parity data.
- Cut-over DNS; retire v1.

---

## Catatan Blocking

- **Lokasi repo v2** harus disepakati sebelum Phase 0 (clone template).
- **Domain v2** didaftarkan ke Supabase Auth (Redirect URLs / CORS) sebelum
  testing auth.
- **RLS**: tiap query v2 harus lolos policy v1 — verifikasi per akses.
