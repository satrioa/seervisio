"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  getSessionData,
  successResult,
  errorResult,
  requireActionPermission,
  type ActionResult,
} from "./action-helper";
import { getBranchesByBrandId } from "@/repositories/branch.repository";
import { listShifts } from "@/repositories/store-shift.repository";

/* ── Types ── */

export interface FinanceReportInput {
  branchId?: string | null;
  dateFrom: string;
  dateTo: string;
  accountId?: string | null;
}

export interface ReportSummary {
  totalRevenue: number;
  serviceRevenue: number;
  serviceRevenueCount: number;
  posRevenue: number;
  posRevenueCount: number;
  otherIncome: number;
  totalExpense: number;
  operatingExpense: number;
  bankFee: number;
  totalMdr: number;
  netCashflow: number;
  estimatedNetProfit: number;
  unpaidServiceCount: number;
  totalReceivable: number;
}

export interface RevenueBreakdownItem {
  source: string;
  amount: number;
  percentage: number;
}

export interface PaymentMethodBreakdownItem {
  methodType: string;
  methodName: string;
  grossAmount: number;
  transactionCount: number;
  mdrAmount: number;
  netAmount: number;
}

export interface AccountBalanceItem {
  accountId: string;
  accountName: string;
  accountType: string;
  balance: number;
  isActive: boolean;
  linkedMethods: string[];
  totalIn: number;
  totalOut: number;
}

export interface BranchPerformanceItem {
  branchId: string;
  branchName: string;
  serviceRevenue: number;
  posRevenue: number;
  otherIncome: number;
  expense: number;
  net: number;
  unpaidServiceCount: number;
}

export interface ShiftSummaryItem {
  shiftId: string;
  shiftNumber: string;
  branchName: string;
  openedAt: string;
  closedAt: string | null;
  openedByName: string | null;
  closedByName: string | null;
  openingCash: number;
  expectedClosingCash: number | null;
  countedClosingCash: number | null;
  cashDifference: number | null;
  status: string;
}

export interface RecentMovementItem {
  id: string;
  accountName: string;
  direction: "IN" | "OUT";
  amount: number;
  movementType: string;
  description: string | null;
  referenceLabel: string;
  createdAt: string;
}

export interface FinanceReportData {
  summary: ReportSummary;
  revenueBreakdown: RevenueBreakdownItem[];
  paymentMethodBreakdown: PaymentMethodBreakdownItem[];
  accountBalances: AccountBalanceItem[];
  branchPerformance: BranchPerformanceItem[];
  shiftSummary: ShiftSummaryItem[];
  recentMovements: RecentMovementItem[];
  dateFrom: string;
  dateTo: string;
}

/* ── Helpers ── */

function mapMovementType(mt: string): string {
  const map: Record<string, string> = {
    OPENING_BALANCE: "Saldo Awal",
    BALANCE_ADJUSTMENT: "Penyesuaian",
    SERVICE_PAYMENT: "Pembayaran Servis",
    POS_PAYMENT: "Penjualan POS",
    OTHER_INCOME: "Pendapatan Lain",
    OPERATING_EXPENSE: "Biaya Operasional",
    STOCK_PURCHASE: "Belanja Stok",
    STOCK_PURCHASE_PAYMENT: "Pembayaran Stok",
    TRANSFER_IN: "Transfer Masuk",
    TRANSFER_OUT: "Transfer Keluar",
    BANK_FEE: "Biaya Bank",
    QRIS_SETTLEMENT: "Settlement QRIS",
    SERVICE_REFUND: "Refund Servis",
    POS_REFUND: "Refund POS",
    CASH_IN: "Kas Masuk",
    CASH_OUT: "Kas Keluar",
  };
  return map[mt] || mt;
}

