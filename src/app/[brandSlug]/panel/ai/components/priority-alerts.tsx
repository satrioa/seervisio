"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Package,
  Wrench,
  DollarSign,
  Clock,
  Users,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PriorityAlert, AlertSeverity } from "./mock-data";

interface PriorityAlertsProps {
  alerts: PriorityAlert[];
}

const typeIcons: Record<string, React.ElementType> = {
  inventory: Package,
  technician: Wrench,
  finance: DollarSign,
  service: Clock,
  customer: Users,
};

const severityConfig: Record<AlertSeverity, { icon: React.ElementType; color: string; badge: string }> = {
  critical: {
    icon: AlertTriangle,
    color: "border-l-red-500 bg-red-500/5 dark:bg-red-500/[0.07]",
    badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  },
  warning: {
    icon: AlertCircle,
    color: "border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/[0.07]",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  info: {
    icon: Info,
    color: "border-l-blue-500 bg-blue-500/5 dark:bg-blue-500/[0.07]",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
};

export function PriorityAlerts({ alerts }: PriorityAlertsProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">AI Priority Alerts</CardTitle>
          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-medium">
            {alerts.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {alerts.map((alert, i) => {
          const Icon = typeIcons[alert.type] || AlertCircle;
          const sev = severityConfig[alert.severity];
          const SevIcon = sev.icon;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-lg border-l-[3px] p-3.5 transition-all duration-200 hover:shadow-md",
                sev.color,
                "border border-l-[3px] border-border",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/80 ring-1 ring-border">
                  <Icon className="size-4 text-foreground/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-foreground">{alert.title}</h4>
                    <Badge
                      variant="outline"
                      className={cn("h-5 rounded-full px-2 text-[10px] font-medium", sev.badge)}
                    >
                      <SevIcon className="mr-1 size-3" />
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {alert.description}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/70">
                    {alert.detail}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 rounded-full px-3 text-[11px] font-medium"
                      asChild
                    >
                      <a href={alert.actionHref}>
                        {alert.actionLabel}
                        <ChevronRight className="ml-1 size-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
