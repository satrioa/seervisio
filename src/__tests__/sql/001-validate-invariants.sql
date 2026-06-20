-- ============================================================
-- Seervis TDD Audit: SQL Invariant Validation Queries
-- Run these against a test database to validate data integrity.
-- Expected: ALL queries should return 0 rows.
-- ============================================================

-- 1. SERVICE PAYMENT INVARIANTS
-- ============================================================

-- 1a. Service payments with COMPLETED status that have no matching payment_account_movement
SELECT '1a: COMPLETED payment without account movement' AS check_name,
  sp.id, sp.payment_number, sp.gross_amount
FROM public.service_payments sp
WHERE sp.payment_status = 'COMPLETED'
  AND sp.payment_account_movement_id IS NULL;

-- 1b. Service payments with COMPLETED status that have no SERVICE_REVENUE finance_ledger entry
SELECT '1b: COMPLETED payment without SERVICE_REVENUE' AS check_name,
  sp.id, sp.payment_number, sp.gross_amount
FROM public.service_payments sp
WHERE sp.payment_status = 'COMPLETED'
  AND NOT EXISTS (
    SELECT 1 FROM public.finance_ledger fl
    WHERE fl.reference_type = 'service_payment'
      AND fl.reference_id = sp.id
      AND fl.entry_type = 'SERVICE_REVENUE'
  );

-- 1c. Service payments with MDR > 0 but no MDR_EXPENSE finance_ledger entry
SELECT '1c: MDR payment without MDR_EXPENSE' AS check_name,
  sp.id, sp.payment_number, sp.mdr_amount
FROM public.service_payments sp
WHERE sp.payment_status = 'COMPLETED'
  AND sp.mdr_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.finance_ledger fl
    WHERE fl.reference_type = 'service_payment'
      AND fl.reference_id = sp.id
      AND fl.entry_type = 'MDR_EXPENSE'
  );

-- 1d. Payment account movement for service payment amount mismatch
-- movement.amount should = service_payments.net_amount (gross - mdr)
SELECT '1d: Account movement amount mismatch' AS check_name,
  sp.id, sp.payment_number, sp.net_amount, pam.amount AS movement_amount,
  (sp.net_amount - pam.amount) AS discrepancy
FROM public.service_payments sp
JOIN public.payment_account_movements pam ON pam.id = sp.payment_account_movement_id
WHERE sp.payment_status = 'COMPLETED'
  AND sp.net_amount != pam.amount;

-- 1e. Finance ledger amount mismatch vs service_payments.gross_amount
SELECT '1e: Ledger revenue mismatch' AS check_name,
  sp.id, sp.payment_number, sp.gross_amount, fl.amount AS ledger_amount
FROM public.service_payments sp
JOIN public.finance_ledger fl
  ON fl.reference_type = 'service_payment'
  AND fl.reference_id = sp.id
  AND fl.entry_type = 'SERVICE_REVENUE'
WHERE sp.gross_amount != fl.amount;

-- 1f. Duplicate idempotency keys in service_payments
SELECT '1f: Duplicate idempotency keys' AS check_name,
  brand_id, idempotency_key, COUNT(*) AS cnt
FROM public.service_payments
WHERE idempotency_key IS NOT NULL
GROUP BY brand_id, idempotency_key
HAVING COUNT(*) > 1;

-- ============================================================
-- 2. POS CHECKOUT INVARIANTS
-- ============================================================

-- 2a. COMPLETED POS transactions without payment account movement
SELECT '2a: COMPLETED POS without account movement' AS check_name,
  pt.id, pt.transaction_number, pt.total_amount
FROM public.pos_transactions pt
WHERE pt.status = 'COMPLETED'
  AND pt.payment_account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_account_movements pam
    WHERE pam.reference_type = 'pos_transaction'
      AND pam.reference_id = pt.id::text
  );

-- 2b. POS transaction items without stock movement
SELECT '2b: POS item without stock movement' AS check_name,
  pti.id, pti.transaction_id, pti.item_type, pti.quantity
FROM public.pos_transaction_items pti
JOIN public.pos_transactions pt ON pt.id = pti.transaction_id
WHERE pt.status = 'COMPLETED'
  AND pti.movement_id IS NULL;

