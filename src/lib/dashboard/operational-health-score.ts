/**
 * operational-health-score.ts
 * Calculates the Operational Health Score for the dashboard General tab.
 *
 * The score is automatically derived from operational data across 5 weighted factors.
 * No user input required — purely data-driven.
 */

/* --- Types --- */

export type FactorStatus = "good" | "warning" | "critical";

export type HealthLabel = "Sangat Baik" | "Baik" | "Perlu Perhatian" | "Kritis";

export interface FactorResult {
  label: string;
  score: number;
  status: FactorStatus;
  message: string;
}

export interface OperationalHealthInput {
  shift: {
    totalBranches: number;
    openBranches: number;
    unclosedShifts: number;
  };
  service: {
    totalActive: number;
    completedToday: number;
    needAttention: number;
    overdueQc: number;
    unpickedUnits: number;
  };
  finance: {
    revenue: number;
    target: number;
    cashIn: number;
    cashOut: number;
    unpaidInvoices: number;
    cashDifference: number;
  };
  inventory: {
    lowStockItems: number;
    outOfStockItems: number;
    criticalFastMovingItems: number;
  };
  branchActivity: {
    activeBranches: number;
    totalBranches: number;
    totalActivities: number;
  };
}

export interface OperationalHealthResult {
  score: number;
  label: HealthLabel;
  factors: FactorResult[];
}

/* --- Weights --- */

const WEIGHTS = {
  shift: 15,
  service: 35,
  finance: 25,
  inventory: 15,
  branchActivity: 10,
} as const;

/* --- Helpers --- */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getStatus(score: number): FactorStatus {
  if (score >= 70) return "good";
  if (score >= 40) return "warning";
  return "critical";
}

function getLabel(score: number): HealthLabel {
  if (score >= 85) return "Sangat Baik";
  if (score >= 70) return "Baik";
  if (score >= 50) return "Perlu Perhatian";
  return "Kritis";
}

/* --- Factor Calculators --- */

function calcShiftHealth(input: OperationalHealthInput["shift"]): FactorResult {
  const openRatio =
    input.totalBranches > 0
      ? (input.openBranches / input.totalBranches) * 100
      : 100;

  const penalty = input.unclosedShifts * 15;
  const score = clamp(Math.round(openRatio - penalty), 0, 100);

  const messages: string[] = [];
  if (input.openBranches === input.totalBranches) {
    messages.push("Semua cabang sedang beroperasi");
  } else {
    const closed = input.totalBranches - input.openBranches;
    messages.push(`${closed} cabang tutup, ${input.openBranches} beroperasi`);
  }
  if (input.unclosedShifts > 0) {
    messages.push(`${input.unclosedShifts} shift belum ditutup`);
  } else {
    messages.push("Semua shift sudah ditutup");
  }

  return {
    label: "Shift Health",
    score,
    status: getStatus(score),
    message: messages.join(" • "),
  };
}

function calcServiceHealth(input: OperationalHealthInput["service"]): FactorResult {
  // Base at 100, then apply deductions
  let deductions = 0;
  deductions += input.needAttention * 5;
  deductions += input.overdueQc * 10;
  deductions += input.unpickedUnits * 12;

  // Completion throughput bonus
  const totalJobs = input.totalActive + input.completedToday;
  let bonus = 0;
  if (totalJobs > 0) {
    const completionRate = input.completedToday / totalJobs;
    // If completion rate is > 40%, add bonus proportional to how much above 40%
    if (completionRate > 0.4) {
      bonus = Math.round((completionRate - 0.4) * 50);
    }
  }

  const score = clamp(Math.round(100 - deductions + bonus), 0, 100);

  const messages: string[] = [];
  if (input.completedToday > 0) {
    messages.push(`${input.completedToday} servis selesai hari ini`);
  }
  if (input.needAttention > 0) {
    messages.push(`${input.needAttention} butuh tindakan`);
  }
  if (input.overdueQc > 0) {
    messages.push(`${input.overdueQc} QC terlewat`);
  } else {
    messages.push("Tidak ada antrian QC");
  }
  if (input.unpickedUnits > 0) {
    messages.push(`${input.unpickedUnits} unit belum diambil`);
  } else {
    messages.push("Unit sudah diambil semua");
  }

  return {
    label: "Service Health",
    score,
    status: getStatus(score),
    message: messages.join(" • "),
  };
}

