CREATE OR REPLACE FUNCTION public.post_pos_revenue_ledger(
  p_brand_id integer,
  p_branch_id uuid,
  p_transaction_id uuid,
  p_transaction_number text,
  p_total_amount numeric,
  p_occurred_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idempotency_key text;
  v_existing_id uuid;
  v_inserted_id uuid;
BEGIN
  v_idempotency_key := 'pos_revenue:' || p_transaction_id;

  SELECT id INTO v_existing_id
  FROM finance_ledger
  WHERE idempotency_key = v_idempotency_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  INSERT INTO finance_ledger (
    brand_id,
    branch_id,
    ledger_date,
    occurred_at,
    entry_type,
    direction,
    amount,
    category,
    reference_type,
    reference_id,
    source_table,
    source_id,
    description,
    idempotency_key,
    metadata,
    created_by,
    created_at
  ) VALUES (
    p_brand_id,
    p_branch_id,
    p_occurred_at::date,
    p_occurred_at,
    'POS_REVENUE',
    'CREDIT',
    p_total_amount,
    'pos',
    'POS_TRANSACTION',
    p_transaction_id,
    'pos_transactions',
    p_transaction_id,
    'POS sale ' || p_transaction_number || ' revenue',
    v_idempotency_key,
    jsonb_build_object(
      'transaction_number', p_transaction_number,
      'status', 'COMPLETED'
    ),
    NULL,
    p_occurred_at
  )
  RETURNING id INTO v_inserted_id;

  RETURN v_inserted_id;
END;
$$;
