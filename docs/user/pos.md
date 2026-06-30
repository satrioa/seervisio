# POS Module

The POS (Point of Sale) module lets you sell products to customers quickly — accessories, parts, or any retail items.

---

## When to Use POS

| Situation | Use POS |
|-----------|---------|
| Customer buys a phone case | ✅ POS |
| Customer buys a charger cable | ✅ POS |
| Customer pays for a repair service | ❌ Use Service module |
| Walk-in buys screen protector + installation | ✅ POS |
| Customer buys multiple items | ✅ POS |

---

## Opening POS

1. Go to **POS** module from the sidebar
2. Make sure a shift is open (check Dynamic Island)
3. The POS screen appears with product search and cart

---

## Product Search

### Search Bar

Type the product name, barcode, or SKU in the search bar. Results appear instantly.

**Example searches:**
- "LCD iPhone 13"
- "Tempered glass"
- "Charger cable"

### Categories

Browse products by category:

1. Click a category button (e.g., "Screen Protector", "Charger", "Case")
2. Products in that category are displayed
3. Click on a product to add it to cart

### Barcode Scanner

If you have a barcode scanner:

1. Point the scanner at the product barcode
2. The product is automatically added to cart
3. No need to search manually

> **Tip:** For fastest checkout, use a barcode scanner.

---

## Product Variants

Some products have variants (e.g., different colors or sizes).

**When you select a product with variants:**
1. A variant selection dialog appears
2. Choose the variant (e.g., "Black", "White", "Blue")
3. The correct variant is added to cart

**Inventory tracking:**
- Each variant has its own stock count
- The system prevents selling out-of-stock variants

---

## IMEI Tracking

For products that require IMEI tracking (phones, modems, etc.):

1. Add the product to cart
2. An IMEI input field appears
3. Scan or type the IMEI number
4. The IMEI is recorded with the sale

**Why this matters:**
- Tracks each individual unit
- Useful for warranty claims
- Required for certain regulations

---

## Cart Management

### Adding Items

- Click a product to add one unit
- Click the quantity number to change it
- Each item shows: name, variant, quantity, and price

### Removing Items

- Click the trash icon next to an item to remove it

### Adjusting Quantity

1. Click the quantity number
2. Enter the new quantity
3. Press Enter or click outside

---

## Discounts

### Applying a Discount

You can apply discounts at the item level or cart level.

**Item discount:**
1. Click the discount icon on an item
2. Enter discount amount (Rp) or percentage (%)
3. Confirm

**Cart discount:**
1. Click **Diskon** below the total
2. Enter discount amount or percentage
3. Confirm

> **Note:** Cart discount applies to the entire purchase. Item discount applies only to that item.

---

## Service Fee

You can add a service fee (e.g., installation fee):

1. Click **Biaya Service**
2. Enter the amount
3. Add description (e.g., "Screen protector installation")
4. Confirm

---

## Payment

### Available Payment Methods

| Method | Description |
|--------|-------------|
| **Cash** | Physical money — enter amount paid, system calculates change |
| **QRIS** | QR code payment — customer scans QR with e-wallet app |
| **Transfer** | Bank transfer — confirm receipt manually |
| **Debit** | Debit card payment |
| **E-Wallet** | Digital wallet payment |

### Cash Payment

1. Select **Cash** as payment method
2. Enter the amount received from the customer
3. The system shows the change amount
4. Click **Bayar** to complete

**Example:**
- Total: Rp 150,000
- Customer pays: Rp 200,000
- Change: Rp 50,000

### QRIS Payment

1. Select **QRIS** as payment method
2. Customer scans the QR code with their e-wallet app
3. Wait for payment confirmation
4. Click **Bayar** to complete

### Transfer Payment

1. Select **Transfer** as payment method
2. Customer transfers to the displayed bank account
3. Verify the transfer in your bank app
4. Click **Bayar** to complete

### Split Payment

For payments using multiple methods:
1. Click **Bayar Bertahap** (Split Payment)
2. Enter amounts for each method
3. The total must equal the cart total

---

## Print Receipt

After payment is successful:

1. A receipt preview appears
2. Click **Cetak** to print
3. The receipt includes:
   - Store name and address
   - Transaction number
   - Items purchased
   - Prices and total
   - Amount paid and change
   - Date and time
   - Cashier name
   - Payment method

> **Tip:** Make sure your receipt printer is connected and configured.

---

## Voiding a Transaction

If a transaction needs to be cancelled:

1. Go to POS transaction history
2. Find the transaction
3. Click **Void**
4. Enter the reason (min 5 characters)
5. Confirm

**What happens:**
- The transaction is marked as voided
- Inventory is restored
- The refund is recorded in the cash drawer
- The void is logged in the activity history

> **Warning:** Voiding cannot be undone. Only void when absolutely necessary.

---

## Best Practices

- **Scan barcodes** for speed and accuracy
- **Verify payment** — always count cash before finalizing
- **Check change** — double-check the change amount before giving to customer
- **Keep receipt** — give the customer their receipt
- **Handle voids immediately** — don't delay voiding incorrect transactions

### Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Wrong product selected | Verify product name and variant before payment |
| Wrong amount entered | Double-check numbers before confirming |
| Forgetting IMEI | Always scan/enter IMEI for tracked products |
| Not checking change | System calculates change — verify before handing over |
| Voiding without reason | Always provide a clear reason for audit trail |
