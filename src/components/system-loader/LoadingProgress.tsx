"use client";

import { motion } from "framer-motion";

interface LoadingProgressProps {
  value: number;
  color: string;
}

export function LoadingProgress({ value, color }: LoadingProgressProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[2px] bg-white/5">
      <motion.div
        className="h-full"
        style={{ backgroundColor: color || "rgb(255 255 255 / 0.4)" }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}
