"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentCountdownProps {
  deadline: string;
  createdAt: string;
}

function formatWIB(date: Date) {
  const d = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const t = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  return `${d} ${t} WIB`;
}

export function PaymentCountdown({ deadline, createdAt }: PaymentCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const deadlineDate = new Date(deadline);
    const created = new Date(createdAt);

    function tick() {
      const now = new Date();
      const diff = deadlineDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ hours, minutes, seconds });
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, createdAt]);

  if (!mounted) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <AnimatePresence>
      {!isExpired && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center"
        >
          <div className="mb-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Batas Pembayaran</span>
          </div>

          <div className="flex items-center justify-center gap-2 font-mono text-2xl font-bold tracking-wider text-foreground">
            <span className="tabular-nums">{pad(timeLeft.hours)}</span>
            <span className="text-muted-foreground/40">:</span>
            <span className="tabular-nums">{pad(timeLeft.minutes)}</span>
            <span className="text-muted-foreground/40">:</span>
            <span className="tabular-nums">{pad(timeLeft.seconds)}</span>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Sebelum {formatWIB(new Date(deadline))}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
