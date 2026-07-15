# Platform v2 — Owner Console (Greenfield Rebuild)

- **Date:** 2026-07-15
- **Status:** Draft for review
- **Author:** opencode + owner
- **Template:** https://github.com/arhamkhnz/next-shadcn-admin-dashboard (Next.js 16 + Tailwind v4 + Shadcn UI)

---

## 1. Context & Goal

Platform v1 (owner console di repo Seervisio saat ini) sudah punya banyak route tapi
"terlalu banyak gap" — beberapa fitur masih placeholder (Support Tickets kosong),
billing masih manual, tidak ada manajemen kupon, dan tidak ada enforcement limit.

Platform v2 adalah **greenfield rewrite dari owner console saja** menggunakan
template shadcn admin dashboard sebagai basis UI, dengan arsitektur yang lebih
bersih. App tenant/customer tetap v1 dan berbagi DB Supabase yang sama.

**Tujuan:** console manajemen tenant yang premium, lengkap (tutup gap kritis),
dan mudah dikembangkan — tanpa mengganggu v1 sampai cut-over.

---

## 2. Keputusan Kunci (hasil brainstorming)

| # | Pertanyaan | Keputusan |
|---|-----------|-----------|
| 1 | Tipe rebuild | **C. Greenfield rewrite** (arsitektur bersih, pertahankan skema DB + aturan bisnis inti) |
| 2 | Strategi repo & DB | **Repo terpisah, Supabase project & DB SAMA** (tidak ada migrasi data) |
| 3 | Cakupan app | **A. Hanya owner console** (app tenant tetap v1, share DB) |
| 4 | Modul MVP | **A. Carry-over + tutup gap kritis** (Support, Kupon, Enforcement) |
| 5 | Pemakaian template | **B. Scaffold dari template, lalu sesuaikan** (hapus demo, sambungkan ke Supabase) |
| 6 | Template spesifik | `arhamkhnz/next-shadcn-admin-dashboard` (Next 16 + Tailwind v4 + Shadcn UI) |

---

## 3. Template Stack (dari riset repo)

- **Framework:** Next.js 16 (App Router), TypeScript, **Tailwind CSS v4**
- **UI:** Shadcn UI (registry terbaru, berbasis Radix)
- **Validation:** Zod
- **Forms & State:** React Hook Form, Zustand
- **Tables:** TanStack Table
- **Tooling:** Biome, Husky
- **Fitur template:** multiple dashboards (Default/CRM/Finance/Analytics/…),
  auth screens, theme presets (light/dark + Tangerine/Brutalist/Soft Pop),
  collapsible sidebar, layout controls
- **Belum ada:** RBAC & multi-tenant (status "planned") → kita implement sendiri

**Implikasi versi:** v2 pakai Next 16 + Tailwind v4 (beda dari v1 yang
Next 14/15 + Tailwind v3). Karena repo terpisah, ini aman. Tailwind v4 pakai
konfigurasi CSS-based (`@theme`), bukan `tailwind.config.ts` seperti v1 — jadi
token warna Seervisio (`--platform-primary` dll) didefinisikan ulang di CSS v4.

---

## 4. Arsitektur & Struktur Proyek

- **Repo baru** `platform-v2/` (git terpisah), scaffold dari template di atas.
- **Deploy terpisah** ke `v2.seervisio.com`; v1 tetap di `platform.seervisio.com`.
- **DB sama:** env Supabase identik dengan v1
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`).
- **Struktur colocation** (sesuai template): tiap fitur punya folder sendiri
  berisi page + komponen + logic.

```
platform-v2/
  src/
    app/
      (auth)/            # login (dari template, di-wire ke Supabase)
      (dashboard)/
        layout.tsx       # shell: sidebar + topbar + theme (dari template)
        dashboard/page.tsx
        tenants/...
        packages/...
        subscriptions/...
        licenses/...
        coupons/...
        usage/...        # + enforcement
        revenue/...
        support/...
        health/...
        monitoring/...
        logs/...          # audit + system
        settings/...
    features/            # colocated: tiap modul punya subfolder
      tenants/
      packages/
      coupons/
      enforcement/
      support/
      ...
    lib/
      supabase/          # client server + browser
      auth/              # PLATFORM_OWNER guard, get-user-roles wrapper
    components/ui/        # shadcn components (dari template)
    components/          # shared: stat-card, chart-card, activity-list, dsb grid
```

- **Middleware:** proteksi `(dashboard)` → redirect ke `(auth)/login` kalau bukan
  PLATFORM_OWNER (logika sama seperti v1, tulis ulang di v2).

---

## 5. Daftar Modul v2 (MVP)

| Modul | Sumber | Catatan |
|-------|--------|---------|
| Dashboard | Carry-over + percantik | Overview console (Business/Customer KPI, charts, commerce, ops, infra) |
| Tenants | Carry-over | CRUD brand, owner, suspend/reactivate, login-as-tenant, health |
| Packages | Carry-over | CRUD paket + limit, billing duration |
| Subscriptions & Licenses | Carry-over | status langganan, siklus lisensi, approval pembayaran manual |
| **Coupons/Diskon** | **BARU** | manajemen kode kupon + pemakaian |
| **Usage & Enforcement** | Carry-over + **BARU** | monitor pemakaian + alert/blokir otomatis kalau lewat limit |
| Revenue | Carry-over | MRR/ARR, tren, breakdown |
| **Support/Tickets** | **BARU** | list tiket, assign, balas, status, prioritas |
| System Health & Monitoring | Carry-over | DB/storage/email/jobs/API, cron, queue |
| Audit & System Logs | Carry-over | trail + log level |
| Settings | Carry-over | maintenance, signup toggle, SMTP, feature flags, branding |

Billing tetap **manual** (alur verify yang sudah ada di v1 dipertahankan).

---

## 6. Data & Auth (reuse, bukan bikin ulang skema)

- **Skema DB, RLS, Auth users, Storage bucket = sama persis dengan v1** (DB share).
- Karena repo terpisah, v2 **tidak bisa import** TS module v1. Maka v2 implement
  **data-access layer sendiri**: repositories + server actions ditulis ulang
  terhadap skema yang sama (copy-adapt, patuh kontrak nama tabel/kolom/RLS).
- **Auth:** Supabase Auth (email/password). Guard `PLATFORM_OWNER` via
  `get_user_roles()` (sudah ada di DB v1). Template auth screens dipakai
  visualnya, logikanya di-wire ke Supabase.
- **Konfigurasi Supabase yang wajib di-set:**
  - Tambahkan `v2.seervisio.com` ke **Auth → Redirect URLs** & **Site URL**.
  - Tambahkan domain v2 ke **Allowed Origins / CORS**.
  - Pastikan RLS policy v1 kompatibel dengan query v2.

---

## 7. Modul Gap Baru — Sketsa Skema

### 7.1 Coupons
```sql
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null check (type in ('percent','fixed')),
  value numeric not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  max_uses int,
  used_count int not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
