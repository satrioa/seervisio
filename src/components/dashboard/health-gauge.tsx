"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Activity, ShieldAlert, ShieldCheck, Gauge } from "lucide-react";

interface HealthGaugeProps {
  score: number; // 0-100
  label: string; // e.g. "Baik"
  usageStatus?: string; // e.g. "Standby" / "Aktif"
}

function scoreColor(score: number): string {
  if (score >= 85) return "hsl(var(--chart-2))"; // green
  if (score >= 70) return "hsl(var(--chart-1))"; // primary/blue
  if (score >= 50) return "hsl(35 92% 50%)"; // amber
  return "hsl(0 84% 60%)"; // red
}

function scoreRisk(score: number): { text: string; icon: React.ReactNode } {
  if (score >= 85) return { text: "Risiko Rendah", icon: <ShieldCheck className="size-3.5" /> };
  if (score >= 70) return { text: "Risiko Wajar", icon: <ShieldCheck className="size-3.5" /> };
  if (score >= 50) return { text: "Perlu Perhatian", icon: <ShieldAlert className="size-3.5" /> };
  return { text: "Risiko Tinggi", icon: <ShieldAlert className="size-3.5" /> };
}

export function HealthGauge({ score, label, usageStatus = "Standby" }: HealthGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const color = scoreColor(clamped);
  const risk = scoreRisk(clamped);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
          <circle
            cx={70}
            cy={70}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={10}
          />
          <motion.circle
            cx={70}
            cy={70}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - dash }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-extrabold tabular-nums text-foreground">{clamped}</span>
          <span className="text-[11px] font-medium" style={{ color }}>
            {label}
          </span>
        </div>
      </div>

      {/* Risk + usage status */}
      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <span style={{ color }}>{risk.icon}</span>
          <div className="leading-tight">
            <p className="text-[10px] text-muted-foreground">Risk</p>
            <p className="text-xs font-semibold text-foreground">{risk.text}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <Activity className="size-4 text-primary" />
          <div className="leading-tight">
            <p className="text-[10px] text-muted-foreground">Usage</p>
            <p className="text-xs font-semibold text-foreground">{usageStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HealthGauge;
