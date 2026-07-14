"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatCurrencyIDR } from "@/lib/utils/money";

interface PaymentView {
  id: string;
  status: string;
  packageName: string;
  packageSlug: string;
  price: number;
  discountAmount: number;
  totalAmount: number;
  billingCycle: string;
  currency: string;
  couponCode: string | null;
  invoiceNumber: string | null;
  proofUrl: string | null;
  bankInfo: { bank_name: string; account_number: string; account_holder: string };
  estimatedVerificationHours: number;
}

interface Props {
  initialStatus: {
    hasPayment: boolean;
    payment: PaymentView | null;
    hasActiveLicense: boolean;
    licensePackage: string | null;
    daysRemaining: number | null;
  } | null;
  bankInfo: { bank_name: string; account_number: string; account_holder: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  waiting_verification: "Menunggu Verifikasi",
  paid: "Terverifikasi",
  rejected: "Ditolak",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};

export function LicenseCenterClient({ initialStatus, bankInfo }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!status) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Memuat pusat lisensi…</p>
      </Shell>
    );
  }

  // Active license -> onward.
  if (status.hasActiveLicense) {
    return (
      <Shell>
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
          Lisensi Aktif
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          {status.licensePackage}
        </h1>
        {typeof status.daysRemaining === "number" && status.daysRemaining > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            Berlaku {status.daysRemaining} hari lagi.
          </p>
        )}
        <div className="mt-6">
          <Link
            href="/welcome"
            className="inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Lanjutkan ke Pengaturan Awal
          </Link>
        </div>
      </Shell>
    );
  }

  // No payment yet -> go choose a package.
  if (!status.hasPayment || !status.payment) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          Anda belum memilih paket.
        </p>
        <div className="mt-6">
          <Link
            href="/pricing"
            className="inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Pilih Paket
          </Link>
        </div>
      </Shell>
    );
  }

  const p = status.payment;

  async function handleUpload() {
    setError(null);
    if (!file) {
      setError("Pilih file bukti transfer terlebih dahulu.");
      return;
    }
    const fd = new FormData();
    fd.append("proof", file);
    startTransition(async () => {
      const { uploadLicensePaymentProofAction } = await import(
        "@/server/actions/license.actions"
      );
      const res = await uploadLicensePaymentProofAction(p.id, fd);
      if (!res.success) {
        setError(res.error || "Gagal mengunggah bukti.");
        return;
      }
      setDone(true);
      setStatus((s) => (s ? { ...s, payment: res.data ?? s.payment } : s));
    });
  }

  return (
    <Shell>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Pusat Lisensi
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{p.packageName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {p.billingCycle === "yearly" ? "Tahunan" : "Bulanan"}
      </p>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Total</dt>
          <dd>{formatCurrencyIDR(p.totalAmount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Status</dt>
          <dd>{STATUS_LABEL[p.status] ?? p.status}</dd>
        </div>
      </dl>

      {bankInfo && p.status === "pending_payment" && (
        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Transfer ke:</p>
          <p className="mt-1">{bankInfo.bank_name}</p>
          <p>{bankInfo.account_number}</p>
          <p className="text-muted-foreground">{bankInfo.account_holder}</p>
        </div>
      )}

      {p.status === "pending_payment" && (
        <div className="mt-6 space-y-3">
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="button"
            onClick={handleUpload}
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {isPending ? "Mengunggah…" : "Upload Bukti Transfer"}
          </button>
        </div>
      )}

      {p.status === "waiting_verification" && (
        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p>
            Bukti sedang diverifikasi. Estimasi {" "}
            {p.estimatedVerificationHours} jam.
          </p>
          {p.proofUrl && (
            <a
              href={p.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-primary underline"
            >
              Lihat bukti
            </a>
          )}
        </div>
      )}

      {p.status === "rejected" && (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p>Pesanan ditolak. Silakan hubungi kami untuk bantuan.</p>
        </div>
      )}

      {done && (
        <p className="mt-4 text-sm text-emerald-600">
          Bukti terunggah. Menunggu verifikasi.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-2 text-xs text-muted-foreground">
        <Link href="/checkout" className="underline">
          Ubah Paket
        </Link>
        <a
          href="https://wa.me/6281234567890"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Hubungi WhatsApp
        </a>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
