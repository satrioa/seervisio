"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Check, Loader2, Building2, ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LicensePackage } from "@/types/license";
import { PaymentHeader } from "./_components/payment-header";
import { PaymentCountdown } from "./_components/payment-countdown";
import { PaymentInstructions } from "./_components/payment-instructions";
import { UploadDropzone } from "./_components/upload-dropzone";
import { ImportantNotice } from "./_components/important-notice";
import { PrimaryCta } from "./_components/primary-cta";
import { SecondaryActions } from "./_components/secondary-actions";
import { WaitingVerification } from "./_components/waiting-verification";
import { SuccessState } from "./_components/success-state";
import { isLifetimeBilling, getBillingLabel } from "@/lib/billing/billing-helpers";

interface PaymentView {
  id: string;
  status: string;
  packageName: string;
  packageSlug: string;
  price: number;
  discountAmount: number;
  totalAmount: number;
  billingCycle: string;
  billingDurationEnabled: boolean;
  currency: string;
  couponCode: string | null;
  invoiceNumber: string | null;
  proofUrl: string | null;
  bankInfo: { bank_name: string; account_number: string; account_holder: string };
  estimatedVerificationHours: number;
  paymentDeadline: string | null;
  createdAt: string;
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
  initialPackages: LicensePackage[];
}

function buildFeatureList(pkg: LicensePackage): string[] {
  const base: string[] = [];
  if (pkg.max_branches > 0) base.push("Up to " + pkg.max_branches + " branches");
  if (pkg.max_users > 0) base.push("Up to " + pkg.max_users + " users");
  if (pkg.max_storage_mb > 0) base.push(pkg.max_storage_mb + "MB storage");
  if (pkg.max_transactions > 0) base.push(pkg.max_transactions.toLocaleString("id-ID") + " transactions/month");
  return base;
}

const STATIC_FEATURES: Record<string, string[]> = {
  starter: ["All core features", "Basic reports & analytics", "Email support"],
  professional: ["Unlimited services", "AI Command Center", "Advanced analytics & insights", "Priority support"],
  enterprise: ["Unlimited branches & users", "Custom integrations & API", "Dedicated account manager", "SLA guarantee"],
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  waiting_verification: "Menunggu Verifikasi",
  paid: "Terverifikasi",
  rejected: "Ditolak",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};

/* ── Bank Logo ── */

const LOGO_PALETTE = [
  "bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-rose-600",
  "bg-amber-600", "bg-cyan-600", "bg-pink-600", "bg-orange-600",
];

const BANK_LOGOS: Record<string, string> = {
  "bank mandiri": "/images/Payment/Transfer/livin-logo.svg",
  mandiri: "/images/Payment/Transfer/livin-logo.svg",
  "bank bca": "/images/Payment/Transfer/Bank_Central_Asia.svg",
  bca: "/images/Payment/Transfer/Bank_Central_Asia.svg",
  "bank bni": "/images/Payment/Transfer/bank-negara-indonesia-(bni)-logo.svg",
  bni: "/images/Payment/Transfer/bank-negara-indonesia-(bni)-logo.svg",
  "bank btn": "/images/Payment/Transfer/bank-btn-logo.svg",
  btn: "/images/Payment/Transfer/bank-btn-logo.svg",
  "cimb niaga": "/images/Payment/Transfer/bank-cimb-niaga-logo.svg",
  "bank cimb niaga": "/images/Payment/Transfer/bank-cimb-niaga-logo.svg",
  "bank danamon": "/images/Payment/Transfer/bank-danamon-logo.svg",
  "bank permata": "/images/Payment/Transfer/bank-permata-logo.svg",
  "bank ocbc": "/images/Payment/Transfer/bank-ocbc-logo.png",
  ocbc: "/images/Payment/Transfer/bank-ocbc-logo.png",
  "bank hsbc": "/images/Payment/Transfer/bank-hsbc-logo.svg",
  "bank raya": "/images/Payment/Transfer/bank-raya-logo.svg",
  "bank jago": "/images/Payment/Transfer/bank-jago-logo.png",
  "bank saqu": "/images/Payment/Transfer/bank-saqu-logo.png",
  "bank bsn": "/images/Payment/Transfer/bank-bsn-logo.png",
  seabank: "/images/Payment/Transfer/seabank-logo.svg",
  gopay: "/images/Payment/EWallet/Gopay_logo.svg",
  ovo: "/images/Payment/EWallet/Logo_ovo_purple.svg",
  dana: "/images/Payment/EWallet/Logo_dana_blue.svg",
  shopeepay: "/images/Payment/EWallet/shopee-pay.png",
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % LOGO_PALETTE.length;
}

