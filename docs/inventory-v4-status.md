# Inventory V4 + POS V4 Status

## Promotion Status

| Item | Status |
|---|---|
| **Sidebar** | Inventory → `/inventory-v4`, POS → `/pos-v4` |
| **Legacy visibility** | Hidden from normal users. Accessible via direct URL for MASTER_ADMIN/PLATFORM_OWNER only |
| **Legacy banner** | Warning banner displayed on legacy inventory and POS pages |
| **Route strategy** | Option A — Sidebar only (no hard redirect, old routes still manually accessible) |

### What is V4 (production-ready)
- Inventory V4 catalog (sparepart, produk, unit baru, unit second)
- Belanja Stok V4 (purchase + stock in + payment movement)
- Penyesuaian Stok V4 (stock opname correction)
- Service Sparepart Usage V4 (atomic sparepart usage for service)
- POS V4 checkout (products/units, cart, payment, MDR, transaction history)
- POS V4 void/reversal (atomic void with stock restore + payment reversal + audit trail)
- Category management (create, rename, deactivate per item_type)

### What is NOT yet V4
- Dashboard (should not read V4 tables until reporting views exist)
- Reporting / Finance report summaries
- Finance dashboard summaries
- Legacy service billing integration with V4 sparepart usage
- Trade-in (legacy POS handles this)
- Partial refund (full void only)
- Customer auto-complete in POS V4

## Tables Created (via migrations 029–034)

| Table | Purpose |
|---|---|
| `inv_products` | V4 product catalog (sparepart/produk/unit) |
| `inv_variants` | SKU-level variant definitions with cost/selling price, attributes |
| `inv_variant_stocks` | Per-branch quantity stock for quantity-based items |
| `inv_units` | Per-branch serialized physical units for Unit Second |
| `inv_stock_movements` | Atomic movement ledger for all V4 stock changes |
| `inventory_categories` | Shared category table (pre-existing, filtered by `item_type`) |
| `inv_sparepart_usage` | Service sparepart usage snapshots |
| `inv_stock_purchases` | Stock purchase headers |
| `inv_stock_purchase_items` | Stock purchase line items with snapshots |
| `inv_stock_purchase_number_counters` | Auto-increment PO number counters |
| `pos_transactions` | POS transaction headers |
| `pos_transaction_items` | POS transaction line items with snapshots |
| `pos_transaction_number_counters` | Auto-increment POS number counters |

## RPC Functions

| Function | Purpose |
|---|---|
| `generate_inv_stock_purchase_number` | PO number generator (PO/YYYY/MM/NNNN) |
| `create_inv_stock_purchase` | Atomic stock purchase (validate → stock in → movement → payment) |
| `adjust_inv_variant_stock_opname` | Atomic stock opname correction |
| `use_inv_sparepart_for_service` | Atomic sparepart usage for service |
| `checkout_pos_v4` | Atomic POS checkout (stock → transaction → payment) |
| `void_pos_transaction_v4` | Atomic POS void (validate → restore stock → reverse payment → audit trail) |

## Routes

| Route | Status |
|---|---|
| `/[brandSlug]/panel/inventory-v4` | **Primary** — Sidebar points here. Inventory management with tabs: Sparepart, Produk, Unit Baru, Unit Second, Movement, Riwayat Belanja |
| `/[brandSlug]/panel/pos-v4` | **Primary** — Sidebar points here. POS with product grid, cart, payment, void, transaction history |
| `/[brandSlug]/panel/pos` | Legacy fallback — Hidden from sidebar unless MASTER_ADMIN/PLATFORM_OWNER |
| `/[brandSlug]/panel/inventory` | Legacy fallback — Hidden from sidebar unless MASTER_ADMIN/PLATFORM_OWNER |
| `/[brandSlug]/panel/inventory-v3` | Legacy. Left untouched. |

## Supported Flows

- **Sparepart**: Create → Belanja Stok → Penyesuaian Stok → Service Sparepart Usage
- **Produk**: Create → Belanja Stok → POS V4 sale
- **Unit Baru**: Create → Belanja Stok → POS V4 sale
- **Unit Second**: Create → POS V4 sale (exact unit selection) → status changes to SOLD
- **POS V4 Void**: Full transaction void → stock restored, unit status reset to READY_STOCK, payment reversed, audit trail created
- **Category management**: Create, rename, deactivate categories filtered by item_type
- **Stock movements**: All flows create inv_stock_movements with correct type/direction
- **Payment movements**: Belanja Stok and POS V4 create payment_account_movements

## Known Limitations (Internal)

1. **Service billing not auto-updated**: V4 service sparepart usage (`inv_sparepart_usage`) is recorded atomically but does not automatically update the service's `final_cost`. A separate sync step is needed.

2. **Legacy/V4 coexistence**: Legacy `inventory_items`, `pos_sales`, `purchases` tables remain active. Do not mix legacy and V4 data in reports.

3. **Dashboard not wired**: Dashboards should not read V4 tables until reporting views are created.

4. **No trade-in support**: POS V4 does not handle trade-in items. Legacy POS handles trade-ins.

5. **No customer auto-complete**: POS V4 customer field is text-only, no customer search/suggest yet.

6. **No partial refund**: Full void only. Partial refund not yet implemented.

## Verification SQL

```sql
-- Recent POS transactions
SELECT t.transaction_number, t.total_amount, t.paid_amount, t.change_amount,
       t.status, t.created_at, pm.name AS payment_method,
       pa.account_name AS payment_account
FROM public.pos_transactions t
LEFT JOIN public.payment_methods pm ON pm.id = t.payment_method_id
LEFT JOIN public.payment_accounts pa ON pa.id = t.payment_account_id
ORDER BY t.created_at DESC LIMIT 20;

-- Recent POS items with snapshots
SELECT t.transaction_number, i.item_type, i.item_name_snapshot,
       i.variant_name_snapshot, i.attributes_snapshot,
       i.imei_snapshot, i.battery_health_snapshot,
       i.quantity, i.selling_price_snapshot, i.subtotal_amount
FROM public.pos_transaction_items i
JOIN public.pos_transactions t ON t.id = i.transaction_id
ORDER BY i.created_at DESC LIMIT 30;

-- Recent stock movements
SELECT movement_type, direction, quantity, stock_before, stock_after,
       unit_status_before, unit_status_after,
       reference_label, notes, created_at
FROM public.inv_stock_movements
ORDER BY created_at DESC LIMIT 50;

-- Unit Second status
SELECT p.name, u.unit_attributes, u.imei, u.battery_health,
       u.status, u.selling_price, u.updated_at
FROM public.inv_units u
JOIN public.inv_products p ON p.id = u.product_id
ORDER BY u.updated_at DESC LIMIT 30;

-- Stock sanity (all variant stocks)
SELECT p.product_kind, p.condition_type, p.name AS product_name,
       v.name AS variant_name, s.current_stock, s.reserved_stock
FROM public.inv_variant_stocks s
JOIN public.inv_variants v ON v.id = s.variant_id
JOIN public.inv_products p ON p.id = v.product_id
ORDER BY s.updated_at DESC LIMIT 50;

-- Payment movements
SELECT movement_type, direction, amount, reference_type,
       reference_label, created_at
FROM public.payment_account_movements
WHERE reference_type IN ('POS_TRANSACTION', 'INV_STOCK_PURCHASE')
ORDER BY created_at DESC LIMIT 50;
```

## Next Phase Plan

- Service billing sync with V4 sparepart usage
- Dashboard views for V4 data
- Migrate legacy inventory features to V4
- Full replacement of legacy routes (future phase)
