"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatRp(n: number) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

interface RevenueBreakdownCardProps {
  totalRevenue: number;
  serviceRevenue: number;
  posRevenue: number;
  otherIncome: number;
}

export function RevenueBreakdownCard({
  totalRevenue,
  serviceRevenue,
  posRevenue,
  otherIncome,
}: RevenueBreakdownCardProps) {
  const items = [
    { label: "Service", value: serviceRevenue },
    { label: "POS", value: posRevenue },
    { label: "Other", value: otherIncome },
  ];

  return (
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          Pendapatan
        </CardTitle>
        <TrendingUp className="size-4 text-muted-foreground/60" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Left: main revenue */}
          <div className="sm:w-[40%]">
            <div className="text-lg sm:text-xl font-semibold tracking-tight">
              {formatRp(totalRevenue)}
            </div>
          </div>
          {/* Right: three mini KPIs */}
          <div className="grid grid-cols-3 gap-2 sm:w-[60%]">
            {items.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] leading-none text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-sm font-semibold leading-none tracking-tight">
                  {formatRp(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          total revenue dari service, POS, dan other income
        </p>
      </CardContent>
    </Card>
  );
}