function BankLogo({ name }: { name: string }) {
  const key = name.toLowerCase().trim();
  const logoUrl = BANK_LOGOS[key];
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-white">
        <img
          src={logoUrl}
          alt={name}
          className="size-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const initials = getInitials(name) || "?";
  const color = LOGO_PALETTE[getColorIndex(name)];
  return (
    <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${color}`}>
      {initials}
    </span>
  );
}

export function LicenseCenterClient({ initialStatus, bankInfo, initialPackages }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleChoosePlan = async (pkg: LicensePackage) => {
    setLoadingId(pkg.id);
    try {
      const mod = await import("@/server/actions/checkout.actions");
      const result = await mod.createCheckoutSessionAction({ packageId: pkg.id });
      if (!result.success) {
        setLoadingId(null);
        return;
      }
      window.location.href = "/checkout?token=" + encodeURIComponent(result.data.token);
    } catch {
      setLoadingId(null);
    }
  };

  const handleUploadComplete = useCallback((updatedPayment: PaymentView) => {
    setJustUploaded(true);
    setFile(null);
    setStatus((s) =>
      s
        ? { ...s, payment: updatedPayment }
        : s
    );
  }, []);

  if (!status) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (status.hasActiveLicense) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="size-7 text-emerald-600" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
              Lisensi Aktif
            </p>
            <h1 className="mt-2 text-xl font-semibold text-foreground">
              {status.licensePackage}
            </h1>
            {typeof status.daysRemaining === "number" && status.daysRemaining > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Berlaku {status.daysRemaining} hari lagi.
              </p>
            )}
            <div className="mt-8 w-full">
              <Link
                href="/welcome"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Lanjutkan ke Pengaturan Awal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!status.hasPayment || !status.payment) {
    return <PricingGrid packages={initialPackages} loadingId={loadingId} onChoose={handleChoosePlan} />;
  }

  const p = status.payment;
  const bank = p.bankInfo ?? (bankInfo as typeof p.bankInfo | null);
  const showPaymentForm = p.status === "pending_payment" && !justUploaded;
  const isLifetime = !p.billingDurationEnabled || isLifetimeBilling(p.billingCycle);

  if (p.status === "waiting_verification" || justUploaded) {
    return (
      <Shell>
        <WaitingVerification
          proofUrl={p.proofUrl}
          estimatedVerificationHours={p.estimatedVerificationHours}
        />
      </Shell>
    );
  }

  if (p.status === "paid") {
    return (
      <Shell>
        <SuccessState />
      </Shell>
    );
  }

  // expired (natural or replaced) / cancelled (from replacePaymentAction) → no active payment → show pricing grid
  if (p.status === "expired" || p.status === "cancelled") {
    return <PricingGrid packages={initialPackages} loadingId={loadingId} onChoose={handleChoosePlan} />;
  }

  if (p.status === "rejected") {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center py-8">
          <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="size-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Pesanan Ditolak</h2>
          <p className="mt-2 text-sm text-muted-foreground">Silakan hubungi kami untuk bantuan lebih lanjut.</p>
          <div className="mt-8 w-full">
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Hubungi Kami
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  // cancelled payments (from replacePaymentAction) → no active payment → show pricing grid
  if (p.status === "cancelled") {
    return <PricingGrid packages={initialPackages} loadingId={loadingId} onChoose={handleChoosePlan} />;
  }

  return (
    <div className="mx-auto max-w-[520px] px-4 py-8 sm:py-12">
      <div className="rounded-3xl border border-border/40 bg-card p-8 shadow-sm">
        <div className="space-y-6">
          <PaymentHeader
            packageName={p.packageName}
            billingCycle={p.billingCycle}
          />

          {p.paymentDeadline && !isLifetime && (
            <PaymentCountdown
              deadline={p.paymentDeadline}
              createdAt={p.createdAt}
            />
          )}

          {/* ── Combined: Total Pembayaran + Transfer ke + Ringkasan Pesanan ── */}
          <div className="overflow-hidden rounded-xl border-2 border-primary/20 bg-primary/[0.03]">
            {/* Total */}
            <div className="border-b border-primary/10 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Pembayaran
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {formatPrice(p.totalAmount)}
              </p>
            </div>

            {/* Transfer ke */}
            {bank && (
              <div className="border-b border-primary/10 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Transfer ke
                </p>
                <div className="flex items-center gap-4">
                  <BankLogo name={bank.bank_name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{bank.bank_name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="font-mono text-lg font-bold tracking-wider text-foreground">
                        {bank.account_number}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(bank.account_number)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Copy className="size-4" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{bank.account_holder}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Ringkasan Pesanan (accordion) */}
            <details className="group" open>
              <summary className="flex cursor-pointer items-center gap-2 bg-muted/20 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/30 list-none [&::-webkit-details-marker]:hidden">
                Ringkasan Pesanan
                <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="divide-y divide-border/60 text-sm">
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{p.packageName}</span>
                    <span className="text-xs text-muted-foreground">
                      {isLifetime ? "1x Bayar, Aktif Selamanya" : "1x Bayar, 1 Bulan"}
                    </span>
                  </div>
                  <span className="font-semibold text-foreground">{formatPrice(p.price)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-muted-foreground">Tipe Tagihan</span>
                  <span className="font-medium text-foreground">
                    {getBillingLabel(p.billingCycle)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-muted-foreground">Status</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    <span className="font-medium text-foreground">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </span>
                </div>
                {p.invoiceNumber && (
                  <div className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="text-muted-foreground">Nomor Pesanan</span>
                    <span className="font-mono text-xs font-medium text-foreground">
                      {p.invoiceNumber}
                    </span>
                  </div>
                )}
              </div>
            </details>
          </div>

          {bank && <PaymentInstructions bankName={bank.bank_name} />}

          {showPaymentForm && (
            <>
              <UploadDropzone
                file={file}
                error={error}
                onFileAccepted={(f) => {
                  setFile(f);
                  setError(null);
                }}
                onFileRemove={() => {
                  setFile(null);
                  setError(null);
                }}
                onError={setError}
              />

              <ImportantNotice />

              <PrimaryCta
                paymentId={p.id}
                packageName={p.packageName}
                invoiceNumber={p.invoiceNumber}
                file={file}
                disabled={!showPaymentForm}
                onUploadComplete={handleUploadComplete}
              />

              <SecondaryActions paymentId={p.id} invoiceNumber={p.invoiceNumber} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[520px] px-4 py-8 sm:py-12">
      <div className="rounded-3xl border border-border/40 bg-card p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function PricingGrid({
  packages,
  loadingId,
  onChoose,
}: {
  packages: LicensePackage[];
  loadingId: string | null;
  onChoose: (pkg: LicensePackage) => void;
}) {
  const sorted = [...packages].sort((a, b) => a.price - b.price);

  return (
    <main className="min-h-screen border-y border-border/40 bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Building2 className="size-4" />
            <span>Pilih paket yang sesuai untuk bisnis Anda</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pilih Paket Lisensi
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Anda belum memiliki paket aktif. Pilih salah satu di bawah untuk memulai.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-8">
          {sorted.map((pkg, i) => {
            const slug = pkg.slug.toLowerCase();
            const isBestValue = i === 0;
            const isPopular = i === 1 && sorted.length > 2;
            const features = [...(STATIC_FEATURES[slug] ?? []), ...buildFeatureList(pkg)];

            return (
              <div
                key={pkg.id}
                className={
                  "relative flex flex-col rounded-2xl border p-6 transition-all duration-200 " +
                  (isPopular
                    ? "border-primary/50 bg-card shadow-lg shadow-primary/5 scale-[1.02]"
                    : "border-border/50 bg-card hover:shadow-md")
                }
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                {isBestValue && !isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-white">
                    Best Value
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      {pkg.price === 0 ? "Free" : formatPrice(pkg.price)}
                    </span>
                    {pkg.price > 0 && pkg.billing_duration_enabled && (
                      <span className="text-sm text-muted-foreground">
                        /{pkg.billing_duration_type === "year" ? "year" : "month"}
                      </span>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{pkg.description}</p>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPopular ? "default" : "outline"}
                  className="w-full"
                  onClick={() => onChoose(pkg)}
                  disabled={loadingId === pkg.id}
                >
                  {loadingId === pkg.id ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Processing...
                    </>
                  ) : isPopular ? (
                    "Get Started"
                  ) : (
                    "Choose Plan"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
