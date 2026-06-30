"use client";

import { LoadingDigit } from "./LoadingDigit";

interface LoadingCounterProps {
  value: number;
}

export function LoadingCounter({ value }: LoadingCounterProps) {
  const left = Math.floor(value / 10);
  const right = value % 10;

  return (
    <div className="fixed bottom-6 right-6 flex items-center font-[family-name:var(--font-geist-mono),system-ui] text-[50vh] leading-none tracking-tighter text-white/15 font-[200] select-none">
      <LoadingDigit value={left} position="left" />
      <LoadingDigit value={right} position="right" />
    </div>
  );
}