-- 2c. UNIT_SECOND_SERIALIZED items that didn't update unit status to SOLD
SELECT '2c: Unit not SOLD after POS' AS check_name,
  pti.id, pti.unit_id, iu.status AS actual_status
FROM public.pos_transaction_items pti
JOIN public.inv_units iu ON iu.id = pti.unit_id
JOIN public.pos_transactions pt ON pt.id = pti.transaction_id
WHERE pt.status = 'COMPLETED'
  AND pti.item_type = 'UNIT_SECOND_SERIALIZED'
  AND iu.status != 'SOLD';

-- 2d. POS transactions with negative total_amount
SELECT '2d: Negative total POS' AS check_name,
  id, transaction_number, total_amount
FROM public.pos_transactions
WHERE total_amount < 0;

-- ============================================================
-- 3. INVENTORY INVARIANTS
-- ============================================================

-- 3a. inv_variant_stocks with negative current_stock
-- The CHECK constraint should prevent this, but validate
SELECT '3a: Negative stock' AS check_name,
  id, variant_id, current_stock
FROM public.inv_variant_stocks
WHERE current_stock < 0;

-- 3b. inv_variant_stocks with no corresponding inv_stock_movements
-- Every stock change should have a movement record
SELECT '3b: Stock without any movement' AS check_name,
  ivs.id, ivs.variant_id, ivs.current_stock
FROM public.inv_variant_stocks ivs
WHERE ivs.current_stock > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.inv_stock_movements ism
    WHERE ism.variant_id = ivs.variant_id
      AND ism.branch_id = ivs.branch_id
  );

-- 3c. Stock movement total mismatch with current_stock
-- Calculated stock from movements should match cached current_stock
SELECT '3c: Cached stock != movement sum' AS check_name,
  ivs.id, ivs.variant_id, ivs.branch_id,
  ivs.current_stock AS cached_stock,
  COALESCE(SUM(CASE WHEN ism.direction = 'IN' THEN ism.quantity ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN ism.direction = 'OUT' THEN ism.quantity ELSE 0 END), 0) AS movement_balance
FROM public.inv_variant_stocks ivs
LEFT JOIN public.inv_stock_movements ism
  ON ism.variant_id = ivs.variant_id
  AND ism.branch_id = ivs.branch_id
GROUP BY ivs.id, ivs.variant_id, ivs.branch_id, ivs.current_stock
HAVING ivs.current_stock !=
  COALESCE(SUM(CASE WHEN ism.direction = 'IN' THEN ism.quantity ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN ism.direction = 'OUT' THEN ism.quantity ELSE 0 END), 0);

-- 3d. Duplicate idempotency keys across stock movements
-- Though inv_stock_movements has no idempotency_key, check for duplicate references
SELECT '3d: Duplicate reference in stock movements' AS check_name,
  reference_type, reference_id, COUNT(*) AS cnt
FROM public.inv_stock_movements
WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL
GROUP BY reference_type, reference_id
HAVING COUNT(*) > 1;

-- ============================================================
-- 4. PAYMENT ACCOUNT INVARIANTS
-- ============================================================

-- 4a. Payment account balance mismatch with movements
SELECT '4a: Account balance mismatch' AS check_name,
  pa.id, pa.account_name, pa.current_balance AS cached_balance,
  COALESCE(SUM(CASE WHEN pam.direction = 'IN' THEN pam.amount ELSE -pam.amount END), 0) AS movement_balance
FROM public.payment_accounts pa
LEFT JOIN public.payment_account_movements pam ON pam.payment_account_id = pa.id
GROUP BY pa.id, pa.account_name, pa.current_balance
HAVING pa.current_balance !=
  COALESCE(SUM(CASE WHEN pam.direction = 'IN' THEN pam.amount ELSE -pam.amount END), 0);

