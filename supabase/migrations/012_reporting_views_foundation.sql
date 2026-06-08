-- ============================================================
-- Migration 012: Reporting Views Foundation
-- Derived views for daily/monthly finance, payment methods,
-- branch revenue, store shifts, service status, inventory stock
-- ============================================================

-- ============================================================
-- DESIGN PRINCIPLES
-- ============================================================
-- These views are read-only reporting abstractions over the
-- append-only source tables. They are NOT materialized — they
-- compute fresh on every query. Materialization may be added
-- later as a performance optimization.
--
-- All monetary columns are cast to numeric(14,2). All counts
-- are cast to integer.
-- ============================================================

-- ============================================================
-- VIEW 1: daily_finance_summary
-- Daily P&L from finance_ledger, grouped by brand + branch + date
-- ============================================================

create or replace view public.daily_finance_summary as
select
  fl.brand_id,
  fl.branch_id,
  fl.ledger_date,
  coalesce(sum(
    case
      when fl.entry_type = 'SERVICE_REVENUE' and fl.direction = 'CREDIT' then fl.amount
      when fl.entry_type = 'SERVICE_REVENUE' and fl.direction = 'DEBIT' then -fl.amount
    end
  ), 0)::numeric(14,2) as service_revenue,
  coalesce(sum(
    case
      when fl.entry_type = 'POS_REVENUE' and fl.direction = 'CREDIT' then fl.amount
      when fl.entry_type = 'POS_REVENUE' and fl.direction = 'DEBIT' then -fl.amount
    end
  ), 0)::numeric(14,2) as pos_revenue,
  coalesce(sum(
    case
      when fl.entry_type = 'OTHER_INCOME' and fl.direction = 'CREDIT' then fl.amount
      when fl.entry_type = 'OTHER_INCOME' and fl.direction = 'DEBIT' then -fl.amount
    end
  ), 0)::numeric(14,2) as other_income,
  coalesce(sum(
    case
      when fl.entry_type = 'MDR_EXPENSE' and fl.direction = 'DEBIT' then fl.amount
      when fl.entry_type = 'MDR_EXPENSE' and fl.direction = 'CREDIT' then -fl.amount
    end
  ), 0)::numeric(14,2) as mdr_expense,
  coalesce(sum(
    case
      when fl.entry_type = 'OPERATING_EXPENSE' and fl.direction = 'DEBIT' then fl.amount
      when fl.entry_type = 'OPERATING_EXPENSE' and fl.direction = 'CREDIT' then -fl.amount
    end
  ), 0)::numeric(14,2) as operating_expense,
  coalesce(sum(
    case
      when fl.entry_type = 'COGS' and fl.direction = 'DEBIT' then fl.amount
      when fl.entry_type = 'COGS' and fl.direction = 'CREDIT' then -fl.amount
    end
  ), 0)::numeric(14,2) as cogs,
  coalesce(sum(
    case
      when fl.entry_type = 'CASH_ADJUSTMENT' and fl.direction = 'DEBIT' then fl.amount
      when fl.entry_type = 'CASH_ADJUSTMENT' and fl.direction = 'CREDIT' then -fl.amount
    end
  ), 0)::numeric(14,2) as cash_adjustment,
  coalesce(sum(
    case
      when fl.entry_type = 'PAYMENT_REFUND' and fl.direction = 'DEBIT' then fl.amount
      when fl.entry_type = 'PAYMENT_REFUND' and fl.direction = 'CREDIT' then -fl.amount
    end
  ), 0)::numeric(14,2) as payment_refund,
  coalesce(sum(
    case
      when fl.entry_type in ('SERVICE_REVENUE', 'POS_REVENUE', 'OTHER_INCOME') and fl.direction = 'CREDIT' then fl.amount
      when fl.entry_type in ('SERVICE_REVENUE', 'POS_REVENUE', 'OTHER_INCOME') and fl.direction = 'DEBIT' then -fl.amount
      when fl.entry_type in ('MDR_EXPENSE', 'OPERATING_EXPENSE', 'COGS', 'CASH_ADJUSTMENT', 'PAYMENT_REFUND') and fl.direction = 'DEBIT' then -fl.amount
      when fl.entry_type in ('MDR_EXPENSE', 'OPERATING_EXPENSE', 'COGS', 'CASH_ADJUSTMENT', 'PAYMENT_REFUND') and fl.direction = 'CREDIT' then fl.amount
    end
  ), 0)::numeric(14,2) as net_profit
