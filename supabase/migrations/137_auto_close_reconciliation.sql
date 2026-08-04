-- Migration: Auto Shift Close Reconciliation
-- Adds reconciliation_status column to store_shifts and reconcile_store_shift() function.
-- This enables the "pending reconciliation" flow for auto-closed shifts.

-- ── 1. Add reconciliation_status column ──

ALTER TABLE public.store_shifts
  ADD COLUMN reconciliation_status TEXT NOT NULL DEFAULT 'NONE'
  CHECK (reconciliation_status IN ('NONE', 'PENDING', 'DONE'));

COMMENT ON COLUMN public.store_shifts.reconciliation_status IS
  'NONE = manually closed (no reconciliation needed), PENDING = auto-closed awaiting cash reconciliation, DONE = auto-closed and reconciled';

-- Backfill existing auto-closed shifts as DONE (they were already reconciled implicitly)
UPDATE public.store_shifts
SET reconciliation_status = 'DONE'
WHERE auto_closed = true;

-- ── 2. Index for fast pending reconciliation lookup ──

CREATE INDEX IF NOT EXISTS idx_store_shifts_pending_reconciliation
  ON public.store_shifts (branch_id, reconciliation_status)
  WHERE reconciliation_status = 'PENDING';

-- ── 3. Function: reconcile_store_shift ──
-- Called by cashier to input actual cash for an auto-closed shift.
-- Updates counted_closing_cash, recalculates cash_difference, creates adjustment movement.

