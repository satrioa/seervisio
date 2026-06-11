/**
 * customer-data.ts
 * Mock data and types for Customer Module mockup.
 *
 * This data mirrors the customers DB table structure with additional
 * computed fields (totalSpend, totalServices, etc.) for display.
 *
 * No Supabase queries. No server actions. Mockup only.
 */

/* ─── Customer Status Types ─── */

export interface CustomerMock {
  id: string;
  brandId: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  /* ── Computed summary fields ── */
  totalSpend: number;
  totalServices: number;
  activeServices: number;
  completedServices: number;
  activeWarranties: number;
  lastServiceAt: string | null;
}

/* ─── Mock Service Summary Ref ─── */

export interface CustomerServiceRef {
  id: string;
  deviceInfo: string;
  issue: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  completedAt: string | null;
  totalCost: number;
  warrantyUntil: string | null;
  warrantyNotes: string | null;
}

/* ─── Mock Customers ─── */

export const MOCK_CUSTOMERS: CustomerMock[] = [
  {
    id: "CUST-001",
    brandId: 1,
    name: "Budi Santoso",
    phone: "081234567890",
    email: "budi@email.com",
    address: "Jl. Pahlawan No. 123, Semarang",
    notes: "Pelanggan tetap. Sering servis laptop.",
    createdAt: "2025-01-15T08:00:00Z",
    updatedAt: "2026-06-10T10:30:00Z",
    totalSpend: 2750000,
    totalServices: 5,
    activeServices: 1,
    completedServices: 4,
    activeWarranties: 1,
    lastServiceAt: "2026-06-10T10:00:00Z",
  },
  {
    id: "CUST-002",
    brandId: 1,
    name: "Siti Aminah",
    phone: "081234567891",
    email: "siti@email.com",
    address: "Jl. Diponegoro No. 45, Semarang",
    notes: null,
    createdAt: "2025-02-20T09:00:00Z",
    updatedAt: "2026-05-28T14:00:00Z",
    totalSpend: 1850000,
    totalServices: 3,
    activeServices: 0,
    completedServices: 3,
    activeWarranties: 0,
    lastServiceAt: "2026-05-28T13:00:00Z",
  },
  {
    id: "CUST-003",
    brandId: 1,
    name: "Andi Pratama",
    phone: "081234567892",
    email: "andi@email.com",
    address: "Jl. Sudirman No. 78, Salatiga",
    notes: "Baru pertama kali servis.",
    createdAt: "2026-03-10T10:00:00Z",
    updatedAt: "2026-06-08T16:00:00Z",
    totalSpend: 850000,
    totalServices: 2,
    activeServices: 1,
    completedServices: 1,
    activeWarranties: 1,
    lastServiceAt: "2026-06-08T15:30:00Z",
  },
  {
    id: "CUST-004",
    brandId: 1,
    name: "Dewi Lestari",
    phone: "081234567893",
    email: "dewi@email.com",
    address: "Jl. Ahmad Yani No. 12, Semarang",
    notes: null,
    createdAt: "2025-05-05T07:00:00Z",
    updatedAt: "2026-05-15T11:00:00Z",
    totalSpend: 4200000,
    totalServices: 8,
    activeServices: 2,
    completedServices: 6,
    activeWarranties: 2,
    lastServiceAt: "2026-05-15T10:00:00Z",
  },
  {
    id: "CUST-005",
    brandId: 1,
    name: "Eko Wahyudi",
    phone: "081234567894",
    email: "eko@email.com",
    address: "Jl. Gajah Mada No. 56, Salatiga",
    notes: "Konsumen korporat. Perusahaan.",
    createdAt: "2025-04-10T08:00:00Z",
    updatedAt: "2026-06-09T09:00:00Z",
    totalSpend: 6800000,
    totalServices: 12,
    activeServices: 3,
    completedServices: 9,
    activeWarranties: 3,
    lastServiceAt: "2026-06-09T08:00:00Z",
  },
  {
    id: "CUST-006",
    brandId: 1,
    name: "Fitri Handayani",
    phone: "081234567895",
    email: null,
    address: null,
    notes: null,
    createdAt: "2026-01-20T10:00:00Z",
    updatedAt: "2026-04-20T14:00:00Z",
    totalSpend: 450000,
    totalServices: 1,
    activeServices: 0,
    completedServices: 1,
    activeWarranties: 0,
    lastServiceAt: "2026-04-20T13:00:00Z",
  },
  {
    id: "CUST-007",
    brandId: 2,
    name: "Gunawan Saputra",
    phone: "081234567896",
    email: "gunawan@email.com",
    address: "Jl. Merapi No. 34, Sragen",
    notes: "Pelanggan dari cabang Sragen.",
    createdAt: "2025-09-01T08:00:00Z",
    updatedAt: "2026-06-07T10:00:00Z",
    totalSpend: 1500000,
    totalServices: 4,
    activeServices: 1,
    completedServices: 3,
    activeWarranties: 1,
    lastServiceAt: "2026-06-07T09:00:00Z",
  },
  {
    id: "CUST-008",
    brandId: 1,
    name: "Hesti Pratiwi",
    phone: "081234567897",
    email: "hesti@email.com",
    address: "Jl. Pandanaran No. 90, Semarang",
    notes: null,
    createdAt: "2026-02-14T09:00:00Z",
    updatedAt: "2026-06-10T08:00:00Z",
    totalSpend: 1200000,
    totalServices: 2,
    activeServices: 1,
    completedServices: 1,
    activeWarranties: 0,
    lastServiceAt: "2026-06-10T07:30:00Z",
  },
];

