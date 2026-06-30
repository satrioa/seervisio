# Frequently Asked Questions

## General

### What is Seervisio?
Seervisio is a complete repair shop management system. It handles service orders, POS, inventory, finance, and reporting — all in one place.

### Do I need internet to use Seervisio?
Yes, Seervisio requires an internet connection. Make sure your connection is stable for the best experience.

### Which browser should I use?
Chrome, Edge, Firefox, or Safari — the latest version of any of these works fine.

### I forgot my password. What do I do?
On the login page, click **Lupa Password** (Forgot Password). Enter your email and follow the reset link sent to your inbox.

### Can I use Seervisio on my phone?
Yes. The interface adapts to mobile screens, though some features are easier to use on a tablet or desktop.

---

## Account & Login

### I can't log in. What's wrong?
- Check your email and password are correct
- Make sure caps lock is off
- Ask your Master Admin if your account is active
- Try the "Lupa Password" option

### Why do I see "Akses Ditolak" (Access Denied)?
Your account role doesn't have permission for that action. Contact your Master Admin if you think this is a mistake.

### Can I use the same account on multiple devices?
Yes, but avoid sharing your account with others. Each person should have their own account.

### How do I switch accounts?
Click your profile picture at the top right, then select **Switch Account**. You'll need the target account's PIN if one is set.

---

## Store Shift

### Why can't I open a shift?
- A shift may already be open in your branch
- You may not have the Frontliner or Admin role
- Check with your manager

### What happens if I forget to close a shift?
The shift remains open. You can close it when you remember. However, transactions recorded after you should have closed may be in the wrong shift.

### Can I reopen a closed shift?
No. Once a shift is closed, it cannot be reopened. You must open a new shift.

### Why is my expected cash different from what I counted?
- A transaction might not have been recorded
- A cash in or out might have been missed
- You may have made incorrect change
- Count the cash again to be sure

---

## Services

### How do I find a service order?
Use the search bar in the Service module. You can search by:
- Service number (e.g., "SRV-2026-001")
- Customer name
- Customer phone number
- Device IMEI

### Can I edit a service after it's created?
Yes. Open the service detail and click edit. Some fields may be locked once the service reaches certain statuses.

### What if I made a mistake in the service details?
Edit the service before it's completed. If it's already completed, you may need to create a correction or contact your manager.

### How do I cancel a service?
Open the service detail and change its status to **Batal** (Cancelled). Add a reason for cancellation.

### Can I split a service into multiple repairs?
Currently, create separate service orders for each repair needed. Link them in the customer notes if needed.

---

## POS

### What if the barcode scanner doesn't work?
- Check the scanner connection
- Make sure the cursor is in the search field
- Type the barcode number manually
- Check scanner settings in your device

### Can I refund a POS transaction?
Yes. Open the transaction history, find the transaction, and click **Void**. This cancels the transaction and returns items to inventory.

### What happens to inventory when I sell via POS?
The system automatically deducts the items from inventory.

### Can I sell items that are out of stock?
The system prevents selling items with zero stock. You need to restock first.

---

## Inventory

### My inventory count is wrong. What do I do?
Use **Stock Adjustment** to correct it. Choose the right reason (found, damaged, miscount) and enter the correct quantity.

### How do I know when to reorder?
Set **Minimum Stock** levels for each product. The system will alert you when stock falls below the minimum.

### How do I transfer stock to another branch?
Go to Inventory → **Transfer Stok**. Select source and destination branches, add items, and send. The receiving branch must confirm.

### What's the difference between "Purchase" and "Adjustment"?
- **Purchase** — You bought new stock from a supplier
- **Adjustment** — Correcting existing stock (not a new purchase)

---

## Customers

### Can I delete a customer?
It's not recommended. Instead, you can mark them as inactive. This preserves their service history.

### How do I find a customer's warranty information?
Open their customer profile and scroll to the **Warranty** section. All active warranties are listed there.

### A customer says they never brought their device here. What do I do?
Check their service history. If there's no record, ask for identification or proof of previous visit.

---

## Finance

### What's the difference between "Income" and "Expense"?
- **Income** — Money coming into the business
- **Expense** — Money going out of the business

### Do I need to record every expense?
Yes. Every expense should be recorded for accurate financial reporting and profit calculation.

### Why doesn't my profit match my bank balance?
The system tracks expected cash, not actual bank balance. Bank transfers may take time to clear. Reconcile regularly.

### Can I export financial data?
Yes. Go to Finance → Transactions → Export. Choose PDF or Excel format.

---

## Reports

### Why are my reports showing zero data?
- No shift was open during the period
- No transactions were recorded
- The date range filter may be wrong
- The branch filter might not match

### Can I compare this month to last month?
Yes. When viewing reports, select a custom date range and compare with the previous period. Some reports show comparison automatically.

### How often should I check reports?
- **Daily**: Revenue summary, cash reconciliation
- **Weekly**: Services completed, inventory levels
- **Monthly**: Full financial review, profit analysis

---

## Settings

### I changed a setting but nothing happened. Why?
Some settings require a page refresh to take effect. Try refreshing your browser.

### Can I change the app language?
Language settings are managed by your Master Admin. Contact them if you need a different language.

### How do I add a new payment method?
Go to Settings → Payment Methods → **Tambah Metode**. Configure the method and set it to Active.

---

## Technical Issues

### The page is loading slowly.
- Check your internet connection
- Try refreshing the page
- Close unnecessary browser tabs
- Contact support if it persists

### I see an error on screen. What should I do?
1. Take a screenshot
2. Note what you were doing when it happened
3. Contact your Master Admin with the screenshot and details

### The Dynamic Island is stuck.
Try refreshing the page. If it persists, clear your browser cache and try again.

### My session expired. What happened?
For security, sessions automatically expire after a period of inactivity. Just log in again.

---

## Data & Privacy

### Is my data safe?
Yes. Your data is stored securely. Only authorized users in your organization can access it.

### Can anyone else see my business data?
No. Your data is private to your organization. Users from other organizations cannot see your data.

### How do I get a backup of my data?
Contact your Master Admin. They can export reports and, if enabled, provide database backups.

---

## Still Need Help?

If you didn't find the answer you're looking for:

- Ask your Branch Manager or Master Admin
- Check the relevant chapter in this handbook
- Contact Seervisio support through your Master Admin
