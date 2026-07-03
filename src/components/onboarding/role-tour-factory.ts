import type { Step } from "react-joyride";

type TourStep = Step & { disableBeacon?: boolean; skipBeacon?: boolean };

export function getTourSteps(role: string, brandSlug: string): Step[] {
  const base: Step[] = [
    {
      target: "body",
      title: "Selamat Datang di Seervisio! 🎉",
      content:
        "Mari kita lihat sekilas fitur-fitur utama yang bisa Anda gunakan. Tur ini akan memandu Anda langkah demi langkah.",
      placement: "center",
      skipBeacon: true,
    },
  ];

  const roleSteps = getRoleSpecificSteps(role, brandSlug);

  const outro: Step[] = [
    {
      target: "body",
      title: "Siap Memulai!",
      content:
        "Anda sudah siap menggunakan Seervisio. Jika ada pertanyaan, jangan ragu untuk menghubungi tim support kami.",
      placement: "center",
    },
  ];

  return [...base, ...roleSteps, ...outro];
}

function getRoleSpecificSteps(role: string, brandSlug: string): Step[] {
  switch (role) {
    case "MASTER_ADMIN":
      return getMasterAdminSteps(brandSlug);
    case "ADMIN":
      return getAdminSteps(brandSlug);
    case "FRONTLINER":
      return getFrontlinerSteps(brandSlug);
    case "TECHNICIAN":
      return getTechnicianSteps(brandSlug);
    case "CASHIER":
      return getCashierSteps(brandSlug);
    case "INVENTORY_STAFF":
      return getInventoryStaffSteps(brandSlug);
    default:
      return getDefaultSteps(brandSlug);
  }
}

function getMasterAdminSteps(_brandSlug: string): Step[] {
  return [
    {
      target: "body",
      title: "Dashboard",
      content:
        "Dashboard adalah pusat informasi bisnis Anda. Di sini Anda bisa melihat ringkasan layanan, keuangan, dan inventaris dalam satu tampilan.",
      placement: "center",
    },
    {
      target: `[data-tour="sidebar"]`,
      title: "Navigasi Sidebar",
      content:
        "Gunakan sidebar untuk berpindah antar menu. Anda bisa mengakses semua fitur manajemen dari sini.",
      placement: "right",
    },
    {
      target: `[data-tour="branches"]`,
      title: "Kelola Cabang",
      content:
        "Di menu Cabang, Anda bisa menambah, mengedit, dan mengelola semua cabang bisnis Anda.",
      placement: "right",
    },
    {
      target: `[data-tour="users"]`,
      title: "Kelola Pengguna",
      content:
        "Atur tim Anda dengan memberikan peran dan akses yang sesuai untuk setiap anggota.",
      placement: "right",
    },
    {
      target: `[data-tour="settings"]`,
      title: "Pengaturan",
      content:
        "Sesuaikan brand, tema tampilan, target & goal, dan pengaturan sistem di menu ini.",
      placement: "right",
    },
    {
      target: `[data-tour="services"]`,
      title: "Layanan Servis",
      content:
        "Pantau semua layanan servis di semua cabang. Lihat status, kelola antrian, dan pastikan semuanya berjalan lancar.",
      placement: "right",
    },
  ];
}

function getAdminSteps(_brandSlug: string): Step[] {
  return [
    {
      target: `[data-tour="dashboard"]`,
      title: "Dashboard Cabang",
      content:
        "Dashboard ini menampilkan data spesifik untuk cabang Anda, termasuk layanan, pendapatan, dan inventaris.",
      placement: "center",
    },
    {
      target: `[data-tour="sidebar"]`,
      title: "Navigasi",
      content:
        "Gunakan sidebar untuk mengakses fitur-fitur cabang Anda dengan cepat.",
      placement: "right",
    },
    {
      target: `[data-tour="services"]`,
      title: "Manajemen Servis",
      content:
        "Kelola layanan servis pelanggan, pantau status, dan pastikan teknisi mengerjakan tugasnya.",
      placement: "right",
    },
    {
      target: `[data-tour="reports"]`,
      title: "Laporan",
      content:
        "Lihat laporan keuangan dan performa untuk memonitor kesehatan bisnis cabang Anda.",
      placement: "right",
    },
  ];
}