/* ─── Mock Customer Service History ─── */

export const MOCK_CUSTOMER_SERVICES: Record<string, CustomerServiceRef[]> = {
  "CUST-001": [
    { id: "SRV-1019", deviceInfo: "Asus ROG - Laptop", issue: "Layar mati total", status: "qc", statusLabel: "QC", createdAt: "2026-06-10T10:00:00Z", completedAt: null, totalCost: 800000, warrantyUntil: "2026-09-10", warrantyNotes: "Garansi servis 3 bulan" },
    { id: "SRV-1008", deviceInfo: "MacBook Pro 2021 - Laptop", issue: "Baterai cepat habis", status: "selesai", statusLabel: "Selesai", createdAt: "2026-05-01T09:00:00Z", completedAt: "2026-05-03T16:00:00Z", totalCost: 450000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0990", deviceInfo: "Lenovo ThinkPad - Laptop", issue: "Keyboard tidak berfungsi", status: "selesai", statusLabel: "Selesai", createdAt: "2026-03-15T08:00:00Z", completedAt: "2026-03-17T14:00:00Z", totalCost: 350000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0950", deviceInfo: "HP Pavilion - Laptop", issue: "Overheat saat dipakai", status: "selesai", statusLabel: "Selesai", createdAt: "2026-01-10T10:00:00Z", completedAt: "2026-01-12T15:00:00Z", totalCost: 550000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0900", deviceInfo: "Dell Inspiron - Laptop", issue: "Tidak bisa booting", status: "selesai", statusLabel: "Selesai", createdAt: "2025-11-05T09:00:00Z", completedAt: "2025-11-07T12:00:00Z", totalCost: 600000, warrantyUntil: null, warrantyNotes: null },
  ],
  "CUST-002": [
    { id: "SRV-1012", deviceInfo: "Samsung Galaxy S24 - Smartphone", issue: "Touchscreen tidak responsif", status: "selesai", statusLabel: "Selesai", createdAt: "2026-05-28T13:00:00Z", completedAt: "2026-05-30T11:00:00Z", totalCost: 650000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0975", deviceInfo: "iPhone 15 Pro - Smartphone", issue: "Ganti baterai", status: "selesai", statusLabel: "Selesai", createdAt: "2026-02-10T10:00:00Z", completedAt: "2026-02-11T14:00:00Z", totalCost: 500000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0930", deviceInfo: "Xiaomi Pad 6 - Tablet", issue: "Tidak bisa charging", status: "selesai", statusLabel: "Selesai", createdAt: "2025-12-01T08:00:00Z", completedAt: "2025-12-03T16:00:00Z", totalCost: 700000, warrantyUntil: null, warrantyNotes: null },
  ],
  "CUST-003": [
    { id: "SRV-1020", deviceInfo: "Acer Predator - Laptop", issue: "Kipas berisik", status: "perbaikan", statusLabel: "Perbaikan", createdAt: "2026-06-08T15:30:00Z", completedAt: null, totalCost: 450000, warrantyUntil: "2026-09-08", warrantyNotes: "Garansi servis 3 bulan" },
    { id: "SRV-1000", deviceInfo: "Logitech G Pro - Mouse", issue: "Sensor error", status: "selesai", statusLabel: "Selesai", createdAt: "2026-04-20T09:00:00Z", completedAt: "2026-04-20T11:00:00Z", totalCost: 400000, warrantyUntil: null, warrantyNotes: null },
  ],
  "CUST-004": [
    { id: "SRV-1015", deviceInfo: "iPad Pro M2 - Tablet", issue: "Touch ID bermasalah", status: "diagnosa", statusLabel: "Diagnosa", createdAt: "2026-05-15T10:00:00Z", completedAt: null, totalCost: 950000, warrantyUntil: "2026-08-15", warrantyNotes: "Garansi servis 3 bulan" },
    { id: "SRV-1005", deviceInfo: "Samsung Galaxy Tab S9 - Tablet", issue: "Layar retak", status: "perbaikan", statusLabel: "Perbaikan", createdAt: "2026-04-10T08:00:00Z", completedAt: null, totalCost: 1200000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0985", deviceInfo: "Sony WH-1000XM5 - Headphone", issue: "Tidak mau pairing", status: "selesai", statusLabel: "Selesai", createdAt: "2026-03-01T09:00:00Z", completedAt: "2026-03-02T14:00:00Z", totalCost: 350000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0960", deviceInfo: "iPhone 14 Pro - Smartphone", issue: "Ganti layar", status: "selesai", statusLabel: "Selesai", createdAt: "2026-01-15T10:00:00Z", completedAt: "2026-01-17T16:00:00Z", totalCost: 800000, warrantyUntil: "2026-04-17", warrantyNotes: "Garansi layar 3 bulan" },
  ],
  "CUST-005": [
    { id: "SRV-1021", deviceInfo: "Dell Latitude - Laptop", issue: "RAM error", status: "masuk", statusLabel: "Masuk", createdAt: "2026-06-09T08:00:00Z", completedAt: null, totalCost: 850000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-1017", deviceInfo: "HP EliteBook - Laptop", issue: "SSD tidak terdeteksi", status: "diagnosa", statusLabel: "Diagnosa", createdAt: "2026-05-20T09:00:00Z", completedAt: null, totalCost: 750000, warrantyUntil: "2026-08-20", warrantyNotes: "Garansi servis 3 bulan" },
    { id: "SRV-1010", deviceInfo: "Lenovo Legion - Laptop", issue: "Overheat gaming", status: "perbaikan", statusLabel: "Perbaikan", createdAt: "2026-05-05T10:00:00Z", completedAt: null, totalCost: 1200000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0995", deviceInfo: "Asus ZenBook - Laptop", issue: "Ganti keyboard", status: "selesai", statusLabel: "Selesai", createdAt: "2026-04-01T08:00:00Z", completedAt: "2026-04-02T14:00:00Z", totalCost: 600000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0980", deviceInfo: "Microsoft Surface Pro - Laptop", issue: "Layar flicker", status: "selesai", statusLabel: "Selesai", createdAt: "2026-03-10T09:00:00Z", completedAt: "2026-03-12T16:00:00Z", totalCost: 950000, warrantyUntil: "2026-06-12", warrantyNotes: "Garansi layar 3 bulan" },
    { id: "SRV-0955", deviceInfo: "Mac Mini - Desktop", issue: "Tidak menyala", status: "selesai", statusLabel: "Selesai", createdAt: "2026-01-20T08:00:00Z", completedAt: "2026-01-22T15:00:00Z", totalCost: 800000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-0920", deviceInfo: "Dell Monitor 27\" - Monitor", issue: "Dead pixel", status: "selesai", statusLabel: "Selesai", createdAt: "2025-11-15T09:00:00Z", completedAt: "2025-11-16T12:00:00Z", totalCost: 500000, warrantyUntil: null, warrantyNotes: null },
  ],
  "CUST-006": [
    { id: "SRV-1002", deviceInfo: "Xiaomi Redmi Note 13 - Smartphone", issue: "Layar retak", status: "selesai", statusLabel: "Selesai", createdAt: "2026-04-20T13:00:00Z", completedAt: "2026-04-22T11:00:00Z", totalCost: 450000, warrantyUntil: null, warrantyNotes: null },
  ],
  "CUST-007": [
    { id: "SRV-1018", deviceInfo: "Acer Nitro 5 - Laptop", issue: "BSOD saat gaming", status: "perbaikan", statusLabel: "Perbaikan", createdAt: "2026-06-07T09:00:00Z", completedAt: null, totalCost: 600000, warrantyUntil: "2026-09-07", warrantyNotes: "Garansi servis 3 bulan" },
    { id: "SRV-1007", deviceInfo: "Samsung Galaxy A55 - Smartphone", issue: "Ganti baterai", status: "selesai", statusLabel: "Selesai", createdAt: "2026-04-25T10:00:00Z", completedAt: "2026-04-26T14:00:00Z", totalCost: 350000, warrantyUntil: null, warrantyNotes: null },
  ],
  "CUST-008": [
    { id: "SRV-1022", deviceInfo: "iPhone 16 Pro - Smartphone", issue: "Face ID error", status: "diagnosa", statusLabel: "Diagnosa", createdAt: "2026-06-10T07:30:00Z", completedAt: null, totalCost: 750000, warrantyUntil: null, warrantyNotes: null },
    { id: "SRV-1009", deviceInfo: "iPad Air M1 - Tablet", issue: "Baterai kembung", status: "selesai", statusLabel: "Selesai", createdAt: "2026-05-01T08:00:00Z", completedAt: "2026-05-03T16:00:00Z", totalCost: 450000, warrantyUntil: null, warrantyNotes: null },
  ],
};

/* ─── Helpers ─── */

export function formatCurrency(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

export function searchCustomers(query: string): CustomerMock[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  return MOCK_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      c.phone.includes(query),
  ).slice(0, 6);
}

export function getCustomerById(id: string): CustomerMock | undefined {
  return MOCK_CUSTOMERS.find((c) => c.id === id);
}

export function getCustomerServices(customerId: string): CustomerServiceRef[] {
  return MOCK_CUSTOMER_SERVICES[customerId] ?? [];
}

export function hasActiveWarranty(customer: CustomerMock): boolean {
  return customer.activeWarranties > 0;
}
