"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { User, HeadphonesIcon, Wrench, CheckCircle2, Package, CreditCard } from "lucide-react";

const STEPS = [
  { icon: User, label: "Customer", desc: "Walks in or books online" },
  { icon: HeadphonesIcon, label: "Frontliner", desc: "Intake & diagnosis" },
  { icon: Wrench, label: "Technician", desc: "Repair & testing" },
  { icon: CheckCircle2, label: "QC", desc: "Quality check" },
  { icon: Package, label: "Pickup", desc: "Device returned" },
  { icon: CreditCard, label: "Payment", desc: "Payment completed" },
];

export function WorkflowSection() {
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
            From intake to pickup, beautifully orchestrated
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-muted-foreground"
          >
            Every step is tracked, every handoff is seamless.
          </motion.p>
        </div>

        <div className="relative mt-16">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent lg:block" />

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-0">
            {STEPS.map((step, i) => {
              const isRight = i % 2 === 1;
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: isRight ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-start gap-4 ${isRight ? "lg:pl-12" : "lg:pr-12"} ${isRight ? "lg:col-start-2" : "lg:col-start-1"}`}
                >
                  <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-card shadow-sm">
                    <Icon className="size-5 text-primary" />
                    <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
