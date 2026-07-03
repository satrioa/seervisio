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
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Wrench, title: "Service Management", desc: "End-to-end repair workflow from intake to pickup." },
  { icon: CreditCard, title: "POS System", desc: "Fast, intuitive point of sale with multiple payment methods." },
  { icon: Package, title: "Inventory", desc: "Real-time stock tracking, alerts, and supplier management." },
  { icon: LineChart, title: "Finance", desc: "Revenue reports, expenses, and profit analytics." },
  { icon: Users, title: "CRM", desc: "Customer history, preferences, and loyalty tracking." },
  { icon: GitBranch, title: "Multi Branch", desc: "Centralized management for all your locations." },
  { icon: UserCog, title: "Employee Management", desc: "Role-based access, schedules, and performance." },
  { icon: Bot, title: "AI Command Center", desc: "Ask questions, get insights, automate decisions." },
  { icon: BellRing, title: "Realtime Notifications", desc: "Instant updates on services, payments, and stock." },
  { icon: Fingerprint, title: "Customer Tracking", desc: "Device history, warranties, and service records." },
  { icon: ShieldCheck, title: "Warranty", desc: "Automated warranty tracking and claims management." },
  { icon: FileText, title: "Reports", desc: "Customizable reports with beautiful visualizations." },
];

export function FeatureGrid() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Everything you need to run your repair shop
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-muted-foreground"
          >
            One platform. Zero clutter. Infinite possibilities.
          </motion.p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className={cn(
                "group relative rounded-xl border border-border/50 bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5",
              )}
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{feature.desc}</p>
              <div className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-gradient-to-r from-primary/50 to-blue-500/50 transition-transform group-hover:scale-x-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