function calcFinanceHealth(input: OperationalHealthInput["finance"]): FactorResult {
  // Revenue progress (max 60 pts)
  const revenueProgress =
    input.target > 0
      ? Math.min((input.revenue / input.target) * 60, 60)
      : 60;

  // Cash flow health (max 25 pts)
  let cashHealth = 0;
  if (input.cashIn > 0) {
    const cashRatio = input.cashIn / Math.max(input.cashOut, 1);
    cashHealth = Math.min(Math.round(cashRatio * 15), 25);
  }

  // Penalties
  let penalties = 0;
  penalties += input.unpaidInvoices * 8;
  if (input.cashDifference > 100000) {
    penalties += 10;
  }

  const score = clamp(Math.round(revenueProgress + cashHealth - penalties), 0, 100);

  const messages: string[] = [];
  messages.push(`Revenue ${Math.round((input.revenue / Math.max(input.target, 1)) * 100)}% dari target`);
  if (input.cashIn > input.cashOut) {
    messages.push("Cash flow positif");
  } else {
    messages.push("Cash flow negatif");
  }
  if (input.unpaidInvoices > 0) {
    messages.push(`${input.unpaidInvoices} invoice belum lunas`);
  } else {
    messages.push("Semua invoice lunas");
  }

  return {
    label: "Finance Health",
    score,
    status: getStatus(score),
    message: messages.join(" • "),
  };
}

function calcInventoryHealth(input: OperationalHealthInput["inventory"]): FactorResult {
  const deductions =
    input.lowStockItems * 6 +
    input.outOfStockItems * 15 +
    input.criticalFastMovingItems * 10;

  const score = clamp(Math.round(100 - deductions), 0, 100);

  const messages: string[] = [];
  if (input.lowStockItems > 0) {
    messages.push(`${input.lowStockItems} stok menipis`);
  } else {
    messages.push("Stok aman");
  }
  if (input.outOfStockItems > 0) {
    messages.push(`${input.outOfStockItems} stok habis`);
  }
  if (input.criticalFastMovingItems > 0) {
    messages.push(`${input.criticalFastMovingItems} fast-moving kritis`);
  }

  return {
    label: "Inventory Health",
    score,
    status: getStatus(score),
    message: messages.join(" • "),
  };
}

function calcBranchActivityHealth(
  input: OperationalHealthInput["branchActivity"]
): FactorResult {
  // Branch coverage (max 50 pts)
  const coverage =
    input.totalBranches > 0
      ? (input.activeBranches / input.totalBranches) * 50
      : 50;

  // Activity volume score (max 50 pts)
  const activityScore = Math.min((input.totalActivities / 60) * 50, 50);

  const score = clamp(Math.round(coverage + activityScore), 0, 100);

  const messages: string[] = [];
  if (input.activeBranches === input.totalBranches) {
    messages.push("Semua cabang aktif");
  } else {
    const inactive = input.totalBranches - input.activeBranches;
    messages.push(`${input.activeBranches}/${input.totalBranches} cabang aktif`);
  }
  messages.push(`${input.totalActivities} aktivitas hari ini`);

  return {
    label: "Branch Activity",
    score,
    status: getStatus(score),
    message: messages.join(" • "),
  };
}

/* --- Main Calculator --- */

export function calculateOperationalHealth(
  input: OperationalHealthInput
): OperationalHealthResult {
  const factors: FactorResult[] = [
    calcShiftHealth(input.shift),
    calcServiceHealth(input.service),
    calcFinanceHealth(input.finance),
    calcInventoryHealth(input.inventory),
    calcBranchActivityHealth(input.branchActivity),
  ];

  // Weighted total
  const weightedSum =
    factors[0].score * (WEIGHTS.shift / 100) +
    factors[1].score * (WEIGHTS.service / 100) +
    factors[2].score * (WEIGHTS.finance / 100) +
    factors[3].score * (WEIGHTS.inventory / 100) +
    factors[4].score * (WEIGHTS.branchActivity / 100);

  const totalScore = clamp(Math.round(weightedSum), 0, 100);

  return {
    score: totalScore,
    label: getLabel(totalScore),
    factors,
  };
}

/* --- Mock Data --- */

export function getMockOperationalHealthInput(): OperationalHealthInput {
  return {
    shift: {
      totalBranches: 3,
      openBranches: 2,
      unclosedShifts: 0,
    },
    service: {
      totalActive: 8,
      completedToday: 16,
      needAttention: 2,
      overdueQc: 1,
      unpickedUnits: 0,
    },
    finance: {
      revenue: 4250000,
      target: 7000000,
      cashIn: 4250000,
      cashOut: 1400000,
      unpaidInvoices: 0,
      cashDifference: 5000,
    },
    inventory: {
      lowStockItems: 2,
      outOfStockItems: 0,
      criticalFastMovingItems: 1,
    },
    branchActivity: {
      activeBranches: 2,
      totalBranches: 3,
      totalActivities: 57,
    },
  };
}
