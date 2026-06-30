# Dynamic Island

The Dynamic Island is the floating element at the top center of your screen. It shows important information about your current shift and store status at a glance.

---

## What is the Dynamic Island?

Think of it as your store's status indicator. It lives at the top of the screen and changes appearance based on what's happening:

- Whether a shift is active
- How long the shift has been running
- Your current cash balance
- Notifications and alerts

It works on both desktop and mobile.

---

## States

### Idle State (No Active Shift)

**Appearance:** Small pill shape with scrolling text

**Shows:**
- Branch name
- "Buka toko untuk memulai session" (Open store to start a session)

**Action:**
- Click **Buka Toko** to open a new shift

---

### Active Shift (Compact)

**Appearance:** Small pill shape with clock and branch name

**Shows:**
- Branch name
- Shift duration (e.g., "Semarang - 02:30:00")

**What you can do:**
- Click to expand for more details
- Long press (mobile) to see actions

---

### Active Shift (Expanded)

**Appearance:** Larger card with detailed information

**Shows:**
| Item | Description |
|------|-------------|
| **Shift Berjalan** | Header indicating active shift |
| **Branch** | Current branch name |
| **Duration** | How long the shift has been active |
| **Saldo Kasir** | Current expected cash balance (highlighted) |

**Actions available:**

| Button | Action |
|--------|--------|
| **Akhiri Shift** | Opens the close shift modal |
| **Lihat Kas** | Opens the shift detail drawer |

---

### Feedback / Notification State

**Appearance:** Small pill shape with icon and message

**When it appears:**
| Icon | Type | Example |
|------|------|---------|
| Spinner | Loading | "Memproses pembayaran..." |
| Checkmark | Success | "Transaksi berhasil" |
| Warning | Error | "Gagal memproses" |
| Info | Info | "Stok sedang diperbarui" |

**Duration:** Success and error notifications auto-dismiss after 2-3 seconds.

---

## How to Use

### Desktop

| Action | How |
|--------|-----|
| Check shift status | Look at Dynamic Island (top center) |
| Open shift | Click **Buka Toko** in idle state |
| View shift details | Click the Dynamic Island while shift is active |
| Close shift | Click Dynamic Island → Click **Akhiri Shift** |
| View cash | Click Dynamic Island → Click **Lihat Kas** |
| See notification | Dynamic Island shows it automatically |

### Mobile

On mobile screens, the Dynamic Island works the same way but adapts to smaller screen size:

| Action | How |
|--------|-----|
| Tap to expand | Tap the Dynamic Island |
| Scroll expanded view | Scroll if content is taller than the island |
| Same actions | Same as desktop |

---

## What Triggers Notifications

| Event | Notification |
|-------|--------------|
| Shift opened | "Shift berhasil dibuka" |
| Shift closed | "Shift berhasil diakhiri" |
| Payment recorded | "Pembayaran berhasil" |
| POS transaction | "Transaksi berhasil" (with transaction number) |
| Cash in | "Pemasukan berhasil dicatat" |
| Cash out | "Pengeluaran berhasil dicatat" |
| Error | "Gagal..." with error message |
| Loading | "Memproses..." during any operation |

---

## Tips

- **Quick shift check** — Glance at the Dynamic Island to confirm your shift is active
- **Close shift from anywhere** — You don't need to go to the Store Shift page
- **Notifications are clickable** — Some notifications provide additional info when clicked
- **Auto-dismiss** — Don't worry about clearing notifications, they disappear automatically

### Common Questions

**Q: The Dynamic Island disappeared. How do I get it back?**
- Refresh the page. It will reappear.

**Q: Can I move the Dynamic Island?**
- No, it's fixed at the top center. This is by design.

**Q: Why does the Dynamic Island show loading?**
- It's performing an action (processing payment, saving data). Wait for it to complete.

**Q: The cash balance seems wrong.**
- Check your shift drawer for details. Cash movements may not have been recorded yet.