from public.finance_ledger fl
group by fl.brand_id, fl.branch_id, fl.ledger_date;

-- ============================================================
-- VIEW 2: monthly_finance_summary
-- Monthly aggregation of daily_finance_summary
-- ============================================================

create or replace view public.monthly_finance_summary as
select
  dfs.brand_id,
  dfs.branch_id,
  extract(year from dfs.ledger_date)::integer as year,
  extract(month from dfs.ledger_date)::integer as month,
  sum(dfs.service_revenue)::numeric(14,2) as service_revenue,
  sum(dfs.pos_revenue)::numeric(14,2) as pos_revenue,
  sum(dfs.other_income)::numeric(14,2) as other_income,
  sum(dfs.mdr_expense)::numeric(14,2) as mdr_expense,
  sum(dfs.operating_expense)::numeric(14,2) as operating_expense,
  sum(dfs.cogs)::numeric(14,2) as cogs,
  sum(dfs.cash_adjustment)::numeric(14,2) as cash_adjustment,
  sum(dfs.payment_refund)::numeric(14,2) as payment_refund,
  sum(dfs.net_profit)::numeric(14,2) as net_profit
from public.daily_finance_summary dfs
group by dfs.brand_id, dfs.branch_id, extract(year from dfs.ledger_date), extract(month from dfs.ledger_date);

-- ============================================================
-- VIEW 3: payment_method_summary
-- Aggregated payment volume by payment method
-- Combines service_payments and pos_sales via UNION ALL
-- ============================================================

create or replace view public.payment_method_summary as
with payment_source as (
  select
    sp.brand_id,
    sp.branch_id,
    sp.payment_method_id,
    sp.gross_amount as gross,
    sp.mdr_amount as mdr,
    sp.net_amount as net
  from public.service_payments sp
  where sp.payment_status = 'COMPLETED'
  union all
  select
    ps.brand_id,
    ps.branch_id,
    ps.payment_method_id,
    (ps.gross_amount - ps.discount_amount) as gross,
    ps.mdr_amount as mdr,
    ps.net_amount as net
  from public.pos_sales ps
  where ps.sale_status = 'COMPLETED'
)
select
  ps.brand_id,
  ps.branch_id,
  ps.payment_method_id,
  pm.type as payment_method_type,
  pm.name as payment_method_name,
  count(*)::integer as transaction_count,
  coalesce(sum(ps.gross), 0)::numeric(14,2) as total_gross_amount,
  coalesce(sum(ps.mdr), 0)::numeric(14,2) as total_mdr_amount,
  coalesce(sum(ps.net), 0)::numeric(14,2) as total_net_amount
from payment_source ps
join public.payment_methods pm on pm.id = ps.payment_method_id
group by ps.brand_id, ps.branch_id, ps.payment_method_id, pm.type, pm.name;

-- ============================================================
-- VIEW 4: branch_revenue_summary
-- Aggregate revenue and expenses per branch
-- ============================================================

create or replace view public.branch_revenue_summary as
select
  dfs.brand_id,
  dfs.branch_id,
  sum(dfs.service_revenue)::numeric(14,2) as service_revenue,
  sum(dfs.pos_revenue)::numeric(14,2) as pos_revenue,
  sum(dfs.other_income)::numeric(14,2) as other_income,
  (sum(dfs.service_revenue) + sum(dfs.pos_revenue) + sum(dfs.other_income))::numeric(14,2) as total_revenue,
  sum(dfs.mdr_expense)::numeric(14,2) as mdr_expense,
  sum(dfs.cogs)::numeric(14,2) as cogs,
  sum(dfs.operating_expense)::numeric(14,2) as operating_expense,
  sum(dfs.cash_adjustment)::numeric(14,2) as cash_adjustment,
  sum(dfs.net_profit)::numeric(14,2) as net_profit
from public.daily_finance_summary dfs
group by dfs.brand_id, dfs.branch_id;

