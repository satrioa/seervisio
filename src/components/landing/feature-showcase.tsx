"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Wrench,
  CreditCard,
  Package,
  LineChart,
  Users,
  GitBranch,
  UserCog,
  Bot,
  BellRing,
  Fingerprint,
  ShieldCheck,
  FileText,
  ScanLine,
  Hash,
  Receipt,
  QrCode,
  LayoutDashboard,
  BarChart3,
  Building2,
  UserCheck,
  History,
  AlarmClock,
  Bell,
  DatabaseBackup,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: GitBranch, title: "Multi Cabang", desc: "Kelola semua lokasi dari satu dashboard pusat." },
  { icon: Wrench, title: "Tracking Servis", desc: "Alur servis end-to-end: intake sampai pickup." },
  { icon: Package, title: "Inventory", desc: "Stok realtime, alert menipis, dan supplier." },
  { icon: ScanLine, title: "Barcode", desc: "Scan masuk/keluar barang dengan cepat." },
  { icon: Hash, title: "IMEI Tracking", desc: "Lacak perangkat berdasarkan nomor IMEI." },
  { icon: Users, title: "Customer Portal", desc: "Pelanggan cek status servis secara mandiri." },
  { icon: Receipt, title: "Invoice", desc: "Buat & kirim invoice profesional otomatis." },
  { icon: CreditCard, title: "POS", desc: "Kasir cepat dengan banyak metode bayar." },
  { icon: LineChart, title: "Finance", desc: "Laporan revenue, profit, & cash flow." },
  { icon: QrCode, title: "QRIS", desc: "Pembayaran QRIS langsung terintegrasi." },
  { icon: LayoutDashboard, title: "Dashboard", desc: "Semua metrik penting dalam sekilas pandang." },
  { icon: BarChart3, title: "Reports", desc: "Laporan customizable dengan visual indah." },
  { icon: Building2, title: "Branch Management", desc: "Atur cabang, stok, & tim per lokasi." },
  { icon: UserCog, title: "Employee Management", desc: "Role-based access & performa karyawan." },
  { icon: History, title: "Customer Timeline", desc: "Riwayat lengkap perangkat & transaksi." },
  { icon: AlarmClock, title: "Reminder", desc: "Pengingat garansi & follow-up otomatis." },
  { icon: Bell, title: "Notification", desc: "Update realtime untuk servis & pembayaran." },
  { icon: DatabaseBackup, title: "Backup", desc: "Data aman dengan backup otomatis." },
  { icon: Sparkles, title: "Analytics", desc: "Insight AI untuk keputusan lebih baik." },
  { icon: Bot, title: "AI Command Center", desc: "Tanya jawab & otomasi cerdas." },
  { icon: Fingerprint, title: "Warranty", desc: "Pelacakan garansi & klaim otomatis." },
  { icon: ShieldCheck, title: "Security", desc: "Akses aman & audit trail lengkap." },
];

export function FeatureShowcase() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            Semua Fitur
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Satu platform, seluruh kebutuhan toko
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-muted-foreground"
          >
            Lebih dari 20 fitur siap pakai untuk bengkel dan toko servis modern.
          </motion.p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: (i % 8) * 0.04, ease: EASE }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-primary/30 hover:bg-primary/[0.06]"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <f.icon className="size-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              <div className={cn("absolute inset-x-0 bottom-0 h-px scale-x-0 bg-gradient-to-r from-primary/60 to-emerald-400/60 transition-transform duration-300 group-hover:scale-x-100")} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureShowcase;
