"use client";

import { motion, AnimatePresence } from "framer-motion";

interface LoadingDigitProps {
  value: number;
  position: "left" | "right";
}

export function LoadingDigit({ value, position }: LoadingDigitProps) {
  const isLeft = position === "left";
  const enterY = isLeft ? "100%" : "-100%";
  const exitY = isLeft ? "-100%" : "100%";

  return (
    <div className="relative w-[0.6em] h-[1em] overflow-hidden">
      <AnimatePresence>
        <motion.div
          key={value}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ y: enterY }}
          animate={{ y: 0 }}
          exit={{ y: exitY }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 35,
            mass: 0.6,
          }}
          style={{ willChange: "transform" }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
