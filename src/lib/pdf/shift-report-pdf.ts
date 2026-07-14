import type { ShiftDetailPdfInput } from "./shift-report-pdf.types";

export type {
  TransactionItem,
  PaymentBreakdownItem,
  ShiftDetailPdfInput,
} from "./shift-report-pdf.types";

export {
  formatRupiah,
  formatDateTime,
  formatDate as formatDateShort,
  formatPaymentMethodLabel,
  formatReconciliationStatus,
} from "@/pdf/helpers/format";

export async function buildShiftReportPdf(
  input: ShiftDetailPdfInput,
): Promise<Blob> {
  const res = await fetch("/api/pdf/shift-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`PDF generation failed: ${res.status} ${res.statusText}`);
  }

  return res.blob();
}
