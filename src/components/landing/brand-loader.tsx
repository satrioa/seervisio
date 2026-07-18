"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrambleText } from "./scramble-text";

/**
 * Full-screen brand loader shown briefly on landing first paint.
 * Plays the decode sequence: Loading… → S3erv1s10 → Seervisio.
 */
export function BrandLoader({ onFinish }: { onFinish?: () => void }) {
  const [phase, setPhase] = React.useState<"loading" | "decode" | "done">("loading");
  const [stage, setStage] = React.useState<0 | 1>(0);

  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase("decode"), 600);
    return () => clearTimeout(t1);
  }, []);

  return (
    <AnimatePresence onExitComplete={onFinish}>
      {phase !== "done" && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        >
          <div className="relative flex flex-col items-center">
            {/* pulsing dot */}
            <div className="mb-8 flex size-3 gap-2">
              <motion.span
                className="size-3 rounded-full bg-primary"
                animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            </div>

            {phase === "loading" ? (
              <ScrambleText
                as="div"
                text="Loading..."
                speed={40}
                className="font-mono text-lg tracking-widest text-muted-foreground"
              />
            ) : stage === 0 ? (
              <ScrambleText
                as="div"
                text="S3erv1s10"
                speed={45}
                delay={80}
                className="font-mono text-3xl font-extrabold tracking-widest text-primary"
                onDone={() => setStage(1)}
              />
            ) : (
              <ScrambleText
                as="div"
                text="Seervisio"
                speed={55}
                delay={120}
                className="bg-gradient-to-r from-primary via-emerald-400 to-teal-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent"
                onDone={() => {
                  setTimeout(() => setPhase("done"), 500);
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BrandLoader;
