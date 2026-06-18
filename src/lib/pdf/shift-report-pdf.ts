"use client";

import type { TransactionItem, PaymentBreakdownItem } from "@/server/actions/store-shift.actions";

/* ── Formatters ── */

export function formatRupiah(value: number | null | undefined): string {
  if (value == null) return "Rp 0";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function formatPaymentMethodLabel(methodType: string, methodName: string): string {
  const overrides: Record<string, string> = {
    CASH: "Tunai",
    TRANSFER: "Transfer",
    QRIS: "QRIS",
    DEBIT: "Debit",
    CREDIT: "Kredit",
    E_WALLET: "E-Wallet",
    OTHER: "Lainnya",
  };
  return overrides[methodType] || methodName || methodType;
}

export function formatReconciliationStatus(diff: number): {
  label: string;
  bg: [number, number, number];
  fg: [number, number, number];
} {
  if (diff === 0) return { label: "Sesuai", bg: [0.925, 0.992, 0.961], fg: [0.016, 0.471, 0.341] };
  if (diff > 0) return { label: "Lebih", bg: [0.953, 0.957, 0.965], fg: [0.9, 0.5, 0.04] };
  return { label: "Kurang", bg: [0.953, 0.957, 0.965], fg: [0.863, 0.149, 0.149] };
}

export function sanitizePdfText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  /* If no whitespace (UUID, long code), do character-level break */
  if (!/\s/.test(text)) {
    const lines: string[] = [];
    for (let i = 0; i < text.length; i += maxChars) {
      lines.push(text.slice(i, i + maxChars));
    }
    return lines;
  }

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function truncateText(text: string, maxWidth: number, fontSize: number): string {
  if (getTextWidth(text, fontSize) <= maxWidth) return text;
  let t = text;
  while (getTextWidth(t + "...", fontSize) > maxWidth && t.length > 0) {
    t = t.slice(0, -1);
  }
  return t + "...";
}

function fmtShiftDuration(openedAt: string | null | undefined, closedAt: string | null | undefined): string {
  if (!openedAt) return "-";
  const start = new Date(openedAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "-";
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days > 0 ? `${days} hari` : "",
    hours > 0 ? `${hours} jam` : "",
    `${minutes} menit`,
  ].filter(Boolean);
  return parts.join(" ");
}

function generatePdfDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ── Input type ── */

export interface ShiftDetailPdfInput {
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
    paymentBreakdown: PaymentBreakdownItem[];
    transactions: TransactionItem[];
  } | null;
}

/* ── PDF Builder ── */

const PW = 595;
const PH = 842;
const MX = 48;
const MT = 48;
const MB = 56;
const CW = PW - MX * 2;
const SECTION_GAP = 26;

function getTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.5;
}

type Rgb = [number, number, number];

const COLORS = {
  dark: [0.067, 0.094, 0.153] as Rgb,      // #111827
  body: [0.15, 0.13, 0.1] as Rgb,
  gray: [0.42, 0.447, 0.502] as Rgb,        // #6B7280
  lightGray: [0.58, 0.55, 0.48] as Rgb,
  subtle: [0.68, 0.65, 0.58] as Rgb,
  border: [0.898, 0.906, 0.922] as Rgb,     // #E5E7EB
  headerBg: [0.976, 0.98, 0.984] as Rgb,    // #F9FAFB
  white: [1, 1, 1] as Rgb,
  emptyBg: [0.98, 0.98, 0.98] as Rgb,      // #FAFAFA
  green: [0.016, 0.471, 0.341] as Rgb,      // #047857
  blue: [0.02, 0.38, 0.68] as Rgb,
  orange: [0.9, 0.5, 0.04] as Rgb,
  red: [0.863, 0.149, 0.149] as Rgb,        // #DC2626
  badgeBg: [0.953, 0.957, 0.965] as Rgb,    // #F3F4F6
  successBg: [0.925, 0.992, 0.961] as Rgb,  // #ECFDF5
};

