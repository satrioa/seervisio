-- ============================================================
-- 141_fix_v4_reporting_view_unit_new.sql
-- Fix v4 reporting views: product_kind filter used 'UNIT_NEW'
-- but the DB check constraint stores 'UNIT'. As a result Unit
-- Baru products were excluded from stock summary & valuation.
-- ============================================================

-- ============================================================
-- View: v4_inventory_stock_summary
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
where p.product_kind in ('SPAREPART', 'PRODUCT', 'UNIT')
  and p.is_active = true;

-- ============================================================
-- View: v4_inventory_valuation
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
where p.product_kind in ('SPAREPART', 'PRODUCT', 'UNIT')
  and p.is_active = true;
