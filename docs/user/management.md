# Management

The Management section is where Master Admins and Admins handle organizational settings — branches, users, permissions, and activity logs.

---

## Branches

If your business has multiple locations, you can manage them here.

### Adding a Branch

1. Go to **Management** → **Branches**
2. Click **Tambah Cabang** (Add Branch)
3. Fill in the details:

| Field | Description |
|-------|-------------|
| **Branch Name** | Name of the location (e.g., "Semarang", "Jakarta") |
| **Address** | Physical address |
| **Phone** | Branch contact number |

4. Click **Simpan**

### Editing a Branch

1. Click the branch name
2. Update the details
3. Click **Simpan**

### Branch Status

| Status | Meaning |
|--------|---------|
| Active | Branch is operational and can open shifts |
| Inactive | Branch is closed or not yet open — cannot open shifts |

---

## Users

Manage who has access to Seervisio.

### Adding a User

1. Go to **Management** → **Users**
2. Click **Tambah Pengguna** (Add User)
3. Fill in the details:

| Field | Description |
|-------|-------------|
| **Name** | User's full name |
| **Email** | Used for login (must be unique) |
| **Role** | Master Admin, Admin, Frontliner, or Technician |
| **Branch** | Which branch the user belongs to |
| **Password** | Temporary password (user can change later) |

4. Click **Simpan**

### Editing a User

1. Find the user in the list
2. Click their name
3. Update the details
4. Click **Simpan**

### Disabling a User

If a staff member leaves:

1. Open the user's profile
2. Set status to **Nonaktif** (Inactive)
3. They won't be able to log in anymore

> **Note:** Disabling a user preserves their transaction history. Deleting a user may cause data issues.

---

## Permissions

### Role-Based Access

Each role has predefined permissions:

| Capability | Master Admin | Admin | Frontliner | Technician |
|------------|:---:|:---:|:---:|:---:|
| Manage Branches | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |
| View All Branches | ✅ | ✅ | Own | Own |
| Create Services | ✅ | ✅ | ✅ | ❌ |
| POS Transactions | ✅ | ✅ | ✅ | ❌ |
| Inventory | ✅ | ✅ | ✅ | ❌ |
| Finance | ✅ | ✅ | ✅ | ❌ |
| Open/Close Shift | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | Limited | Limited |

### Branch Access

Users can be assigned to:
- **A specific branch** — Can only see and operate within that branch
- **All branches** — For Master Admins and regional managers

---

## Activity Log

Every action in Seervisio is logged.

### What is Logged

- User logins and logouts
- Service creation and status changes
- POS transactions
- Inventory changes
- Finance transactions
- Shift opens and closes
- Setting changes
- User management actions

### Viewing the Activity Log

1. Go to **Management** → **Activity Log**
2. See a chronological list of all actions

### Filters

You can filter by:

| Filter | Description |
|--------|-------------|
| **User** | See actions by a specific person |
| **Action Type** | Service, POS, Inventory, Finance, etc. |
| **Date Range** | Specific time period |
| **Branch** | Specific location |

### Why Activity Log Matters

- **Accountability** — Know who did what and when
- **Auditing** — Trace any issue back to its source
- **Security** — Detect unauthorized or suspicious activity
- **Training** — See how staff are using the system

---

## Best Practices

### User Management

- Create individual accounts — never share login credentials
- Assign the correct role — don't give more permissions than needed
- Disable accounts promptly when staff leave
- Regularly review active users

### Branch Management

- Keep branch information up to date
- Only create branches that are actually operational
- Use descriptive branch names

### Activity Monitoring

- Review the activity log periodically
- Investigate unusual actions
- Use the log for training and feedback

### Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Sharing accounts | Create individual accounts for everyone |
| Giving wrong role | Double-check role before saving |
| Forgetting to disable ex-staff | Have a offboarding checklist |
| Too many inactive users | Periodically clean up user list |