export function buildShiftReportPdf(input: ShiftDetailPdfInput): string {
  const { shiftNumber, status, branchName, openedAt, closedAt, openedByName, closedByName } = input;
  const { openingCash, expectedClosingCash, countedClosingCash, cashDifference, report } = input;
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

  /* ── Builder state ── */
  const pages: string[] = [];
  let ops: string[] = [];
  let y = PH - MT;
  let pageIndex = 0;

  function ensureSpace(needed: number) {
    if (y - needed >= MB) return;
    pages.push(ops.join("\n"));
    ops = [];
    y = PH - MT;
    pageIndex++;
  }

  /* ── Low-level drawing ── */

  function textOp(
    txt: string,
    font: "F1" | "F2",
    size: number,
    color: Rgb,
    x: number,
    yy: number,
  ) {
    ops.push("BT");
    ops.push(`/${font} ${size} Tf`);
    ops.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    ops.push(`${x} ${yy} Td`);
    ops.push(`(${sanitizePdfText(txt)}) Tj`);
    ops.push("ET");
  }

  function drawText(
    txt: string,
    size: number,
    bold: boolean,
    color: Rgb,
    x: number,
    yy: number,
  ) {
    textOp(txt, bold ? "F2" : "F1", size, color, x, yy);
  }

  function fillRect(x: number, yy: number, w: number, h: number, color: Rgb) {
    ops.push("q");
    ops.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    ops.push(`${x} ${yy} ${w} ${h} re f`);
    ops.push("Q");
  }

  function strokeRect(x: number, yy: number, w: number, h: number, color: Rgb, lw = 0.5) {
    ops.push("q");
    ops.push(`${color[0]} ${color[1]} ${color[2]} RG`);
    ops.push(`${lw} w`);
    ops.push(`${x} ${yy} ${w} ${h} re S`);
    ops.push("Q");
  }

  function fillStrokeRect(x: number, yy: number, w: number, h: number, fill: Rgb, stroke: Rgb, lw = 0.5) {
    ops.push("q");
    ops.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);
    ops.push(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG`);
    ops.push(`${lw} w`);
    ops.push(`${x} ${yy} ${w} ${h} re B`);
    ops.push("Q");
  }

  function rule(yy: number, color: Rgb = COLORS.border, lw = 0.5) {
    ops.push("q");
    ops.push(`${color[0]} ${color[1]} ${color[2]} RG`);
    ops.push(`${lw} w`);
    ops.push(`${MX} ${yy} m ${PW - MX} ${yy} l S`);
    ops.push("Q");
  }

  /* ── High-level layout ── */

  function spacer(px: number) {
    ensureSpace(px);
    y -= px;
  }

  function wrappedText(
    txt: string,
    size: number,
    bold: boolean,
    color: Rgb,
    indent = 0,
    maxWidth = CW,
  ): number {
    const maxChars = Math.max(20, Math.floor((maxWidth - indent) / (size * 0.48)));
    const lines = wrapText(txt, maxChars);
    const lineH = Math.max(13, size + 3);
    const totalH = lines.length * lineH;
    ensureSpace(totalH);
    for (const line of lines) {
      drawText(line, size, bold, color, MX + indent, y);
      y -= lineH;
    }
    return totalH;
  }

  function sectionTitle(title: string, keepWithNext = 60) {
    if (keepWithNext > 0) ensureSpace(keepWithNext);
    spacer(10);
    textOp(title, "F2", 14, COLORS.dark, MX, y);
    y -= 22;
    /* faint rule under section title */
    rule(y + 4, COLORS.border, 0.4);
    y -= 6;
  }

  /* ── Ringkasan Shift — 3-column card ── */
  function drawRingkasanShift(
    branchName: string | null | undefined,
    shiftNumber: string,
    openedAt: string,
    closedAt: string | null,
    openedByName: string | null,
    closedByName: string | null,
    statusLabel: string,
    cashDiff: number,
  ) {
    const colW = CW / 3;
    const pad = 10;
    const sectionH = 16;
    const rowH = 16;
    const nRows = 3;
    const totalH = pad * 2 + sectionH + nRows * rowH + 6;
    ensureSpace(totalH + 4);

    const cy = y - totalH;
    fillStrokeRect(MX, cy, CW, totalH, COLORS.white, COLORS.border, 0.5);

    const cellBottom = (ri: number) => cy + pad + ri * rowH;

    /* Column 1 — Waktu Shift */
    const c1x = MX + pad;
    const c1labelW = getTextWidth("Ditutup: ", 8);
    textOp("Waktu Shift", "F2", 9, COLORS.gray, c1x, y - pad - 4);
    textOp("Dibuka:", "F1", 8, COLORS.gray, c1x, cellBottom(0) + 11);
    textOp(formatDateTime(openedAt), "F1", 8, COLORS.body, c1x + c1labelW, cellBottom(0) + 11);
    textOp("Ditutup:", "F1", 8, COLORS.gray, c1x, cellBottom(1) + 11);
    textOp(formatDateTime(closedAt), "F1", 8, COLORS.body, c1x + c1labelW, cellBottom(1) + 11);
    textOp("Durasi:", "F1", 8, COLORS.gray, c1x, cellBottom(2) + 11);
    textOp(fmtShiftDuration(openedAt, closedAt), "F1", 8, COLORS.body, c1x + c1labelW, cellBottom(2) + 11);

    /* Column 2 — Cabang & Petugas */
    const c2x = MX + colW + pad;
    const c2labelW = getTextWidth("Ditutup Oleh: ", 8);
    textOp("Cabang & Petugas", "F2", 9, COLORS.gray, c2x, y - pad - 4);
    textOp("Cabang:", "F1", 8, COLORS.gray, c2x, cellBottom(0) + 11);
    textOp(branchName || "-", "F1", 8, COLORS.body, c2x + c2labelW, cellBottom(0) + 11);
    textOp("Dibuka Oleh:", "F1", 8, COLORS.gray, c2x, cellBottom(1) + 11);
    textOp(openedByName || "-", "F1", 8, COLORS.body, c2x + c2labelW, cellBottom(1) + 11);
    textOp("Ditutup Oleh:", "F1", 8, COLORS.gray, c2x, cellBottom(2) + 11);
    textOp(closedByName || "-", "F1", 8, COLORS.body, c2x + c2labelW, cellBottom(2) + 11);

    /* Column 3 — Status (row-based label-value layout) */
    const c3x = MX + colW * 2 + pad;
    const c3labelW = getTextWidth("Rekonsiliasi: ", 8);

    textOp("Status", "F2", 9, COLORS.gray, c3x, y - pad - 4);

    /* Row 0 - Nomor Shift */
    textOp("Nomor Shift:", "F1", 8, COLORS.gray, c3x, cellBottom(0) + 11);
    const shiftAvail = colW - pad * 2 - c3labelW;
    const shiftDisplay = getTextWidth(shiftNumber, 8) > shiftAvail
      ? truncateText(shiftNumber, shiftAvail, 8)
      : shiftNumber;
    textOp(shiftDisplay, "F1", 8, COLORS.body, c3x + c3labelW, cellBottom(0) + 11);

    /* Row 1 - Status with badge */
    textOp("Status:", "F1", 8, COLORS.gray, c3x, cellBottom(1) + 11);
    const sbw = Math.max(statusLabel.length * 5 + 12, 28);
    const sbh = 14;
    const sbx = c3x + c3labelW;
    const sfg: Rgb = statusLabel === "Ditutup" ? COLORS.green
      : statusLabel === "Aktif" ? COLORS.blue
      : COLORS.body;
    /* Soft badge background */
    fillRect(sbx, cellBottom(1), sbw, sbh, COLORS.badgeBg);
    strokeRect(sbx, cellBottom(1), sbw, sbh, COLORS.border, 0.3);
    textOp(statusLabel, "F2", 8, sfg, sbx + (sbw - getTextWidth(statusLabel, 8)) / 2, cellBottom(1) + 4);

    /* Row 2 - Rekonsiliasi with badge */
    const rec = formatReconciliationStatus(cashDiff);
    textOp("Rekonsiliasi:", "F1", 8, COLORS.gray, c3x, cellBottom(2) + 11);
    const rbw = Math.max(rec.label.length * 5 + 12, 28);
    const rbh = 14;
    const rbx = c3x + c3labelW;
    fillRect(rbx, cellBottom(2), rbw, rbh, rec.bg);
    strokeRect(rbx, cellBottom(2), rbw, rbh, COLORS.border, 0.3);
    textOp(rec.label, "F2", 8, rec.fg, rbx + (rbw - getTextWidth(rec.label, 8)) / 2, cellBottom(2) + 4);

    y -= totalH + 8;
  }

  /* ── KPI Card ── */
  function kpiCard(label: string, value: string, x: number, w: number) {
    const h = 42;
    const yy = y - h;
    fillStrokeRect(x, yy, w, h, COLORS.white, COLORS.border, 0.5);
    textOp(label, "F1", 7.5, COLORS.gray, x + 12, yy + 26);
    const vw = getTextWidth(value, 12);
    textOp(value, "F2", 12, COLORS.dark, x + w - vw - 12, yy + 7);
  }

  function kpiRow(cards: { label: string; value: string }[]) {
    const gap = 5;
    const n = cards.length;
    const cardW = (CW - gap * (n - 1)) / n;
    ensureSpace(46);
    for (let i = 0; i < n; i++) {
      kpiCard(cards[i].label, cards[i].value, MX + i * (cardW + gap), cardW);
    }
    y -= 46;
    spacer(6);
  }

  /* ── Table ── */
  interface TCol {
    header: string;
    width: number;
    align: "left" | "right";
  }

  function drawTable(
    cols: TCol[],
    rows: string[][],
    highlightRows?: number[],
  ) {
    const baseRowH = 22;
    const lineStep = 10;
    const positions = cols.map((c) => {
      const cw = CW * c.width;
      return { cw, align: c.align };
    });

    /* Estimate total height with variable row sizes */
    const rowHeights: number[] = [];
    let totalH = baseRowH; /* header */
    for (let r = 0; r < rows.length; r++) {
      let maxLines = 1;
      for (let c = 0; c < cols.length; c++) {
        const cell = rows[r][c] ?? "";
        const pos = positions[c];
        const availW = pos.cw - 14;
        if (getTextWidth(cell, 8) > availW) {
          const maxChars = Math.max(10, Math.floor(availW / (8 * 0.5)));
          const nLines = Math.ceil(cell.length / maxChars);
          maxLines = Math.max(maxLines, Math.min(nLines, 3));
        }
      }
      const rh = baseRowH + (maxLines - 1) * lineStep;
      rowHeights[r] = rh;
      totalH += rh;
    }
    totalH += 8;
    ensureSpace(totalH);

    /* Header bg */
    fillRect(MX, y - baseRowH, CW, baseRowH, COLORS.headerBg);
    strokeRect(MX, y - baseRowH, CW, baseRowH, COLORS.border, 0.4);

    let hx = MX;
    for (let c = 0; c < cols.length; c++) {
      const pos = positions[c];
      const tx = pos.align === "right" ? hx + pos.cw - 7 : hx + 7;
      textOp(cols[c].header, "F2", 8, COLORS.body, tx, y - baseRowH + 5);
      hx += pos.cw;
    }
    y -= baseRowH;

    for (let r = 0; r < rows.length; r++) {
      const actualRowH = rowHeights[r];
      ensureSpace(actualRowH + 2);

      if (highlightRows?.includes(r)) {
        fillRect(MX, y - actualRowH, CW, actualRowH, COLORS.headerBg);
      }

      /* Row border */
      ops.push("q");
      ops.push(`${COLORS.border[0]} ${COLORS.border[1]} ${COLORS.border[2]} RG`);
      ops.push("0.3 w");
      ops.push(`${MX} ${y} m ${PW - MX} ${y} l S`);
      ops.push("Q");

      /* Cells */
      let rx = MX;
      for (let c = 0; c < cols.length; c++) {
        let cell = rows[r][c] ?? "";
        const pos = positions[c];
        const availW = pos.cw - 14;
        const isHighlighted = highlightRows?.includes(r);
        const color = isHighlighted && c === cols.length - 1 ? COLORS.blue : COLORS.body;

        if (pos.align === "right") {
          /* Numeric — keep single line, truncate if needed */
          if (getTextWidth(cell, 8) > availW) {
            cell = truncateText(cell, availW, 8);
          }
          textOp(cell, "F1", 8, color, rx + pos.cw - getTextWidth(cell, 8) - 7, y - actualRowH + 5);
        } else {
          /* Left-aligned — wrap to multi-line if needed */
          const maxChars = Math.max(10, Math.floor(availW / (8 * 0.5)));
          const lines = cell.length > maxChars ? wrapText(cell, maxChars).slice(0, 3) : [cell];
          for (let li = 0; li < lines.length; li++) {
            const line = lines[li];
            const lx = rx + 7;
            if (getTextWidth(line, 8) > availW) {
              textOp(truncateText(line, availW, 8), "F1", 8, color, lx, y - actualRowH + 5 + li * lineStep);
            } else {
              textOp(line, "F1", 8, color, lx, y - actualRowH + 5 + li * lineStep);
            }
          }
        }
        rx += pos.cw;
      }
      y -= actualRowH;
    }
    y -= 6;
  }

  /* ── Empty state ── */
  function emptyBox(msg: string) {
    const boxH = 44;
    ensureSpace(boxH + 6);
    const by = y - boxH;
    fillStrokeRect(MX, by, CW, boxH, COLORS.emptyBg, COLORS.border);
    const tw = getTextWidth(msg, 8);
    textOp(msg, "F1", 8, COLORS.gray, MX + (CW - tw) / 2, by + 18);
    y -= boxH + 8;
  }

  /* ══════════════════════════════════════════════════
     BUILD CONTENT
     ══════════════════════════════════════════════════ */

  /* ── HEADER ── */

  /* Right: date */
  const headerDate = formatDateShort(closedAt ?? openedAt);
  const dateW = getTextWidth(headerDate, 12);
  textOp(headerDate, "F1", 12, COLORS.gray, PW - MX - dateW, y);

  /* Left: title + branch */
  const headerBranch = branchName ? ` - ${branchName}` : "";
  textOp(`Ringkasan Shift${headerBranch}`, "F2", 22, COLORS.dark, MX, y);
  y -= 28;

  /* Subtitle */
  textOp("Laporan operasional shift berdasarkan transaksi yang tercatat di Seervis.", "F1", 10, COLORS.gray, MX, y);
  y -= 18;

  /* Divider */
  rule(y - 4);
  y -= 16;
  spacer(SECTION_GAP);

  /* ── RINGKASAN SHIFT ── */
  sectionTitle("Ringkasan Shift");

  const statusLabel = status === "OPEN" ? "Aktif" : status === "CLOSED" ? "Ditutup" : status;
  drawRingkasanShift(branchName, shiftNumber, openedAt, closedAt, openedByName, closedByName, statusLabel, diff);

  /* ── REKONSILIASI KAS TUNAI ── */
  spacer(6);
  {
    sectionTitle("Rekonsiliasi Kas Tunai");

    const recStatus = formatReconciliationStatus(diff);

    drawTable(
      [
        { header: "Keterangan", width: 0.55, align: "left" },
        { header: "Nilai", width: 0.45, align: "right" },
      ],
      [
        ["Saldo Awal", formatRupiah(openingCash)],
        ["Kas Tunai Masuk", formatRupiah(cashMethodTotal)],
        ["Expected Closing Cash", formatRupiah(expectedCash)],
        ["Kas Aktual", formatRupiah(countedCash)],
        ["Status Rekonsiliasi", `${recStatus.label} (${formatRupiah(diff)})`],
      ],
      [2, 3, 4],
    );
    spacer(8);
  }

  /* ── LAPORAN KEUANGAN / CASHFLOW ── */
  sectionTitle("Laporan Keuangan / Cashflow");
  kpiRow([
    { label: "Total Transaksi Masuk", value: formatRupiah(inTotal) },
    { label: "Total Kas Keluar", value: formatRupiah(outTotal) },
    { label: "Pendapatan Tunai", value: formatRupiah(cashMethodTotal) },
    { label: "Pendapatan Non-Tunai", value: formatRupiah(nonCashMethodTotal) },
  ]);

  /* ── LAPORAN SERVIS ── */
  sectionTitle("Laporan Servis");
  if (serviceTransactions.length === 0) {
    emptyBox("Tidak ada transaksi servis pada shift ini.");
  } else {
    const totalService = serviceTransactions.reduce((s, t) => s + t.amount, 0);
    wrappedText(`Total: ${formatRupiah(totalService)}`, 9, true, COLORS.body, 4);
    spacer(4);
    const sRows = serviceTransactions.map((t) => [
      formatDateShort(t.createdAt),
      t.referenceId || "-",
      t.description.replace(/^Payment\s+/i, "Pembayaran ").replace(/ for service$/i, " servis") || "-",
      t.accountName || "-",
      formatRupiah(t.amount),
    ]);
    drawTable(
      [
        { header: "Tanggal", width: 0.13, align: "left" },
        { header: "No. Payment", width: 0.18, align: "left" },
        { header: "Deskripsi", width: 0.31, align: "left" },
        { header: "Metode", width: 0.23, align: "left" },
        { header: "Nominal", width: 0.15, align: "right" },
      ],
      sRows,
    );
  }

  /* ── RINCIAN PENDAPATAN LAIN / POS ── */
  spacer(12);
  sectionTitle("Rincian Pendapatan Lain / POS");
  if (posIncomeTransactions.length === 0) {
    emptyBox("Tidak ada transaksi POS / pendapatan lain pada shift ini.");
  } else {
    const totalPos = posIncomeTransactions.reduce((s, t) => s + t.amount, 0);
    wrappedText(`Total: ${formatRupiah(totalPos)}`, 9, true, COLORS.body, 4);
    spacer(4);
    const pRows = posIncomeTransactions.map((t) => [
      formatDateShort(t.createdAt),
      t.referenceId || "-",
      t.description || "-",
      t.accountName || "-",
      formatRupiah(t.amount),
    ]);
    drawTable(
      [
        { header: "Tanggal", width: 0.14, align: "left" },
        { header: "Ref", width: 0.2, align: "left" },
        { header: "Deskripsi", width: 0.32, align: "left" },
        { header: "Akun", width: 0.19, align: "left" },
        { header: "Nominal", width: 0.15, align: "right" },
      ],
      pRows,
    );
  }

  /* ── RINCIAN KAS KELUAR ── */
  spacer(12);
  sectionTitle("Rincian Kas Keluar");
  if (cashOutTransactions.length === 0) {
    emptyBox("Tidak ada kas keluar pada shift ini.");
  } else {
    wrappedText(`Total: ${formatRupiah(outTotal)}`, 9, true, COLORS.body, 4);
    spacer(4);
    const cRows = cashOutTransactions.map((t) => [
      formatDateShort(t.createdAt),
      t.movementType || "-",
      t.description || "-",
      t.accountName || "-",
      formatRupiah(t.amount),
    ]);
    drawTable(
      [
        { header: "Tanggal", width: 0.16, align: "left" },
        { header: "Kategori", width: 0.17, align: "left" },
        { header: "Deskripsi", width: 0.28, align: "left" },
        { header: "Akun", width: 0.17, align: "left" },
        { header: "Nominal", width: 0.22, align: "right" },
      ],
      cRows,
    );
  }

  /* ── REVENUE BERDASARKAN METODE ── */
  spacer(12);
  sectionTitle("Revenue Berdasarkan Metode");
  if (paymentBreakdown.length === 0) {
    emptyBox("Tidak ada data metode pembayaran pada shift ini.");
  } else {
    const pmtRows = paymentBreakdown.map((p) => [
      formatPaymentMethodLabel(p.methodType, p.methodName),
      `${p.count} transaksi`,
      formatRupiah(p.total),
    ]);
    drawTable(
      [
        { header: "Metode Pembayaran", width: 0.4, align: "left" },
        { header: "Jumlah Transaksi", width: 0.3, align: "right" },
        { header: "Total Revenue", width: 0.3, align: "right" },
      ],
      pmtRows,
    );
  }

  /* ── CATATAN + FOOTER ── */
  spacer(18);

  /* Thin separator */
  rule(y, COLORS.border, 0.3);
  y -= 12;

  wrappedText(
    "Dokumen ini dibuat otomatis dari data shift, mutasi akun pembayaran, servis, POS, dan kas keluar pada rentang shift.",
    8,
    false,
    COLORS.lightGray,
    0,
  );

  /* ── Finalize ── */
  if (ops.length > 0) {
    pages.push(ops.join("\n"));
  }

  /* ── FOOTER per page ── */
  const footerDate = generatePdfDate();

  for (let i = 0; i < pages.length; i++) {
    const fOps: string[] = [];
    const fy = MB - 8;

    fOps.push("q");
    fOps.push(`${COLORS.border[0]} ${COLORS.border[1]} ${COLORS.border[2]} RG`);
    fOps.push("0.3 w");
    fOps.push(`${MX} ${fy + 12} m ${PW - MX} ${fy + 12} l S`);
    fOps.push("Q");

    fOps.push("BT");
    fOps.push("/F1 7.5 Tf");
    fOps.push(`${COLORS.subtle[0]} ${COLORS.subtle[1]} ${COLORS.subtle[2]} rg`);
    fOps.push(`${MX} ${fy} Td`);
    fOps.push(`(${sanitizePdfText("PDF dibuat otomatis oleh Seervis")}) Tj`);
    fOps.push("ET");

    const pageLabel = `Halaman ${i + 1} dari ${pages.length}`;
    const pageW = getTextWidth(pageLabel, 7.5);
    fOps.push("BT");
    fOps.push("/F1 7.5 Tf");
    fOps.push(`${COLORS.subtle[0]} ${COLORS.subtle[1]} ${COLORS.subtle[2]} rg`);
    fOps.push(`${MX + (CW - pageW) / 2} ${fy} Td`);
    fOps.push(`(${sanitizePdfText(pageLabel)}) Tj`);
    fOps.push("ET");

    const dateW = getTextWidth(footerDate, 7.5);
    fOps.push("BT");
    fOps.push("/F1 7.5 Tf");
    fOps.push(`${COLORS.subtle[0]} ${COLORS.subtle[1]} ${COLORS.subtle[2]} rg`);
    fOps.push(`${PW - MX - dateW} ${fy} Td`);
    fOps.push(`(${sanitizePdfText(footerDate)}) Tj`);
    fOps.push("ET");

    pages[i] += "\n" + fOps.join("\n");
  }

  /* ── Build PDF objects ── */
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pages.forEach((content, index) => {
    const pageObjNum = 5 + index * 2;
    const contentObjNum = pageObjNum + 1;
    pageObjectNumbers.push(pageObjNum);
    objects[pageObjNum - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjNum} 0 R >>`;
    objects[contentObjNum - 1] =
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, index) => {
    offsets[index] = pdf.length;
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
}
