---
title: "Right Sidebar Halaman Services"
date: 2026-06-09
author: "System Design"
status: draft
---

## Problem

Halaman Services saat ini menggunakan ServiceDetailModal (popup dialog) untuk menampilkan detail servis. Ini tidak optimal karena user harus membuka/menutup modal setiap kali ingin melihat detail, dan tidak bisa melihat daftar servis bersamaan dengan detail.

## Solution

Right sidebar tetap yang lives di luar `<main>` content, dikelola via React Context. Menggantikan modal sepenuhnya.

## Architecture

### Komponen Baru

| Komponen | Lokasi | Fungsi |
|---|---|---|
| `RightSidebarProvider` | `src/components/layout/right-sidebar-context.tsx` | Context provider + hook `useRightSidebar()` |
| `RightSidebarPanel` | `src/components/layout/right-sidebar-panel.tsx` | Panel fisik sidebar |
| `ServiceSidebarOverview` | `src/components/services/service-sidebar-overview.tsx` | Default view: stat cards + line chart |
| `ServiceSidebarDetail` | `src/components/services/service-sidebar-detail.tsx` | Detail servis (adaptasi dari modal) |

### RightSidebarContext

Menyediakan state dan methods:

- `type: "overview" | "detail" | "closed"`
- `data: ServiceRecord | null`
- `isOpen: boolean`
- `showOverview()` — set ke overview mode
- `showDetail(service)` — set ke detail mode dengan data
- `close()` — close sidebar
- `toggle()` — open/close toggle

### RightSidebarPanel

- Render di `panel-layout-client.tsx` sebagai sibling dari `<SidebarProvider>`, di luar `<SidebarInset>` tapi di dalam flex container
- **Desktop**: `sticky top-0 h-screen w-[400px] border-l bg-background overflow-y-auto`, dengan transisi CSS lebar `w-0` ↔ `w-[400px]` saat buka/tutup
- **Mobile** (<1024px): shadcn Sheet slide from right, full width
- Background: `bg-background` dengan `border-l`

### Layout Panel

```
<div className="flex min-h-screen bg-[#f3f2f0]">
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header>...</header>
      <main>...</main>
    </SidebarInset>
  </SidebarProvider>
  <RightSidebarPanel />   ← di luar SidebarProvider/SidebarInset
</div>
```

Kontainer `flex` secara natural membagi ruang: Sidebar (collapsible) + SidebarInset (flex-1) + RightSidebarPanel (fixed width 400px).

### ServiceSidebarOverview

Default view saat tidak ada servis yang dipilih:

1. **Header**: "Overview Servis" + tombol close (×)
2. **Stat cards**: 4 kartu kecil horizontal (grid 2×2):
   - Total Masuk (hari ini)
   - Dalam Perbaikan
   - QC
   - Selesai (hari ini)
3. **Line chart**: Trend 14 hari
   - Recharts LineChart in ChartContainer
   - Sumbu X: tanggal (14 hari terakhir)
   - Sumbu Y: jumlah servis
   - Dua garis: "Dalam Proses" (aggregate masuk+perbaikan+QC) dan "Selesai"
   - Warna: `hsl(var(--chart-1))` untuk Dalam Proses, `hsl(var(--chart-2))` untuk Selesai
   - Tooltip dengan date formatting
4. **Footer**: Info ringan tentang status servis terkini atau tip cepat

### ServiceSidebarDetail

Detail servis (adaptasi konten dari ServiceDetailModal tanpa dialog wrapper):

1. **Header**: ID servis + device icon + status badge + tombol close (×)
2. **Scrollable content area**:
   - Info grid (2×2): Pelanggan, Perangkat, Layanan, Pembayaran
   - Issue & Diagnosis
   - Status stepper (progress bar horizontal)
   - Timeline aktivitas
   - Spareparts list
   - Notes
3. **Sticky bottom bar**: tombol Update Status, Tambah Sparepart, Terima Pembayaran, Tutup

## Data Flow

1. **Page mount** (`services/page.tsx` useEffect):
   - Panggil `showOverview()` → sidebar terbuka dengan overview

2. **User klik service** (list-view.tsx / kanban-view.tsx):
   - Panggil `showDetail(service)` → sidebar beralih ke detail mode
   - ServiceDetailModal TIDAK muncul (sudah diganti)

3. **User klik close / pilih service lain**:
   - Close → `close()` → sidebar collapse (type = "closed")
   - Klik service lain → `showDetail(otherService)` → konten berganti

4. **Mobile**:
   - Sidebar sebagai Sheet, otomatis open/close
   - State tetap di context, Sheet controlled via isOpen

## Chart Detail

- **Library**: Recharts LineChart
- **Wrapper**: shadcn ChartContainer
- **Data structure**: Array of `{ date: string, inProgress: number, completed: number }`
- **X-axis**: dataKey="date", format tanggal pendek (dd/mm)
- **Lines**: dua `<Line>` components
- **Colors**: `hsl(var(--chart-1))` untuk inProgress, `hsl(var(--chart-2))` untuk completed
- **Dataset**: Mock data 14 hari untuk sekarang (generate via helper function di service-data.ts)
- **Responsive**: ChartContainer menyesuaikan lebar sidebar

## Mock Data

Tambahkan di `service-data.ts`:
- Fungsi `generateTrendData()` → return array 14 entry `{ date, inProgress, completed }`
- Menggunakan mock services sebagai basis, atau synthetic data untuk demo

## Responsive Behavior

| Breakpoint | Desktop (≥1024px) | Mobile (<1024px) |
|---|---|---|
| Posisi | Inline flex item, sticky | Sheet overlay dari kanan |
| Lebar | 400px | Full width |
| Transisi | CSS width transition + overflow-hidden | shadcn Sheet animation |
| Close | Otomatis konten tetap terlihat dengan w-0 | Sheet dismissed |

## Files Affected

### Created:
1. `src/components/layout/right-sidebar-context.tsx` (~60 lines)
2. `src/components/layout/right-sidebar-panel.tsx` (~120 lines)
3. `src/components/services/service-sidebar-overview.tsx` (~150 lines)
4. `src/components/services/service-sidebar-detail.tsx` (~400 lines, adaptasi dari modal)

### Modified:
1. `src/components/panel/panel-layout-client.tsx` — tambah provider + sidebar
2. `src/components/services/service-list-view.tsx` — ganti modal → useRightSidebar
3. `src/components/services/service-kanban-view.tsx` — ganti modal → useRightSidebar
4. `src/components/services/service-data.ts` — tambah generateTrendData()
5. `src/app/[brandSlug]/panel/services/page.tsx` — mount showOverview()

## Edge Cases

- **No services data**: Overview menunjukkan "Belum ada data servis" dengan chart kosong
- **Mobile**: Sheet otomatis open saat showDetail/showOverview dipanggil, otomatis close saat close()
- **Resize window**: Jika resize dari desktop ke mobile, state dipertahankan
- **Multiple clicks**: Klik service lain saat detail terbuka → konten berganti mulus
