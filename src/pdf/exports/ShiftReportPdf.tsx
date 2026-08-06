import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { theme } from "@/lib/pdfx-theme";
import { PdfDocument } from "../components/PdfDocument";
import { PdfHeader } from "../components/PdfHeader";
import { PdfFooter } from "../components/PdfFooter";
import { PdfSection } from "../components/PdfSection";
import { PdfDataTable } from "../components/PdfDataTable";
import { PdfSummaryBox } from "../components/PdfSummaryBox";
import { PdfStatCard } from "../components/PdfStatCard";
import { Divider } from "@/components/pdfx/divider/pdfx-divider";
import {
  formatRupiah,
  formatDate,
  formatDateTime,
  formatDuration,
  formatPaymentMethodLabel,
  formatReconciliationStatus,
} from "../helpers/format";

interface TransactionItem {
  id: string;
  movementType: string;
  direction: string;
  referenceId?: string | null;
  description: string;
  amount: number;
  accountName?: string | null;
  createdAt: string;
}

interface PaymentBreakdownItem {
  methodType: string;
  methodName: string;
  count: number;
  total: number;
}

interface ShiftReportData {
  shiftNumber: string;
  status: string;
  branchName?: string | null;
  openedAt: string;
  closedAt: string | null;
  openedByName: string | null;
  closedByName: string | null;
  openingCash: number;
  expectedClosingCash: number | null;
  countedClosingCash: number | null;
  cashDifference: number | null;
  report?: {
    expectedCash: number | null;
    cashInTotal: number;
    cashOutTotal: number;
    cashSales: number;
    serviceCashPayments: number;
    refunds: number;
    paymentBreakdown: PaymentBreakdownItem[];
    transactions: TransactionItem[];
  } | null;
}

const styles = StyleSheet.create({
  ringkasanRow: {
    flexDirection: "row",
    gap: 8,
  },
  ringkasanCol: {
    flex: 1,
    padding: 10,
    backgroundColor: theme.colors.muted,
    borderRadius: 4,
  },
  ringkasanLabel: {
    fontSize: theme.primitives.typography.xs,
    color: theme.colors.mutedForeground,
    marginBottom: 3,
  },
  ringkasanValue: {
    fontSize: theme.primitives.typography.sm,
    color: theme.colors.foreground,
  },
  noteText: {
    fontSize: theme.primitives.typography.xs,
    color: theme.colors.mutedForeground,
    fontStyle: "italic",
  },
  badge: {
    padding: "2 6",
    borderRadius: 2,
    fontSize: theme.primitives.typography.xs,
    fontWeight: 700,
  },
});

function StatusBadge({ status, diff }: { status: string; diff?: number }) {
  if (status === "OPEN") {
    return (
      <View style={[styles.badge, { backgroundColor: "#f0f9ff" }]}>
        <Text style={{ color: "#0369a1" }}>Aktif</Text>
      </View>
    );
  }

  const statusLabel = status === "CLOSED" ? "Ditutup" : status;
  const rec = diff !== undefined ? formatReconciliationStatus(diff) : null;

  return (
    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
      <View style={[styles.badge, { backgroundColor: status === "CLOSED" ? "#f0fdf4" : "#f8f9fb" }]}>
        <Text style={{ color: status === "CLOSED" ? "#16a34a" : theme.colors.foreground }}>
          {statusLabel}
        </Text>
      </View>
      {rec && (
        <View style={[styles.badge, { backgroundColor: `${rec.color}15` }]}>
          <Text style={{ color: rec.color }}>{rec.label}</Text>
        </View>
      )}
    </View>
  );
}

