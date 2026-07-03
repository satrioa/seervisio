"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "Seervisio transformed how we manage repairs. We went from spreadsheets to a fully automated workflow in two weeks.",
    author: "Rina Wijaya",
    role: "Owner, TechFix Surabaya",
  },
  {
    quote: "The AI insights alone save us hours every week. It's like having a business analyst on staff 24/7.",
    author: "Budi Santoso",
    role: "CEO, GadgetCare Indonesia",
  },
  {
    quote: "Multi-branch management used to be a nightmare. Now I can see every location's performance from one dashboard.",
    author: "Dian Permata",
    role: "Operations Director, PhoneRepair Network",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Loved by repair shop owners
          </motion.h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-xl border border-border/50 bg-card p-6"
            >
              <Quote className="mb-3 size-6 text-primary/30" />
              <p className="text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 border-t border-border/40 pt-4">
                <p className="text-sm font-semibold text-foreground">{t.author}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
