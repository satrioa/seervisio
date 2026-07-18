"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface SparklineCardProps {
  title: string;
  description?: string;
  data: { value: number; label?: string }[];
  color?: string;
  valueFormatter?: (v: number) => string;
  className?: string;
}

function trend(data: { value: number }[]): { icon: React.ReactNode; text: string; color: string } {
  if (data.length < 2) return { icon: <Minus className="size-3.5" />, text: "Stabil", color: "text-muted-foreground" };
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  if (Math.abs(pct) < 1) return { icon: <Minus className="size-3.5" />, text: "Stabil", color: "text-muted-foreground" };
  if (pct > 0) return { icon: <TrendingUp className="size-3.5" />, text: `${pct.toFixed(1)}%`, color: "text-emerald-500" };
  return { icon: <TrendingDown className="size-3.5" />, text: `${pct.toFixed(1)}%`, color: "text-red-500" };
}

export function SparklineCard({ title, description, data, color = "hsl(var(--chart-1))", valueFormatter, className }: SparklineCardProps) {
  const fmt = valueFormatter ?? ((v: number) => v.toLocaleString());
  const t = trend(data);
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const W = 280;
  const H = 64;
  const pts = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * W,
    y: H - (d.value / maxVal) * H,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const fillPath = `${pathD} L${pts[pts.length - 1]?.x ?? W} ${H} L0 ${H} Z`;
  const current = data[data.length - 1]?.value ?? 0;

  return (
    <Card className={`shadow-xs ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums text-foreground">{fmt(current)}</span>
          <span className={`flex items-center gap-0.5 text-xs font-medium ${t.color}`}>
            {t.icon}
            {t.text}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 px-4 pb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16 overflow-visible">
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <motion.path
            d={fillPath}
            fill="url(#sg)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.circle
            cx={pts[pts.length - 1]?.x ?? 0}
            cy={pts[pts.length - 1]?.y ?? 0}
            r={3.5}
            fill={color}
            stroke="hsl(var(--card))"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          />
        </svg>
      </CardContent>
    </Card>
  );
}

export default SparklineCard;
