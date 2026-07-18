"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Typewriter from "@/components/fancy/text/typewriter";
import { AmbientEyes } from "@/components/ambient-eyes";

const EASE = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] size-[700px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-[-10%] top-1/4 size-[420px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] size-[420px] rounded-full bg-teal-500/10 blur-[120px]" />
        {/* grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0, ease: EASE }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur"
          >
            <Sparkles className="size-3.5" />
            Modern Operating System for Repair Shops
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
            className="text-balance text-5xl font-extrabold leading-[0.95] tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            Solusi Cerdas
            <br />
            <span
              className="bg-gradient-to-r from-primary via-emerald-400 to-teal-300 bg-clip-text text-transparent"
            >
              Toko Servis Gadget-mu
            </span>
          </motion.h1>

          {/* Animated sub-line */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: EASE }}
            className="mt-7 text-balance text-2xl font-semibold text-foreground/90 sm:text-3xl"
          >
            Kelola{" "}
            <Typewriter
              text={[
                "Data Servis",
                "Tracking Servis",
                "Inventori Stok",
                "Laporan Keuangan",
                "Performa Teknisi",
                "CRM Pelanggan",
              ]}
              speed={80}
              className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent"
              waitTime={1500}
              deleteSpeed={40}
              cursorChar="_"
            />
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: EASE }}
            className="mx-auto mt-6 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg"
          >
            Semua kebutuhan operasional toko servis dalam satu platform modern.
            Cepat, aman, dan terlihat profesional di mata pelanggan.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32, ease: EASE }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="group h-12 gap-2 px-7 text-base shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30">
              <Link href="/signup">
                Mulai Gratis
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 gap-2 px-7 text-base backdrop-blur transition-colors hover:bg-primary/5">
              <Link href="/#pricing">
                Lihat Paket
              </Link>
            </Button>
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
            className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-primary text-primary" />
              ))}
            </div>
            <span>Dipercaya ratusan toko servis di Indonesia</span>
          </motion.div>
        </div>

        {/* Premium dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          {/* glow — behind the mockup frame */}
          <div className="pointer-events-none absolute -inset-x-10 top-6 -z-10 h-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="dark relative z-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
            {/* window chrome */}
            <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2.5">
              <span className="size-2.5 rounded-full bg-red-500/80" />
              <span className="size-2.5 rounded-full bg-yellow-500/80" />
              <span className="size-2.5 rounded-full bg-green-500/80" />
              <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-xs text-muted-foreground">
                dashboard.seervisio.com
              </span>
              <div className="ml-auto flex items-center gap-2 text-muted-foreground">
                <AmbientEyes />
              </div>
            </div>

            {/* mock content */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-3">
              {[
                { label: "Pendapatan Hari Ini", value: "Rp 4.250.000", trend: "+12%" },
                { label: "Servis Aktif", value: "24", trend: "+3" },
                { label: "Unit Belum Diambil", value: "5", trend: "-2" },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="text-[11px] text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{card.value}</p>
                  <p className="mt-0.5 text-[11px] text-primary">{card.trend} vs kemarin</p>
                </motion.div>
              ))}
            </div>

            {/* mock chart row */}
            <div className="mx-3 mb-3 grid grid-cols-3 gap-2">
              {[60, 45, 75, 30, 55, 80, 40, 65, 50, 70, 35, 85].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 1 + i * 0.03, duration: 0.4 }}
                  style={{ height: `${h}px`, originY: 1 }}
                  className="rounded-t bg-gradient-to-t from-primary/40 to-primary/80"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
