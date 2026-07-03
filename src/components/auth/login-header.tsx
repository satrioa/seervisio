"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";

export function LoginHeader() {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
          delay: 0.1,
        }}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Wrench className="size-7 text-primary" />
        </div>
      </motion.div>

      <div className="space-y-1.5">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.15,
          }}
          className="text-xl font-semibold tracking-tight text-white"
        >
          Welcome back
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.2,
          }}
          className="text-sm text-white/50"
        >
          Sign in to continue managing your repair shop.
        </motion.p>
      </div>
    </div>
  );
}
