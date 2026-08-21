-- ============================================================
-- Migration 142: Suppliers master data
--
-- Adds a brand-scoped supplier master (Nama, WhatsApp, Nama Toko,
-- Informasi Bank Account) and links it to both purchase systems
-- (legacy `purchases` and V4 `inv_stock_purchases`) via supplier_id.
-- ============================================================

-- ============================================================
-- A. suppliers table
-- ============================================================

create table if not exists public.suppliers (
  id                uuid primary key default gen_random_uuid(),
  brand_id          integer not null references public.brands(id) on delete cascade,
  name              text not null,
  whatsapp          text,
  store_name        text,
  bank_account_info text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.suppliers is
  'Supplier master data for stock purchase (Belanja Stok). Brand-scoped.';

create index if not exists idx_suppliers_brand on public.suppliers (brand_id);
create index if not exists idx_suppliers_brand_name on public.suppliers (brand_id, name);

drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- RLS: suppliers
-- ============================================================

alter table public.suppliers enable row level security;

create policy suppliers_select on public.suppliers
  for select using (
    brand_id = any(public.get_user_brand_ids())
    or 'PLATFORM_OWNER' = any(public.get_user_roles())
  );

create policy suppliers_insert on public.suppliers
  for insert with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = suppliers.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy suppliers_update on public.suppliers
  for update using (true)
  with check (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = suppliers.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

create policy suppliers_delete on public.suppliers
  for delete using (
    exists (
      select 1 from public.user_brand_memberships bm
      where bm.brand_id = suppliers.brand_id
        and bm.profile_id = public.get_user_profile_id()
        and bm.role in ('MASTER_ADMIN', 'ADMIN')
        and bm.is_active = true
    )
  );

-- ============================================================
-- B. Link suppliers to legacy purchases
-- ============================================================

alter table public.purchases
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists idx_purchases_supplier on public.purchases (brand_id, supplier_id);

-- ============================================================
-- B2. Link suppliers to V4 inv_stock_purchases
-- ============================================================

alter table public.inv_stock_purchases
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists idx_isp_supplier on public.inv_stock_purchases (brand_id, supplier_id);

-- ============================================================
-- C. Extend legacy create_purchase_with_movements
-- ============================================================

create or replace function public.create_purchase_with_movements(
  p_brand_id integer,
  p_branch_id uuid,
  p_purchase_number text,
  p_supplier_name text,
  p_payment_account_id uuid,
  p_purchase_date date,
  p_notes text,
  p_created_by uuid,
  p_items jsonb,
  p_supplier_id uuid default null
)
returns jsonb
language plpgsql
as $func$
declare
  v_purchase_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_unit_cost numeric;
  v_subtotal numeric;
  v_total_amount numeric := 0;
  v_item_row inventory_items%ROWTYPE;
  v_stock_row branch_inventory_stocks%ROWTYPE;
  v_stock_before numeric;
  v_stock_after numeric;
  v_old_avg_cost numeric;
  v_new_avg_cost numeric;
  v_movement_id uuid;
  v_payment_account_row payment_accounts%ROWTYPE;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  -- 0. Validate supplier (if provided)
  if p_supplier_id is not null then
    if not exists (
      select 1 from public.suppliers s
      where s.id = p_supplier_id and s.brand_id = p_brand_id
    ) then
      raise exception 'Supplier tidak ditemukan untuk brand ini.' using errcode = 'P0006';
    end if;
  end if;

  -- 1. Create purchase
  insert into purchases (
    brand_id, branch_id, purchase_number, supplier_name, supplier_id,
    payment_account_id, purchase_date, notes, created_by, status
  )
  values (
    p_brand_id, p_branch_id, p_purchase_number,
    coalesce(p_supplier_name, (select name from public.suppliers where id = p_supplier_id)),
    p_supplier_id, p_payment_account_id, p_purchase_date, p_notes, p_created_by, 'PAID'
  )
  returning id into v_purchase_id;

  -- 2. Process each item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := (v_item->>'itemId')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unitCost')::numeric;
    v_subtotal := v_quantity * v_unit_cost;
    v_total_amount := v_total_amount + v_subtotal;

    -- Fetch item
    select * into v_item_row from inventory_items where id = v_item_id;
    if not found then
      raise exception 'Item not found: %', v_item_id;
    end if;

    -- Fetch current stock
    select * into v_stock_row from branch_inventory_stocks
      where branch_id = p_branch_id and item_id = v_item_id;
    v_stock_before := coalesce(v_stock_row.current_stock, 0);

    -- Calculate new stock
    v_stock_after := v_stock_before + v_quantity;

    -- Calculate new average cost
    v_old_avg_cost := coalesce(v_item_row.average_cost, 0);
    if v_stock_before <= 0 then
      v_new_avg_cost := v_unit_cost;
    else
      v_new_avg_cost := ((v_stock_before * v_old_avg_cost) + (v_quantity * v_unit_cost)) / v_stock_after;
    end if;

    -- Create purchase_items with snapshots
    insert into purchase_items (
      purchase_id, item_id, item_name_snapshot, variant_snapshot, sku_snapshot, barcode_snapshot,
      quantity, unit_snapshot, unit_cost_snapshot, subtotal
    ) values (
      v_purchase_id, v_item_id,
      v_item_row.name,
      v_item_row.variant_attributes,
      v_item_row.sku,
      v_item_row.barcode,
      v_quantity,
      v_item_row.unit_name,
      v_unit_cost,
      v_subtotal
    );

    -- Update or create branch stock
    if v_stock_row.id is not null then
      update branch_inventory_stocks
      set current_stock = v_stock_after,
          last_movement_at = now(),
          updated_at = now()
      where id = v_stock_row.id;
    else
      insert into branch_inventory_stocks (brand_id, branch_id, item_id, current_stock, reserved_stock)
      values (p_brand_id, p_branch_id, v_item_id, v_stock_after, 0);
    end if;

    -- Update item average cost and cost price
    update inventory_items
    set average_cost = v_new_avg_cost,
        cost_price = v_unit_cost,
        updated_at = now()
    where id = v_item_id;

    -- Create inventory movement
    insert into inventory_movements (
      brand_id, branch_id, item_id, movement_type, direction,
      quantity, unit_snapshot, before_quantity, after_quantity,
      unit_cost, unit_cost_snapshot, total_cost_snapshot,
      selling_price_snapshot, total_price_snapshot,
      reference_type, reference_id, reference_label, notes, created_by
    ) values (
      p_brand_id, p_branch_id, v_item_id, 'PURCHASE_IN', 'IN',
      v_quantity, v_item_row.unit_name, v_stock_before, v_stock_after,
      v_unit_cost, v_unit_cost, v_subtotal,
      v_item_row.selling_price, v_quantity * v_item_row.selling_price,
      'PURCHASE', v_purchase_id, p_purchase_number, p_notes, p_created_by
    );
  end loop;

  -- 3. Update purchase total
  update purchases set total_amount = v_total_amount, updated_at = now() where id = v_purchase_id;

  -- 4. Create payment account movement
  select * into v_payment_account_row from payment_accounts where id = p_payment_account_id;
  if not found then
    raise exception 'Payment account not found: %', p_payment_account_id;
  end if;

  v_balance_before := v_payment_account_row.current_balance;
  v_balance_after := v_balance_before - v_total_amount;

  insert into payment_account_movements (
    payment_account_id, brand_id, branch_id,
    direction, amount, before_balance, after_balance,
    movement_type, reference_type, reference_id, description, created_by
  ) values (
    p_payment_account_id, p_brand_id, p_branch_id,
    'OUT', v_total_amount, v_balance_before, v_balance_after,
    'STOCK_PURCHASE', 'PURCHASE', v_purchase_id, 'Belanja Stok: ' || p_purchase_number, p_created_by
  );

  update payment_accounts
  set current_balance = v_balance_after, updated_at = now()
  where id = p_payment_account_id;

  -- 5. Return purchase id
  return jsonb_build_object('purchase_id', v_purchase_id);
end;
$func$;

comment on function public.create_purchase_with_movements is
  'Atomic legacy stock purchase. Now supports optional supplier_id linking.';

-- ============================================================
-- D. Extend V4 create_inv_stock_purchase
-- ============================================================

create or replace function public.create_inv_stock_purchase(
  p_brand_id integer,
  p_branch_id uuid,
  p_payment_account_id uuid,
  p_supplier_name text,
  p_purchase_date date,
  p_notes text,
  p_created_by uuid,
  p_items jsonb,
  p_supplier_id uuid default null
) returns jsonb
language plpgsql
as $func$
declare
  v_purchase_id uuid;
  v_purchase_number text;
  v_item jsonb;
  v_variant_id uuid;
  v_quantity numeric;
  v_unit_cost numeric;
  v_unit_selling_price numeric;
  v_note text;
  v_subtotal numeric;
  v_total_amount numeric := 0;
  v_variant_row public.inv_variants%rowtype;
  v_product_row public.inv_products%rowtype;
  v_stock_row public.inv_variant_stocks%rowtype;
  v_stock_before numeric;
  v_stock_after numeric;
  v_old_avg_cost numeric;
  v_new_avg_cost numeric;
  v_movement_id uuid;
  v_payment_account_row public.payment_accounts%rowtype;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  -- 0. Validate supplier (if provided)
  if p_supplier_id is not null then
    if not exists (
      select 1 from public.suppliers s
      where s.id = p_supplier_id and s.brand_id = p_brand_id
    ) then
      raise exception 'Supplier tidak ditemukan untuk brand ini.' using errcode = 'P0006';
    end if;
  end if;

  -- 0b. Validate payment account
  select * into v_payment_account_row
  from public.payment_accounts
  where id = p_payment_account_id
    and brand_id = p_brand_id
    and is_active = true;

  if not found then
    raise exception 'Akun pembayaran tidak ditemukan atau tidak aktif.'
      using errcode = 'P0001';
  end if;

  -- 1. Generate purchase number
  select public.generate_inv_stock_purchase_number(p_brand_id, p_branch_id)
  into v_purchase_number;

  -- 2. Create purchase header
  insert into public.inv_stock_purchases (
    brand_id, branch_id, purchase_number, payment_account_id,
    supplier_name, supplier_id, purchase_date, notes, created_by, status
  ) values (
    p_brand_id, p_branch_id, v_purchase_number, p_payment_account_id,
    coalesce(p_supplier_name, (select name from public.suppliers where id = p_supplier_id)),
    p_supplier_id, p_purchase_date, p_notes, p_created_by, 'COMPLETED'
  )
  returning id into v_purchase_id;

  -- 3. Process each item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variantId')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unitCost')::numeric;
    v_unit_selling_price := coalesce((v_item->>'unitSellingPrice')::numeric, 0);
    v_note := (v_item->>'note')::text;
    v_subtotal := v_quantity * v_unit_cost;
    v_total_amount := v_total_amount + v_subtotal;

    -- Validate variant exists
    select * into v_variant_row
    from public.inv_variants
    where id = v_variant_id;

    if not found then
      raise exception 'Varian tidak ditemukan: %', v_variant_id
        using errcode = 'P0002';
    end if;

    -- Validate variant brand matches
    if v_variant_row.brand_id != p_brand_id then
      raise exception 'Varian tidak sesuai dengan brand.'
        using errcode = 'P0003';
    end if;

    -- Fetch product to validate product_kind
    select * into v_product_row
    from public.inv_products
    where id = v_variant_row.product_id;

    if not found then
      raise exception 'Produk tidak ditemukan untuk varian: %', v_variant_id
        using errcode = 'P0002';
    end if;

    -- Reject Unit Second (condition_type = SECOND)
    if v_product_row.product_kind = 'UNIT' and v_product_row.condition_type = 'SECOND' then
      raise exception 'Unit Second tidak dapat dibeli melalui Belanja Stok biasa. Gunakan form Unit Second.'
        using errcode = 'P0004';
    end if;

    -- Fetch or create variant stock
    select * into v_stock_row
    from public.inv_variant_stocks
    where branch_id = p_branch_id
      and variant_id = v_variant_id;

    v_stock_before := coalesce(v_stock_row.current_stock, 0);
    v_stock_after := v_stock_before + v_quantity;

    -- Calculate new average cost
    v_old_avg_cost := coalesce(v_variant_row.average_cost, 0);
    if v_stock_before <= 0 then
      v_new_avg_cost := v_unit_cost;
    else
      v_new_avg_cost := ((v_stock_before * v_old_avg_cost) + (v_quantity * v_unit_cost)) / v_stock_after;
    end if;

    -- Insert purchase item with snapshots
    insert into public.inv_stock_purchase_items (
      brand_id, branch_id, purchase_id,
      product_id, variant_id,
      product_name_snapshot, variant_name_snapshot, attributes_snapshot,
      sku_snapshot, barcode_snapshot, unit_snapshot,
      quantity, unit_cost, unit_selling_price_snapshot, subtotal_amount
    ) values (
      p_brand_id, p_branch_id, v_purchase_id,
      v_product_row.id, v_variant_id,
      v_product_row.name,
      v_variant_row.name,
      v_variant_row.attributes,
      v_variant_row.sku,
      v_variant_row.barcode,
      v_variant_row.unit,
      v_quantity,
      v_unit_cost,
      v_unit_selling_price,
      v_subtotal
    );

    -- Update variant stock (insert or update)
    if v_stock_row.id is not null then
      update public.inv_variant_stocks
      set current_stock = v_stock_after,
          updated_at = now()
      where id = v_stock_row.id;
    else
      insert into public.inv_variant_stocks (brand_id, branch_id, variant_id, current_stock, reserved_stock)
      values (p_brand_id, p_branch_id, v_variant_id, v_stock_after, 0);
    end if;

    -- Update variant average_cost and cost_price
    update public.inv_variants
    set average_cost = v_new_avg_cost,
        cost_price = v_unit_cost,
        updated_at = now()
    where id = v_variant_id;

    -- Create stock movement
    insert into public.inv_stock_movements (
      brand_id, branch_id,
      product_id, variant_id,
      movement_type, direction,
      quantity, stock_before, stock_after,
      reference_type, reference_id, reference_label,
      notes, created_by
    ) values (
      p_brand_id, p_branch_id,
      v_product_row.id, v_variant_id,
      'PURCHASE_IN', 'IN',
      v_quantity, v_stock_before, v_stock_after,
      'INV_STOCK_PURCHASE', v_purchase_id, v_purchase_number,
      coalesce(v_note, 'Belanja Stok: ' || v_product_row.name), p_created_by
    )
    returning id into v_movement_id;

    -- Update purchase item with movement_id
    update public.inv_stock_purchase_items
    set movement_id = v_movement_id
    where purchase_id = v_purchase_id
      and variant_id = v_variant_id;
  end loop;

  -- 4. Update purchase totals
  update public.inv_stock_purchases
  set subtotal_amount = v_total_amount,
      total_amount = v_total_amount,
      updated_at = now()
  where id = v_purchase_id;

  -- 5. Create payment account movement (OUT)
  v_balance_before := v_payment_account_row.current_balance;
  v_balance_after := v_balance_before - v_total_amount;

  if v_balance_after < 0 and v_payment_account_row.allow_negative_balance = false then
    raise exception 'Saldo akun pembayaran tidak mencukupi. Sisa saldo: %', v_balance_before
      using errcode = 'P0005';
  end if;

  insert into public.payment_account_movements (
    payment_account_id, brand_id, branch_id,
    direction, amount, before_balance, after_balance,
    movement_type, reference_type, reference_id, description, created_by
  ) values (
    p_payment_account_id, p_brand_id, p_branch_id,
    'OUT', v_total_amount, v_balance_before, v_balance_after,
    'STOCK_PURCHASE', 'INV_STOCK_PURCHASE', v_purchase_id::text,
    'Belanja Stok: ' || v_purchase_number, p_created_by
  );

  update public.payment_accounts
  set current_balance = v_balance_after,
      updated_at = now()
  where id = p_payment_account_id;

  -- 6. Return result
  return jsonb_build_object(
    'purchase_id', v_purchase_id,
    'purchase_number', v_purchase_number,
    'total_amount', v_total_amount,
    'item_count', (select count(*) from jsonb_array_elements(p_items))
  );
end;
$func$;

comment on function public.create_inv_stock_purchase is
  'Atomic V4 stock purchase. Now supports optional supplier_id linking.';
