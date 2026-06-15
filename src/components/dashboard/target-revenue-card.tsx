"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function TargetRevenueCard() {
  // Mock data - will be replaced with real data
  const currentRevenue = 8_500_000;
  const target = 12_000_000;
  const percentage = Math.round((currentRevenue / target) * 100);

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Target Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground">
          <span className="text-lg font-semibold text-foreground">{formatRp(currentRevenue)}</span>
          <span className="mx-1">/</span>
          <span>{formatRp(target)}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{percentage}%</span>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {percentage >= 100
            ? "Target tercapai!"
            : `${percentage}% tercapai`}
        </p>
      </CardContent>
    </Card>
  );
}
