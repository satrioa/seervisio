# Getting Started

This chapter covers two things:
1. **First Setup** — What the Master Admin needs to configure before the shop can run
2. **Accounts & Roles** — How users and permissions work

---

## Chapter 2: First Setup

When Seervisio is first installed, the Master Admin must complete the initial setup. This only needs to be done once.

### Brand Profile

Tell Seervisio about your business.

**What to set:**
- Business name
- Business address
- Phone number
- Email
- Tax ID / NPWP (if applicable)

**Where:** Settings → Brand Profile

### Logo

Upload your company logo. It appears on:
- Login page
- Receipts and invoices
- Reports

**Tip:** Use a square image (at least 200×200 px) with a transparent background for best results.

### Theme

Choose colors that match your brand.

**What you can change:**
- Primary color (buttons, headers, links)
- Accent color
- Sidebar color

**Where:** Settings → Appearance

### Branch

If you have multiple locations, add them here.

**Each branch needs:**
- Branch name
- Address
- Phone number

**Where:** Management → Branches

> **Note:** At least one branch must exist before anyone can open a shift.

### Users

Create accounts for your staff.

**Each user needs:**
- Name
- Email (used for login)
- Role (see Chapter 3 for role details)
- Branch assignment

**Where:** Management → Users

### Payment Methods

Set up how customers can pay.

**Available methods:**
- **Cash** — Physical money
- **QRIS** — QR code payments (GoPay, OVO, DANA, etc.)
- **Transfer** — Bank transfer
- **Debit** — Debit card
- **E-Wallet** — Digital wallets

**For each method:**
- Give it a name (e.g., "BCA Transfer", "GoPay")
- Set the account number or QR code if needed
- Mark it as active or inactive

**Where:** Settings → Payment Methods

### Taxes

Configure tax rates if applicable.

**What to set:**
- Tax name (e.g., "PPN 11%")
- Tax rate percentage
- Whether it applies to all transactions or specific items

**Where:** Settings → Taxes

### Store Settings

Configure how your store operates.

**Key settings:**
- Currency (IDR)
- Time zone
- Date format
- Receipt footer message
- Business hours

**Where:** Settings → Store Settings

### Notifications

Choose what alerts your staff sees.

**Types of notifications:**
- Low stock warnings
- Service status changes
- Shift reminders

**Where:** Settings → Notifications

### Receipt Template

Customize what appears on printed receipts.

**What you can include:**
- Business name and logo
- Address and contact
- Transaction details
- Footer message (e.g., "Thank you for your visit")

**Where:** Settings → Receipt Template

### Business Hours

Set your operating hours for each day of the week.

**Where:** Settings → Store Settings → Business Hours

> **Tip:** Business hours are used for reporting and can help staff know when to open and close shifts.

---

## Chapter 3: Account & Roles

### Role Overview

Seervisio has four roles. Each role has different permissions.

| Role | Can Do |
|------|--------|
| **Master Admin** | Everything — configure system, manage users, view all branches |
| **Admin** | Manage daily operations, create users (limited), view reports |
| **Frontliner** | Create service orders, process POS, handle payments |
| **Technician** | Update service status, log spare parts, complete repairs |

### Permission Differences

| Feature | Master Admin | Admin | Frontliner | Technician |
|---------|:---:|:---:|:---:|:---:|
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Manage branches | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ |
| View all branches | ✅ | ✅ | Assigned only | Assigned only |
| Create service | ✅ | ✅ | ✅ | ❌ |
| Update service status | ✅ | ✅ | ✅ | ✅ |
| POS transactions | ✅ | ✅ | ✅ | ❌ |
| Inventory management | ✅ | ✅ | ✅ | ❌ |
| Finance transactions | ✅ | ✅ | ✅ | ❌ |
| Open/close shift | ✅ | ✅ | ✅ | ❌ |
| View reports | ✅ | ✅ | Limited | Limited |

### Switching Accounts

If you need to switch between accounts (e.g., covering for a colleague):

1. Click your profile picture or name in the top-right corner
2. Select **Switch Account**
3. Enter the PIN of the target account (if enabled)

### PIN Security

Accounts can be protected with a PIN for quick switching.

**To set a PIN:**
1. Go to your profile settings
2. Click **Set PIN**
3. Enter a 4-6 digit PIN
4. Confirm

> **Important:** Keep your PIN private. Anyone with your PIN can access your account.

### Security Best Practices

- Always log out when leaving your workstation
- Do not share your password
- Use a PIN for quick, secure account switching
- Report suspicious activity to your Master Admin immediately
- Change your password regularly

### Forgot Password

1. On the login page, click **Lupa Password** (Forgot Password)
2. Enter your email address
3. Check your email for a reset link
4. Click the link and create a new password

> **Note:** If you don't receive the email, check your spam folder or contact your Master Admin.
