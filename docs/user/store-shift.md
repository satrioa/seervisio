# Store Shift Module

The Store Shift module manages your cash drawer from opening to closing. It ensures every rupiah is accounted for.

---

## What is a Store Shift?

A store shift is a work session that tracks:
- When you opened the cash drawer
- How much cash was in it at the start
- All cash movements during the shift
- How much cash should be in it at the end

Every transaction during a shift (POS sales, service payments, cash in/out) is recorded against that shift.

---

## Opening a Shift

### When to Open

- At the start of each work day
- At the start of a new shift rotation (morning/afternoon/evening)
- If the previous shift has been closed

### Steps

1. The Dynamic Island shows **Buka Toko** when no shift is active
2. Click **Buka Toko**
3. Enter the **Opening Cash** — count the physical cash in your drawer

| Field | Description |
|-------|-------------|
| **Opening Cash** | Total physical cash in the drawer at the start |
| **Notes** | Optional — notes about this shift |

4. Click **Buka Shift**

### What Happens

- The system records the opening time and cash amount
- The Dynamic Island shows the shift as active
- The sidebar cash widget shows the current balance
- You can now process transactions

---

## Active Shift

When a shift is active:

### Dynamic Island Shows

- Branch name
- Duration (how long the shift has been running)
- Cash balance (current running total)

### Sidebar Shows

- **Saldo Kasir** (Cash Balance) — the current expected amount
- Click to open the shift detail drawer

### Shift Detail Drawer

Open by clicking the cash widget in the sidebar:

| Section | What It Shows |
|---------|---------------|
| Shift Header | Shift number, duration, opened by |
| Opening Cash | The cash amount at shift start |
| POS Sales | Cash received from POS sales |
| Service Payments | Cash received from service payments |
| Cash In | Manual cash added |
| Cash Out | Manual cash withdrawn |
| Refunds | Cash refunded to customers |
| **Expected Cash** | **Opening Cash + POS + Service + Cash In − Cash Out − Refunds** |
| Payment Methods | Breakdown by payment type |
| Quick Actions | Record income, expense, or close shift |

---

## Cash Movements During Shift

### Cash In (Manual Income)

When you add money to the drawer (e.g., reimbursement, petty cash top-up):

1. Open the shift detail drawer
2. Click **Tambah Pemasukan**
3. Select the cash account
4. Enter the amount
5. Enter the description
6. Click **Simpan**

### Cash Out (Manual Expense)

When you take money from the drawer (e.g., buy supplies):

1. Open the shift detail drawer
2. Click **Catat Pengeluaran**
3. Select the cash account
4. Enter the amount
5. Enter the description
6. Click **Simpan**

### Automatic Movements

These happen automatically and are recorded against the current shift:

| Movement | Trigger |
|----------|---------|
| POS Sale | Cash payment in POS module |
| Service Payment | Cash payment in Service module |
| POS Refund | Voided POS transaction (cash) |
| Service Refund | Voided service payment |

---

## Expected Cash

**Expected Cash** is the amount the system calculates should be in the drawer.

### Formula

```
Expected Cash = Opening Cash
              + POS Cash Sales
              + Service Cash Payments
              + Manual Cash In
              − Manual Cash Out
              − Refunds
```

### Example

| Item | Amount |
|------|:------:|
| Opening Cash | Rp 200,000 |
| + POS Sales | Rp 500,000 |
| + Service Payments | Rp 350,000 |
| + Cash In | Rp 100,000 |
| − Cash Out | Rp 50,000 |
| − Refunds | Rp 25,000 |
| **= Expected Cash** | **Rp 1,075,000** |

---

## Closing a Shift

### When to Close

- End of work day
- End of shift rotation
- When handing over to the next shift
- If the store is closing for the day

### Steps

1. Click the Dynamic Island to expand it
2. Click **Akhiri Shift** (End Shift)
3. **Count the physical cash** in your drawer
4. Enter the **actual cash amount**
5. If there's a difference, add notes explaining why
6. Click **Tutup Shift**

### After Closing

- The shift is recorded and cannot be reopened
- A **shift report** PDF is automatically generated
- The cash drawer is reset
- A new shift can be opened

---

## Cash Difference

### What is Cash Difference?

**Cash Difference** = Actual Cash − Expected Cash

| Result | Meaning |
|--------|---------|
| **Zero** | Perfect — drawer is balanced |
| **Positive** | Surplus — more cash than expected |
| **Negative** | Shortage — less cash than expected |

### Handling Differences

**If there's a difference:**
1. Double-check your math
2. Review the shift transactions
3. Check if any movements were missed
4. Add a clear explanation in the notes
5. Report to the manager if the difference is significant

### Common Causes of Differences

| Cause | Description |
|-------|-------------|
| Wrong change given | Customer was given too much or too little change |
| Unrecorded expense | Cash taken from drawer but not recorded |
| Unrecorded income | Cash added to drawer but not recorded |
| Data entry error | Wrong amount entered for a payment |
| Counting error | Physical cash counted incorrectly |

---

## Shift Report

After closing, a shift report is generated as a PDF.

### What the Report Contains

- Store name and address
- Shift number
- Opened by and closed by
- Open and close times
- Duration
- Opening cash
- All cash movements (POS, service, manual)
- Expected cash
- Actual cash
- Cash difference
- Notes

### Accessing Shift Reports

1. Go to **Store Shift** module
2. View shift history
3. Click on a closed shift to see its report

---

## Multiple Shifts Per Day

You can have multiple shifts in a single day:

| Scenario | Process |
|----------|---------|
| Morning shift → Afternoon shift | Close morning shift → Open afternoon shift |
| Shift A → Shift B | Close Shift A → Open Shift B |
| Emergency close | Close shift → Record cash → Explain reason |

Each shift is separate and has its own cash tracking.

---

## Best Practices

- **Always open a shift** before processing any transactions
- **Count opening cash carefully** — this is your baseline
- **Record cash movements immediately** — don't rely on memory
- **Count closing cash twice** — to avoid errors
- **Document differences** — always explain why there's a difference
- **Close shift before leaving** — never leave a shift open when you go home

### Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Opening with wrong cash amount | Count twice before entering |
| Not recording cash out | Record immediately when taking cash |
| Forgetting to close shift | Set a reminder at closing time |
| Ignoring small differences | Small differences add up — investigate |
| Closing without counting | Always count physical cash |