function fmtCurrency(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/* ── Main Report Action ── */

export async function getFinanceReportAction(
  brandSlug: string,
  input: FinanceReportInput,
): Promise<ActionResult<FinanceReportData>> {
  try {
    const session = await getSessionData(brandSlug);
    requireActionPermission(session.role, "finance_report.view");

    const supabase = await createServerSupabase();
    const { branchId, dateFrom, dateTo, accountId } = input;

    const dateFromStr = dateFrom || "1970-01-01";
    const dateToStr = dateTo || "2099-12-31";

    /* ── 1. Branches ── */
    const allBranches = await getBranchesByBrandId(supabase as any, session.brandId);
    const branchMap = new Map(allBranches.map((b: any) => [b.id, b.name || b.id]));
    const accessibleBranchIds =
      session.canAccessAllBranches
        ? allBranches.map((b: any) => b.id)
        : session.accessibleBranchIds;

    const branchFilter =
      branchId && branchId !== "ALL_BRANCHES"
        ? [branchId]
        : accessibleBranchIds;

    /* ── 2. Run parallel queries ── */
    const [movementsResult, servicePaymentsResult, posSalesResult, accountsResult, shiftsResult, servicesResult, bpmResult] =
      await Promise.all([
        /* Movements */
        (supabase as any)
          .from("payment_account_movements")
          .select(`
            id, branch_id, payment_account_id, direction, amount, movement_type,
            reference_type, reference_id, description, created_at,
            payment_accounts!payment_account_movements_payment_account_id_fkey(account_name, type),
            branches!payment_account_movements_branch_id_fkey(name)
          `)
          .eq("brand_id", session.brandId)
          .in("branch_id", branchFilter)
          .gte("created_at", dateFromStr)
          .lte("created_at", dateToStr)
          .order("created_at", { ascending: false }),

        /* Service payments */
        (supabase as any)
          .from("service_payments")
          .select(`
            id, branch_id, service_id, payment_method_id, payment_account_id,
            gross_amount, mdr_amount, net_amount, payment_status, paid_at,
            payment_methods!service_payments_payment_method_id_fkey(name, type)
          `)
          .eq("brand_id", session.brandId)
          .in("branch_id", branchFilter)
          .eq("payment_status", "PAID")
          .gte("paid_at", dateFromStr)
          .lte("paid_at", dateToStr),

        /* POS sales */
        (supabase as any)
          .from("pos_sales")
          .select(`
            id, branch_id, payment_method_id, payment_account_id,
            gross_amount, discount_amount, mdr_amount, net_amount,
            sale_status, sold_at,
            payment_methods!pos_sales_payment_method_id_fkey(name, type)
          `)
          .eq("brand_id", session.brandId)
          .in("branch_id", branchFilter)
          .eq("sale_status", "COMPLETED")
          .gte("sold_at", dateFromStr)
          .lte("sold_at", dateToStr),

        /* Payment accounts */
        (supabase as any)
          .from("payment_accounts")
          .select(`id, account_name, type, current_balance, is_active`)
          .eq("brand_id", session.brandId),

        /* Closed shifts */
        (supabase as any)
          .from("store_shifts")
          .select(`
            *,
            opened_by_profile:profiles!opened_by(name, email),
            closed_by_profile:profiles!closed_by(name, email)
          `)
          .eq("brand_id", session.brandId)
          .in("branch_id", branchFilter)
          .eq("shift_status", "CLOSED")
          .gte("closed_at", dateFromStr)
          .lte("closed_at", dateToStr)
          .order("closed_at", { ascending: false })
          .limit(50),

        /* Unpaid services — exclude CANCELLED */
        (supabase as any)
          .from("services")
          .select("id, final_cost, branch_id")
          .eq("brand_id", session.brandId)
          .in("branch_id", branchFilter)
          .neq("current_status", "CANCELLED"),

        /* Branch payment methods for account linkage */
        (supabase as any)
          .from("branch_payment_methods")
          .select(`payment_account_id, payment_methods!inner(name, type)`)
          .in("branch_id", branchFilter),
      ]);

    const movements = (movementsResult.data ?? []) as any[];
    const servicePayments = (servicePaymentsResult.data ?? []) as any[];
    const posSales = (posSalesResult.data ?? []) as any[];
    const accountsRaw = (accountsResult.data ?? []) as any[];
    const shifts = (shiftsResult.data ?? []) as any[];
    const services = (servicesResult.data ?? []) as any[];
    const bpms = (bpmResult.data ?? []) as any[];

    /* Build account→methods map */
    const accountMethodMap = new Map<string, Set<string>>();
    for (const bpm of bpms) {
      if (!bpm.payment_account_id) continue;
      if (!accountMethodMap.has(bpm.payment_account_id)) {
        accountMethodMap.set(bpm.payment_account_id, new Set());
      }
      const pm = bpm.payment_methods;
      if (pm?.name) accountMethodMap.get(bpm.payment_account_id)!.add(pm.name);
    }

    /* ── 3. Compute summary KPIs ── */

    const totalServiceRevenue = servicePayments.reduce(
      (s: number, p: any) => s + Number(p.gross_amount || 0), 0,
    );
    const serviceRevenueCount = servicePayments.length;

    const totalPosRevenue = posSales.reduce(
      (s: number, p: any) => s + Number(p.gross_amount || 0), 0,
    );
    const posRevenueCount = posSales.length;

    const otherIncome = movements
      .filter((m: any) => m.movement_type === "OTHER_INCOME" && m.direction === "IN")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

    const operatingExpense = movements
      .filter((m: any) => m.movement_type === "OPERATING_EXPENSE" && m.direction === "OUT")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

    const bankFee = movements
      .filter((m: any) => m.movement_type === "BANK_FEE")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);

    const mdrFromMovements = bankFee;
    const mdrFromServicePayments = servicePayments.reduce(
      (s: number, p: any) => s + Number(p.mdr_amount || 0), 0,
    );
    const mdrFromPosSales = posSales.reduce(
      (s: number, p: any) => s + Number(p.mdr_amount || 0), 0,
    );
    const totalMdr = mdrFromMovements + mdrFromServicePayments + mdrFromPosSales;

    const totalExpense = operatingExpense + bankFee;

    const totalIn = movements
      .filter((m: any) => m.direction === "IN")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const totalOut = movements
      .filter((m: any) => m.direction === "OUT")
      .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const netCashflow = totalIn - totalOut;

    const totalRevenue = totalServiceRevenue + totalPosRevenue + otherIncome;
    const estimatedNetProfit = totalRevenue - totalExpense - totalMdr;

    /* Unpaid services */
    let unpaidServiceCount = 0;
    let totalReceivable = 0;
    for (const svc of services) {
      const paidTotal = servicePayments
        .filter((p: any) => p.service_id === svc.id)
        .reduce((s: number, p: any) => s + Number(p.gross_amount || 0), 0);
      const remaining = Number(svc.final_cost || 0) - paidTotal;
      if (remaining > 0) {
        unpaidServiceCount++;
        totalReceivable += remaining;
      }
    }

    const summary: ReportSummary = {
      totalRevenue,
      serviceRevenue: totalServiceRevenue,
      serviceRevenueCount,
      posRevenue: totalPosRevenue,
      posRevenueCount,
      otherIncome,
      totalExpense,
      operatingExpense,
      bankFee,
      totalMdr,
      netCashflow,
      estimatedNetProfit,
      unpaidServiceCount,
      totalReceivable,
    };

    /* ── 4. Revenue breakdown ── */
    const revTotal = totalRevenue || 1;
    const revenueBreakdown: RevenueBreakdownItem[] = [
      { source: "Servis", amount: totalServiceRevenue, percentage: (totalServiceRevenue / revTotal) * 100 },
      { source: "POS / Aksesoris", amount: totalPosRevenue, percentage: (totalPosRevenue / revTotal) * 100 },
      { source: "Pendapatan Lain", amount: otherIncome, percentage: (otherIncome / revTotal) * 100 },
    ];

    /* ── 5. Payment method breakdown ── */
    const pmtMap = new Map<string, { gross: number; count: number; mdr: number; name: string; type: string }>();

    for (const p of servicePayments) {
      const pm = p.payment_methods;
      const key = pm?.type || "UNKNOWN";
      const name = pm?.name || key;
      const entry = pmtMap.get(key) || { gross: 0, count: 0, mdr: 0, name, type: key };
      entry.gross += Number(p.gross_amount || 0);
      entry.count++;
      entry.mdr += Number(p.mdr_amount || 0);
      entry.name = name;
      entry.type = key;
      pmtMap.set(key, entry);
    }

    for (const s of posSales) {
      const pm = s.payment_methods;
      const key = pm?.type || "UNKNOWN";
      const name = pm?.name || key;
      const entry = pmtMap.get(key) || { gross: 0, count: 0, mdr: 0, name, type: key };
      entry.gross += Number(s.gross_amount || 0);
      entry.count++;
      entry.mdr += Number(s.mdr_amount || 0);
      entry.name = name;
      entry.type = key;
      pmtMap.set(key, entry);
    }

    const methodOrder = ["CASH", "QRIS", "TRANSFER", "DEBIT", "EWALLET", "UNKNOWN"];
    const paymentMethodBreakdown: PaymentMethodBreakdownItem[] = methodOrder
      .map((mt) => {
        const entry = pmtMap.get(mt);
        if (!entry) return null;
        return {
          methodType: entry.type,
          methodName: entry.name,
          grossAmount: entry.gross,
          transactionCount: entry.count,
          mdrAmount: entry.mdr,
          netAmount: entry.gross - entry.mdr,
        };
      })
      .filter((x): x is PaymentMethodBreakdownItem => x !== null);

    /* ── 6. Account balances ── */
    const accountBalances: AccountBalanceItem[] = accountsRaw.map((a: any) => {
      const movs = movements.filter((m: any) => m.payment_account_id === a.id);
      const totalInAcc = movs
        .filter((m: any) => m.direction === "IN")
        .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
      const totalOutAcc = movs
        .filter((m: any) => m.direction === "OUT")
        .reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
      const methods = accountMethodMap.get(a.id);
      return {
        accountId: a.id,
        accountName: a.account_name,
        accountType: a.type,
        balance: Number(a.current_balance || 0),
        isActive: a.is_active,
        linkedMethods: methods ? Array.from(methods) : [],
        totalIn: totalInAcc,
        totalOut: totalOutAcc,
      };
    }).filter((a: AccountBalanceItem) => a.totalIn > 0 || a.totalOut > 0 || a.balance > 0);

    /* ── 7. Branch performance ── */
    const branchPerfMap = new Map<string, BranchPerformanceItem>();

    for (const b of allBranches) {
      if (accessibleBranchIds.includes(b.id)) {
        branchPerfMap.set(b.id, {
          branchId: b.id,
          branchName: b.name || b.id,
          serviceRevenue: 0,
          posRevenue: 0,
          otherIncome: 0,
          expense: 0,
          net: 0,
          unpaidServiceCount: 0,
        });
      }
    }

    for (const p of servicePayments) {
      const perf = branchPerfMap.get(p.branch_id);
      if (perf) perf.serviceRevenue += Number(p.gross_amount || 0);
    }
    for (const s of posSales) {
      const perf = branchPerfMap.get(s.branch_id);
      if (perf) perf.posRevenue += Number(s.gross_amount || 0);
    }
    for (const m of movements) {
      const perf = branchPerfMap.get(m.branch_id);
      if (!perf) continue;
      if (m.movement_type === "OTHER_INCOME" && m.direction === "IN") {
        perf.otherIncome += Number(m.amount || 0);
      } else if (
        ["OPERATING_EXPENSE", "BANK_FEE", "STOCK_PURCHASE"].includes(m.movement_type) &&
        m.direction === "OUT"
      ) {
        perf.expense += Number(m.amount || 0);
      }
    }
    for (const svc of services) {
      const perf = branchPerfMap.get(svc.branch_id);
      if (!perf) continue;
      const paidTotal = servicePayments
        .filter((p: any) => p.service_id === svc.id)
        .reduce((s: number, p: any) => s + Number(p.gross_amount || 0), 0);
      if (Number(svc.final_cost || 0) - paidTotal > 0) {
        perf.unpaidServiceCount++;
      }
    }

    const branchPerformance = Array.from(branchPerfMap.values()).map((bp) => ({
      ...bp,
      net: bp.serviceRevenue + bp.posRevenue + bp.otherIncome - bp.expense,
    }));

    /* ── 8. Shift summary ── */
    const shiftSummary: ShiftSummaryItem[] = shifts.map((s: any) => ({
      shiftId: s.id,
      shiftNumber: s.shift_number,
      branchName: branchMap.get(s.branch_id) || s.branch_id,
      openedAt: s.opened_at,
      closedAt: s.closed_at,
      openedByName: s.opened_by_profile?.name ?? null,
      closedByName: s.closed_by_profile?.name ?? null,
      openingCash: Number(s.opening_cash || 0),
      expectedClosingCash: s.expected_closing_cash != null ? Number(s.expected_closing_cash) : null,
      countedClosingCash: s.counted_closing_cash != null ? Number(s.counted_closing_cash) : null,
      cashDifference: s.cash_difference != null ? Number(s.cash_difference) : null,
      status: s.shift_status,
    }));

    /* ── 9. Recent movements (top 20) ── */
    const enrichedRecent = movements.slice(0, 20).map((m: any) => {
      const refType = m.reference_type;
      const refId = m.reference_id;
      let refLabel = "-";
      if (refType === "BALANCE_ADJUSTMENT" || m.movement_type === "BALANCE_ADJUSTMENT") refLabel = "Penyesuaian Saldo";
      else if (refType === "OPENING_BALANCE" || m.movement_type === "OPENING_BALANCE") refLabel = "Saldo Awal";
      else if (refType && refId) refLabel = `${refType}:${refId.slice(0, 8)}`;

      return {
        id: m.id,
        accountName: m.payment_accounts?.account_name ?? "-",
        direction: m.direction as "IN" | "OUT",
        amount: Number(m.amount || 0),
        movementType: mapMovementType(m.movement_type),
        description: m.description ?? null,
        referenceLabel: refLabel,
        createdAt: m.created_at,
      };
    });

    return successResult({
      summary,
      revenueBreakdown,
      paymentMethodBreakdown,
      accountBalances,
      branchPerformance,
      shiftSummary,
      recentMovements: enrichedRecent,
      dateFrom: dateFromStr,
      dateTo: dateToStr,
    });
  } catch (err: any) {
    console.error("[FinanceReport] getFinanceReportAction:", err.message);
    return errorResult(err.message || "Gagal memuat laporan keuangan.");
  }
}

