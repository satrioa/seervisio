-- ============================================================
-- POS Full Checkout Test Seed
-- Local/dev only. Do not run in production.
--
-- Creates/ensures minimal data for testing:
-- - CASH + QRIS payment accounts/methods
-- - branch_payment_methods mappings
-- - PRODUCT/SPAREPART/SUPPLY/DEVICE_UNIT inventory items
-- - branch stock rows
-- - one AVAILABLE serialized device unit
-- ============================================================

do $$
declare
  v_brand_id integer;
  v_branch_id uuid;
  v_cash_account_id uuid;
  v_qris_account_id uuid;
  v_cash_method_id uuid;
  v_qris_method_id uuid;
  v_product_item_id uuid;
  v_sparepart_item_id uuid;
  v_supply_item_id uuid;
  v_device_item_id uuid;
  v_device_unit_id uuid;
begin
  -- Prefer kasservice, otherwise use the first active brand.
  select id into v_brand_id
  from public.brands
  where slug = 'kasservice'
    and status = 'active'
  limit 1;

  if v_brand_id is null then
    select id into v_brand_id
    from public.brands
    where status = 'active'
    order by id
    limit 1;
  end if;

  if v_brand_id is null then
    raise exception 'No active brand found. Create a brand before running POS test seed.';
  end if;

  -- Prefer an existing active branch; create a clearly marked TEST branch only if none exists.
  select id into v_branch_id
  from public.branches
  where brand_id = v_brand_id
    and is_active = true
    and deleted_at is null
  order by created_at, id
  limit 1;

  if v_branch_id is null then
    insert into public.branches (
      brand_id, name, code, address, phone, is_active
    ) values (
      v_brand_id,
      'TEST POS Branch',
      'TEST-POS',
      'TEST DATA - POS checkout seed branch',
      null,
      true
    )
    returning id into v_branch_id;
  end if;

  -- CASH payment account.
  select id into v_cash_account_id
  from public.payment_accounts
  where brand_id = v_brand_id
    and branch_id = v_branch_id
    and account_name = 'TEST Kas POS'
  limit 1;

  if v_cash_account_id is null then
    insert into public.payment_accounts (
      brand_id, branch_id, account_name, type,
      is_cash_account, is_system_account, is_default_receiving_account,
      is_active, allow_negative_balance, current_balance,
      description, metadata
    ) values (
      v_brand_id, v_branch_id, 'TEST Kas POS', 'CASH',
      true, false, false,
      true, false, 0,
      'TEST DATA - POS cash account',
      jsonb_build_object('seed', 'pos_test_seed', 'test', true)
    )
    returning id into v_cash_account_id;
  else
    update public.payment_accounts
    set type = 'CASH',
        is_cash_account = true,
        is_system_account = false,
        is_active = true,
        description = 'TEST DATA - POS cash account',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('seed', 'pos_test_seed', 'test', true),
        updated_at = now()
    where id = v_cash_account_id;
  end if;

  -- QRIS payment account. Schema allows QRIS directly.
  select id into v_qris_account_id
  from public.payment_accounts
  where brand_id = v_brand_id
    and branch_id = v_branch_id
    and account_name = 'TEST QRIS POS'
  limit 1;

  if v_qris_account_id is null then
    insert into public.payment_accounts (
      brand_id, branch_id, account_name, type,
      account_holder_name, bank_name,
      is_cash_account, is_system_account, is_default_receiving_account,
      is_active, allow_negative_balance, current_balance,
      description, metadata
    ) values (
      v_brand_id, v_branch_id, 'TEST QRIS POS', 'QRIS',
      'TEST QRIS POS', 'TEST QRIS',
      false, false, false,
      true, false, 0,
      'TEST DATA - POS QRIS account',
      jsonb_build_object('seed', 'pos_test_seed', 'test', true)
    )
    returning id into v_qris_account_id;
  else
    update public.payment_accounts
    set type = 'QRIS',
        is_cash_account = false,
        is_system_account = false,
        is_active = true,
        description = 'TEST DATA - POS QRIS account',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('seed', 'pos_test_seed', 'test', true),
        updated_at = now()
    where id = v_qris_account_id;
  end if;

  -- CASH payment method.
  insert into public.payment_methods (
    brand_id, type, name, is_active, default_payment_account_id, mdr_percentage, metadata
  ) values (
    v_brand_id, 'CASH', 'Tunai', true, v_cash_account_id, 0,
    jsonb_build_object('seed', 'pos_test_seed', 'test', true)
  )
  on conflict (brand_id, name) do update
  set type = excluded.type,
      is_active = true,
      default_payment_account_id = excluded.default_payment_account_id,
      mdr_percentage = excluded.mdr_percentage,
      metadata = coalesce(public.payment_methods.metadata, '{}'::jsonb) || excluded.metadata,
      updated_at = now()
  returning id into v_cash_method_id;

  -- QRIS payment method with MDR.
  insert into public.payment_methods (
    brand_id, type, name, is_active, default_payment_account_id, mdr_percentage, metadata
  ) values (
    v_brand_id, 'QRIS', 'QRIS Test', true, v_qris_account_id, 0.70,
    jsonb_build_object('seed', 'pos_test_seed', 'test', true)
  )
  on conflict (brand_id, name) do update
  set type = excluded.type,
      is_active = true,
      default_payment_account_id = excluded.default_payment_account_id,
      mdr_percentage = excluded.mdr_percentage,
      metadata = coalesce(public.payment_methods.metadata, '{}'::jsonb) || excluded.metadata,
      updated_at = now()
  returning id into v_qris_method_id;

  -- Branch payment method overrides used by resolve_pos_payment_account().
  insert into public.branch_payment_methods (
    brand_id, branch_id, method_type, payment_account_id, mdr_percentage, is_active
  ) values (
    v_brand_id, v_branch_id, 'CASH', v_cash_account_id, 0, true
  )
  on conflict (brand_id, branch_id, method_type) do update
  set payment_account_id = excluded.payment_account_id,
      mdr_percentage = excluded.mdr_percentage,
      is_active = true,
      updated_at = now();

  insert into public.branch_payment_methods (
    brand_id, branch_id, method_type, payment_account_id, mdr_percentage, is_active
  ) values (
    v_brand_id, v_branch_id, 'QRIS', v_qris_account_id, 0.70, true
  )
  on conflict (brand_id, branch_id, method_type) do update
  set payment_account_id = excluded.payment_account_id,
      mdr_percentage = excluded.mdr_percentage,
      is_active = true,
      updated_at = now();

  -- Inventory items. These are brand-level catalog rows.
  select id into v_product_item_id
  from public.inventory_items
  where brand_id = v_brand_id
    and name = 'TEST Case iPhone 13'
    and deleted_at is null
  limit 1;

  if v_product_item_id is null then
    insert into public.inventory_items (
      brand_id, item_type, name, sku, description, unit_name,
      cost_price, selling_price, min_stock, track_stock,
      allow_negative_stock, is_active, metadata
    ) values (
      v_brand_id, 'PRODUCT', 'TEST Case iPhone 13', 'TEST-POS-CASE-13',
      'TEST DATA - POS PRODUCT item', 'pcs',
      15000, 50000, 1, true,
      false, true, jsonb_build_object('seed', 'pos_test_seed', 'test', true)
    ) returning id into v_product_item_id;
  else
    update public.inventory_items
    set item_type = 'PRODUCT',
        cost_price = 15000,
        selling_price = 50000,
        track_stock = true,
        allow_negative_stock = false,
        is_active = true,
        deleted_at = null,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('seed', 'pos_test_seed', 'test', true),
        updated_at = now()
    where id = v_product_item_id;
  end if;

  select id into v_sparepart_item_id
  from public.inventory_items
  where brand_id = v_brand_id
    and name = 'TEST Battery iPhone 11'
    and deleted_at is null
  limit 1;

  if v_sparepart_item_id is null then
    insert into public.inventory_items (
      brand_id, item_type, name, sku, description, unit_name,
      cost_price, selling_price, min_stock, track_stock,
      allow_negative_stock, is_active, metadata
    ) values (
      v_brand_id, 'SPAREPART', 'TEST Battery iPhone 11', 'TEST-POS-BATT-IP11',
      'TEST DATA - POS SPAREPART item', 'pcs',
      120000, 250000, 1, true,
      false, true, jsonb_build_object('seed', 'pos_test_seed', 'test', true)
    ) returning id into v_sparepart_item_id;
  else
    update public.inventory_items
    set item_type = 'SPAREPART',
        cost_price = 120000,
        selling_price = 250000,
        track_stock = true,
        allow_negative_stock = false,
        is_active = true,
        deleted_at = null,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('seed', 'pos_test_seed', 'test', true),
        updated_at = now()
    where id = v_sparepart_item_id;
  end if;

  select id into v_supply_item_id
  from public.inventory_items
  where brand_id = v_brand_id
    and name = 'TEST Lem LCD'
    and deleted_at is null
  limit 1;

  if v_supply_item_id is null then
    insert into public.inventory_items (
      brand_id, item_type, name, sku, description, unit_name,
      cost_price, selling_price, min_stock, track_stock,
      allow_negative_stock, is_active, metadata
    ) values (
      v_brand_id, 'SUPPLY', 'TEST Lem LCD', 'TEST-POS-LEM-LCD',
      'TEST DATA - POS SUPPLY item', 'pcs',
      10000, 30000, 1, true,
      false, true, jsonb_build_object('seed', 'pos_test_seed', 'test', true)
    ) returning id into v_supply_item_id;
  else
    update public.inventory_items
    set item_type = 'SUPPLY',
        cost_price = 10000,
        selling_price = 30000,
        track_stock = true,
        allow_negative_stock = false,
        is_active = true,
        deleted_at = null,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('seed', 'pos_test_seed', 'test', true),
        updated_at = now()
    where id = v_supply_item_id;
  end if;

  select id into v_device_item_id
  from public.inventory_items
  where brand_id = v_brand_id
    and name = 'TEST iPhone 12 128GB Second'
    and deleted_at is null
  limit 1;

  if v_device_item_id is null then
    insert into public.inventory_items (
      brand_id, item_type, name, sku, description, unit_name,
      cost_price, selling_price, min_stock, track_stock,
      allow_negative_stock, is_active, metadata
    ) values (
      v_brand_id, 'DEVICE_UNIT', 'TEST iPhone 12 128GB Second', 'TEST-POS-IP12-128-SECOND',
      'TEST DATA - POS DEVICE_UNIT item', 'unit',
      4000000, 5200000, 1, true,
      false, true, jsonb_build_object('seed', 'pos_test_seed', 'test', true)
    ) returning id into v_device_item_id;
  else
    update public.inventory_items
    set item_type = 'DEVICE_UNIT',
        cost_price = 4000000,
        selling_price = 5200000,
        track_stock = true,
        allow_negative_stock = false,
        is_active = true,
        deleted_at = null,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('seed', 'pos_test_seed', 'test', true),
        updated_at = now()
    where id = v_device_item_id;
  end if;

  -- Branch stock rows. Set to at least 5 for repeatable manual checkout tests.
  insert into public.branch_inventory_stocks (
    brand_id, branch_id, item_id, current_stock, reserved_stock, last_movement_at
  ) values
    (v_brand_id, v_branch_id, v_product_item_id, 10, 0, now()),
    (v_brand_id, v_branch_id, v_sparepart_item_id, 10, 0, now()),
    (v_brand_id, v_branch_id, v_supply_item_id, 10, 0, now()),
    (v_brand_id, v_branch_id, v_device_item_id, 5, 0, now())
  on conflict (branch_id, item_id) do update
  set current_stock = greatest(public.branch_inventory_stocks.current_stock, excluded.current_stock),
      reserved_stock = 0,
      last_movement_at = now(),
      updated_at = now();

  -- One available serialized device unit for DEVICE_UNIT checkout.
  select id into v_device_unit_id
  from public.inventory_item_units
  where brand_id = v_brand_id
    and branch_id = v_branch_id
    and inventory_item_id = v_device_item_id
    and (imei = 'TEST-IMEI-IP12-0001' or serial_number = 'TEST-SN-IP12-0001')
  limit 1;

  if v_device_unit_id is null then
    insert into public.inventory_item_units (
      brand_id, branch_id, inventory_item_id,
      imei, serial_number, device_brand, device_model,
      storage, color, condition_grade, battery_health,
      purchase_price, selling_price,
      source, status, note
    ) values (
      v_brand_id, v_branch_id, v_device_item_id,
      'TEST-IMEI-IP12-0001', 'TEST-SN-IP12-0001', 'Apple', 'iPhone 12',
      '128GB', 'Black', 'B', '85%',
      4000000, 5200000,
      'MANUAL', 'AVAILABLE', 'TEST DATA - POS serialized device unit'
    ) returning id into v_device_unit_id;
  else
    update public.inventory_item_units
    set status = 'AVAILABLE',
        source = 'MANUAL',
        purchase_price = 4000000,
        selling_price = 5200000,
        device_brand = 'Apple',
        device_model = 'iPhone 12',
        storage = '128GB',
        color = 'Black',
        condition_grade = 'B',
        battery_health = '85%',
        note = 'TEST DATA - POS serialized device unit',
        updated_at = now()
    where id = v_device_unit_id;
  end if;

  raise notice 'POS test seed ready. brand_id=%, branch_id=%, cash_method_id=%, qris_method_id=%, device_unit_id=%',
    v_brand_id, v_branch_id, v_cash_method_id, v_qris_method_id, v_device_unit_id;
end $$;

-- Quick verification after running:
-- select id, slug, name from public.brands where id in (select brand_id from public.inventory_items where name like 'TEST %');
-- select account_name, type, is_cash_account, is_active from public.payment_accounts where account_name like 'TEST % POS';
-- select name, type, mdr_percentage, is_active from public.payment_methods where name in ('Tunai', 'QRIS Test');
-- select item_type, name, selling_price, cost_price from public.inventory_items where name like 'TEST %';
-- select current_stock, available_stock from public.branch_inventory_stocks where item_id in (select id from public.inventory_items where name like 'TEST %');
-- select imei, serial_number, source, status from public.inventory_item_units where imei = 'TEST-IMEI-IP12-0001';
