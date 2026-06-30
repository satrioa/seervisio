# System Settings

The Settings section lets you configure how your Seervisio instance looks and behaves. Only **Master Admins** can access these settings.

---

## Appearance

### Brand Colors

Change the look of your Seervisio interface:

| Setting | Description |
|---------|-------------|
| **Primary Color** | Main color for buttons, links, and accents |
| **Sidebar Color** | Background color of the sidebar menu |
| **Logo** | Your company logo (appears in sidebar and login page) |

### Dark / Light Mode

Toggle between:
- **Light Mode** — Bright background, dark text
- **Dark Mode** — Dark background, light text
- **System** — Follows your device's setting

---

## Branding

### Business Information

| Setting | Description |
|---------|-------------|
| **Business Name** | Your company's legal name |
| **Address** | Main business address |
| **Phone** | Contact number |
| **Email** | Contact email |
| **Website** | Your website URL (optional) |
| **Tax ID / NPWP** | Tax identification number |

This information appears on:
- Receipts and invoices
- Shift reports
- System emails

### Logo Upload

Upload formats: PNG, JPG, SVG

**Recommended:**
- Square aspect ratio (1:1)
- At least 200×200 pixels
- Transparent background for best appearance

---

## Notifications

### What You Can Configure

| Notification | Description |
|--------------|-------------|
| **Low Stock** | Alert when inventory falls below minimum |
| **Service Updates** | When a service status changes |
| **Shift Reminders** | Reminder to open or close shift |
| **Payment Received** | When a payment is recorded |

### Delivery Methods

Choose how notifications are delivered:
- **In-app** — Bell icon on the interface
- **Dynamic Island** — Popup notification at the top of the screen

---

## Payment Methods

### Available Methods

| Method | Description |
|--------|-------------|
| **Cash** | Physical currency — requires no setup |
| **QRIS** | QR code payments (GoPay, OVO, DANA, LinkAja) |
| **Transfer** | Bank transfer to a specific account |
| **Debit** | Debit card payments |
| **E-Wallet** | Other digital wallet payments |

### Adding a Payment Method

1. Go to **Settings** → **Payment Methods**
2. Click **Tambah Metode**
3. Choose the method type
4. Configure details:

| Method | Details Needed |
|--------|----------------|
| **QRIS** | QR code image, merchant name |
| **Transfer** | Bank name, account number, account name |
| **Debit** | Terminal ID (if applicable) |
| **E-Wallet** | Wallet name, account ID |

5. Set to **Active**
6. Click **Simpan**

### Ordering

Drag and drop to reorder payment methods. The order affects how they appear in POS and service payment screens.

---

## Receipt Template

Customize what printed receipts look like.

### What You Can Customize

| Section | Options |
|---------|---------|
| **Header** | Show/hide business name, logo, address |
| **Items** | Show/hide item details, prices |
| **Footer** | Custom message (e.g., "Thank you for your visit") |
| **Paper Size** | 58mm, 80mm, or A4 |

### Receipt Preview

As you make changes, the receipt preview updates in real-time so you can see exactly how it will look when printed.

---

## Taxes

### Adding a Tax

1. Go to **Settings** → **Taxes**
2. Click **Tambah Pajak**
3. Fill in:

| Field | Description |
|-------|-------------|
| **Tax Name** | e.g., "PPN 11%", "PPH 23" |
| **Rate** | Percentage (e.g., 11 for 11%) |
| **Apply To** | All transactions or specific categories |

4. Click **Simpan**

### How Taxes Affect Transactions

When a tax is active:
- POS and service transactions include the tax calculation
- Receipts show the tax breakdown
- Reports include tax collected

---

## Store Settings

### Business Hours

Set your operating hours for each day:

| Day | Setting |
|-----|---------|
| Monday | Open / Close time |
| Tuesday | Open / Close time |
| ... | ... |
| Sunday | Open / Close or Closed |

### Currency

Set your local currency (default: IDR / Indonesian Rupiah).

### Date & Time Format

Choose how dates and times display throughout the system.

---

## Backup

### Automatic Backups

Enable automatic data backups:

| Setting | Description |
|---------|-------------|
| **Frequency** | Daily, Weekly, or Monthly |
| **Time** | Preferred time for backup to run |
| **Retention** | How many backups to keep |

### Manual Backup

You can also trigger a manual backup at any time:
1. Go to **Settings** → **Backup**
2. Click **Backup Sekarang** (Backup Now)
3. Wait for the process to complete

---

## Security

### Password Policy

| Setting | Description |
|---------|-------------|
| Minimum Length | Minimum password length (default: 8) |
| Require Special Char | Require symbols (!@#$%) |
| Expiration | Force password change after X days |

### Session Timeout

Set how long a user can stay logged in without activity before being automatically logged out.

| Timeout | Description |
|---------|-------------|
| 30 minutes | Recommended for high-security environments |
| 60 minutes | Standard |
| 4 hours | For busy environments |
| Never | Not recommended |

### Login Attempts

Configure how many failed login attempts are allowed before the account is temporarily locked.

---

## Best Practices

- **Complete your brand profile** — It makes receipts and reports look professional
- **Set business hours** — Helps staff know when to open/close
- **Configure payment methods correctly** — Test each method after setup
- **Enable backups** — You don't want to lose data
- **Set reasonable session timeout** — Balances security with convenience
- **Review notification settings** — Make sure staff get important alerts

### Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Incorrect tax rate | Double-check with your accountant |
| Wrong receipt format | Print a test receipt to verify |
| Missing payment method | Add and test before telling staff |
| Not backing up | Enable automatic backups |
| Too many notifications | Keep only important ones active |
