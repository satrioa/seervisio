"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const FloatingShape = ({ className, delay = 0 }: { className: string; delay?: number }) => (
  <motion.div
    className={className}
    animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden pt-24">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <FloatingShape
          delay={0}
          className="absolute -left-32 -top-32 size-[500px] rounded-full bg-primary/5 blur-3xl"
        />
        <FloatingShape
          delay={2}
          className="absolute -right-32 top-1/3 size-[400px] rounded-full bg-blue-500/5 blur-3xl"
        />
        <FloatingShape
          delay={4}
          className="absolute bottom-0 left-1/3 size-[350px] rounded-full bg-purple-500/5 blur-3xl"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-green-500" />
            Now in public beta
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
          >
            The Modern Operating System
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
              for Repair Shops
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            Everything your repair business needs. Service management, POS, inventory, finance,
            CRM, and AI — all in one beautiful platform.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button asChild size="lg" className="h-12 gap-2 px-8 text-base">
              <Link href="/login">
                Start Free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 gap-2 px-8 text-base">
              <Link href="#demo">
                <Play className="size-4" />
                View Demo
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Dashboard preview */}
        <motion.div
          id="demo"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative mx-auto mt-16 max-w-6xl"
        >
          <div className="relative rounded-2xl border border-border/50 bg-card shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-border/50 px-4 py-3">
              <div className="size-2.5 rounded-full bg-red-500" />
              <div className="size-2.5 rounded-full bg-yellow-500" />
              <div className="size-2.5 rounded-full bg-green-500" />
              <div className="ml-3 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
                dashboard.seervisio.com
              </div>
            </div>
            <div className="aspect-video bg-gradient-to-br from-muted/50 via-background to-muted/30 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                  <div className="size-8 rounded-lg bg-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Dashboard Preview</p>
              </div>
            </div>
          </div>
          {/* Glow behind */}
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-b from-primary/10 via-blue-500/5 to-purple-500/10 blur-2xl" />
        </motion.div>
      </div>
    </section>
  );
}