-- hubungan ke checkout_sessions / license_payments via coupon_code
```
Behavior: saat checkout (di app tenant/v1) memakai `coupon_code`, diskon
diterapkan & `used_count` naik. v2 hanya mengelola master kupon.

### 7.2 Enforcement
- View/trigger membandingkan pemakaian tenant vs `packages.max_*`:
  branches, users, storage_mb, transactions.
- Saat lewat → set flag `brands.limit_status` (enum: ok | warning | exceeded)
  + tulis ke `audit_logs` + notifikasi owner & tenant.
- UI v2: halaman Usage menampilkan progress bar per kuota + badge status.
- Blokir (hard) bersifat opsional di MVP; MVP fokus ke **alert + visibility**.

### 7.3 Support Tickets
```sql
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  brand_id int references public.brands(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.support_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  body text not null,
  author_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```
Behavior: owner buka tiket per tenant, balas, ubah status/priority, assign.

---

## 8. Visual & Theme

- Pakai **shell template** (sidebar collapsible, topbar dengan search/
  notification/theme, breadcrumb, settings panel).
- **Branding Seervisio:** definisikan preset tema kustom di Tailwind v4
  (`@theme`) dengan aksen hijau `--platform-primary` (160 68% 53%) menggantikan
  preset default (Tangerine/dll). Pertahankan nuansa minimal, monochrome,
  spacing generos seperti yang sudah kita terapkan di redesign console v1.
- Komponen reusable (copy dari v1 lalu adaptasi ke shadcn v4):
  `PlatformStatCard`, `PlatformChartCard`, `PlatformActivityList`,
  `PlatformSection`, `PlatformDashboardGrid`, `PlatformEmptyState`,
  `PlatformSkeleton`.
- Charts: pakai approhe template (Recharts/shadcn chart) dengan palet
  monochrome + aksen hijau.

---

## 9. Migrasi & Cut-over

1. Scaffold v2 di repo baru, sambungkan ke Supabase v1 (env sama).
2. Bangun modul MVP bertahap (lihat §10 urutan).
3. Jalankan **side-by-side**: v2 di `v2.seervisio.com`, v1 tetap produksi.
4. Uji parity data (tenant/paket/lisensi yang sama terbaca v2).
5. **Cut-over:** ganti DNS/subdomain → `platform.seervisio.com` ke v2.
6. V1 di-retire setelah stabil.

Tidak ada migrasi data karena DB share.

---

## 10. Urutan Implementasi (disarankan)

1. Scaffold + theme Seervisio + auth (Supabase) + middleware PLATFORM_OWNER.
2. Shell dashboard + komponen reusable + Dashboard overview.
3. Tenants, Packages, Subscriptions & Licenses (carry-over).
4. Revenue, Usage + Enforcement, Health/Monitoring, Logs, Settings.
5. **Modul baru:** Coupons → Support Tickets (urutan bisa di-swap).
6. Polish, test, side-by-side, cut-over.

---

## 11. Testing

- Reuse kontrak SQL yang sama → tidak perlu test RLS ulang, tapi v2 punya
  data-access layer sendiri → test repository/action v2 (vitest).
- Test khusus 3 modul baru:
  - Coupon: validitas (kadaluarsa, max_uses), penerapan diskon.
  - Enforcement: trigger saat pemakaian lewat limit → `limit_status` benar.
  - Ticket: lifecycle (open→pending→resolved→closed), reply.
- E2E smoke: login owner → buka tiap modul → data sama dengan v1.

---

## 12. Risks & Caveats

- **Tailwind v4 vs v3:** konfigurasi beda (CSS `@theme`). Token v1 perlu
  diterjemahkan; jangan asumsikan `tailwind.config.ts` sama.
- **RLS kompatibilitas:** query v2 harus lolos policy v1; verifikasi tiap akses.
- **Auth redirect:** domain v2 wajib didaftarkan di Supabase Auth.
- **Template demo:** banyak screen/auth adalah mock — wajib di-wire ke
  Supabase, jangan dipakai begitu saja.
- **Next 16 + React Compiler:** pastikan dependency (recharts, dsb) kompatibel.

---

## 13. Out of Scope (v2 phase 1)

- Rewrite app tenant/customer (tetap v1).
- Billing gateway otomatis (Stripe/Xendit) — tetap manual di MVP.
- Announcement/broadcast massal.
- Rewrite arsitektur DB/RLS (tetap pakai skema v1).
