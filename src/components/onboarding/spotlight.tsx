'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface SpotlightProps {
  targetRect: DOMRect | null;
  padding?: number;
  rounded?: number;
  visible: boolean;
}

export function Spotlight({
  targetRect,
  padding = 8,
  rounded = 12,
  visible,
}: SpotlightProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!visible) return null;

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 300, damping: 30 };

  // If no targetRect, we show a full black overlay
  if (!targetRect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/50"
      />
    );
  }

  const { top, left, width, height } = targetRect;

  // Calculate dimensions for the 4 bars
  const bars = {
    top: {
      top: 0,
      left: 0,
      right: 0,
      height: Math.max(0, top - padding),
    },
    bottom: {
      top: top + height + padding,
      left: 0,
      right: 0,
      bottom: 0,
    },
    left: {
      top: top - padding,
      left: 0,
      bottom: 0,
      width: Math.max(0, left - padding),
      height: height + 2 * padding,
    },
    right: {
      top: top - padding,
      right: 0,
      bottom: 0,
      left: left + width + padding,
      height: height + 2 * padding,
    },
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <motion.div
            initial={false}
            animate={bars.top}
            transition={transition}
            className="absolute backdrop-blur-sm bg-black/50"
          />
          <motion.div
            initial={false}
            animate={bars.bottom}
            transition={transition}
            className="absolute backdrop-blur-sm bg-black/50"
          />
          <motion.div
            initial={false}
            animate={bars.left}
            transition={transition}
            className="absolute backdrop-blur-sm bg-black/50"
          />
          <motion.div
            initial={false}
            animate={bars.right}
            transition={transition}
            className="absolute backdrop-blur-sm bg-black/50"
          />
          
          {/* Optional: border/highlight around the hole */}
          <motion.div
            initial={false}
            animate={{
              top: top - padding,
              left: left - padding,
              width: width + 2 * padding,
              height: height + 2 * padding,
              borderRadius: rounded,
            }}
            transition={transition}
            className="absolute border-2 border-white/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          />
        </div>
      )}
    </AnimatePresence>
  );
}
