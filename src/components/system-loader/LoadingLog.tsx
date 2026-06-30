"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { TaskLogItem } from "./BootProvider";

interface LoadingLogProps {
  items: TaskLogItem[];
}

const MAX_VISIBLE = 7;

export function LoadingLog({ items }: LoadingLogProps) {
  const visible = items.length <= MAX_VISIBLE ? items : items.slice(-MAX_VISIBLE);

  return (
    <div className="fixed bottom-10 left-6 overflow-hidden">
      <AnimatePresence initial={false}>
        {visible.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{
              opacity: item.status === "active" ? 1 : 0.55,
              y: 0,
            }}
            exit={{ opacity: 0, y: -12, height: 0, marginBottom: 0 }}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 32,
              mass: 0.7,
            }}
            className="flex items-center gap-2 text-sm font-mono leading-6"
          >
            <span
              className={`shrink-0 text-xs ${
                item.status === "active" ? "text-white" : "text-white/40"
              }`}
            >
              {item.status === "active" ? "\u2022" : "\u2713"}
            </span>
            <span
              className={`${
                item.status === "active"
                  ? "text-white font-medium"
                  : "text-white/60"
              }`}
            >
              {item.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
