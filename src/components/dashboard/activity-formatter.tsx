import * as React from "react";

/* ── Status labels ── */

const SERVICE_STATUS_LABELS: Record<string, string> = {
  INTAKE: "Masuk",
  DIAGNOSIS: "Diagnosa",
  WAITING_APPROVAL: "Menunggu Approval",
  REPAIRING: "Perbaikan",
  REPAIR: "Perbaikan",
  QC: "QC",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
};

function formatStatusLabel(status: string): string {
  return SERVICE_STATUS_LABELS[status] || status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Currency ── */

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/* ── Invoice extraction — check multiple possible field names ── */

function extractInvoiceNumber(
  details: Record<string, any> | null | undefined,
  targetLabel?: string | null,
): string | null {
  if (!details && !targetLabel) return null;
  const candidates = [
    details?.invoice_number,
    details?.invoiceNumber,
    details?.service_number,
    details?.serviceNumber,
    details?.service_code,
    details?.serviceCode,
    details?.invoice,
    details?.payment_number,
    details?.paymentNumber,
    details?.reference_number,
    details?.referenceNumber,
  ];
  for (const c of candidates) {
    if (c && typeof c === "string" && c.length < 50 && !c.includes("-")) return c;
  }
  for (const c of candidates) {
    if (c && typeof c === "string" && c.length < 50) return c;
  }
  if (targetLabel && targetLabel.length < 50) return targetLabel;
  return null;
}

/* ── Orange badge component ── */

function InvoiceBadge({ number }: { number: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
      {number}
    </span>
  );
}

/* ── Return type ── */

export interface FormattedActivity {
  primaryText: React.ReactNode;
  secondaryText?: React.ReactNode[];
}

/* ── Main formatter ── */

export function formatActivityEvent(
  activityType: string,
  details: Record<string, any> | null | undefined,
  targetLabel?: string | null,
): FormattedActivity {
  const invoice = extractInvoiceNumber(details, targetLabel);
  const badge = invoice ? <InvoiceBadge number={invoice} /> : null;

  switch (activityType) {
    /* ── Service created ── */
    case "service_created": {
      const customerName = details?.customer_name || details?.customerName || details?.customer?.name || null;
      const deviceParts = [details?.device_type, details?.device_brand, details?.device_model].filter(Boolean);
      const deviceStr = deviceParts.length > 0 ? deviceParts.join(" ") : null;
      const secondary: React.ReactNode[] = [];
      if (deviceStr) {
        secondary.push(<span>Perangkat: {deviceStr}</span>);
      }
      return {
        primaryText: badge && customerName ? (
          <>
            membuat servis baru {badge} untuk {customerName}
          </>
        ) : badge ? (
          <>
            membuat servis baru {badge}
          </>
        ) : customerName ? (
          <>membuat servis baru untuk {customerName}</>
        ) : (
          <>membuat servis baru</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Status changed ── */
    case "status_changed": {
      const from = details?.from_status ? formatStatusLabel(String(details.from_status)) : null;
      const to = details?.to_status ? formatStatusLabel(String(details.to_status)) : null;
      const reason = details?.reason || details?.note || null;
      const secondary: React.ReactNode[] = [];
      if (reason) {
        secondary.push(<span>Catatan teknisi: {String(reason)}</span>);
      }
      return {
        primaryText: badge && from && to ? (
          <>
            Servis {badge} dipindahkan dari {from} ke {to}
          </>
        ) : from && to ? (
          <>Status servis dipindahkan dari {from} ke {to}</>
        ) : badge && to ? (
          <>
            Servis {badge} diperbarui ke status {to}
          </>
        ) : to ? (
          <>Status servis diperbarui ke {to}</>
        ) : badge ? (
          <>
            Servis {badge} diperbarui statusnya
          </>
        ) : (
          <>memindahkan status servis</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Service cancelled ── */
    case "service_cancelled": {
      const reason = details?.reason || null;
      const secondary: React.ReactNode[] = [];
      if (reason) {
        secondary.push(<span>Alasan: {String(reason)}</span>);
      }
      return {
        primaryText: badge ? (
          <>
            Servis {badge} dihapus dari daftar servis
          </>
        ) : (
          <>Satu data servis dihapus dari sistem</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Payment received ── */
    case "payment_received": {
      const amount = details?.amount ? formatCurrency(Number(details.amount)) : null;
      const secondary: React.ReactNode[] = [];
      if (details?.note) {
        secondary.push(<span>Catatan: {String(details.note)}</span>);
      }
      return {
        primaryText:
          badge && amount ? (
            <>
              mencatat pembayaran {badge} — {amount}
            </>
          ) : badge ? (
            <>
              mencatat pembayaran {badge}
            </>
          ) : amount ? (
            <>mencatat pembayaran — {amount}</>
          ) : (
            <>mencatat pembayaran</>
          ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Shift opened ── */
    case "shift_opened": {
      const openingCash = details?.opening_cash ? formatCurrency(Number(details.opening_cash)) : null;
      return {
        primaryText: <>membuka shift toko</>,
        secondaryText: openingCash ? [<span>Kas awal: {openingCash}</span>] : undefined,
      };
    }

    /* ── Shift closed ── */
    case "shift_closed": {
      const countedCash = details?.counted_closing_cash ?? details?.countedClosingCash ?? details?.actual_cash ?? null;
      const cashDiff = typeof details?.cash_difference === "number" ? Number(details.cash_difference) : typeof details?.cashDifference === "number" ? Number(details.cashDifference) : null;
      const secondary: React.ReactNode[] = [];
      if (cashDiff !== null) {
        if (cashDiff === 0) {
          secondary.push(<span>Kas sesuai, tidak ada selisih saat tutup shift.</span>);
        } else if (cashDiff > 0) {
          secondary.push(<span>Selisih lebih {formatCurrency(cashDiff)}. Kas fisik lebih besar dari sistem.</span>);
        } else {
          secondary.push(<span>Selisih kurang {formatCurrency(Math.abs(cashDiff))}. Kas fisik lebih kecil dari sistem.</span>);
        }
      }
      const primaryText = countedCash !== null
        ? <>Shift ditutup dengan kas fisik {formatCurrency(Number(countedCash))}</>
        : <>menutup shift</>;
      return {
        primaryText,
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Stock used ── */
    case "stock_used": {
      const secondary: React.ReactNode[] = [];
      if (details?.note) {
        secondary.push(<span>Catatan: {String(details.note)}</span>);
      }
      return {
        primaryText: <>mencatat penggunaan sparepart</>,
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Purchase created (POS) ── */
    case "purchase_created": {
      const amount = details?.amount ? formatCurrency(Number(details.amount)) : null;
      return {
        primaryText: amount ? (
          <>membuat penjualan POS — {amount}</>
        ) : (
          <>membuat penjualan POS</>
        ),
      };
    }

    /* ── Note added (adjustment) ── */
    case "note_added":
      return {
        primaryText: <>melakukan penyesuaian saldo</>,
      };

    /* ── Fallback ── */
    default:
      return {
        primaryText: <>Aktivitas berhasil dicatat oleh sistem</>,
      };
  }
}
