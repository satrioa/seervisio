/**
 * store-health-summary.ts
 * Operational summary for the Store Health Score card.
 * Structured so real dashboard data can replace mock input later.
 */

export type StoreHealthStatus = "good" | "warning" | "critical";

export interface StoreHealthInsight {
  key: "shift" | "service" | "finance" | "inventory" | "activity";
  label: string;
  score: number;
  status: StoreHealthStatus;
  title: string;
  description: string;
  meta?: string;
}

export interface StoreHealthSummary {
  score: number;
  statusLabel: string;
  status: StoreHealthStatus;
  headline: string;
  insight: string;
  items: StoreHealthInsight[];
}

/* ── Input types (ready for real data) ── */

export interface StoreHealthInput {
  shift: {
    isActive: boolean;
    openedAt: string | null;
    openedBy: string | null;
    activeDurationMinutes: number;
    expectedOperatingMinutes: number;
  };
  service: {
    createdToday: number;
    completedToday: number;
    inRepair: number;
    waitingQc: number;
    overdueServices: number;
  };
  finance: {
    revenueToday: number;
    expenseToday: number;
    targetRevenueToday: number;
    unpaidInvoices: number;
  };
  inventory: {
    lowStockItems: number;
    outOfStockItems: number;
    stockMovementsToday: number;
  };
  activity: {
    activityCountToday: number;
    hasRecentActivity: boolean;
    lastActivityAt: string | null;
    /** Number of distinct activity types (service, payment, stock, pos, etc) */
    activityVariety: number;
  };
}

/* ── Weights ── */

const WEIGHTS = {
  shift: 20,
  service: 25,
  finance: 25,
  inventory: 20,
  activity: 10,
} as const;

/* ── Helpers ── */

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getStatus(score: number): StoreHealthStatus {
  if (score >= 70) return "good";
  if (score >= 40) return "warning";
  return "critical";
}

function getStatusLabel(score: number): string {
  if (score >= 85) return "Sangat Baik";
  if (score >= 70) return "Baik";
  if (score >= 50) return "Perlu Dipantau";
  return "Kritis";
}

/* ── Dimension scorers ── */