export function ShiftReportPdf({ data }: { data: ShiftReportData }) {
  const { shiftNumber, status, branchName, openedAt, closedAt, openedByName, closedByName } = data;
  const { openingCash, expectedClosingCash, countedClosingCash, cashDifference, report } = data;
  const reportData = report ?? null;

  const transactions = reportData?.transactions ?? [];
  const paymentBreakdown = reportData?.paymentBreakdown ?? [];
  const expectedCash = reportData?.expectedCash ?? expectedClosingCash ?? 0;
  const countedCash = countedClosingCash ?? expectedCash;
  const diff = cashDifference ?? countedCash - expectedCash;

  const cashInTransactions = transactions.filter((t) => t.direction === "IN");
  const cashOutTransactions = transactions.filter((t) => t.direction === "OUT" || t.movementType === "CASH_OUT");
  const serviceTransactions = transactions.filter(
    (t) => t.movementType === "SERVICE_PAYMENT" || t.movementType === "SERVICE",
  );
  const posIncomeTransactions = transactions.filter(
    (t) => t.movementType === "POS_PAYMENT" || t.movementType === "POS" || t.movementType === "OTHER_INCOME",
  );
  const cashMethodTotal = paymentBreakdown
    .filter((item) => item.methodType === "CASH")
    .reduce((total, item) => total + item.total, 0);
  const nonCashMethodTotal = paymentBreakdown
    .filter((item) => item.methodType !== "CASH")
    .reduce((total, item) => total + item.total, 0);
  const inTotal = cashInTransactions.reduce((s, t) => s + t.amount, 0);
  const outTotal = cashOutTransactions.reduce((s, t) => s + t.amount, 0);

  const statusLabel = status === "OPEN" ? "Aktif" : status === "CLOSED" ? "Ditutup" : status;
  const headerDate = formatDate(closedAt ?? openedAt);

  return (
    <PdfDocument title={`Laporan Shift - ${shiftNumber}`}>
      <PdfHeader
        title={`Laporan Shift${branchName ? ` - ${branchName}` : ""}`}
        subtitle="Laporan operasional shift berdasarkan transaksi yang tercatat di Seervis."
        brandName={branchName ?? undefined}
        generatedBy={openedByName ?? undefined}
        generatedAt={headerDate}
        rightText={shiftNumber}
        rightSubText={statusLabel}
      />

      <PdfSection title="Ringkasan Shift">
        <View style={styles.ringkasanRow}>
          <View style={styles.ringkasanCol}>
            <Text style={styles.ringkasanLabel}>Waktu Shift</Text>
            <Text style={styles.ringkasanValue}>Dibuka: {formatDateTime(openedAt)}</Text>
            <Text style={styles.ringkasanValue}>Ditutup: {formatDateTime(closedAt)}</Text>
            <Text style={styles.ringkasanValue}>Durasi: {formatDuration(openedAt, closedAt)}</Text>
          </View>
          <View style={styles.ringkasanCol}>
            <Text style={styles.ringkasanLabel}>Cabang & Staf</Text>
            <Text style={styles.ringkasanValue}>Cabang: {branchName || "-"}</Text>
            <Text style={styles.ringkasanValue}>Dibuka oleh: {openedByName || "-"}</Text>
            <Text style={styles.ringkasanValue}>Ditutup oleh: {closedByName || "-"}</Text>
          </View>
          <View style={styles.ringkasanCol}>
            <Text style={styles.ringkasanLabel}>Status</Text>
            <StatusBadge status={status} diff={diff} />
            <Text style={[styles.ringkasanValue, { marginTop: 4 }]}>
              Kas Awal: {formatRupiah(openingCash)}
            </Text>
          </View>
        </View>
      </PdfSection>

      <PdfSection title="Rekonsiliasi Kas">
        <PdfDataTable
          columns={[
            { key: "desc", header: "Keterangan", width: "55%" },
            { key: "value", header: "Jumlah", width: "45%", align: "right" },
          ]}
          data={[
            { desc: "Saldo Awal", value: formatRupiah(openingCash) },
            { desc: "Kas Masuk", value: formatRupiah(cashMethodTotal) },
            { desc: "Kas Akhir yang Diharapkan", value: formatRupiah(expectedCash) },
            { desc: "Kas Aktual", value: formatRupiah(countedCash) },
            {
              desc: "Status Rekonsiliasi",
              value: `${formatReconciliationStatus(diff).label} (${formatRupiah(diff)})`,
            },
          ]}
          variant="striped"
        />
      </PdfSection>

      <PdfSection title="Ringkasan Arus Kas">
        <PdfSummaryBox
          items={[
            { label: "Total Kas Masuk", value: formatRupiah(inTotal) },
            { label: "Total Kas Keluar", value: formatRupiah(outTotal) },
            { label: "Pendapatan Tunai", value: formatRupiah(cashMethodTotal) },
            { label: "Pendapatan Non-Tunai", value: formatRupiah(nonCashMethodTotal) },
          ]}
        />
      </PdfSection>

      <PdfSection title="Pembayaran Servis">
        {serviceTransactions.length === 0 ? (
          <Text style={styles.noteText}>Tidak ada transaksi servis pada shift ini.</Text>
        ) : (
          <>
            <PdfStatCard label="Total Pendapatan Servis" value={formatRupiah(serviceTransactions.reduce((s, t) => s + t.amount, 0))} />
            <View style={{ height: 8 }} />
            <PdfDataTable
              columns={[
                { key: "date", header: "Tanggal", width: "13%" },
                { key: "ref", header: "No. Pembayaran", width: "18%" },
                { key: "desc", header: "Keterangan", width: "31%" },
                { key: "method", header: "Metode", width: "23%" },
                { key: "amount", header: "Jumlah", width: "15%", align: "right" },
              ]}
              data={serviceTransactions.map((t) => ({
                date: formatDate(t.createdAt, "short"),
                ref: t.referenceId || "-",
                desc: t.description.replace(/^Payment\s+/i, "Pembayaran ").replace(/ for service$/i, ""),
                method: t.accountName || "-",
                amount: formatRupiah(t.amount),
              }))}
              variant="striped"
            />
          </>
        )}
      </PdfSection>

      <PdfSection title="POS & Pendapatan Lainnya">
        {posIncomeTransactions.length === 0 ? (
          <Text style={styles.noteText}>Tidak ada transaksi POS / pendapatan lain pada shift ini.</Text>
        ) : (
          <>
            <PdfStatCard label="Total Pendapatan POS" value={formatRupiah(posIncomeTransactions.reduce((s, t) => s + t.amount, 0))} />
            <View style={{ height: 8 }} />
            <PdfDataTable
              columns={[
                { key: "date", header: "Tanggal", width: "16%" },
                { key: "desc", header: "Keterangan", width: "42%" },
                { key: "account", header: "Akun", width: "27%" },
                { key: "amount", header: "Jumlah", width: "15%", align: "right" },
              ]}
              data={posIncomeTransactions.map((t) => ({
                date: formatDate(t.createdAt, "short"),
                desc: t.description || "-",
                account: t.accountName || "-",
                amount: formatRupiah(t.amount),
              }))}
              variant="striped"
            />
          </>
        )}
      </PdfSection>

      <PdfSection title="Detail Kas Keluar">
        {cashOutTransactions.length === 0 ? (
          <Text style={styles.noteText}>Tidak ada transaksi kas keluar pada shift ini.</Text>
        ) : (
          <>
            <PdfStatCard label="Total Kas Keluar" value={formatRupiah(outTotal)} />
            <View style={{ height: 8 }} />
            <PdfDataTable
              columns={[
                { key: "date", header: "Tanggal", width: "16%" },
                { key: "category", header: "Kategori", width: "17%" },
                { key: "desc", header: "Keterangan", width: "28%" },
                { key: "account", header: "Akun", width: "17%" },
                { key: "amount", header: "Jumlah", width: "22%", align: "right" },
              ]}
              data={cashOutTransactions.map((t) => ({
                date: formatDate(t.createdAt, "short"),
                category: t.movementType || "-",
                desc: t.description || "-",
                account: t.accountName || "-",
                amount: formatRupiah(t.amount),
              }))}
              variant="striped"
            />
          </>
        )}
      </PdfSection>

      <PdfSection title="Pendapatan per Metode Pembayaran">
        {paymentBreakdown.length === 0 ? (
          <Text style={styles.noteText}>Tidak ada data metode pembayaran pada shift ini.</Text>
        ) : (
          <PdfDataTable
            columns={[
              { key: "method", header: "Metode Pembayaran", width: "40%" },
              { key: "count", header: "Transaksi", width: "30%", align: "right" },
              { key: "total", header: "Total Pendapatan", width: "30%", align: "right" },
            ]}
            data={paymentBreakdown.map((p) => ({
              method: formatPaymentMethodLabel(p.methodType, p.methodName),
              count: `${p.count} transaksi`,
              total: formatRupiah(p.total),
            }))}
            variant="striped"
          />
        )}
      </PdfSection>

      <Divider spacing="md" />

      <Text style={styles.noteText}>
        Dokumen ini dibuat otomatis dari data shift, pergerakan akun pembayaran, servis, POS, dan
        catatan kas keluar dalam periode shift.
      </Text>

      <PdfFooter
        leftText="Dibuat oleh Seervisio"
        showPageNumber
        showTimestamp
      />
    </PdfDocument>
  );
}
