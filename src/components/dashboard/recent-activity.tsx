import type { LucideIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ActivityItem {
  time: string;
  text: string;
  icon: LucideIcon;
}

interface RecentActivityProps {
  items: ActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <div className="space-y-0">
      {items.map((act, idx) => (
        <div key={idx}>
          <div className="flex items-start gap-3 py-2.5">
            <div className="flex size-7 items-center justify-center rounded-full bg-muted">
              <act.icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="text-xs text-foreground">{act.text}</p>
              <span className="text-[10px] text-muted-foreground">
                {act.time}
              </span>
            </div>
          </div>
          {idx < items.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
