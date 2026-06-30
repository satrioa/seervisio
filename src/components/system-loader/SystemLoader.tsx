"use client";

import { motion } from "framer-motion";
import { useBootLoader } from "./BootProvider";
import { LoadingCounter } from "./LoadingCounter";
import { LoadingLog } from "./LoadingLog";
import { LoadingProgress } from "./LoadingProgress";

const EXIT_EASE = [0.22, 1, 0.36, 1] as const;

export function SystemLoader() {
  const { displayProgress, taskLog, phase, brandColor } = useBootLoader();

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex flex-col bg-[#090909]"
      initial={false}
      animate={phase === "ready" ? { y: "-100%" } : { y: "0%" }}
      transition={{ duration: 0.7, ease: EXIT_EASE }}
      style={{
        willChange: "transform",
        pointerEvents: phase === "ready" ? "none" : "auto",
      }}
    >
      <div className="flex-1" />

      {/* Subtle scan-line overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px)",
        }}
      />

      <LoadingLog items={taskLog} />
      <LoadingCounter value={displayProgress} />
      <LoadingProgress value={displayProgress} color={brandColor} />
    </motion.div>
  );
}