-- ============================================================
-- VIEW 5: store_shift_summary
-- Shift details with opener/closer names and duration
-- ============================================================

create or replace view public.store_shift_summary as
select
  ss.id as shift_id,
  ss.brand_id,
  ss.branch_id,
  ss.shift_number,
  ss.shift_status,
  ss.opened_at,
  ss.closed_at,
  coalesce(ss.opening_cash, 0)::numeric(14,2) as opening_cash,
  coalesce(ss.expected_closing_cash, 0)::numeric(14,2) as expected_closing_cash,
  coalesce(ss.counted_closing_cash, 0)::numeric(14,2) as counted_closing_cash,
  coalesce(ss.cash_difference, 0)::numeric(14,2) as cash_difference,
  case
    when ss.shift_status = 'CLOSED' and ss.closed_at is not null and ss.opened_at is not null
    then (extract(epoch from (ss.closed_at - ss.opened_at)) / 60)::integer
  end as duration_minutes,
  ss.opened_by,
  ss.closed_by,
  opener.name as opened_by_name,
  closer.name as closed_by_name
from public.store_shifts ss
left join public.profiles opener on opener.id = ss.opened_by
left join public.profiles closer on closer.id = ss.closed_by;

-- ============================================================
-- VIEW 6: service_status_summary
-- Count of active services grouped by status
-- ============================================================

create or replace view public.service_status_summary as
select
  s.brand_id,
  s.branch_id,
  s.current_status,
  count(*)::integer as service_count
from public.services s
where s.deleted_at is null
group by s.brand_id, s.branch_id, s.current_status;

-- ============================================================
-- VIEW 7: inventory_stock_summary
-- Stock levels with status classification per item per branch
-- ============================================================

create or replace view public.inventory_stock_summary as
select
  ii.id as item_id,
  ii.brand_id,
  bis.branch_id,
  ii.name as item_name,
  ii.sku,
  ii.item_type,
  coalesce(bis.current_stock, 0)::numeric(14,2) as current_stock,
  coalesce(bis.reserved_stock, 0)::numeric(14,2) as reserved_stock,
  coalesce(bis.available_stock, 0)::numeric(14,2) as available_stock,
  ii.min_stock,
  case
    when coalesce(bis.current_stock, 0) <= 0 then 'OUT'
    when coalesce(bis.current_stock, 0) <= ii.min_stock then 'LOW'
    else 'OK'
  end as stock_status
from public.inventory_items ii
left join public.branch_inventory_stocks bis on bis.item_id = ii.id
where ii.deleted_at is null;

-- ============================================================
-- COMMENTS
-- ============================================================

comment on view public.daily_finance_summary is
  'Daily P&L from finance_ledger. Each row = one brand + branch + date. net_profit = revenue contributions (CREDIT=+ DEBIT=-) + expense contributions (DEBIT=- CREDIT=+). Excludes STOCK_PURCHASE and VOID_REVERSAL.';

comment on column public.daily_finance_summary.service_revenue is
  'SERVICE_REVENUE CREDIT = +amount, DEBIT = -amount';
comment on column public.daily_finance_summary.pos_revenue is
  'POS_REVENUE CREDIT = +amount, DEBIT = -amount';
comment on column public.daily_finance_summary.other_income is
  'OTHER_INCOME CREDIT = +amount, DEBIT = -amount';
comment on column public.daily_finance_summary.mdr_expense is
  'MDR_EXPENSE DEBIT = +amount, CREDIT = -amount';
comment on column public.daily_finance_summary.operating_expense is
  'OPERATING_EXPENSE DEBIT = +amount, CREDIT = -amount';
comment on column public.daily_finance_summary.cogs is
  'COGS DEBIT = +amount, CREDIT = -amount';
comment on column public.daily_finance_summary.cash_adjustment is
  'CASH_ADJUSTMENT DEBIT = +amount, CREDIT = -amount';
comment on column public.daily_finance_summary.payment_refund is
  'PAYMENT_REFUND DEBIT = +amount, CREDIT = -amount';
