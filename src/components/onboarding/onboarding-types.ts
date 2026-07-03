export interface OnboardingProgress {
  onboarding_completed: boolean;
  onboarding_current_step: number;
  onboarding_completed_tasks: string[];
  onboarding_earned_badges: string[];
}

export interface TourTask {
  id: string;
  label: string;
  description: string;
  section: string;
}

export const TOUR_TASKS: Record<string, TourTask[]> = {
  MASTER_ADMIN: [
    { id: "welcome", label: "Sambutan", description: "Kenali dashboard Seervisio", section: "Pengenalan" },
    { id: "branches", label: "Kelola Cabang", description: "Buat dan kelola cabang bisnis", section: "Manajemen Bisnis" },
    { id: "users", label: "Kelola Pengguna", description: "Atur tim dan hak akses", section: "Manajemen Bisnis" },
    { id: "services", label: "Layanan Servis", description: "Pelajari alur layanan servis", section: "Operasional" },
    { id: "settings", label: "Pengaturan", description: "Sesuaikan brand, tema, dan target", section: "Konfigurasi" },
  ],
  ADMIN: [
    { id: "welcome", label: "Sambutan", description: "Kenali dashboard cabang Anda", section: "Pengenalan" },
    { id: "services", label: "Layanan Servis", description: "Pantau dan kelola layanan servis", section: "Operasional" },
    { id: "customers", label: "Pelanggan", description: "Kelola data pelanggan", section: "Operasional" },
    { id: "settings", label: "Pengaturan", description: "Sesuaikan pengaturan cabang", section: "Konfigurasi" },
  ],
  FRONTLINER: [
    { id: "welcome", label: "Sambutan", description: "Selamat datang di Seervisio", section: "Pengenalan" },
    { id: "create-service", label: "Buat Servis Baru", description: "Pelajari cara membuat servis baru", section: "Tugas Harian" },
    { id: "manage-services", label: "Kelola Servis", description: "Pantau status servis pelanggan", section: "Tugas Harian" },
    { id: "customers", label: "Data Pelanggan", description: "Cari dan kelola data pelanggan", section: "Tugas Harian" },
  ],
  TECHNICIAN: [
    { id: "welcome", label: "Sambutan", description: "Selamat datang di Seervisio", section: "Pengenalan" },
    { id: "my-services", label: "Servis Saya", description: "Lihat servis yang ditugaskan ke Anda", section: "Pekerjaan" },
    { id: "update-status", label: "Update Status", description: "Perbarui progres perbaikan", section: "Pekerjaan" },
    { id: "spareparts", label: "Sparepart", description: "Gunakan sparepart untuk perbaikan", section: "Pekerjaan" },
  ],
  CASHIER: [
    { id: "welcome", label: "Sambutan", description: "Selamat datang di Seervisio", section: "Pengenalan" },
    { id: "pos", label: "POS Kasir", description: "Pelajari cara menggunakan POS", section: "Transaksi" },
    { id: "payments", label: "Pembayaran", description: "Proses pembayaran servis", section: "Transaksi" },
  ],
  INVENTORY_STAFF: [
    { id: "welcome", label: "Sambutan", description: "Selamat datang di Seervisio", section: "Pengenalan" },
    { id: "stock", label: "Stok Barang", description: "Kelola stok inventory", section: "Inventaris" },
    { id: "purchases", label: "Pembelian", description: "Catat pembelian barang", section: "Inventaris" },
    { id: "stock-opname", label: "Stock Opname", description: "Lakukan stock opname", section: "Inventaris" },
  ],
};

export const SECTION_ICONS: Record<string, string> = {
  Pengenalan: "👋",
  "Manajemen Bisnis": "🏢",
  Operasional: "🔧",
  Konfigurasi: "⚙️",
  "Tugas Harian": "📋",
  Pekerjaan: "🔨",
  Transaksi: "💳",
  Inventaris: "📦",
};
