# Service Module

The Service module is the heart of Seervisio. It manages every repair order from the moment a customer walks in until the device is returned.

---

## Understanding Service Status

Every service order moves through a series of statuses:

| Status | Meaning | Who Updates |
|--------|---------|-------------|
| **Antrian** | Queue — device received, waiting for diagnosis | Frontliner |
| **Diagnosis** | Technician is inspecting the device | Technician |
| **Menunggu Konfirmasi** | Waiting for customer approval of cost/parts | Technician |
| **Menunggu Sparepart** | Waiting for parts to arrive | Technician |
| **Perbaikan** | Active repair in progress | Technician |
| **QC** | Quality check — verifying the repair | Technician |
| **Siap Ambil** | Ready for customer pickup | Technician / QC |
| **Selesai** | Completed — handed back to customer | Frontliner |
| **Batal** | Cancelled — device returned unrepaired | Anyone |
| **Garansi** | Under warranty — returned after previous repair | Frontliner |

---

## Creating a Service Order

### Step-by-Step

1. Go to **Service** module
2. Click **Buat Servis Baru**
3. **Customer Information**
   - Search existing customer by name or phone
   - Or click **+ Customer Baru** to add a new customer
4. **Device Information**
   - Device type (phone, tablet, laptop, etc.)
   - Brand and model
   - IMEI or serial number (if applicable)
   - Color, storage, or other identifiers
5. **Complaint Details**
   - Describe the issue the customer reported
   - Include any notes (e.g., "screen cracked, battery swollen")
6. **Service Details**
   - Service category (screen repair, battery, software, etc.)
   - Priority (Normal, High, Urgent)
   - Estimated cost
7. Click **Simpan**

### What Happens Next

- The service appears in the service list with status **Antrian**
- A service number is assigned (e.g., SRV-20260630-001)
- The technician can see it in their queue
- The customer is now in the system with a service history

---

## Viewing Services

### List View

The default view shows services in a table/list format.

**Columns:**
- Service number
- Customer name
- Device info
- Status
- Technician assigned
- Created date
- Priority

**You can:**
- Sort by any column
- Search by service number, customer name, or device
- Filter by status, technician, branch, date range

### Kanban View

Switch to Kanban view to see services organized by status column.

**How to use:**
1. Click the Kanban toggle at the top of the service list
2. Services are grouped into columns by status
3. Drag and drop a service card to change its status
4. Click a card to open its detail

> **Tip:** Kanban view is great for managers to see the overall workflow at a glance.

---

## Service Detail

Click any service to open the detail view. This is where you manage everything about the repair.

### Sections

| Section | What You Can Do |
|---------|-----------------|
| **Info** | View and edit customer, device, and complaint details |
| **Status** | Update the service status with notes |
| **Technician** | Assign or change the technician |
| **Parts Used** | Log spare parts consumed during repair |
| **Cost Summary** | View parts cost, service fee, and total |
| **Payment** | Record payment when customer pays |
| **Timeline** | See all activity history for this service |
| **Warranty** | Track warranty if this is a warranty claim |

### Updating Status

1. Open the service detail
2. Click the current status button
3. Select the next appropriate status
4. Add notes (required for some transitions)
5. Confirm

> **Note:** Statuses must be updated in order. You cannot skip steps (e.g., go from Antrian directly to Siap Ambil).

---

## Assigning a Technician

1. Open the service detail
2. Click **Assign Technician**
3. Select a technician from the list
4. Confirm

The technician will see this service in their queue.

> **Best Practice:** Assign the technician with the right skills for the repair type. If it's a complex motherboard repair, assign your senior technician.

---

## Logging Spare Parts

When a technician uses parts during repair:

1. Open the service detail
2. Go to **Parts Used** section
3. Click **Tambah Sparepart**
4. Search and select the part
5. Enter quantity used
6. Click **Simpan**

**What happens:**
- The part is deducted from inventory
- The cost is added to the service total
- Inventory is updated in real-time

> **Warning:** Only log parts that were actually used. Incorrect logging will mess up your inventory.

---

## Quality Check (QC)

Before a device is marked ready for pickup:

1. Update status to **QC**
2. Perform the quality check
3. If the repair passes, update to **Siap Ambil**
4. If the repair fails, update back to **Perbaikan** with notes

---

## Completing a Service

### Ready for Pickup

When the device is repaired and checked:

1. Update status to **Siap Ambil**
2. The frontliner can see it's ready
3. Contact the customer to inform them

### Handover to Customer

When the customer arrives:

1. Open the service
2. Process payment if not already paid
3. Explain what was done
4. Update status to **Selesai**
5. Hand over the device

---

## Warranty

### Creating a Warranty Service

If a customer returns with a device previously repaired:

1. Create a new service order
2. Check the **Garansi** (Warranty) checkbox
3. Link it to the original service
4. The system will track warranty status

### Warranty Terms

- The warranty period is set in system settings
- The system automatically flags warranty services for priority handling

---

## Search and Filter

### Searching

- Search by service number (e.g., "SRV-2026")
- Search by customer name or phone
- Search by device IMEI or serial number

### Filtering

| Filter | Options |
|--------|---------|
| Status | All, Antrian, Diagnosis, Perbaikan, Siap Ambil, Selesai, etc. |
| Technician | All technicians or specific |
| Branch | All branches or specific |
| Date Range | Today, This Week, This Month, Custom |
| Priority | All, Normal, High, Urgent |

---

## Printing

### Service Label

Print a label for the device:
1. Open the service detail
2. Click **Cetak Label**
3. The label includes service number, customer name, and device info

### Service Receipt

Print a receipt for the customer:
1. Open the service detail
2. Click **Cetak Tanda Terima**
3. Includes service number, device info, estimated cost, and date

### Service Invoice

Print the final invoice:
1. Open the service detail
2. Ensure payment has been recorded
3. Click **Cetak Invoice**

---

## Best Practices

- Always verify customer identity before handing over a device
- Write clear, specific complaint descriptions
- Take photos of damaged devices before starting repair (if feature available)
- Log parts immediately when used, not at the end of the day
- Communicate with customers if there are delays
- Use QC status to ensure quality before pickup

### Common Mistakes

| Mistake | Solution |
|---------|----------|
| Not logging spare parts | Log parts as soon as they're installed |
| Skipping QC | Always QC before marking as ready |
| Wrong status update | Follow the correct status order |
| Missing customer details | Fill all required fields when creating service |
| No notes on status change | Add notes explaining what was done |
