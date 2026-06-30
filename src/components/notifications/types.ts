export type NotificationCategory = "system" | "activity" | "customer";

export interface Notification {
  id: string;
  icon: string;
  title: string;
  description: string;
  timestamp: Date;
  category: NotificationCategory;
  read: boolean;
  href?: string;
}

export interface NotificationGroup {
  label: string;
  items: Notification[];
}

export function groupNotifications(items: Notification[]): NotificationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: { label: string; items: Notification[] }[] = [];

  const todayItems = items.filter((n) => n.timestamp >= today);
  if (todayItems.length) groups.push({ label: "Today", items: todayItems });

  const yesterdayItems = items.filter(
    (n) => n.timestamp >= yesterday && n.timestamp < today,
  );
  if (yesterdayItems.length) groups.push({ label: "Yesterday", items: yesterdayItems });

  const earlierItems = items.filter((n) => n.timestamp < yesterday);
  if (earlierItems.length) groups.push({ label: "Earlier", items: earlierItems });

  return groups;
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    icon: "wrench",
    title: "Service Updated",
    description: "SRV-20260613-0006 moved to Diagnosis.",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    category: "activity",
    read: false,
    href: "/panel/services/SRV-20260613-0006",
  },
  {
    id: "n2",
    icon: "wallet",
    title: "Payment Received",
    description: "Customer paid Rp123.444 via QRIS.",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    category: "activity",
    read: false,
    href: "/panel/finance/transactions",
  },
  {
    id: "n3",
    icon: "store",
    title: "Store Shift Opened",
    description: "Kasservice Semarang opened shift.",
    timestamp: new Date(Date.now() - 8.5 * 60 * 60 * 1000),
    category: "activity",
    read: false,
  },
  {
    id: "n4",
    icon: "package",
    title: "Inventory Warning",
    description: "Battery iPhone 13 stock below minimum.",
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000),
    category: "system",
    read: true,
    href: "/panel/inventory-v4",
  },
  {
    id: "n5",
    icon: "sparkles",
    title: "AI Recommendation",
    description: "Average repair time increased 18% this week.",
    timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000),
    category: "system",
    read: true,
    href: "/panel/ai",
  },
  {
    id: "n6",
    icon: "user",
    title: "Customer Registered",
    description: "Andi Pratama registered as new customer.",
    timestamp: new Date(Date.now() - 40 * 60 * 60 * 1000),
    category: "customer",
    read: true,
  },
  {
    id: "n7",
    icon: "alert",
    title: "Stock Alert",
    description: "Tempered Glass iPhone 14 Pro stock is 0.",
    timestamp: new Date(Date.now() - 50 * 60 * 60 * 1000),
    category: "system",
    read: true,
  },
  {
    id: "n8",
    icon: "wrench",
    title: "Service Completed",
    description: "SRV-20260613-0005 completed — ready for pickup.",
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    category: "activity",
    read: false,
    href: "/panel/services/SRV-20260613-0005",
  },
];
