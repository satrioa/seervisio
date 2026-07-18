"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

const TESTIMONIALS = [
  { quote: "Seervisio mengubah cara kami mengelola servis. Dari spreadsheet jadi alur kerja otomatis dalam dua minggu.", author: "Rina Wijaya", role: "Owner, TechFix Surabaya" },
  { quote: "Insight AI-nya menghemat waktu berjam-jam tiap minggu. Seperti punya analis bisnis 24/7.", author: "Budi Santoso", role: "CEO, GadgetCare Indonesia" },
  { quote: "Multi-cabang dulu menyiksa. Sekarang semua performa cabang ada dalam satu dashboard.", author: "Dian Permata", role: "Ops Director, PhoneRepair Network" },
  { quote: "Pelanggan bisa cek status servis sendiri lewat portal. CS jadi jauh lebih ringan.", author: "Andi Pratama", role: "Owner, iServis Bandung" },
  { quote: "QRIS langsung nyambung, laporan keuangan rapi otomatis. Rekon jadi 5 menit.", author: "Sari Dewi", role: "Finance, SmartPhone Clinic" },
  { quote: "Onboarding cepat, tim kami langsung produktif hari pertama. Support responsif.", author: "Hendra K", role: "Manager, FixHub Jakarta" },
];

function Card({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <figure className="flex w-[340px] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <Quote className="mb-3 size-6 text-primary/40" />
      <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
          {t.author.split(" ").map((w) => w[0]).join("").slice(0, 2)}
        </div>
        <div>
          <figcaption className="text-sm font-semibold text-foreground">{t.author}</figcaption>
          <p className="text-xs text-muted-foreground">{t.role}</p>
        </div>
        <div className="ml-auto flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-3 fill-primary text-primary" />
          ))}
        </div>
      </div>
    </figure>
  );
}

export function TestimonialsSection() {
  const row = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            Testimoni
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Dipercaya pemilik toko servis
          </motion.h2>
        </div>
      </div>

      {/* Auto-scrolling marquee */}
      <div className="group relative mt-14 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max gap-4 px-4 animate-[marquee_40s_linear_infinite] group-hover:[animation-play-state:paused]">
          {row.map((t, i) => (
            <Card key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
