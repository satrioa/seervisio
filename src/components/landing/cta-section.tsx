"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-y border-border/40 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 size-[400px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 size-[400px] rounded-full bg-[#3ecf8e]/5 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        >
          Ready to modernize your repair shop?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
        >
          Join thousands of repair shops already using Seervisio. Start free, no credit card
          required.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button asChild size="lg" className="h-12 gap-2 px-8 text-base">
            <Link href="/login">
              Start Free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 gap-2 px-8 text-base">
            <Link href="/login">
              <Calendar className="size-4" />
              Book Demo
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
