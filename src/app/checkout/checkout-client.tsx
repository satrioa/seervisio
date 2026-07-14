"use client";

import Link from "next/link";
import { formatCurrencyIDR } from "@/lib/utils/money";

interface Props {
  session: {
    token: string;
    packageId: string;
    packageSlug: string;
    packageName: string;
    price: number;
    billingCycle: string;
    currency: string;
    couponCode: string | null;
    discountAmount: number;
    totalAmount: number;
    hasActiveLicense: boolean;
  };
}

export function CheckoutClient({ session }: Props) {
  const tokenParam = `?token=${encodeURIComponent(session.token)}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Checkout
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{session.packageName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {session.billingCycle === "yearly" ? "Tahunan" : "Bulanan"} · {session.currency}
        </p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Harga paket</dt>
            <dd>{formatCurrencyIDR(session.price)}</dd>
          </div>
          {session.couponCode && (
            <div className="flex justify-between text-emerald-600">
              <dt>Kupon {session.couponCode}</dt>
              <dd>-{formatCurrencyIDR(session.discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatCurrencyIDR(session.totalAmount)}</dd>
          </div>
        </dl>

        <ol className="mt-6 space-y-1 text-xs text-muted-foreground">
          <li>1. Pilih paket (sudah)</li>
          <li>2. Masuk / Daftar untuk menyimpan pilihan</li>
          <li>3. Verifikasi email</li>
          <li>4. Upload bukti transfer</li>
          <li>5. Tunggu verifikasi → Lisensi aktif</li>
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={`/login${tokenParam}`}
            className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
          >
            Lanjutkan Pembayaran
          </Link>
          <Link
            href={`/signup${tokenParam}`}
            className="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium"
          >
            Daftar Akun
          </Link>
        </div>
      </div>
    </main>
  );
}
