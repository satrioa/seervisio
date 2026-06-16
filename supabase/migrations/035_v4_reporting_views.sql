-- ============================================================
-- Migration 035: V4 Reporting Views
--
-- All views are read-only with security_invoker = true,
-- so RLS from underlying tables applies automatically.
-- Do not materialize; keep as plain SQL views.
-- ============================================================

-- ============================================================
-- View: v4_pos_sales_summary
-- Daily POS sales summary by branch.
-- ============================================================
create or replace view public.v4_pos_sales_summary
with (security_invoker = true)
as
select
  t.brand_id,
  t.branch_id,
  b.name as branch_name,
  date(t.created_at) as sales_date,
  count(*) filter (where t.status = 'COMPLETED') as transaction_count,
  coalesce(sum(t.total_amount) filter (where t.status = 'COMPLETED'), 0) as gross_sales,
  coalesce(sum(t.discount_amount) filter (where t.status = 'COMPLETED'), 0) as discount_amount,
  coalesce(sum(t.service_fee_amount) filter (where t.status = 'COMPLETED'), 0) as service_fee_amount,
  coalesce(sum(t.total_amount - t.discount_amount) filter (where t.status = 'COMPLETED'), 0) as net_sales,
  coalesce(sum(t.paid_amount) filter (where t.status = 'COMPLETED'), 0) as paid_amount,
  count(*) filter (where t.status = 'VOIDED') as voided_count,
  coalesce(sum(t.total_amount) filter (where t.status = 'VOIDED'), 0) as voided_amount
from public.pos_transactions t
left join public.branches b on b.id = t.branch_id
group by t.brand_id, t.branch_id, b.name, date(t.created_at);

comment on view public.v4_pos_sales_summary is
  'Daily POS sales summary. COMPLETED = sales, VOIDED counted separately.';

-- ============================================================
-- View: v4_pos_item_sales
-- Line-item detail for POS sales.
-- ============================================================
create or replace view public.v4_pos_item_sales
with (security_invoker = true)
as
select
  t.brand_id,
  t.branch_id,
  b.name as branch_name,
  date(t.created_at) as sales_date,
  t.id as transaction_id,
  t.transaction_number,
  i.item_type,
  i.product_id,
  i.variant_id,
  i.unit_id,
  i.item_name_snapshot,
  i.variant_name_snapshot,
  i.attributes_snapshot,
  i.imei_snapshot,
  i.battery_health_snapshot,
  i.condition_snapshot,
  i.quantity,
  i.cost_price_snapshot,
  i.selling_price_snapshot,
  i.subtotal_amount,
  (i.subtotal_amount - i.cost_price_snapshot * i.quantity) as gross_profit,
  case
    when i.subtotal_amount > 0
    then round(((i.subtotal_amount - i.cost_price_snapshot * i.quantity) / i.subtotal_amount) * 100, 2)
    else 0
  end as margin_percent,
  t.status as transaction_status,
  t.created_at
from public.pos_transaction_items i
join public.pos_transactions t on t.id = i.transaction_id
left join public.branches b on b.id = t.branch_id;

comment on view public.v4_pos_item_sales is
  'POS line-item sales with cost/profit/margin. Includes all transaction statuses.';

-- ============================================================
-- View: v4_pos_payment_summary
-- POS sales grouped by payment method.
-- ============================================================
create or replace view public.v4_pos_payment_summary
with (security_invoker = true)
as
select
  t.brand_id,
  t.branch_id,
  b.name as branch_name,
  date(t.created_at) as sales_date,
  t.payment_method_id,
  pm.name as payment_method_name,
  t.payment_account_id,
  pa.account_name as payment_account_name,
  count(*) as transaction_count,
  coalesce(sum(t.total_amount), 0) as total_amount,
  coalesce(sum(t.paid_amount), 0) as paid_amount,
  coalesce(sum(t.change_amount), 0) as change_amount
from public.pos_transactions t
left join public.branches b on b.id = t.branch_id
left join public.payment_methods pm on pm.id = t.payment_method_id
left join public.payment_accounts pa on pa.id = t.payment_account_id
where t.status = 'COMPLETED'
group by
  t.brand_id, t.branch_id, b.name,
  date(t.created_at),
  t.payment_method_id, pm.name,
  t.payment_account_id, pa.account_name;

comment on view public.v4_pos_payment_summary is
  'COMPLETED POS sales by payment method and account.';

-- ============================================================
-- View: v4_inventory_stock_summary
-- Quantity-based stock (sparepart, produk, unit baru) per branch.
-- Does NOT include unit second (serialized).
-- ============================================================
create or replace view public.v4_inventory_stock_summary
with (security_invoker = true)
as
select
  p.brand_id,
  s.branch_id,
  b.name as branch_name,
  p.product_kind,
  p.condition_type,
  p.id as product_id,
  p.name as product_name,
  v.id as variant_id,
  v.name as variant_name,
  v.attributes,
  v.sku,
  v.barcode,
  p.category_id,
  ic.name as category_name,
  coalesce(s.current_stock, 0) as current_stock,
  coalesce(s.reserved_stock, 0) as reserved_stock,
  (coalesce(s.current_stock, 0) - coalesce(s.reserved_stock, 0)) as available_stock,
  v.min_stock,
  case
    when coalesce(s.current_stock, 0) <= 0 then 'OUT_OF_STOCK'
    when v.min_stock is not null and coalesce(s.current_stock, 0) <= v.min_stock then 'LOW_STOCK'
    else 'OK'
  end as stock_status