function calcShiftInsight(input: StoreHealthInput["shift"]): StoreHealthInsight {
  let score: number;
  let title: string;
  let description: string;
  let meta: string | undefined;

  const ratio = input.expectedOperatingMinutes > 0
    ? input.activeDurationMinutes / input.expectedOperatingMinutes
    : 0;

  if (!input.isActive) {
    score = 20;
    title = "Shift belum dibuka";
    description = "Tidak ada shift aktif saat jam operasional.";
  } else if (ratio >= 1) {
    score = 100;
    title = "Shift berjalan normal";
    description = `Shift berjalan ${formatDuration(input.activeDurationMinutes)}.`;
  } else if (ratio >= 0.5) {
    score = 75;
    title = `Shift berjalan ${formatDuration(input.activeDurationMinutes)}`;
    description = "Shift berjalan sesuai ekspektasi.";
  } else {
    score = 40;
    title = `Shift berjalan ${formatDuration(input.activeDurationMinutes)}`;
    description = "Shift berjalan di bawah jam operasional.";
  }

  if (input.openedAt && input.openedBy) {
    const time = new Date(input.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    meta = `Dibuka pukul ${time} oleh ${input.openedBy}`;
  }

  return {
    key: "shift",
    label: "Shift",
    score,
    status: getStatus(score),
    title,
    description,
    meta,
  };
}

function calcServiceInsight(input: StoreHealthInput["service"]): StoreHealthInsight {
  let deductions = 0;
  deductions += input.overdueServices * 5;
  deductions += input.waitingQc * 10;

  // Completion bonus
  const totalJobs = input.createdToday + input.completedToday;
  let bonus = 0;
  if (totalJobs > 0) {
    const completionRate = input.completedToday / totalJobs;
    if (completionRate > 0.3) {
      bonus = Math.round((completionRate - 0.3) * 30);
    }
  }

  const score = clamp(Math.round(100 - deductions + bonus), 0, 100);

  const parts: string[] = [];
  if (input.createdToday > 0) parts.push(`${input.createdToday} servis masuk`);
  if (input.completedToday > 0) parts.push(`${input.completedToday} selesai`);
  const title = parts.length > 0 ? parts.join(", ") : "Tidak ada servis hari ini";

  const subParts: string[] = [];
  if (input.inRepair > 0) subParts.push(`${input.inRepair} dalam perbaikan`);
  if (input.waitingQc > 0) subParts.push(`${input.waitingQc} menunggu QC`);
  const description = subParts.length > 0 ? subParts.join(", ") : "Antrian servis lancar";

  return {
    key: "service",
    label: "Servis",
    score,
    status: getStatus(score),
    title,
    description,
    meta: input.overdueServices > 0 ? `${input.overdueServices} servis terlambat` : undefined,
  };
}

function calcFinanceInsight(input: StoreHealthInput["finance"]): StoreHealthInsight {
  // Revenue progress (max 60 pts)
  const revenueProgress = input.targetRevenueToday > 0
    ? Math.min((input.revenueToday / input.targetRevenueToday) * 60, 60)
    : 60;

  // Cash health (max 25 pts)
  let cashHealth = 25;
  if (input.expenseToday > 0) {
    const ratio = input.revenueToday / Math.max(input.expenseToday, 1);
    cashHealth = clamp(Math.round(ratio * 15), 0, 25);
  }

  // Penalties
  const penalties = input.unpaidInvoices * 8;

  const score = clamp(Math.round(revenueProgress + cashHealth - penalties), 0, 100);

  const title = `Pemasukan Rp ${input.revenueToday.toLocaleString("id-ID")}`;
  const net = input.revenueToday - input.expenseToday;
  const description = `Pengeluaran Rp ${input.expenseToday.toLocaleString("id-ID")} · Net Rp ${net.toLocaleString("id-ID")}`;

  return {
    key: "finance",
    label: "Keuangan",
    score,
    status: getStatus(score),
    title,
    description,
    meta: input.unpaidInvoices > 0 ? `${input.unpaidInvoices} invoice belum lunas` : undefined,
  };
}

function calcInventoryInsight(input: StoreHealthInput["inventory"]): StoreHealthInsight {
  let score: number;
  let description: string;

  if (input.outOfStockItems > 0) {
    score = 50;
    description = `${input.outOfStockItems} item habis, ${input.lowStockItems} menipis`;
  } else if (input.lowStockItems > 0) {
    score = 75;
    description = `${input.lowStockItems} item perlu dipantau`;
  } else {
    score = 100;
    description = "Stok aman";
  }

  return {
    key: "inventory",
    label: "Inventori",
    score,
    status: getStatus(score),
    title: description,
    description: `${input.stockMovementsToday} mutasi stok hari ini`,
    meta: input.outOfStockItems > 0 ? "Segera lakukan restock" : undefined,
  };
}

function calcActivityInsight(input: StoreHealthInput["activity"]): StoreHealthInsight {
  let score: number;
  let title: string;
  let description: string;

  if (input.activityCountToday >= 50 && input.hasRecentActivity) {
    score = 100;
    title = `${input.activityCountToday} aktivitas tercatat hari ini`;
    description = "Aktivitas operasional berjalan lancar.";
  } else if (input.activityCountToday >= 10) {
    score = 70;
    title = `${input.activityCountToday} aktivitas tercatat hari ini`;
    description = "Aktivitas cukup, dapat ditingkatkan.";
  } else if (input.activityCountToday > 0) {
    score = 40;
    title = `${input.activityCountToday} aktivitas tercatat hari ini`;
    description = "Aktivitas operasional rendah.";
  } else {
    score = 20;
    title = "Belum ada aktivitas hari ini";
    description = "Tidak ada aktivitas tercatat.";
  }

  return {
    key: "activity",
    label: "Aktivitas",
    score,
    status: getStatus(score),
    title,
    description,
    meta: input.activityVariety >= 3
      ? "Mencakup servis, pembayaran, dan stok"
      : undefined,
  };
}

/* ── Main builder ── */

export function buildStoreHealthSummary(input: StoreHealthInput): StoreHealthSummary {
  const items: StoreHealthInsight[] = [
    calcShiftInsight(input.shift),
    calcServiceInsight(input.service),
    calcFinanceInsight(input.finance),
    calcInventoryInsight(input.inventory),
    calcActivityInsight(input.activity),
  ];

  const weightedSum =
    items[0].score * (WEIGHTS.shift / 100) +
    items[1].score * (WEIGHTS.service / 100) +
    items[2].score * (WEIGHTS.finance / 100) +
    items[3].score * (WEIGHTS.inventory / 100) +
    items[4].score * (WEIGHTS.activity / 100);

  const score = clamp(Math.round(weightedSum), 0, 100);
  const statusLabel = getStatusLabel(score);
  const status = getStatus(score);

  let headline: string;
  let insight: string;
  if (score >= 85) {
    headline = "Operasional sangat baik";
    insight = "Semua indikator dalam kondisi optimal.";
  } else if (score >= 70) {
    headline = "Operasional stabil";
    insight = "Sebagian besar indikator berjalan normal.";
  } else if (score >= 50) {
    headline = "Perlu perhatian";
    insight = "Beberapa indikator memerlukan tindakan.";
  } else {
    headline = "Kondisi kritis";
    insight = "Segera lakukan evaluasi operasional.";
  }

  return { score, statusLabel, status, headline, insight, items };
}

/* ── Helpers ── */

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} jam ${m} menit`;
  if (h > 0) return `${h} jam`;
  return `${m} menit`;
}

/* ── Mock data ── */

export function getMockStoreHealthInput(): StoreHealthInput {
  const now = new Date();
  const openedAt = new Date(now);
  openedAt.setHours(8, 12, 0, 0);

  return {
    shift: {
      isActive: true,
      openedAt: openedAt.toISOString(),
      openedBy: "Master Admin",
      activeDurationMinutes: 384,
      expectedOperatingMinutes: 720,
    },
    service: {
      createdToday: 12,
      completedToday: 3,
      inRepair: 5,
      waitingQc: 1,
      overdueServices: 0,
    },
    finance: {
      revenueToday: 2_450_000,
      expenseToday: 350_000,
      targetRevenueToday: 3_000_000,
      unpaidInvoices: 0,
    },
    inventory: {
      lowStockItems: 2,
      outOfStockItems: 0,
      stockMovementsToday: 8,
    },
    activity: {
      activityCountToday: 53,
      hasRecentActivity: true,
      lastActivityAt: now.toISOString(),
      activityVariety: 4,
    },
  };
}
