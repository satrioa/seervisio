# Daily Workflow

This chapter walks through a typical day at your shop using Seervisio — from opening to closing.

---

## Opening the Store

### 1. Open a Shift

Before you can serve customers, you must open a shift. A shift tracks all cash and transactions for the work period.

**Steps:**
1. Log in to Seervisio
2. Look at the **Dynamic Island** at the top center of the screen
3. Click **Buka Toko** (Open Store)
4. Enter your **Opening Cash** — the amount of physical cash in the drawer at the start
5. Add optional notes (e.g., "Shift pagi", "Minggu libur")
6. Click **Buka Shift**

**What happens after:**
- The Dynamic Island turns green/active
- The sidebar shows your cash balance
- You can now create services, sell products, and receive payments

> **Important:** Opening cash must match the actual cash in your drawer. This is your accountability baseline.

### 2. Store Status

The store status is shown on the Dynamic Island:
- **Idle** — No shift open. Click "Buka Toko" to start.
- **Active** — Shift is running. Duration is shown.
- **Closed** — Shift has ended.

---

## Receiving Customers

### Walk-in Customer

When a customer walks in with a device:

1. Go to **Service** module
2. Click **Buat Servis Baru** (Create New Service)
3. Select or create the customer profile
4. Fill in device details
5. Describe the complaint
6. Set the service type and priority
7. Click **Simpan** (Save)

The service order is now created with status **Antrian** (Queued).

### Phone-in / Pre-order

If a customer calls ahead:

1. Create the service order as above
2. Set the device status to **Menunggu** (Waiting) if the device hasn't arrived yet
3. When the device arrives, update the status to **Antrian**

---

## Daily Tasks

### For Frontliners

| Task | How |
|------|-----|
| Receive customer device | Create service order → Antrian |
| Sell accessories | Use POS module → scan/search product → checkout |
| Receive payment | Open service → Terima Pembayaran |
| Process walk-in sales | Use POS module for quick sales |
| Handle cash in/out | Use Cash Widget in sidebar → Tambah Pemasukan / Catat Pengeluaran |

### For Technicians

| Task | How |
|------|-----|
| View assigned services | Go to Service → filter by your name |
| Start diagnosis | Update status to **Diagnosis** → record findings |
| Order parts | Update status to **Menunggu Sparepart** |
| Start repair | Update status to **Perbaikan** |
| Complete repair | Update status to **QC** (quality check) |
| Finish device | Update status to **Siap Ambil** |
| Hand over to customer | Update status to **Selesai** |

---

## Processing Payments

### Service Payment

When a service is complete and the customer is ready to pay:

1. Open the service order
2. Scroll to the **Pembayaran** (Payment) section
3. Enter the amount paid
4. Select the payment method (Cash, QRIS, Transfer, etc.)
5. Click **Terima Pembayaran**

### POS Payment

For product sales (accessories, parts, etc.):

1. Go to **POS** module
2. Add items to cart
3. Apply discount if needed
4. Select payment method
5. Click **Bayar**
6. For cash: enter the amount received → system calculates change

---

## Closing the Store

### Closing Shift

At the end of your shift (or end of day):

1. Click the **Dynamic Island** to expand it
2. Click **Akhiri Shift** (End Shift)
3. Count the physical cash in your drawer
4. Enter the **actual cash amount**
5. If there's a difference from expected cash, add a note explaining why
6. Click **Tutup Shift**

**What happens after:**
- The shift is recorded and cannot be reopened
- A shift report PDF is generated
- The Dynamic Island resets to idle
- The next shift can begin with a new opening cash

### Cash Difference

The system compares:
- **Expected Cash** = Opening Cash + Cash Sales + Service Payments + Cash In − Cash Out − Refunds
- **Actual Cash** = What you count in the drawer

If these don't match:
- A **Selisih Lebih** (Surplus) means you have more cash than expected
- A **Selisih Kurang** (Shortage) means you have less cash than expected

> **Best Practice:** Investigate and document any cash difference immediately. Common causes: wrong change given, unrecorded expenses, or data entry errors.

---

## After Closing

### Daily Reports

After closing, you can view:
- **Shift Report** — Summary of the shift just closed (auto-generated PDF)
- **Finance Report** — Day's income, expenses, and net cash flow
- **Service Report** — Services completed, pending, and transferred

These help you reconcile the day's business.

---

## Best Practices

### Daily Checklist

- [ ] Count opening cash before starting shift
- [ ] Open shift with correct cash amount
- [ ] Record every customer interaction in Service module
- [ ] Log spare parts used for each repair
- [ ] Process payments immediately
- [ ] Record manual cash in/out as they happen
- [ ] Count closing cash before ending shift
- [ ] Document any cash differences

### Common Mistakes

| Mistake | Consequence | How to Avoid |
|---------|-------------|--------------|
| Forgetting to open shift | Transactions not recorded to cash drawer | Always check Dynamic Island |
| Not logging spare parts | Inventory becomes inaccurate | Log parts immediately when used |
| Delaying payment entry | Cash difference at closing | Enter payment when customer pays |
| Not recording cash in/out | Cash difference at closing | Record immediately |
| Closing shift without counting cash | Can't verify accuracy | Always count before closing |
