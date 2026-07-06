import * as React from "react";

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

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

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
    details?.transaction_number,
    details?.transactionNumber,
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

function InvoiceBadge({ number }: { number: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
      {number}
    </span>
  );
}

export interface FormattedActivity {
  primaryText: React.ReactNode;
  secondaryText?: React.ReactNode[];
}

export function formatActivityEvent(
  activityType: string,
  details: Record<string, any> | null | undefined,
  targetLabel?: string | null,
  description?: string | null,
  action?: string | null,
): FormattedActivity {
  const invoice = extractInvoiceNumber(details, targetLabel);
  const badge = invoice ? <InvoiceBadge number={invoice} /> : null;

  const secondaryFromNote = details?.note || details?.reason
    ? [<span>Catatan: {String(details?.note || details?.reason)}</span>]
    : [];

  switch (activityType) {
    /* ── Service ── */
    case "service_created": {
      const customerName = details?.customer_name || details?.customerName || details?.customer?.name || null;
      const deviceParts = [details?.device_type, details?.device_brand, details?.device_model].filter(Boolean);
      const deviceStr = deviceParts.length > 0 ? deviceParts.join(" ") : null;
      const secondary: React.ReactNode[] = [];
      if (deviceStr) secondary.push(<span>Perangkat: {deviceStr}</span>);
      return {
        primaryText: badge && customerName ? (
          <>membuat servis baru {badge} untuk {customerName}</>
        ) : badge ? (
          <>membuat servis baru {badge}</>
        ) : customerName ? (
          <>membuat servis baru untuk {customerName}</>
        ) : (
          <>membuat servis baru</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "status_changed": {
      const from = details?.from_status ? formatStatusLabel(String(details.from_status)) : null;
      const to = details?.to_status ? formatStatusLabel(String(details.to_status)) : null;
      const reason = details?.reason || details?.note || null;
      const secondary: React.ReactNode[] = [];
      if (reason) secondary.push(<span>Catatan teknisi: {String(reason)}</span>);
      return {
        primaryText: badge && from && to ? (
          <>Servis {badge} dipindahkan dari {from} ke {to}</>
        ) : from && to ? (
          <>Status servis dipindahkan dari {from} ke {to}</>
        ) : badge && to ? (
          <>Servis {badge} diperbarui ke status {to}</>
        ) : to ? (
          <>Status servis diperbarui ke {to}</>
        ) : badge ? (
          <>Servis {badge} diperbarui statusnya</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>memindahkan status servis</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "service_cancelled": {
      const reason = details?.reason || null;
      const secondary: React.ReactNode[] = [];
      if (reason) secondary.push(<span>Alasan: {String(reason)}</span>);
      return {
        primaryText: badge ? (
          <>Servis {badge} dibatalkan</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>membatalkan servis</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "service_reopened": {
      const reason = details?.reason || null;
      const from = details?.reopened_from ? formatStatusLabel(String(details.reopened_from)) : null;
      const to = details?.reopened_to ? formatStatusLabel(String(details.reopened_to)) : null;
      const secondary: React.ReactNode[] = [];
      if (from && to) secondary.push(<span>Dari {from} ke {to}</span>);
      if (reason) secondary.push(<span>Alasan: {String(reason)}</span>);
      return {
        primaryText: badge ? (
          <>Servis {badge} dibuka ulang</>
        ) : (
          <>membuka ulang servis</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "technician_assigned": {
      const oldTechId = details?.old_technician_id;
      const newTechId = details?.new_technician_id;
      const secondary: React.ReactNode[] = [];
      if (oldTechId && newTechId) {
        secondary.push(<span>Teknisi diganti</span>);
      }
      return {
        primaryText: badge ? (
          <>Teknisi ditugaskan ke servis {badge}</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>menugaskan teknisi ke servis</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "pickup_verified": {
      const pickupName = details?.pickup_name || null;
      const relation = details?.pickup_relation || null;
      const secondary: React.ReactNode[] = [];
      if (relation) secondary.push(<span>Hubungan: {String(relation)}</span>);
      return {
        primaryText: badge && pickupName ? (
          <>Unit {badge} diserahkan kepada {pickupName}</>
        ) : badge ? (
          <>Unit {badge} telah diambil</>
        ) : pickupName ? (
          <>Unit diserahkan kepada {pickupName}</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>menyerahkan unit ke pelanggan</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Payments ── */
    case "payment_received":
    case "dp_received": {
      const amount = details?.amount ? formatCurrency(Number(details.amount)) : null;
      const secondary: React.ReactNode[] = [];
      if (details?.note) secondary.push(<span>{String(details.note)}</span>);
      const prefix = activityType === "dp_received" ? "menerima DP" : "menerima pembayaran";
      return {
        primaryText: badge && amount ? (
          <>{prefix} {badge} — {amount}</>
        ) : badge ? (
          <>{prefix} {badge}</>
        ) : amount ? (
          <>{prefix} — {amount}</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>{prefix}</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "void_payment": {
      const reason = details?.reason || null;
      const amount = details?.gross_amount ? formatCurrency(Number(details.gross_amount)) : null;
      const secondary: React.ReactNode[] = [];
      if (amount) secondary.push(<span>Nilai: {amount}</span>);
      if (reason) secondary.push(<span>Alasan: {String(reason)}</span>);
      return {
        primaryText: badge ? (
          <>Pembayaran {badge} dibatalkan (void)</>
        ) : (
          <>membatalkan pembayaran</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "refund_payment": {
      const reason = details?.reason || null;
      const amount = details?.gross_amount ? formatCurrency(Number(details.gross_amount)) : null;
      const secondary: React.ReactNode[] = [];
      if (amount) secondary.push(<span>Nilai: {amount}</span>);
      if (reason) secondary.push(<span>Alasan: {String(reason)}</span>);
      return {
        primaryText: badge ? (
          <>Pembayaran {badge} diretur (refund)</>
        ) : (
          <>meretur pembayaran</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Sparepart / Inventory ── */
    case "sparepart_used": {
      const cost = details?.total_sparepart_cost ? formatCurrency(Number(details.total_sparepart_cost)) : null;
      const secondary: React.ReactNode[] = [...secondaryFromNote];
      if (cost) secondary.push(<span>Biaya sparepart: {cost}</span>);
      return {
        primaryText: badge ? (
          <>Sparepart ditambahkan ke servis {badge}</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>mencatat penggunaan sparepart</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "stock_in": {
      const qty = details?.quantity ? `${details.quantity} ${details?.unit || ""}`.trim() : null;
      return {
        primaryText: description ? <>{description}</> : qty ? (
          <>Mencatat stok masuk ({qty})</>
        ) : (
          <>mencatat stok masuk</>
        ),
      };
    }

    case "stock_out": {
      const qty = details?.quantity ? `${details.quantity} ${details?.unit || ""}`.trim() : null;
      return {
        primaryText: description ? <>{description}</> : qty ? (
          <>Mencatat stok keluar ({qty})</>
        ) : (
          <>mencatat stok keluar</>
        ),
      };
    }

    case "stock_opname": {
      const before = details?.before ?? details?.qty_before;
      const after = details?.after ?? details?.qty_after;
      const diff = details?.diff ?? details?.difference;
      const secondary: React.ReactNode[] = [];
      if (before !== undefined && after !== undefined) {
        secondary.push(<span>Stok: {before} → {after} (±{diff ?? after - before})</span>);
      }
      return {
        primaryText: description ? <>{description}</> : (
          <>melakukan opname stok</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── POS ── */
    case "pos_sale": {
      const amount = details?.total_amount || details?.amount ? formatCurrency(Number(details.total_amount || details.amount)) : null;
      const itemCount = details?.item_count || null;
      const secondary: React.ReactNode[] = [];
      if (itemCount) secondary.push(<span>{itemCount} item</span>);
      return {
        primaryText: badge && amount ? (
          <>Checkout POS {badge} — {amount}</>
        ) : badge ? (
          <>Checkout POS {badge}</>
        ) : amount ? (
          <>Checkout POS — {amount}</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>checkout POS</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "pos_void":
    case "void_pos": {
      const reason = details?.reason || null;
      const amount = details?.gross_amount ? formatCurrency(Number(details.gross_amount)) : null;
      const secondary: React.ReactNode[] = [];
      if (amount) secondary.push(<span>Nilai: {amount}</span>);
      if (reason) secondary.push(<span>Alasan: {String(reason)}</span>);
      return {
        primaryText: badge ? (
          <>Transaksi POS {badge} dibatalkan</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>membatalkan transaksi POS</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "refund_pos": {
      const reason = details?.reason || null;
      const amount = details?.gross_amount ? formatCurrency(Number(details.gross_amount)) : null;
      const secondary: React.ReactNode[] = [];
      if (amount) secondary.push(<span>Nilai: {amount}</span>);
      if (reason) secondary.push(<span>Alasan: {String(reason)}</span>);
      return {
        primaryText: badge ? (
          <>Transaksi POS {badge} diretur</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>meretur transaksi POS</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Shifts ── */
    case "shift_opened": {
      const openingCash = details?.opening_cash ? formatCurrency(Number(details.opening_cash)) : null;
      return {
        primaryText: <>membuka shift toko</>,
        secondaryText: openingCash ? [<span>Kas awal: {openingCash}</span>] : undefined,
      };
    }

    case "shift_closed": {
      const countedCash = details?.counted_closing_cash ?? details?.countedClosingCash ?? details?.actual_cash ?? details?.counted_cash ?? null;
      const cashDiff = typeof details?.cash_difference === "number" ? Number(details.cash_difference)
        : typeof details?.cashDifference === "number" ? Number(details.cashDifference)
        : details?.cash_difference !== undefined ? Number(details.cash_difference)
        : null;
      const secondary: React.ReactNode[] = [];
      if (cashDiff !== null) {
        if (cashDiff === 0) {
          secondary.push(<span>Kas sesuai, tidak ada selisih.</span>);
        } else if (cashDiff > 0) {
          secondary.push(<span>Selisih lebih {formatCurrency(cashDiff)}. Kas fisik lebih besar.</span>);
        } else {
          secondary.push(<span>Selisih kurang {formatCurrency(Math.abs(cashDiff))}. Kas fisik lebih kecil.</span>);
        }
      }
      const primaryText = description ? <>{description}</> : countedCash !== null
        ? <>Shift ditutup — kas fisik {formatCurrency(Number(countedCash))}</>
        : <>menutup shift</>;
      return {
        primaryText,
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    /* ── Finance / Accounts ── */
    case "income_created":
    case "expense_created": {
      const label = activityType === "income_created" ? "Pemasukan" : "Pengeluaran";
      const secondary: React.ReactNode[] = [];
      return {
        primaryText: description ? <>{description}</> : <>{label} dicatat</>,
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "finance_void": {
      return {
        primaryText: description ? <>{description}</> : <>membatalkan transaksi keuangan</>,
      };
    }

    case "account_created": {
      const accountName = details?.account_name || null;
      return {
        primaryText: accountName ? <>Akun keuangan {accountName} dibuat</> : (description || <>membuat akun keuangan baru</>),
      };
    }

    case "account_updated": {
      return {
        primaryText: description || <>akun keuangan diperbarui</>,
      };
    }

    case "account_archived": {
      const name = details?.accountName || details?.account_name || null;
      return {
        primaryText: name ? <>Akun {name} diarsipkan</> : (description || <>mengarsipkan akun keuangan</>),
      };
    }

    case "account_deleted": {
      const name = details?.accountName || details?.account_name || null;
      return {
        primaryText: name ? <>Akun {name} dihapus</> : (description || <>menghapus akun keuangan</>),
      };
    }

    case "balance_adjusted": {
      const direction = details?.direction || null;
      const amount = details?.amount ? formatCurrency(Number(details.amount)) : null;
      const reason = details?.reason || null;
      const secondary: React.ReactNode[] = [];
      if (reason) secondary.push(<span>Alasan: {String(reason)}</span>);
      return {
        primaryText: targetLabel && amount ? (
          <>{targetLabel}: {direction === "IN" || direction === "in" ? "Penambahan" : "Pengurangan"} saldo {amount}</>
        ) : amount ? (
          <>{direction === "IN" || direction === "in" ? "Penambahan" : "Pengurangan"} saldo {amount}</>
        ) : description ? (
          <>{description}</>
        ) : (
          <>penyesuaian saldo akun</>
        ),
        secondaryText: secondary.length > 0 ? secondary : undefined,
      };
    }

    case "payment_method": {
      const methodType = details?.method_type || null;
      return {
        primaryText: methodType ? <>Metode pembayaran {methodType} ditautkan</> : (description || <>menautkan metode pembayaran</>),
      };
    }

    /* ── Brand / Branch / Settings ── */
    case "target_updated":
    case "settings_updated":
    case "profile_updated": {
      return {
        primaryText: description || (activityType === "target_updated"
          ? "Target revenue diperbarui"
          : activityType === "settings_updated"
            ? "Pengaturan sistem diperbarui"
            : "Profil brand diperbarui"),
      };
    }

    case "branch_created": {
      const name = details?.name || targetLabel || null;
      return {
        primaryText: name ? <>Cabang {name} dibuat</> : (description || <>membuat cabang baru</>),
      };
    }

    case "branch_updated": {
      const name = targetLabel || null;
      return {
        primaryText: name ? <>Cabang {name} diperbarui</> : (description || <>memperbarui cabang</>),
      };
    }

    case "branch_activated": {
      const name = targetLabel || null;
      return {
        primaryText: name ? <>Cabang {name} diaktifkan</> : (description || <>mengaktifkan cabang</>),
      };
    }

    case "branch_deactivated": {
      const name = targetLabel || null;
      return {
        primaryText: name ? <>Cabang {name} dinonaktifkan</> : (description || <>menonaktifkan cabang</>),
      };
    }

    /* ── Account / User ── */
    case "user_created": {
      return {
        primaryText: description || <>membuat akun pengguna baru</>,
      };
    }
    case "user_deleted": {
      return {
        primaryText: description || <>menghapus akun pengguna dari brand</>,
      };
    }
    case "user_updated": {
      return {
        primaryText: description || <>memperbarui data akun pengguna</>,
      };
    }
    case "user_activated": {
      return {
        primaryText: description || <>mengaktifkan akun pengguna</>,
      };
    }
    case "user_deactivated": {
      return {
        primaryText: description || <>menonaktifkan akun pengguna</>,
      };
    }
    case "password_reset": {
      return {
        primaryText: description || <>mereset password akun pengguna</>,
      };
    }
    case "auth_linked": {
      return {
        primaryText: description || <>menghubungkan akun login</>,
      };
    }

    /* ── System / Maintenance ── */
    case "export":
      return {
        primaryText: description || <>mengekspor data</>,
      };
    case "import":
      return {
        primaryText: description || <>mengimpor data</>,
      };
    case "cache_cleared":
      return {
        primaryText: description || <>membersihkan cache aplikasi</>,
      };
    case "data_reset":
      return {
        primaryText: description || <>mereset data demo</>,
      };
    case "data_delete":
      return {
        primaryText: description || <>menghapus seluruh data brand</>,
      };
    case "factory_reset":
      return {
        primaryText: description || <>mereset brand ke pengaturan pabrik</>,
      };

    /* ── Fallback — never show "Aktivitas berhasil dicatat oleh sistem" ── */
    default: {
      const actionLabel = action || activityType || "unknown";
      if (description) {
        return { primaryText: <>{description}</> };
      }
      return {
        primaryText: <span className="font-mono text-[10px] opacity-70">{actionLabel.replace(/_/g, " ").toLowerCase()}</span>,
      };
    }
  }
}
