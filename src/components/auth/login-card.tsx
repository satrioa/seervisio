"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoginCardProps {
  children: React.ReactNode;
  className?: string;
}

export function LoginCard({ children, className }: LoginCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
        scale: { duration: 0.5 },
      }}
      className={cn(
        "w-full max-w-[440px]",
        "rounded-3xl border p-8 shadow-2xl",
        "bg-[rgba(17,17,17,0.78)] backdrop-blur-xl",
        "border-[rgba(255,255,255,0.08)]",
        "shadow-black/40",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
