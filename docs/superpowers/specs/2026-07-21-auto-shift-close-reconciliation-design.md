# Auto Shift Close + Pending Reconciliation — Design Spec

**Date:** 2026-07-21  
**Status:** Approved  
**Author:** Seervisio Engineering

---

## Problem Statement

The auto shift close feature exists in the codebase (SQL function `check_and_auto_close_shifts()`, client-side hook `useAutoClose`, config UI in System Settings) but has two critical gaps:

1. **No server-side cron** — auto-close only runs when a user has the app open in their browser. If the store closes and nobody has the dashboard open, shifts are never auto-closed.

2. **Cash reconciliation is bypassed** — when auto-closing, the system sets `counted_closing_cash = expected_closing_cash`, making `cash_difference` always 0. There is no mechanism for the cashier to later input the actual physical cash count.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Server-side cron | Vercel Cron Job | Reliable, runs without user opening app. Already used for billing cron. |
| Cron schedule | Every 15 minutes, 24/7 | Balance between timely auto-close and resource usage (96 invocations/day). |
| Kas tutup toko saat auto-close | Pending reconciliation | Auto-close sets temporary expected cash, but flags shift for later reconciliation. |
| Reconciliation flow | Blocking at shift open | Cashier cannot open a new shift until the previous auto-closed shift is reconciled. Ensures no shift is skipped. |
| Selisih handling | Record + notify + adjust | Discrepancy is recorded, owner/manager notified, and a cash adjustment movement is created automatically. |

---

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Vercel Cron (every 15 min)                             │
│  POST /api/cron/auto-close-shifts                       │
│  └─→ runAutoCloseCheckAction()                          │
│      └─→ check_and_auto_close_shifts() RPC              │
│          └─→ close_store_shift(closing_reason=AUTO_CLOSE)│
│              └─→ shift_status = CLOSED                  │
│                  reconciliation_status = PENDING         │
│                  counted_closing_cash = expected_cash    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Next Morning: Cashier opens app                        │
│  └─→ "Buka Shift" button clicked                        │
│      └─→ Check: ada shift PENDING_RECONCILIATION?       │
│          ├─ YES → Show Reconciliation Dialog (blocking) │
│          │   └─→ Input kas fisik + catatan              │
│          │       └─→ reconcileShiftAction()             │
│          │           ├─ Update counted_closing_cash     │
│          │           ├─ Recalculate cash_difference     │
│          │           ├─ Create adjustment movement       │
│          │           ├─ Send notification to owner       │
│          │           └─ reconciliation_status = DONE     │
│          └─ NO → Open shift normally                    │
└─────────────────────────────────────────────────────────┘
```

---

## Database Changes

### New Column: `store_shifts.reconciliation_status`

```sql
ALTER TABLE store_shifts
  ADD COLUMN reconciliation_status TEXT NOT NULL DEFAULT 'NONE'
  CHECK (reconciliation_status IN ('NONE', 'PENDING', 'DONE'));
