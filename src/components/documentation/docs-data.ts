export interface DocChapter {
  slug: string;
  title: string;
  desc: string;
}

export const DOCS_CHAPTERS: DocChapter[] = [
  { slug: "README", title: "Welcome", desc: "What is Seervisio, who should use it, main modules" },
  { slug: "getting-started", title: "First Setup & Account Roles", desc: "Initial configuration, user roles, permissions, security" },
  { slug: "daily-workflow", title: "Daily Workflow", desc: "Opening store, shift, receiving customers, closing" },
  { slug: "dashboard", title: "Dashboard", desc: "All cards, graphs, widgets, and statistics explained" },
  { slug: "service", title: "Service Module", desc: "Create and manage repair orders from intake to delivery" },
  { slug: "pos", title: "POS", desc: "Sell products, cart management, discounts, payments" },
  { slug: "inventory", title: "Inventory", desc: "Products, stock, purchases, transfers, adjustments" },
  { slug: "finance", title: "Finance", desc: "Income, expenses, transactions, profit reports" },
  { slug: "store-shift", title: "Store Shift", desc: "Open/close shift, expected cash, cash difference" },
  { slug: "customers", title: "Customers", desc: "Add, search, history, warranty tracking" },
  { slug: "management", title: "Management", desc: "Branches, users, permissions, activity log" },
  { slug: "settings", title: "System Settings", desc: "Appearance, branding, payment methods, taxes" },
  { slug: "dynamic-island", title: "Dynamic Island", desc: "All states — idle, active shift, notifications" },
  { slug: "ai-command-center", title: "AI Command Center", desc: "Business health, alerts, recommendations" },
  { slug: "reports", title: "Reports", desc: "Revenue, services, inventory, finance, performance" },
  { slug: "faq", title: "FAQ", desc: "Common problems and solutions" },
  { slug: "best-practices", title: "Best Practices", desc: "Daily/weekly/monthly checklists" },
];

export const DOCS_SLUG_TO_FILE: Record<string, string> = {
  "README": "README.md",
  "getting-started": "getting-started.md",
  "daily-workflow": "daily-workflow.md",
  "dashboard": "dashboard.md",
  "service": "service.md",
  "pos": "pos.md",
  "inventory": "inventory.md",
  "finance": "finance.md",
  "store-shift": "store-shift.md",
  "customers": "customers.md",
  "management": "management.md",
  "settings": "settings.md",
  "dynamic-island": "dynamic-island.md",
  "ai-command-center": "ai-command-center.md",
  "reports": "reports.md",
  "faq": "faq.md",
  "best-practices": "best-practices.md",
};

export const DOCS_TITLES: Record<string, string> = {
  "README": "Welcome",
  "getting-started": "First Setup & Account Roles",
  "daily-workflow": "Daily Workflow",
  "dashboard": "Dashboard",
  "service": "Service Module",
  "pos": "POS",
  "inventory": "Inventory",
  "finance": "Finance",
  "store-shift": "Store Shift",
  "customers": "Customers",
  "management": "Management",
  "settings": "System Settings",
  "dynamic-island": "Dynamic Island",
  "ai-command-center": "AI Command Center",
  "reports": "Reports",
  "faq": "FAQ",
  "best-practices": "Best Practices",
};

export const DOCS_FILE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(DOCS_SLUG_TO_FILE).map(([slug, file]) => [file.replace(/\.md$/, ""), slug])
);

export const DOC_SLUG_TO_MISSION: Record<string, string> = {
  "getting-started": "business-setup",
  "inventory": "inventory-setup",
  "settings": "payment-setup",
  "store-shift": "shift-setup",
  "service": "first-service",
};
