export type AlertSeverity = "critical" | "warning" | "info";
export type TrendDirection = "up" | "down" | "stable";

export interface BusinessHealth {
  score: number;
  trend: TrendDirection;
  trendValue: string;
  contributors: {
    revenue: number;
    inventory: number;
    sla: number;
    finance: number;
    customer: number;
    technician: number;
  };
}

export interface TodayBriefing {
  userName: string;
  summary: {
    icon: string;
    text: string;
    positive: boolean;
  }[];
  revenueChange: number;
  overdueServices: number;
  stockAlert: string;
  marginNote: string;
  cashBalanced: boolean;
}

export interface PriorityAlert {
  id: string;
  type: "inventory" | "technician" | "finance" | "service" | "customer";
  severity: AlertSeverity;
  title: string;
  description: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  expectedImpact: "high" | "medium" | "low";
  confidence: number;
  estimatedRevenueProtected: number;
  actionLabel: string;
  actionHref: string;
}

export interface Insight {
  id: string;
  title: string;
  summary: string;
  severity: AlertSeverity;
  category: string;
  time: string;
  group: "today" | "yesterday" | "lastWeek";
  read: boolean;
  rootCause: string;
  supportingMetrics: string[];
  recommendation: string;
  confidence: number;
  expectedImpact: string;
  actions: { label: string; href: string }[];
}

export interface ScoreboardItem {
  label: string;
  value: string;
  trend: TrendDirection;
  trendValue: string;
  sparklineData: number[];
  insight: string;
  detailLabel: string;
}

export interface ForecastPoint {
  date: string;
  value: number;
  label: string;
}

export interface Forecast {
  tomorrow: { value: number; confidence: number };
  next7Days: ForecastPoint[];
  recommendations: string[];
}