from public.inv_products p
join public.inv_variants v on v.product_id = p.id
left join public.inv_variant_stocks s on s.variant_id = v.id
left join public.branches b on b.id = s.branch_id
left join public.inventory_categories ic on ic.id = p.category_id
where p.product_kind in ('SPAREPART', 'PRODUCT', 'UNIT_NEW')
  and p.is_active = true;

comment on view public.v4_inventory_stock_summary is
  'Quantity-based stock levels for sparepart/produk/unit baru. Excludes unit second.';

-- ============================================================
-- View: v4_inventory_valuation
-- Stock value and potential sales value by variant.
-- ============================================================
create or replace view public.v4_inventory_valuation
with (security_invoker = true)
as
select
  p.brand_id,
  s.branch_id,
  b.name as branch_name,
  p.product_kind,
  p.condition_type,
  p.id as product_id,
  p.name as product_name,
  v.id as variant_id,
  v.name as variant_name,
  coalesce(s.current_stock, 0) as current_stock,
  v.cost_price as average_cost,
  v.selling_price,
  (coalesce(s.current_stock, 0) * v.cost_price) as cost_value,
  (coalesce(s.current_stock, 0) * v.selling_price) as potential_sales_value,
  (coalesce(s.current_stock, 0) * v.selling_price - coalesce(s.current_stock, 0) * v.cost_price) as potential_gross_profit
from public.inv_products p
join public.inv_variants v on v.product_id = p.id
left join public.inv_variant_stocks s on s.variant_id = v.id
left join public.branches b on b.id = s.branch_id
where p.product_kind in ('SPAREPART', 'PRODUCT', 'UNIT_NEW')
  and p.is_active = true;

comment on view public.v4_inventory_valuation is
  'Stock valuation at cost vs potential sales value. Quantity-stock items only.';

-- ============================================================
-- View: v4_unit_second_summary
-- Physical Unit Second inventory with attributes, status, aging.
-- ============================================================
create or replace view public.v4_unit_second_summary
with (security_invoker = true)
as
select
  p.brand_id,
  u.branch_id,
  b.name as branch_name,
  p.id as product_id,
  p.name as product_name,
  v.id as variant_id,
  v.name as variant_name,
  u.id as unit_id,
  u.unit_attributes,
  u.imei,
  u.serial_number,
  u.barcode,
  u.battery_health,
  u.condition_grade,
  u.purchase_cost,
  u.selling_price,
  (u.selling_price - u.purchase_cost) as potential_profit,
  u.status,
  u.created_at,
  u.updated_at,
  (current_date - u.created_at::date) as age_days
from public.inv_units u
join public.inv_products p on p.id = u.product_id
left join public.inv_variants v on v.id = u.variant_id
left join public.branches b on b.id = u.branch_id;

comment on view public.v4_unit_second_summary is
  'Serialized Unit Second inventory with IMEI, BH, attributes, aging, and profit.';

-- ============================================================
-- View: v4_inventory_movement_summary
-- Readable stock movement log with product/unit details.
-- ============================================================
create or replace view public.v4_inventory_movement_summary
with (security_invoker = true)
as
select
  m.brand_id,
  m.branch_id,
  b.name as branch_name,
  date(m.created_at) as movement_date,
  m.movement_type,
  m.direction,
  p.product_kind,
  p.condition_type,
  coalesce(p.name, '(deleted)') as product_name,
  coalesce(v.name, '(deleted)') as variant_name,
  u.imei as unit_imei,
  m.quantity,
  m.stock_before,
  m.stock_after,
  m.unit_status_before,
  m.unit_status_after,
  m.reference_type,
  m.reference_label,
  m.notes,
  m.created_at
from public.inv_stock_movements m
left join public.inv_products p on p.id = m.product_id
left join public.inv_variants v on v.id = m.variant_id
left join public.inv_units u on u.id = m.unit_id
left join public.branches b on b.id = m.branch_id;

comment on view public.v4_inventory_movement_summary is
  'Readable stock movement log with product names and unit IMEI.';

-- ============================================================
-- View: v4_sparepart_usage_summary
-- Sparepart usage for services with cost/charge/profit.
-- ============================================================
create or replace view public.v4_sparepart_usage_summary
with (security_invoker = true)
as
select
  u.brand_id,
  u.branch_id,
  b.name as branch_name,
  u.service_id,
  s.service_number,
  date(u.created_at) as usage_date,
  u.product_id,
  u.item_name_snapshot as product_name_snapshot,
  u.variant_id,
  u.variant_name_snapshot,
  u.attributes_snapshot,
  u.quantity,
  u.cost_price_snapshot,
  u.selling_price_snapshot,
  (u.quantity * u.cost_price_snapshot) as total_cost,
  (u.quantity * u.selling_price_snapshot) as total_charge,
  (u.quantity * u.selling_price_snapshot - u.quantity * u.cost_price_snapshot) as gross_profit
