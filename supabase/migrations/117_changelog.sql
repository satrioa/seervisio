-- ============================================================
-- 117_changelog.sql
--
-- Changelog system for landing page "What's New" section.
-- Platform admin creates entries; landing page reads published ones.
-- ============================================================

-- 1. Changelog versions --------------------------------------

create table if not exists public.changelog_versions (
  id          uuid primary key default gen_random_uuid(),
  version     text not null unique,
  release_date date not null,
  title       text not null,
  summary     text,
  featured    boolean not null default false,
  slug        text,
  status      text not null default 'draft'
    check (status in ('draft', 'published', 'scheduled', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Changelog items (individual changes within a version) ----

create table if not exists public.changelog_items (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references public.changelog_versions(id) on delete cascade,
  category    text not null check (category in (
    'feature', 'improvement', 'bugfix', 'breaking', 'security', 'uiux', 'performance'
  )),
  title       text not null,
  description text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_changelog_items_version
  on public.changelog_items(version_id);

-- 3. RLS -----------------------------------------------------

alter table public.changelog_versions enable row level security;
alter table public.changelog_items enable row level security;

-- Everyone can read published versions.
drop policy if exists cv_select on public.changelog_versions;
create policy cv_select on public.changelog_versions
  for select using (status = 'published' or 'PLATFORM_OWNER' = any(public.get_user_roles()));

drop policy if exists ci_select on public.changelog_items;
create policy ci_select on public.changelog_items
  for select using (
    version_id in (
      select id from public.changelog_versions where status = 'published'
    )
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

-- Platform owner can manage.
drop policy if exists cv_all on public.changelog_versions;
create policy cv_all on public.changelog_versions
  for all using ('PLATFORM_OWNER' = any(public.get_user_roles()));

drop policy if exists ci_all on public.changelog_items;
create policy ci_all on public.changelog_items
  for all using ('PLATFORM_OWNER' = any(public.get_user_roles()));

-- 4. Seed data -----------------------------------------------

insert into public.changelog_versions (version, release_date, title, summary, featured, status, slug) values
  ('v1.2.0', '2026-07-20', 'AI Command Center', 'Pengalaman baru dalam mengelola toko servis dengan kecerdasan buatan.', true, 'published', 'v1-2-0'),
  ('v1.1.5', '2026-06-15', 'Performance Boost', 'Peningkatan performa signifikan di seluruh platform.', false, 'published', 'v1-1-5'),
  ('v1.1.4', '2026-05-20', 'Inventory Revamp', 'Sistem inventori yang lebih intuitif dan powerful.', false, 'published', 'v1-1-4'),
  ('v1.1.3', '2026-04-10', 'Bug Fixes & Improvements', 'Perbaikan berbagai issue dan peningkatan UX.', false, 'published', 'v1-1-3'),
  ('v1.0.0', '2026-03-01', 'Launch', 'Peluncuran perdana Seervisio untuk umum.', false, 'published', 'v1-0-0')
on conflict (version) do nothing;

insert into public.changelog_items (version_id, category, title, description, order_index) values
  -- v1.2.0
  ((select id from public.changelog_versions where version = 'v1.2.0'), 'feature', 'AI Command Center', 'Asisten AI yang membantu Anda mencari dan mengelola data platform hanya dengan perintah teks atau suara.', 1),
  ((select id from public.changelog_versions where version = 'v1.2.0'), 'feature', 'Global Command Menu', 'Akses cepat ke seluruh fitur platform dari satu tempat. Cukup tekan Ctrl+K atau Cmd+K.', 2),
  ((select id from public.changelog_versions where version = 'v1.2.0'), 'feature', 'Dynamic Island Insight', 'Widget cerdas yang menampilkan informasi penting secara real-time di dashboard.', 3),
  ((select id from public.changelog_versions where version = 'v1.2.0'), 'improvement', 'Performa Dashboard meningkat 42%', 'Waktu muat halaman utama dan laporan keuangan kini jauh lebih cepat.', 4),
  ((select id from public.changelog_versions where version = 'v1.2.0'), 'improvement', 'Optimasi Inventori', 'Sistem stok dan pencarian produk lebih responsif.', 5),
  ((select id from public.changelog_versions where version = 'v1.2.0'), 'bugfix', 'Perbaikan login Google', 'Mengatasi issue autentikasi Google pada perangkat tertentu.', 6),
  ((select id from public.changelog_versions where version = 'v1.2.0'), 'bugfix', 'Perbaikan Tour Guide', 'Panduan pengguna baru kini berjalan dengan lancar.', 7),
  -- v1.1.5
  ((select id from public.changelog_versions where version = 'v1.1.5'), 'performance', 'Optimasi Database Query', 'Waktu respon API menurun hingga 60% pada halaman dengan data besar.', 1),
  ((select id from public.changelog_versions where version = 'v1.1.5'), 'performance', 'Lazy Loading Images', 'Gambar produk dan layanan kini dimuat secara progresif.', 2),
  ((select id from public.changelog_versions where version = 'v1.1.5'), 'improvement', 'Compression Asset', 'Ukuran bundle JavaScript berkurang 35%.', 3),
  ((select id from public.changelog_versions where version = 'v1.1.5'), 'bugfix', 'Perbaikan filter laporan', 'Filter tanggal pada laporan keuangan kini berfungsi dengan benar.', 4),
  -- v1.1.4
  ((select id from public.changelog_versions where version = 'v1.1.4'), 'feature', 'Bulk Stock Update', 'Import dan update stok secara massal menggunakan file Excel.', 1),
  ((select id from public.changelog_versions where version = 'v1.1.4'), 'feature', 'Stock Opname Mobile', 'Lakukan opname stok langsung dari perangkat mobile.', 2),
  ((select id from public.changelog_versions where version = 'v1.1.4'), 'improvement', 'Sistem Kategori Baru', 'Kategori inventori kini mendukung hierarki bertingkat.', 3),
  ((select id from public.changelog_versions where version = 'v1.1.4'), 'uiux', 'Redesain Halaman Inventori', 'Tampilan dan navigasi inventori yang lebih bersih dan intuitif.', 4),
  ((select id from public.changelog_versions where version = 'v1.1.4'), 'bugfix', 'Perbaikan duplicate SKU', 'Sistem kini mencegah pembuatan SKU ganda.', 5),
  -- v1.1.3
  ((select id from public.changelog_versions where version = 'v1.1.3'), 'bugfix', 'Perbaikan notifikasi email', 'Email notifikasi pesanan kini terkirim dengan konsisten.', 1),
  ((select id from public.changelog_versions where version = 'v1.1.3'), 'bugfix', 'Perbaikan export PDF', 'File PDF laporan kini memiliki format yang benar.', 2),
  ((select id from public.changelog_versions where version = 'v1.1.3'), 'improvement', 'Peningkatan keamanan session', 'Sesi login lebih aman dengan token refresh otomatis.', 3),
  ((select id from public.changelog_versions where version = 'v1.1.3'), 'uiux', 'Tooltip pada ikon navigasi', 'Setiap ikon menu kini memiliki tooltip untuk memudahkan navigasi.', 4),
  -- v1.0.0
  ((select id from public.changelog_versions where version = 'v1.0.0'), 'feature', 'Manajemen Servis', 'Kelola servis masuk, proses, dan selesai dalam satu dashboard.', 1),
  ((select id from public.changelog_versions where version = 'v1.0.0'), 'feature', 'POS System', 'Kasir digital yang cepat dan terintegrasi dengan inventori.', 2),
  ((select id from public.changelog_versions where version = 'v1.0.0'), 'feature', 'Manajemen Inventori', 'Pantau stok barang, sparepart, dan produk secara real-time.', 3),
  ((select id from public.changelog_versions where version = 'v1.0.0'), 'feature', 'Laporan Keuangan', 'Laporan laba rugi, arus kas, dan analisis bisnis otomatis.', 4),
  ((select id from public.changelog_versions where version = 'v1.0.0'), 'feature', 'Multi-Cabang', 'Kelola beberapa cabang toko dalam satu platform.', 5),
  ((select id from public.changelog_versions where version = 'v1.0.0'), 'feature', 'Tour Guide Interaktif', 'Panduan langkah demi langkah untuk pengguna baru.', 6)
on conflict do nothing;

-- 5. updated_at trigger --------------------------------------

drop trigger if exists trg_changelog_versions_updated on public.changelog_versions;
create trigger trg_changelog_versions_updated before update on public.changelog_versions
  for each row execute function public.touch_updated_at();
