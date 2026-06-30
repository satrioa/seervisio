# Inventory Module

The Inventory module helps you manage every product and spare part in your shop. It tracks stock levels, movements, purchases, and transfers between branches.

---

## Products

### What is a Product?

A product is any item you stock in your shop. This includes:
- **Spare parts** — LCD screens, batteries, charging ports, etc.
- **Accessories** — Phone cases, screen protectors, cables, etc.
- **Consumables** — Screws, adhesives, cleaning supplies
- **Retail items** — Items sold directly to customers

### Adding a Product

1. Go to **Inventory** module
2. Click **Tambah Produk** (Add Product)
3. Fill in the details:

| Field | Description |
|-------|-------------|
| **Product Name** | Clear, descriptive name (e.g., "LCD iPhone 13 Original") |
| **Category** | Select or create a category (e.g., "LCD", "Battery", "Accessories") |
| **Brand** | Manufacturer or brand name |
| **SKU** | Stock Keeping Unit — your internal code |
| **Barcode** | Product barcode number (for scanner) |
| **Unit** | pcs, box, set, etc. |
| **Buying Price** | How much you paid for it |
| **Selling Price** | How much you sell it for |
| **Minimum Stock** | Alert level — system warns when stock is below this |

4. Click **Simpan**

### Product Variants

Some products come in multiple variants:

| Product | Variants |
|---------|----------|
| LCD iPhone 13 | Original, Copy, Soft OLED |
| Tempered Glass | Clear, Privacy, Matte |
| Phone Case | Black, White, Blue, Red |

**To add variants:**
1. While creating/editing a product, scroll to **Varian**
2. Click **Tambah Varian**
3. Enter variant name, buying price, selling price, and stock
4. Repeat for each variant

### IMEI Tracking

For high-value items that need individual tracking:

1. Enable **IMEI Tracking** when creating the product
2. When adding stock, enter each unit's IMEI number
3. The system tracks each unit through its lifecycle

---

## Categories

Organize your products with categories.

**Common categories:**
- LCD / Display
- Battery
- Charging Port
- Ear Speaker / Receiver
- Mic / Flex Cable
- Housing / Back Glass
- Tools
- Accessories

### Managing Categories

1. Go to Inventory → **Kategori** (Categories)
2. Click **Tambah Kategori**
3. Enter name and description
4. Click **Simpan**

> **Tip:** Well-organized categories make it faster to find products during service and POS.

---

## Stock

### Viewing Stock

The main inventory list shows:
- Product name
- Current stock quantity
- Minimum stock level
- Status indicator (normal, low, out of stock)
- Buying and selling prices

### Color Indicators

| Color | Meaning |
|-------|---------|
| Green | Stock is healthy (above minimum) |
| Yellow | Stock is low (at or near minimum) |
| Red | Out of stock |
| Gray | Discontinued or inactive |

---

## Stock Movement

Every action that affects inventory is recorded as a stock movement.

### Types of Movement

| Type | Description | Effect on Stock |
|------|-------------|:---:|
| **Purchase** | Buying new stock from supplier | + |
| **Transfer In** | Receiving stock from another branch | + |
| **Transfer Out** | Sending stock to another branch | − |
| **Sale** | Selling through POS | − |
| **Service Usage** | Used in a repair | − |
| **Adjustment** | Manual correction (add) | + |
| **Adjustment** | Manual correction (remove) | − |
| **Return to Supplier** | Sending back to supplier | − |

### Viewing Movement History

1. Go to a product's detail page
2. Scroll to **Riwayat Pergerakan** (Movement History)
3. See every transaction that affected this product's stock

---

## Stock Adjustment

Use stock adjustments to correct inventory counts (e.g., after physical counting).

**When to use:**
- Physical stock doesn't match system records
- Damaged or expired items need to be written off
- Found items that weren't recorded

### Performing an Adjustment

1. Go to Inventory → **Penyesuaian Stok** (Stock Adjustment)
2. Click **Buat Penyesuaian**
3. Select the product
4. Enter the new quantity (or the difference)
5. Select the reason (found, damaged, expired, recount)
6. Add notes
7. Click **Simpan**

> **Important:** Stock adjustments should be approved by a manager. They affect your inventory value and profit calculations.

---

## Purchase Orders

### Creating a Purchase Order

When you need to restock:

1. Go to Inventory → **Pembelian** (Purchases)
2. Click **Buat Pembelian**
3. Enter supplier information
4. Add items:
   - Search and select each product
   - Enter quantity and price
5. The system calculates the total
6. Click **Simpan**

### Receiving a Purchase

When the order arrives:

1. Open the purchase order
2. Click **Terima** (Receive)
3. Verify the items and quantities
4. Confirm receipt
5. Stock is automatically added

### Purchase History

View all past purchases:
- Filter by supplier, date range, or status
- See total spending per supplier
- Track order fulfillment rates

---

## Stock Transfer

Move stock between branches.

### Sending a Transfer

1. Go to Inventory → **Transfer Stok**
2. Click **Buat Transfer**
3. Select source branch and destination branch
4. Add items to transfer
5. Click **Kirim** (Send)

### Receiving a Transfer

When the other branch confirms:

1. Open the transfer request
2. Verify the items
3. Click **Terima**
4. Stock is automatically added to your branch

> **Tip:** Use transfers to balance stock across branches. If Branch A has excess and Branch B is low, transfer instead of buying new stock.

---

## Low Stock Alerts

The system automatically warns you when stock is low.

### Where Alerts Appear

- **Sidebar** — Low stock count badge
- **Dashboard** — Priority alerts section
- **Inventory** — Yellow/red indicators in the product list

### Minimum Stock

Each product has a minimum stock level. When stock falls to or below this level:
- The product turns yellow in the list
- An alert is generated
- The system recommends restocking

> **Best Practice:** Set realistic minimum stock levels based on your usage rate. For fast-moving items, set a higher minimum.

---

## Best Practices

- **Count physical stock regularly** — Compare with system records
- **Log parts immediately** — When used in a service, log it right away
- **Use barcodes** — Faster and more accurate than manual entry
- **Set minimum stock** — Never run out of essential parts
- **First expiry, first out** — Use older stock before newer stock
- **Audit transfers** — Verify items before confirming receipt

### Common Mistakes

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| Not logging parts used | Inventory too high on paper | Log immediately when used |
| Wrong purchase quantity | Overstock or understock | Double-check before ordering |
| Not verifying transfers | Wrong items at wrong branch | Verify before receiving |
| Skipping physical count | Stock inaccuracy grows | Count weekly |
| No minimum stock | Surprise stockouts | Set minimums for all products |