from public.inv_sparepart_usage u
left join public.services s on s.id = u.service_id
left join public.branches b on b.id = u.branch_id;

comment on view public.v4_sparepart_usage_summary is
  'Service sparepart usage with cost/charge/profit analysis.';

-- ============================================================
-- View: v4_stock_purchase_summary
-- Stock purchase line items with product snapshots.
-- ============================================================
create or replace view public.v4_stock_purchase_summary
with (security_invoker = true)
as
select
  pu.brand_id,
  pu.branch_id,
  b.name as branch_name,
  date(pu.created_at) as purchase_date,
  pu.purchase_number,
  pu.supplier_name,
  i.product_id,
  i.product_name_snapshot,
  i.variant_id,
  i.variant_name_snapshot,
  i.quantity,
  i.unit_cost,
  i.subtotal_amount,
  pu.payment_account_id,
  pu.status
from public.inv_stock_purchases pu
join public.inv_stock_purchase_items i on i.purchase_id = pu.id
left join public.branches b on b.id = pu.branch_id;

comment on view public.v4_stock_purchase_summary is
  'Stock purchase line items with product snapshots and payment account.';

-- ============================================================
-- View: v4_branch_business_summary
-- Daily branch-level business summary combining POS and stock data.
-- ============================================================
create or replace view public.v4_branch_business_summary
with (security_invoker = true)
as
with
pos_data as (
  select
    brand_id, branch_id,
    sales_date,
    transaction_count,
    net_sales,
    (select coalesce(sum(gross_profit), 0)
     from public.v4_pos_item_sales pis
     where pis.brand_id = ps.brand_id
       and pis.branch_id = ps.branch_id
       and pis.sales_date = ps.sales_date
       and pis.transaction_status = 'COMPLETED'
    ) as pos_gross_profit
  from public.v4_pos_sales_summary ps
),
purchase_data as (
  select
    brand_id, branch_id,
    purchase_date as summary_date,
    coalesce(sum(subtotal_amount), 0) as stock_purchase_total
  from public.v4_stock_purchase_summary
  where status = 'COMPLETED'
  group by brand_id, branch_id, purchase_date
),
sparepart_data as (
  select
    brand_id, branch_id,
    usage_date as summary_date,
    coalesce(sum(total_charge), 0) as sparepart_usage_charge,
    coalesce(sum(total_cost), 0) as sparepart_usage_cost
  from public.v4_sparepart_usage_summary
  group by brand_id, branch_id, usage_date
),
unit_second_data as (
  select
    brand_id, branch_id,
    current_date as summary_date,
    count(*) filter (where status = 'READY_STOCK') as unit_second_ready_count,
    count(*) filter (where status = 'SOLD') as unit_second_sold_count
  from public.v4_unit_second_summary
  group by brand_id, branch_id
)
select
  coalesce(p.brand_id, pu.brand_id, s.brand_id, us.brand_id) as brand_id,
  coalesce(p.branch_id, pu.branch_id, s.branch_id, us.branch_id) as branch_id,
  b.name as branch_name,
  coalesce(p.sales_date, pu.summary_date, s.summary_date, us.summary_date) as summary_date,
  coalesce(p.transaction_count, 0) as pos_transaction_count,
  coalesce(p.net_sales, 0) as pos_net_sales,
  coalesce(p.pos_gross_profit, 0) as pos_gross_profit,
  coalesce(pu.stock_purchase_total, 0) as stock_purchase_total,
  coalesce(s.sparepart_usage_charge, 0) as sparepart_usage_charge,
  coalesce(s.sparepart_usage_cost, 0) as sparepart_usage_cost,
  coalesce(us.unit_second_ready_count, 0) as unit_second_ready_count,
  coalesce(us.unit_second_sold_count, 0) as unit_second_sold_count
from pos_data p
full join purchase_data pu on pu.brand_id = p.brand_id and pu.branch_id = p.branch_id and pu.summary_date = p.sales_date
full join sparepart_data s on s.brand_id = coalesce(p.brand_id, pu.brand_id) and s.branch_id = coalesce(p.branch_id, pu.branch_id) and s.summary_date = coalesce(p.sales_date, pu.summary_date)
full join unit_second_data us on us.brand_id = coalesce(p.brand_id, pu.brand_id, s.brand_id) and us.branch_id = coalesce(p.branch_id, pu.branch_id, s.branch_id)
left join public.branches b on b.id = coalesce(p.branch_id, pu.branch_id, s.branch_id, us.branch_id);

comment on view public.v4_branch_business_summary is
  'Daily branch-level summary combining POS sales, purchases, sparepart usage, and unit second counts.';
