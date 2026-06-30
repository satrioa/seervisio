"use client";

import { motion, type Variants } from "framer-motion";
import { useBootLoader } from "@/components/system-loader/BootProvider";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.15,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 28,
      mass: 0.6,
    },
  },
};

export function DashboardStagger({ children }: { children: React.ReactNode }) {
  const { phase } = useBootLoader();
  const isVisible = phase === "ready";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
    >
      {children}
    </motion.div>
  );
}
