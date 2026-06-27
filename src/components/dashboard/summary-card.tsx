import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

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
    <Card className="shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {Icon && <Icon className="size-4 text-muted-foreground/60" />}
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-lg sm:text-xl font-semibold tracking-tight">{value}</div>
        {(helper || trend !== undefined) && (
          <div className="flex items-center gap-1.5">
            {trend !== undefined && trend > 0 && (
              <TrendingUp className="size-3 text-emerald-500" />
            )}
            {trend !== undefined && trend < 0 && (
              <TrendingDown className="size-3 text-red-500" />
            )}
            {helper && (
              <span className="text-[11px] text-muted-foreground">
                {helper}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