/* ── Export CSV ── */

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportFinanceReportCSVAction(
  brandSlug: string,
  input: FinanceReportInput,
): Promise<ActionResult<{ csv: string; filename: string }>> {
  try {
    const report = await getFinanceReportAction(brandSlug, input);
    if (!report.success) return report;

    const data = report.data;
    const lines: string[] = [];

    /* Sheet 1: Ringkasan */
    lines.push("=== LAPORAN KEUANGAN ===");
    lines.push(`Periode: ${data.dateFrom} - ${data.dateTo}`);
    lines.push("");
    lines.push("Ringkasan");
    lines.push("Metrik,Nilai");
    lines.push(`Total Pendapatan,${escapeCsv(fmtCurrency(data.summary.totalRevenue))}`);
    lines.push(`Pendapatan Servis,${escapeCsv(fmtCurrency(data.summary.serviceRevenue))} (${data.summary.serviceRevenueCount} transaksi)`);
    lines.push(`Pendapatan POS,${escapeCsv(fmtCurrency(data.summary.posRevenue))} (${data.summary.posRevenueCount} transaksi)`);
    lines.push(`Pendapatan Lain,${escapeCsv(fmtCurrency(data.summary.otherIncome))}`);
    lines.push(`Total Pengeluaran,${escapeCsv(fmtCurrency(data.summary.totalExpense))}`);
    lines.push(`Potongan MDR,${escapeCsv(fmtCurrency(data.summary.totalMdr))}`);
    lines.push(`Net Cashflow,${escapeCsv(fmtCurrency(data.summary.netCashflow))}`);
    lines.push(`Laba Bersih (Estimasi),${escapeCsv(fmtCurrency(data.summary.estimatedNetProfit))}`);
    lines.push(`Servis Belum Lunas,${data.summary.unpaidServiceCount}`);
    lines.push(`Piutang Servis,${escapeCsv(fmtCurrency(data.summary.totalReceivable))}`);
    lines.push("");

    /* Sheet 2: Pendapatan per sumber */
    lines.push("Pendapatan per Sumber");
    lines.push("Sumber,Jumlah,Persentase");
    for (const rb of data.revenueBreakdown) {
      lines.push(`${escapeCsv(rb.source)},${escapeCsv(fmtCurrency(rb.amount))},${rb.percentage.toFixed(1)}%`);
    }
    lines.push("");

    /* Sheet 3: Payment method breakdown */
    lines.push("Pendapatan per Metode Pembayaran");
    lines.push("Metode,Bruto,MDR,Netto,Transaksi");
    for (const pm of data.paymentMethodBreakdown) {
      lines.push(`${escapeCsv(pm.methodName)},${escapeCsv(fmtCurrency(pm.grossAmount))},${escapeCsv(fmtCurrency(pm.mdrAmount))},${escapeCsv(fmtCurrency(pm.netAmount))},${pm.transactionCount}`);
    }
    lines.push("");

    /* Sheet 4: Account balances */
    lines.push("Saldo Akun");
    lines.push("Akun,Tipe,Saldo,Masuk,Keluar");
    for (const acct of data.accountBalances) {
      lines.push(`${escapeCsv(acct.accountName)},${acct.accountType},${escapeCsv(fmtCurrency(acct.balance))},${escapeCsv(fmtCurrency(acct.totalIn))},${escapeCsv(fmtCurrency(acct.totalOut))}`);
    }
    lines.push("");

    /* Sheet 5: Branch performance */
    lines.push("Performa Cabang");
    lines.push("Cabang,Servis,POS,Lain,Biaya,Net,Piutang");
    for (const bp of data.branchPerformance) {
      lines.push(`${escapeCsv(bp.branchName)},${escapeCsv(fmtCurrency(bp.serviceRevenue))},${escapeCsv(fmtCurrency(bp.posRevenue))},${escapeCsv(fmtCurrency(bp.otherIncome))},${escapeCsv(fmtCurrency(bp.expense))},${escapeCsv(fmtCurrency(bp.net))},${bp.unpaidServiceCount}`);
    }
    lines.push("");

    /* Sheet 6: Shifts */
    lines.push("Laporan Shift");
    lines.push("Shift,Cabang,Buka,Tutup,Dibuka Oleh,Kas Awal,Kas Akhir (Harapan),Kas Akhir (Riil),Selisih,Status");
    for (const sh of data.shiftSummary) {
      lines.push([
        escapeCsv(sh.shiftNumber),
        escapeCsv(sh.branchName),
        escapeCsv(sh.openedAt),
        escapeCsv(sh.closedAt || ""),
        escapeCsv(sh.openedByName || ""),
        escapeCsv(fmtCurrency(sh.openingCash)),
        escapeCsv(sh.expectedClosingCash != null ? fmtCurrency(sh.expectedClosingCash) : "-"),
        escapeCsv(sh.countedClosingCash != null ? fmtCurrency(sh.countedClosingCash) : "-"),
        escapeCsv(sh.cashDifference != null ? fmtCurrency(sh.cashDifference) : "-"),
        escapeCsv(sh.status),
      ].join(","));
    }
    lines.push("");

    /* Sheet 7: Service receivables info */
    lines.push("Piutang Servis");
    lines.push(`Total servis belum lunas: ${data.summary.unpaidServiceCount}`);
    lines.push(`Total piutang: ${fmtCurrency(data.summary.totalReceivable)}`);

    const filename = `finance-report-${brandSlug}-${data.dateFrom}-${data.dateTo}.csv`;

    return successResult({ csv: lines.join("\n"), filename });
  } catch (err: any) {
    console.error("[FinanceReport] export:", err.message);
    return errorResult(err.message || "Gagal mengexport laporan.");
  }
}
