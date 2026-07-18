"use client";

import * as React from "react";
import { motion } from "framer-motion";

/**
 * Lightweight animated 3D-ish globe built with CSS/SVG (no external deps).
 * Rotating dotted sphere with orbiting dots — premium feel, zero CLS.
 */
export function GlobeDemo({ className = "" }: { className?: string }) {
  const dots = React.useMemo(() => {
    const arr: { x: number; y: number; r: number; delay: number }[] = [];
    const rings = 12;
    for (let i = 0; i < rings; i++) {
      const y = (i / (rings - 1)) * 2 - 1; // -1..1
      const radius = Math.sqrt(1 - y * y);
      const count = Math.max(2, Math.round(radius * 14));
      for (let j = 0; j < count; j++) {
        const angle = (j / count) * Math.PI * 2 + i * 0.4;
        const x = Math.cos(angle) * radius;
        arr.push({
          x: +(50 + x * 46).toFixed(3),
          y: +(50 + y * 46).toFixed(3),
          r: +(0.8 + radius * 1.1).toFixed(3),
          delay: (j / count) * 2,
        });
      }
    }
    return arr;
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="relative aspect-square w-full max-w-[280px]">
        {/* sphere base */}
        <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-primary/20 via-emerald-500/10 to-transparent blur-[2px]" />
        <div className="absolute inset-[8%] rounded-full border border-white/10" />
        <div
          className="absolute inset-[8%] rounded-full border border-white/10"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.12), transparent 55%)",
          }}
        />
        {/* rotating dots */}
        <motion.div
          className="absolute inset-[8%]"
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50% 50%" }}
        >
          {dots.map((d, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-primary"
              style={{
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: `${d.r}px`,
                height: `${d.r}px`,
                opacity: +(0.5 + (d.r / 2) * 0.5).toFixed(4),
                boxShadow: "0 0 6px rgba(80,220,160,0.6)",
              }}
            />
          ))}
        </motion.div>
        {/* orbiting satellites */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50% 50%" }}
        >
          <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_10px_#34d399]" />
        </motion.div>
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "50% 50%" }}
        >
          <span className="absolute left-1/2 bottom-[6%] size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_#3ecf8e]" />
        </motion.div>
      </div>
    </div>
  );
}

export default GlobeDemo;