CREATE OR REPLACE FUNCTION public.reconcile_store_shift(
  p_shift_id UUID,
  p_actual_cash NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_reconciled_by UUID DEFAULT NULL
)
RETURNS TABLE (
  shift_id UUID,
  cash_difference NUMERIC,
  reconciliation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_shift RECORD;
  v_expected NUMERIC;
  v_diff NUMERIC;
BEGIN
  -- Validate shift exists and is PENDING
  SELECT * INTO v_shift FROM public.store_shifts
  WHERE id = p_shift_id AND reconciliation_status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found or not pending reconciliation';
  END IF;

  v_expected := v_shift.expected_closing_cash;
  v_diff := p_actual_cash - v_expected;

  -- Update shift with actual cash and reconciliation status
  UPDATE public.store_shifts
  SET
    counted_closing_cash = p_actual_cash,
    cash_difference = v_diff,
    reconciliation_status = 'DONE',
    closing_notes = COALESCE(closing_notes || E'\n', '') ||
                    'RECONCILIATION: ' || COALESCE(p_notes, 'Kas fisik dihitung dan dicatat.'),
    closed_by = COALESCE(p_reconciled_by, closed_by),
    updated_at = NOW()
  WHERE id = p_shift_id;

  -- Create adjustment movement if discrepancy exists
  IF v_diff != 0 THEN
    PERFORM public.add_shift_cash_movement(
      p_shift_id => p_shift_id,
      p_direction => CASE WHEN v_diff > 0 THEN 'IN' ELSE 'OUT' END,
      p_amount => ABS(v_diff),
      p_description => CASE WHEN v_diff > 0
        THEN 'Penyesuaian rekonsiliasi: surplus Rp ' || ABS(v_diff)
        ELSE 'Penyesuaian rekonsiliasi: kurang Rp ' || ABS(v_diff)
      END,
      p_created_by => p_reconciled_by,
      p_metadata => jsonb_build_object(
        'reason', 'reconciliation_adjustment',
        'cash_difference', v_diff,
        'expected_cash', v_expected,
        'actual_cash', p_actual_cash
      )
    );
  END IF;

  RETURN QUERY SELECT p_shift_id, v_diff, 'DONE'::TEXT;
END;
$func$;

COMMENT ON FUNCTION public.reconcile_store_shift IS
  'Reconciles an auto-closed shift by recording actual cash count, calculating discrepancy, and creating adjustment movement.';

-- ── 4. Update check_and_auto_close_shifts to set reconciliation_status = PENDING ──

CREATE OR REPLACE FUNCTION public.check_and_auto_close_shifts()
RETURNS TABLE (
  shift_id uuid,
  branch_id uuid,
  branch_name text,
  shift_number text,
  brand_id integer,
  brand_name text,
  scheduled_close_time time,
  actual_close_time time,
  late_minutes integer,
  grace_period_minutes integer,
  auto_closed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_shift RECORD;
  v_settings jsonb;
  v_business_hours jsonb;
  v_day TEXT;
  v_today_schedule jsonb;
  v_scheduled_close TIME;
  v_grace_period INT;
  v_is_auto_close_enabled BOOLEAN;
  v_late_minutes INT;
  v_now_time TIME;
  v_branch_name TEXT;
  v_brand_name TEXT;
BEGIN
  v_day := lower(trim(to_char(now(), 'Day')));
  v_now_time := now()::time;

  FOR v_shift IN
    SELECT
      s.id, s.branch_id, s.shift_number, s.brand_id,
      s.scheduled_close_time,
      bs.business_hours,
      bs.metadata,
      b.name AS branch_name,
      br.name AS brand_name
    FROM public.store_shifts s
    JOIN public.branches b ON b.id = s.branch_id AND b.deleted_at IS NULL
    JOIN public.brands br ON br.id = s.brand_id AND lower(br.status) = 'active'
    LEFT JOIN public.brand_settings bs ON bs.brand_id = s.brand_id
    WHERE s.shift_status = 'OPEN'
  LOOP
    -- Get auto-close settings from metadata
    v_is_auto_close_enabled := FALSE;
    v_grace_period := 120; -- default 2 hours

    IF v_shift.metadata IS NOT NULL THEN
      v_settings := v_shift.metadata -> 'auto_close_settings';
      IF v_settings IS NOT NULL THEN
        v_is_auto_close_enabled := COALESCE((v_settings ->> 'enabled')::BOOLEAN, FALSE);
        v_grace_period := COALESCE((v_settings ->> 'grace_period_minutes')::INTEGER, 120);
      END IF;
    END IF;

    IF NOT v_is_auto_close_enabled THEN
      CONTINUE;
    END IF;

    -- Use shift's scheduled_close_time if available, or resolve from business_hours
    v_scheduled_close := v_shift.scheduled_close_time;

    IF v_scheduled_close IS NULL AND v_shift.business_hours IS NOT NULL THEN
      v_today_schedule := v_shift.business_hours -> 'branches' -> v_shift.branch_id::TEXT -> v_day;
      IF (v_today_schedule IS NULL OR v_today_schedule = 'null'::jsonb) THEN
        v_today_schedule := v_shift.business_hours -> 'branches' -> '__DEFAULT__' -> v_day;
      END IF;
      IF v_today_schedule IS NOT NULL AND (v_today_schedule ->> 'isOpen')::BOOLEAN THEN
        v_scheduled_close := (v_today_schedule ->> 'close')::TIME;
      END IF;
    END IF;

    IF v_scheduled_close IS NULL THEN
      CONTINUE; -- No schedule defined, skip
    END IF;

    -- Check if current time exceeds scheduled close + grace period
    v_late_minutes := EXTRACT(EPOCH FROM (v_now_time - v_scheduled_close)) / 60;
    IF v_late_minutes >= v_grace_period THEN
      -- Auto-close this shift with expected cash
      PERFORM public.close_store_shift(
        p_shift_id => v_shift.id,
        p_counted_closing_cash => public.calculate_shift_expected_cash(v_shift.id),
        p_closing_notes => NULL,
        p_closed_by => NULL,
        p_metadata => jsonb_build_object(
          'auto_closed', TRUE,
          'grace_period_minutes', v_grace_period,
          'late_minutes', v_late_minutes,
          'scheduled_close', v_scheduled_close::TEXT,
          'actual_close', v_now_time::TEXT
        )
      );

      -- Set reconciliation_status to PENDING so cashier must reconcile before opening new shift
      UPDATE public.store_shifts
      SET reconciliation_status = 'PENDING'
      WHERE id = v_shift.id;

      shift_id := v_shift.id;
      branch_id := v_shift.branch_id;
      branch_name := v_shift.branch_name;
      shift_number := v_shift.shift_number;
      brand_id := v_shift.brand_id;
      brand_name := v_shift.brand_name;
      scheduled_close_time := v_scheduled_close;
      actual_close_time := v_now_time;
      late_minutes := v_late_minutes;
      grace_period_minutes := v_grace_period;
      auto_closed := TRUE;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$func$;

COMMENT ON FUNCTION public.check_and_auto_close_shifts IS
  'Called by scheduler to auto-close shifts exceeding business hours + grace period. Sets reconciliation_status to PENDING.';