-- 4b. Movement balance constraint violation check
-- after_balance should = before_balance +/- amount
SELECT '4b: Movement balance constraint' AS check_name,
  id, payment_account_id, direction, amount, before_balance, after_balance,
  CASE
    WHEN direction = 'IN' AND after_balance != before_balance + amount THEN 'INCONSISTENT'
    WHEN direction = 'OUT' AND after_balance != before_balance - amount THEN 'INCONSISTENT'
    ELSE 'OK'
  END AS balance_check
FROM public.payment_account_movements
WHERE CASE
    WHEN direction = 'IN' AND after_balance != before_balance + amount THEN true
    WHEN direction = 'OUT' AND after_balance != before_balance - amount THEN true
    ELSE false
  END;

-- 4c. Duplicate reference uniqueness on payment_account_movements
-- The unique index should prevent this, but check anyway
SELECT '4c: Duplicate payment movement reference' AS check_name,
  payment_account_id, reference_type, reference_id, movement_type, COUNT(*) AS cnt
FROM public.payment_account_movements
WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL
  AND movement_type != 'OPENING_BALANCE'
GROUP BY payment_account_id, reference_type, reference_id, movement_type
HAVING COUNT(*) > 1;

-- ============================================================
-- 5. VOID/REFUND INVARIANTS
-- ============================================================

-- 5a. VOIDED POS transactions without reversal record
SELECT '5a: VOIDED without reversal' AS check_name,
  id, transaction_number, status
FROM public.pos_transactions
WHERE status = 'VOIDED'
  AND NOT EXISTS (
    SELECT 1 FROM public.pos_transaction_reversals ptr
    WHERE ptr.transaction_id = pos_transactions.id
  );

-- 5b. VOIDED transactions where stock wasn't restored
-- Check if UNIT items in voided transactions still show SOLD status
SELECT '5b: Unit still SOLD after void' AS check_name,
  pti.id, pti.unit_id, iu.status AS current_status
FROM public.pos_transaction_items pti
JOIN public.inv_units iu ON iu.id = pti.unit_id
JOIN public.pos_transactions pt ON pt.id = pti.transaction_id
WHERE pt.status = 'VOIDED'
  AND iu.status != 'READY_STOCK';

-- 5c. VOIDED transactions without reversal stock movements
SELECT '5c: Voided without reversal stock movement' AS check_name,
  pt.id, pt.transaction_number
FROM public.pos_transactions pt
WHERE pt.status = 'VOIDED'
  AND NOT EXISTS (
    SELECT 1 FROM public.inv_stock_movements ism
    WHERE ism.reference_type = 'POS_TRANSACTION_VOID'
      AND ism.reference_id = pt.id::text
  );

-- ============================================================
-- 6. CROSS-REFERENCE INVARIANTS
-- ============================================================

-- 6a. Services with branch_id that doesn't match brand
SELECT '6a: Service branch mismatch' AS check_name,
  s.id, s.service_number, s.brand_id AS service_brand,
  b.brand_id AS branch_brand
FROM public.services s
JOIN public.branches b ON b.id = s.branch_id
WHERE s.brand_id != b.brand_id;

-- 6b. Service payments with branch_id that doesn't match
SELECT '6b: Payment branch mismatch' AS check_name,
  sp.id, sp.payment_number, sp.brand_id, sp.branch_id
FROM public.service_payments sp
JOIN public.services s ON s.id = sp.service_id
WHERE sp.brand_id != s.brand_id OR sp.branch_id != s.branch_id;

-- 6c. Payment account movements with mismatched brand
SELECT '6c: Movement brand mismatch' AS check_name,
  pam.id, pam.payment_account_id, pam.brand_id AS movement_brand,
  pa.brand_id AS account_brand
FROM public.payment_account_movements pam
JOIN public.payment_accounts pa ON pa.id = pam.payment_account_id
WHERE pam.brand_id != pa.brand_id;

-- 6d. Orphaned audit logs (brand deleted but reference remains)
-- Just informational - brand_id is ON DELETE SET NULL
SELECT '6d: Audit logs count by brand' AS check_name,
  COALESCE(brand_id::text, '(null)') AS brand,
  COUNT(*) AS cnt
FROM public.audit_logs
GROUP BY brand_id
ORDER BY cnt DESC;

-- ============================================================
-- End of invariant validation queries
-- ============================================================