comment on column public.daily_finance_summary.net_profit is
  'Revenue entries (SERVICE_REVENUE,POS_REVENUE,OTHER_INCOME: CREDIT=+ DEBIT=-) + expense entries (MDR_EXPENSE,OPERATING_EXPENSE,COGS,CASH_ADJUSTMENT,PAYMENT_REFUND: DEBIT=- CREDIT=+). Excludes STOCK_PURCHASE and VOID_REVERSAL.';

comment on view public.monthly_finance_summary is
  'Monthly aggregation of daily_finance_summary. Sums all financial columns grouped by year and month.';

comment on column public.monthly_finance_summary.year is
  'Extract year from ledger_date';
comment on column public.monthly_finance_summary.month is
  'Extract month from ledger_date (1-12)';

comment on view public.payment_method_summary is
  'Payment volume aggregated by payment method. UNION ALL of COMPLETED service_payments (gross = gross_amount) and COMPLETED pos_sales (gross = gross_amount - discount_amount).';

comment on column public.payment_method_summary.transaction_count is
  'Total number of completed transactions using this payment method';
comment on column public.payment_method_summary.total_gross_amount is
  'Sum of gross amounts. Service: gross_amount. POS: gross_amount - discount_amount.';
comment on column public.payment_method_summary.total_mdr_amount is
  'Sum of MDR fees charged on this payment method';
comment on column public.payment_method_summary.total_net_amount is
  'Sum of net amounts after MDR';

comment on view public.branch_revenue_summary is
  'Aggregate revenue, expenses, and net profit per branch across all dates.';

comment on column public.branch_revenue_summary.total_revenue is
  'service_revenue + pos_revenue + other_income';

comment on view public.store_shift_summary is
  'Store shift details with opener/closer profile names and computed duration.';

comment on column public.store_shift_summary.opening_cash is
  'Cash amount counted at shift opening';
comment on column public.store_shift_summary.expected_closing_cash is
  'Expected cash = opening_cash + cash payments + manual IN - manual OUT';
comment on column public.store_shift_summary.counted_closing_cash is
  'Actual cash counted at shift closing';
comment on column public.store_shift_summary.cash_difference is
  'counted_closing_cash - expected_closing_cash';
comment on column public.store_shift_summary.duration_minutes is
  'Shift duration in minutes (closed_at - opened_at). Only computed for CLOSED shifts.';

comment on view public.service_status_summary is
  'Count of active (non-deleted) services grouped by current_status per brand and branch.';

comment on column public.service_status_summary.service_count is
  'Number of services in this status';

comment on view public.inventory_stock_summary is
  'Inventory stock levels per item per branch with status classification. OUT if stock <= 0, LOW if stock <= min_stock, otherwise OK.';

comment on column public.inventory_stock_summary.current_stock is
  'Current cached stock quantity from branch_inventory_stocks';
comment on column public.inventory_stock_summary.reserved_stock is
  'Reserved (committed but not yet deducted) stock quantity';
comment on column public.inventory_stock_summary.available_stock is
  'current_stock - reserved_stock (generated column)';
comment on column public.inventory_stock_summary.stock_status is
  'OUT when current_stock <= 0, LOW when current_stock <= min_stock (and > 0), OK otherwise';

-- ============================================================
-- VALIDATION QUERIES (reference only, not executed)
-- ============================================================

-- VALIDATION 1: daily_finance_summary service_revenue matches finance_ledger
-- Compare sum of SERVICE_REVENUE CREDIT minus DEBIT per day against the view.
--
-- SELECT
--   fl.ledger_date,
--   fl.brand_id,
--   fl.branch_id,
--   COALESCE(SUM(CASE WHEN fl.entry_type = 'SERVICE_REVENUE' AND fl.direction = 'CREDIT' THEN fl.amount END), 0)
--     - COALESCE(SUM(CASE WHEN fl.entry_type = 'SERVICE_REVENUE' AND fl.direction = 'DEBIT' THEN fl.amount END), 0) AS raw_service_revenue,
--   dfs.service_revenue
-- FROM public.finance_ledger fl
-- LEFT JOIN public.daily_finance_summary dfs
--   ON dfs.brand_id = fl.brand_id
--  AND (dfs.branch_id IS NOT DISTINCT FROM fl.branch_id)
--  AND dfs.ledger_date = fl.ledger_date
-- GROUP BY fl.ledger_date, fl.brand_id, fl.branch_id, dfs.service_revenue
-- HAVING COALESCE(SUM(CASE WHEN fl.entry_type = 'SERVICE_REVENUE' AND fl.direction = 'CREDIT' THEN fl.amount END), 0)
--      - COALESCE(SUM(CASE WHEN fl.entry_type = 'SERVICE_REVENUE' AND fl.direction = 'DEBIT' THEN fl.amount END), 0)
--      IS DISTINCT FROM dfs.service_revenue;

