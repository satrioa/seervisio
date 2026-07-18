"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Apakah Seervisio cocok untuk toko servis kecil?",
    a: "Ya. Paket Trial gratis memungkinkan Anda mencoba semua fitur inti tanpa biaya. Saat bisnis berkembang, Anda bisa naik ke Pro atau Lifetime.",
  },
  {
    q: "Bagaimana cara mengelola beberapa cabang?",
    a: "Seervisio mendukung multi-cabang. Anda dapat melihat performa, stok, dan tim setiap lokasi dari satu dashboard pusat dengan kontrol akses per cabang.",
  },
  {
    q: "Apakah ada aplikasi mobile?",
    a: "Dashboard Seervisio responsif dan bisa diakses dari HP maupun tablet. Pelanggan juga mendapat portal mandiri untuk mengecek status servis.",
  },
  {
    q: "Metode pembayaran apa yang didukung?",
    a: "Kami mendukung transfer bank, QRIS, dan e-wallet. Untuk langganan, Anda dapat memilih tagihan bulanan atau pembayaran sekali untuk akses seumur hidup.",
  },
  {
    q: "Apakah data saya aman?",
    a: "Ya. Data Anda dicadangkan otomatis dan dilindungi dengan kontrol akses berbasis peran serta audit trail lengkap untuk keamanan maksimal.",
  },
  {
    q: "Apakah ada biaya tersembunyi?",
    a: "Tidak. Harga kami transparan tanpa biaya tersembunyi. Yang Anda lihat di halaman paket adalah yang Anda bayar.",
  },
];

export function FaqSection() {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            FAQ
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Pertanyaan yang sering diajukan
          </motion.h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-colors",
                  isOpen ? "border-primary/40 bg-primary/[0.04]" : "border-white/10 bg-white/[0.03] hover:border-white/20",
                )}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-foreground sm:text-base">
                    <HelpCircle className="size-4 shrink-0 text-primary" />
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180 text-primary")}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 pl-12 text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
