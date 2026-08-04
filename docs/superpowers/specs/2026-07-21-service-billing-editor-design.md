# Service Billing Editor — Design Spec

## Problem

Tab Payment di Service Detail saat ini tidak memiliki flow untuk mengatur tagihan.
Jika `final_cost = 0`, tombol "Atur Tagihan" hanya muncul setelah klik "Receive Payment"
di panel terpisah. Tidak ada visual billing editor.

## Solusi

Billing editor inline di tab Payment dengan multi-line items, persist ke tabel baru
`service_billing_items`, didukung permission khusus `service.billing.set` agar
teknisi pun bisa menentukan tagihan.

---

## 1. Data Layer

### Migration: `137_service_billing_items.sql`

```sql
create table if not exists service_billing_items (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references services(id) on delete cascade,
  brand_id      integer not null references brands(id),
  type          text not null check (type in ('SERVICE_FEE', 'ADDITIONAL')),
  description   text not null default '',
  amount        numeric(14,2) not null default 0 check (amount >= 0),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_service_billing_items_service on service_billing_items(service_id);
```

### Types (`src/server/domain/service-billing.types.ts`)

```typescript
export interface ServiceBillingItem {
  id?: string;
  serviceId: string;
  type: "SERVICE_FEE" | "ADDITIONAL";
  description: string;
  amount: number;
  sortOrder: number;
}

export interface ServiceBillingData {
  items: ServiceBillingItem[];
  totalBill: number;
}
```

### Repository (`src/repositories/service-billing.repository.ts`)

- `getServiceBillingItems(serviceId)` → `ServiceBillingItem[]`
- `saveServiceBillingItems(serviceId, brandId, items[])` → transaction:
  1. Delete existing items for service
  2. Insert new items
  3. Update `services.final_cost = SUM(items.amount)`
  4. Return updated billing data

### Perubahan existing

- `getServiceDetailAction` → sertakan `billingItems` di response
- `calculate_service_payment_summary` RPC — tetap pakai `final_cost`, no change

---

## 2. Permission

### `permissions.ts`

```typescript
SERVICE_BILLING_SET: "service.billing.set",
```

### `can.ts` — Tambahkan ke role:

| Role | `service.billing.set` |
|---|---|
| PLATFORM_OWNER | ✓ |
| MASTER_ADMIN | ✓ |
| ADMIN | ✓ |
| FRONTLINER | ✓ |
| TECHNICIAN | ✓ |

TECHNICIAN bisa set tagihan tapi belum tentu bisa proses payment (`service.payment.create`).

---

## 3. Backend Actions

File baru: `src/server/actions/service-billing.actions.ts`

### `getServiceBillingAction(brandSlug, serviceId)` → `ActionResult<ServiceBillingData>`

- Auth: `service.view`
- Ambil billing items dari DB via repository
- Return `{ items, totalBill }`

### `saveServiceBillingAction(brandSlug, serviceId, items[])` → `ActionResult<ServiceBillingData>`

- Auth: `service.billing.set`
- Validasi:
  - Service exists dan belum dicancel
  - **Belum ada payment COMPLETED** (jika ada → error: "Tidak bisa edit tagihan karena sudah ada pembayaran")
  - Minimal 1 item dengan amount > 0
  - Setiap item: amount >= 0, description tidak kosong
- Repository: transaction replace items + update `final_cost`
- Tambah timeline entry + audit log
- Return updated billing data

---

## 4. UI Components

### 4a. Perubahan di `ServiceDetailContent` — Tab Payment

**Mode A — Belum ada tagihan (`final_cost = 0`, UNPAID)**
- Header "Payment" + badge UNPAID
- Empty state: ikon + "Belum ada tagihan untuk servis ini."
- CTA button: **"Atur Tagihan"** (full-width, primary) — hanya jika user punya `service.billing.set`
- Payment summary card dan history tidak ditampilkan

**Mode B — Tagihan sudah ada (`final_cost > 0`)**
- Header "Payment" + badge status (UNPAID/PARTIAL/PAID/OVERPAID)
- Payment summary card (total bill, paid, remaining)
- Tombol **"Edit Tagihan"** (jika UNPAID dan user punya `service.billing.set`)
- Payment history + "Receive Payment" button (seperti sekarang)

