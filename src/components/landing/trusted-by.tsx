"use client";

import { motion } from "framer-motion";

const LOGOS = [
  "TechHub", "FixItPro", "GadgetCare", "PhoneRepair", "ByteWorks",
  "CircuitLab", "DeviceClinic", "PixelFix", "NanoTech", "QuickRepair",
];

export function TrustedBy() {
  const doubled = [...LOGOS, ...LOGOS];

  return (
    <section className="border-y border-border/40 bg-muted/30 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by repair shops worldwide
        </p>
        <div className="relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-muted/30 to-transparent" />
          <div className="absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-muted/30 to-transparent" />
          <motion.div
            className="flex gap-16"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {doubled.map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex h-10 shrink-0 items-center text-sm font-semibold text-muted-foreground/40"
              >
                {name}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