```

- `NONE` — shift was closed manually; no reconciliation needed.
- `PENDING` — shift was auto-closed; awaiting cash reconciliation from cashier.
- `DONE` — shift was auto-closed and subsequently reconciled.

### Modified SQL Function: `check_and_auto_close_shifts()`

After calling `close_store_shift()` with `closing_reason = 'AUTO_CLOSE'`, update the shift:

```sql
UPDATE store_shifts
SET reconciliation_status = 'PENDING'
WHERE id = shift_id;
```

### New SQL Function: `reconcile_store_shift()`

```sql
CREATE OR REPLACE FUNCTION reconcile_store_shift(
  p_shift_id UUID,
  p_actual_cash NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  shift_id UUID,
  cash_difference NUMERIC,
  reconciliation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift RECORD;
  v_expected NUMERIC;
  v_diff NUMERIC;
BEGIN
  -- Validate shift exists and is PENDING
  SELECT * INTO v_shift FROM store_shifts
  WHERE id = p_shift_id AND reconciliation_status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found or not pending reconciliation';
  END IF;

  v_expected := v_shift.expected_closing_cash;
  v_diff := p_actual_cash - v_expected;

  -- Update shift
  UPDATE store_shifts
  SET
    counted_closing_cash = p_actual_cash,
    cash_difference = v_diff,
    reconciliation_status = 'DONE',
    closing_notes = COALESCE(closing_notes || E'\n', '') ||
                    'RECONCILIATION: ' || COALESCE(p_notes, ''),
    updated_at = NOW()
  WHERE id = p_shift_id;

  -- Create adjustment movement if discrepancy exists
  IF v_diff != 0 THEN
    PERFORM add_shift_cash_movement(
      p_shift_id,
      CASE WHEN v_diff > 0 THEN 'IN' ELSE 'OUT' END,
      ABS(v_diff),
      CASE WHEN v_diff > 0
        THEN 'Penyesuaian rekonsiliasi: surplus Rp ' || ABS(v_diff)
        ELSE 'Penyesuaian rekonsiliasi: kurang Rp ' || ABS(v_diff)
      END,
      jsonb_build_object(
        'reason', 'reconciliation_adjustment',
        'cash_difference', v_diff,
        'expected_cash', v_expected,
        'actual_cash', p_actual_cash
      )
    );
  END IF;

  RETURN QUERY SELECT p_shift_id, v_diff, 'DONE'::TEXT;
END;
$$;
```

---

## Server Actions

### New: `reconcileShiftAction(brandSlug, shiftId, actualCash, notes?)`

**File:** `src/server/actions/store-shift.actions.ts`

```typescript
export async function reconcileShiftAction(
  brandSlug: string,
  shiftId: string,
  actualCash: number,
  notes?: string,
): Promise<ActionResult<{ cashDifference: number }>> {
  // 1. Validate session + permission (store_shift.close)
  // 2. Validate actualCash >= 0
  // 3. Call reconcile_store_shift RPC
  // 4. If cashDifference != 0 and no notes → return error
  // 5. Send CASH_DIFFERENCE_DETECTED notification if discrepancy
  // 6. Send RECONCILIATION_DONE notification to owner
  // 7. Return { cashDifference }
}
```

### New: `getPendingReconciliationAction(brandSlug, branchId)`

**File:** `src/server/actions/store-shift.actions.ts`

```typescript
export async function getPendingReconciliationAction(
  brandSlug: string,
  branchId: string,
): Promise<ActionResult<StoreShift | null>> {
  // Returns the most recent CLOSED shift with reconciliation_status = 'PENDING'
  // for the given branch, or null if none.
}
```

---

## API Endpoint

### `POST /api/cron/auto-close-shifts`

**File:** `src/app/api/cron/auto-close-shifts/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { runAutoCloseCheckAction } from "@/server/actions/auto-close.actions";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAutoCloseCheckAction();
  return NextResponse.json(result);
}
```

### `vercel.json` Update

```json
{
  "crons": [
    { "path": "/api/cron/billing", "schedule": "0 1 * * *" },
    { "path": "/api/cron/auto-close-shifts", "schedule": "*/15 * * * *" }
  ]
}
```

---

## UI Components

### Reconciliation Dialog

**File:** `src/components/store-shift/ShiftReconciliationModal.tsx`

Blocking modal that appears when cashier attempts to open a new shift but a `PENDING` shift exists.

| Field | Type | Description |
|-------|------|-------------|
| Shift Info | Read-only | "Shift SHIFT/2026/07/0042 ditutup otomatis pada 22:15" |
| Expected Cash | Read-only | Rp X,XXX,XXX |
| Kas Fisik | **Manual numeric input** | Cashier counts physical cash |
| Selisih | Auto-calculated | `kas_fisik - expected` (green=surplus, red=shortfall, neutral=match) |
| Catatan | **Required if selisih ≠ 0** | Textarea for explanation |

**Validation:**
- Kas fisik must be a non-negative number.
- If selisih ≠ 0 and catatan is empty → block submission with error: "Catatan diperlukan jika terdapat selisih kas."

**Submission:**
1. Call `reconcileShiftAction(brandSlug, shiftId, actualCash, notes)`.
2. On success: Dynamic Island feedback ("Rekonsiliasi berhasil"), dispatch `seervis:shift-changed`, close modal, proceed to open new shift.

### Integration Point: Shift Open Flow

In the existing shift open handler (wherever "Buka Shift" is triggered):

```typescript
const handleOpenShift = async () => {
  const pending = await getPendingReconciliationAction(brandSlug, branchId);
  if (pending.success && pending.data) {
    setPendingShift(pending.data);
    setReconciliationModalOpen(true);
    return; // Block shift open
  }
  // Proceed with normal shift open
};
```

After reconciliation succeeds:
```typescript
const handleReconciliationSuccess = () => {
  setReconciliationModalOpen(false);
  setPendingShift(null);
  // Proceed with normal shift open
  openShift();
};
```

---

## Notification Flow

### At Auto-Close Time

1. **`AUTO_CLOSE`** notification to the cashier who opened the shift:
   - "Shift kamu di [branch] ditutup otomatis (melebihi grace period)."

2. **`RECONCILIATION_REQUIRED`** notification to owner/manager:
   - "Shift [shift_number] di [branch] perlu rekonsiliasi kas."

### At Reconciliation Time

3. **`RECONCILIATION_DONE`** notification to owner/manager:
   - If no discrepancy: "Shift [shift_number] telah direkonsiliasi. Kas sesuai."
   - If discrepancy: "Shift [shift_number] direkonsiliasi — selisih: Rp Y (lebih/kurang). Catatan: [notes]"

---

## Client-Side Hook Update

The existing `useAutoClose` hook in `src/hooks/use-auto-close.ts` remains as a **backup** mechanism but is no longer the primary trigger. The Vercel Cron is the primary.

No changes needed to the hook itself.

---

## Migration

### New Migration File

**File:** `supabase/migrations/NNN_auto_close_reconciliation.sql`

```sql
-- Add reconciliation_status column
ALTER TABLE store_shifts
  ADD COLUMN reconciliation_status TEXT NOT NULL DEFAULT 'NONE'
  CHECK (reconciliation_status IN ('NONE', 'PENDING', 'DONE'));

-- Backfill existing auto-closed shifts
UPDATE store_shifts
SET reconciliation_status = 'DONE'
WHERE auto_closed = true;

-- Create reconcile_store_shift function
-- (see SQL Function section above)

-- Index for fast pending lookup
CREATE INDEX idx_store_shifts_pending_reconciliation
  ON store_shifts (branch_id, reconciliation_status)
  WHERE reconciliation_status = 'PENDING';
```

---

## Testing Strategy

1. **Unit tests** for `reconcileShiftAction`:
   - Happy path: no discrepancy
   - Discrepancy with notes → adjustment created
   - Discrepancy without notes → error
   - Shift not PENDING → error

2. **Integration test** for cron endpoint:
   - Mock `CRON_SECRET` → 200
   - Missing/wrong secret → 401

3. **Manual E2E test**:
   - Open shift → wait past grace period → verify auto-close
   - Next day → click "Buka Shift" → verify reconciliation dialog blocks
   - Input kas fisik with discrepancy → verify adjustment + notification
   - Verify new shift opens after reconciliation

---

## Out of Scope

- Manager approval workflow for discrepancies (future enhancement).
- Partial reconciliation (reconciling only some shifts).
- Bulk reconciliation of multiple pending shifts.
- Recurring auto-close schedule per branch (currently uses global grace period).