### 4b. Komponen Baru: `ServiceBillingEditor`

File: `src/components/services/service-billing-editor.tsx`

**Props:** `serviceId`, `brandSlug`, `existingItems`, `onSaved`, `onCancel`

**Layout (inline di tab):**

```
┌─────────────────────────────────┐
│ ← Kembali                       │
│                                 │
│ Atur Tagihan                    │
│ Isi rincian biaya servis        │
│                                 │
│ ── Daftar Biaya ──              │
│ [SERVICE_FEE] Biaya Jasa   5  × │
│ [ADDITIONAL]  Admin Fee    2  × │
│ [ADDITIONAL]  ...           x  × │
│                                 │
│    + Tambah Biaya Lain          │
│                                 │
│ ─────────────────────────────── │
│ Total                Rp 7.000   │
│                                 │
│ [Batal]        [Simpan Tagihan] │
└─────────────────────────────────┘
```

- Setiap row: icon (Wrench untuk SERVICE_FEE, PlusCircle untuk ADDITIONAL), input description, input amount numeric, hapus button
- Tombol "Tambah Biaya Lain" → add row baru type ADDITIONAL
- Jika ada estimasi (`estimated_cost > 0`) saat pertama buka → pre-fill 1 row SERVICE_FEE
- Validasi: minimal 1 item dengan amount > 0 → Simpan aktif
- Simpan → `saveServiceBillingAction` → `onSaved`
- Batal → `onCancel`

---

## 5. State Management

```
┌─ ServiceDetailSheet ──────────────────────────┐
│                                                 │
│  getServiceDetailAction()                       │
│    → service.final_cost                         │
│    → service.paymentSummary                     │
│    → service.billingItems[]                     │
│                                                 │
│  ┌─ ServiceDetailContent ────────────────────┐ │
│  │  Tab Payment:                             │ │
│  │  billingMode: "view" | "edit"             │ │
│  │                                           │ │
│  │  if (final_cost == 0 && UNPAID)           │ │
│  │    → "Atur Tagihan" CTA                   │ │
│  │    → klik → billingMode = "edit"          │ │
│  │    → render ServiceBillingEditor           │ │
│  │                                           │ │
│  │  if (final_cost > 0 && billingMode="view")│ │
│  │    → payment summary card                  │ │
│  │    → "Edit Tagihan" button                │ │
│  │    → klik → billingMode = "edit"          │ │
│  │    → render ServiceBillingEditor           │ │
│  │                                           │ │
│  │  onSaved → refresh detail → billingMode=  │ │
│  │            "view"                          │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 6. Edge Cases

| Skenario | Handling |
|---|---|
| **Estimasi belum diisi** | Billing editor buka dengan 0 row, user add manual |
| **Estimasi sudah diisi** | Pre-fill 1 row SERVICE_FEE dari `estimated_cost` |
| **Sudah ada payment** | `saveServiceBilling` return error; "Edit Tagihan" tidak tampil |
| **Semua row amount = 0** | Tombol Simpan disabled |
| **User hapus semua row** | Tombol Simpan disabled |
| **Role TECHNICIAN** | Bisa Atur Tagihan / Edit Tagihan (permission `service.billing.set`) |
| **Partial payment** | Tidak bisa edit tagihan — harus void payment dulu (future scope) |

---

## 7. Files Affected

| File | Perubahan |
|---|---|
| `supabase/migrations/137_service_billing_items.sql` | New — create table |
| `src/server/domain/service-billing.types.ts` | New — types |
| `src/repositories/service-billing.repository.ts` | New — DB queries |
| `src/server/actions/service-billing.actions.ts` | New — server actions |
| `src/components/services/service-billing-editor.tsx` | New — UI component |
| `src/components/services/service-detail-content.tsx` | Modify — tab payment render logic |
| `src/lib/permissions/permissions.ts` | Modify — add `SERVICE_BILLING_SET` |
| `src/lib/permissions/can.ts` | Modify — add permission to roles |
| `src/server/actions/service.actions.ts` | Modify — include billingItems in detail |