-- VALIDATION 2: monthly_finance_summary matches daily_finance_summary
-- Compare mdr_expense sum from daily view vs monthly view.
--
-- SELECT
--   dfs.brand_id,
--   dfs.branch_id,
--   EXTRACT(YEAR FROM dfs.ledger_date)::integer AS year,
--   EXTRACT(MONTH FROM dfs.ledger_date)::integer AS month,
--   SUM(dfs.mdr_expense) AS daily_sum_mdr,
--   mfs.mdr_expense AS monthly_mdr
-- FROM public.daily_finance_summary dfs
-- JOIN public.monthly_finance_summary mfs
--   ON mfs.brand_id = dfs.brand_id
--  AND (mfs.branch_id IS NOT DISTINCT FROM dfs.branch_id)
--  AND mfs.year = EXTRACT(YEAR FROM dfs.ledger_date)::integer
--  AND mfs.month = EXTRACT(MONTH FROM dfs.ledger_date)::integer
-- GROUP BY dfs.brand_id, dfs.branch_id, EXTRACT(YEAR FROM dfs.ledger_date), EXTRACT(MONTH FROM dfs.ledger_date), mfs.mdr_expense
-- HAVING SUM(dfs.mdr_expense) IS DISTINCT FROM mfs.mdr_expense;

-- VALIDATION 3: payment_method_summary matches service_payments + pos_sales
-- Compare transaction_count and total_gross_amount.
--
-- SELECT
--   COALESCE(sp_stats.brand_id, ps_stats.brand_id) AS brand_id,
--   COALESCE(sp_stats.branch_id, ps_stats.branch_id) AS branch_id,
--   COALESCE(sp_stats.payment_method_id, ps_stats.payment_method_id) AS payment_method_id,
--   COALESCE(sp_stats.sp_count, 0) + COALESCE(ps_stats.ps_count, 0) AS raw_transaction_count,
--   COALESCE(sp_stats.sp_gross, 0) + COALESCE(ps_stats.ps_gross, 0) AS raw_total_gross,
--   pms.transaction_count AS view_transaction_count,
--   pms.total_gross_amount AS view_total_gross
-- FROM (
--   SELECT brand_id, branch_id, payment_method_id,
--          COUNT(*) AS sp_count,
--          SUM(gross_amount) AS sp_gross
--   FROM public.service_payments
--   WHERE payment_status = 'COMPLETED'
--   GROUP BY brand_id, branch_id, payment_method_id
-- ) sp_stats
-- FULL JOIN (
--   SELECT brand_id, branch_id, payment_method_id,
--          COUNT(*) AS ps_count,
--          SUM(gross_amount - discount_amount) AS ps_gross
--   FROM public.pos_sales
--   WHERE sale_status = 'COMPLETED'
--   GROUP BY brand_id, branch_id, payment_method_id
-- ) ps_stats
--   ON ps_stats.brand_id = sp_stats.brand_id
--  AND (ps_stats.branch_id IS NOT DISTINCT FROM sp_stats.branch_id)
--  AND ps_stats.payment_method_id = sp_stats.payment_method_id
-- JOIN public.payment_method_summary pms
--   ON pms.brand_id = COALESCE(sp_stats.brand_id, ps_stats.brand_id)
--  AND (pms.branch_id IS NOT DISTINCT FROM COALESCE(sp_stats.branch_id, ps_stats.branch_id))
--  AND pms.payment_method_id = COALESCE(sp_stats.payment_method_id, ps_stats.payment_method_id)
-- WHERE COALESCE(sp_stats.sp_count, 0) + COALESCE(ps_stats.ps_count, 0) != pms.transaction_count
--    OR COALESCE(sp_stats.sp_gross, 0) + COALESCE(ps_stats.ps_gross, 0) != pms.total_gross_amount;