function getFrontlinerSteps(_brandSlug: string): Step[] {
  return [
    {
      target: `[data-tour="quick-actions"]`,
      title: "Aksi Cepat",
      content:
        "Dari sini Anda bisa dengan cepat membuat layanan baru atau mencari pelanggan.",
      placement: "bottom",
    },
    {
      target: `[data-tour="services"]`,
      title: "Daftar Servis",
      content:
        "Semua layanan yang masuk akan muncul di sini. Anda bisa melihat status dan memperbaruinya.",
      placement: "right",
    },
    {
      target: `[data-tour="customers"]`,
      title: "Data Pelanggan",
      content:
        "Cari dan kelola data pelanggan dengan cepat. Riwayat servis setiap pelanggan juga tersimpan di sini.",
      placement: "right",
    },
    {
      target: `[data-tour="pos"]`,
      title: "POS",
      content:
        "Gunakan POS untuk transaksi penjualan produk atau layanan tambahan.",
      placement: "right",
    },
  ];
}

function getTechnicianSteps(_brandSlug: string): Step[] {
  return [
    {
      target: `[data-tour="services"]`,
      title: "Servis Saya",
      content:
        "Di sini Anda bisa melihat semua layanan yang ditugaskan kepada Anda. Filter berdasarkan status untuk fokus pada pekerjaan yang perlu diselesaikan.",
      placement: "right",
    },
    {
      target: `[data-tour="service-detail"]`,
      title: "Detail Servis",
      content:
        "Klik pada layanan untuk melihat detailnya. Di sini Anda bisa memperbarui status perbaikan, menambahkan catatan, dan menggunakan sparepart.",
      placement: "center",
    },
    {
      target: `[data-tour="spareparts"]`,
      title: "Penggunaan Sparepart",
      content:
        "Saat memperbaiki, Anda bisa menambahkan sparepart yang digunakan. Ini akan otomatis tercatat di inventaris.",
      placement: "right",
    },
  ];
}

function getCashierSteps(_brandSlug: string): Step[] {
  return [
    {
      target: `[data-tour="pos"]`,
      title: "POS Kasir",
      content:
        "POS adalah pusat transaksi Anda. Di sini Anda bisa memproses penjualan produk dan menerima pembayaran servis.",
      placement: "right",
    },
    {
      target: `[data-tour="payments"]`,
      title: "Pembayaran Servis",
      content:
        "Terima pembayaran untuk layanan servis yang sudah selesai. Berbagai metode pembayaran tersedia.",
      placement: "right",
    },
    {
      target: `[data-tour="store-shift"]`,
      title: "Shift Toko",
      content:
        "Jangan lupa untuk membuka shift di awal hari dan menutupnya di akhir hari. Ini penting untuk akuntansi kas.",
      placement: "bottom",
    },
  ];
}

function getInventoryStaffSteps(_brandSlug: string): Step[] {
  return [
    {
      target: `[data-tour="inventory"]`,
      title: "Manajemen Stok",
      content:
        "Di sini Anda bisa melihat semua stok barang, menambah stok baru, dan memantau jumlah stok.",
      placement: "right",
    },
    {
      target: `[data-tour="purchases"]`,
      title: "Pembelian",
      content:
        "Catat setiap pembelian barang baru di sini. Sistem akan otomatis memperbarui stok.",
      placement: "right",
    },
    {
      target: `[data-tour="stock-opname"]`,
      title: "Stock Opname",
      content:
        "Lakukan stock opname secara berkala untuk memastikan data stok sesuai dengan fisik.",
      placement: "right",
    },
  ];
}

function getDefaultSteps(_brandSlug: string): Step[] {
  return [
    {
      target: `[data-tour="dashboard"]`,
      title: "Dashboard",
      content:
        "Dashboard adalah pusat informasi Anda. Pantau semua aktivitas di sini.",
      placement: "center",
    },
    {
      target: `[data-tour="sidebar"]`,
      title: "Navigasi",
      content:
        "Gunakan sidebar untuk mengakses berbagai fitur yang tersedia untuk peran Anda.",
      placement: "right",
    },
  ];
}
