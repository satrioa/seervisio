import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  label: string;
  value: string;
  helper?: string;
  trend?: number;
  icon?: LucideIcon;
}

export function SummaryCard({
  label,
  value,
  helper,
  trend,
  icon: Icon,
}: SummaryCardProps) {
  return (
    <Card data-slot="card" className="@container/card shadow-xs w-full">
      <CardHeader>
        <CardTitle>
          {Icon && (
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
          )}
        </CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium text-2xl sm:text-3xl tabular-nums leading-none tracking-tight">
            {value}
          </div>
          {trend !== undefined && (
            <Badge variant={trend >= 0 ? "default" : "destructive"} className="text-xs">
              {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {trend > 0 ? "+" : ""}{trend}%
            </Badge>
          )}
        </div>
        {helper && <p className="text-muted-foreground text-xs sm:text-sm">{helper}</p>}
      </CardContent>
    </Card>
  );
}