-- VALIDATION 4: inventory_stock_summary matches branch_inventory_stocks
-- Compare current_stock.
--
-- SELECT
--   bis.id AS stock_id,
--   bis.item_id,
--   bis.branch_id,
--   bis.current_stock AS raw_current_stock,
--   iss.current_stock AS view_current_stock
-- FROM public.branch_inventory_stocks bis
-- JOIN public.inventory_stock_summary iss
--   ON iss.item_id = bis.item_id
--  AND (iss.branch_id IS NOT DISTINCT FROM bis.branch_id)
-- WHERE bis.current_stock IS DISTINCT FROM iss.current_stock;

-- VALIDATION 5: store_shift_summary duration calculation
-- Check duration_minutes against raw EXTRACT.
--
-- SELECT
--   ss.id AS shift_id,
--   ss.shift_number,
--   ss.shift_status,
--   ss.opened_at,
--   ss.closed_at,
--   (EXTRACT(EPOCH FROM (ss.closed_at - ss.opened_at)) / 60)::integer AS raw_duration_minutes,
--   sss.duration_minutes
-- FROM public.store_shifts ss
-- JOIN public.store_shift_summary sss ON sss.shift_id = ss.id
-- WHERE ss.shift_status = 'CLOSED'
--   AND (EXTRACT(EPOCH FROM (ss.closed_at - ss.opened_at)) / 60)::integer IS DISTINCT FROM sss.duration_minutes;

-- VALIDATION 6: branch_revenue_summary matches finance_ledger
-- Compare net_profit.
--
-- SELECT
--   fl.brand_id,
--   fl.branch_id,
--   COALESCE(SUM(
--     CASE
--       WHEN fl.entry_type IN ('SERVICE_REVENUE', 'POS_REVENUE', 'OTHER_INCOME') AND fl.direction = 'CREDIT' THEN fl.amount
--       WHEN fl.entry_type IN ('SERVICE_REVENUE', 'POS_REVENUE', 'OTHER_INCOME') AND fl.direction = 'DEBIT' THEN -fl.amount
--       WHEN fl.entry_type IN ('MDR_EXPENSE', 'OPERATING_EXPENSE', 'COGS', 'CASH_ADJUSTMENT', 'PAYMENT_REFUND') AND fl.direction = 'DEBIT' THEN -fl.amount
--       WHEN fl.entry_type IN ('MDR_EXPENSE', 'OPERATING_EXPENSE', 'COGS', 'CASH_ADJUSTMENT', 'PAYMENT_REFUND') AND fl.direction = 'CREDIT' THEN fl.amount
--     END
--   ), 0)::numeric(14,2) AS raw_net_profit,
--   brs.net_profit
-- FROM public.finance_ledger fl
-- LEFT JOIN public.branch_revenue_summary brs
--   ON brs.brand_id = fl.brand_id
--  AND (brs.branch_id IS NOT DISTINCT FROM fl.branch_id)
-- GROUP BY fl.brand_id, fl.branch_id, brs.net_profit
-- HAVING COALESCE(SUM(
--   CASE
--     WHEN fl.entry_type IN ('SERVICE_REVENUE', 'POS_REVENUE', 'OTHER_INCOME') AND fl.direction = 'CREDIT' THEN fl.amount
--     WHEN fl.entry_type IN ('SERVICE_REVENUE', 'POS_REVENUE', 'OTHER_INCOME') AND fl.direction = 'DEBIT' THEN -fl.amount
--     WHEN fl.entry_type IN ('MDR_EXPENSE', 'OPERATING_EXPENSE', 'COGS', 'CASH_ADJUSTMENT', 'PAYMENT_REFUND') AND fl.direction = 'DEBIT' THEN -fl.amount
--     WHEN fl.entry_type IN ('MDR_EXPENSE', 'OPERATING_EXPENSE', 'COGS', 'CASH_ADJUSTMENT', 'PAYMENT_REFUND') AND fl.direction = 'CREDIT' THEN fl.amount
--   END
-- ), 0)::numeric(14,2) IS DISTINCT FROM brs.net_profit;

-- ============================================================
-- End of Migration 012
-- ============================================================
