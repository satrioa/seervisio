"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Building2, Upload, FileText, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { formatCurrencyIDR } from "@/lib/utils/money";
import type { LicensePackage } from "@/types/license";

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
  initialPackages: LicensePackage[];
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  waiting_verification: "Menunggu Verifikasi",
  paid: "Terverifikasi",
  rejected: "Ditolak",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
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

export function LicenseCenterClient({ initialStatus, bankInfo, initialPackages }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    maxFiles: 1,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "application/pdf": [".pdf"] },
    onDropAccepted: (accepted) => {
      setFile(accepted[0] ?? null);
      setError(null);
    },
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0];
      if (err?.code === "file-invalid-type") {
        setError("Hanya file JPG, PNG, dan PDF yang diperbolehkan.");
      } else if (err?.code === "too-many-files") {
        setError("Maksimal 1 file.");
      } else {
        setError(err?.message ?? "File tidak valid.");
      }
    },
  });

  const handleChoosePlan = async (pkg: LicensePackage) => {
    setLoadingId(pkg.id);
    try {
      const mod = await import("@/server/actions/checkout.actions");
      const result = await mod.createCheckoutSessionAction({ packageId: pkg.id });
      if (!result.success) {
        console.error("Failed to create checkout session:", result.error);
        setLoadingId(null);
        return;
      }
      router.push("/checkout?token=" + encodeURIComponent(result.data.token));
    } catch {
      setLoadingId(null);
    }
  };

  if (!status) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Memuat pusat lisensi…</p>
      </Shell>
    );
  }

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

  if (!status.hasPayment || !status.payment) {
    return <PricingGrid packages={initialPackages} loadingId={loadingId} onChoose={handleChoosePlan} />;
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
          <div
            {...getRootProps()}
            className={
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors " +
              (isDragActive
                ? "border-primary bg-primary/5"
                : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border hover:border-muted-foreground/50")
            }
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-emerald-600" />
                <span className="text-sm font-medium">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setError(null);
                  }}
                  className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive
                    ? "Lepaskan file di sini..."
                    : "Seret file ke sini atau klik untuk memilih"}
                </p>
                <p className="text-xs text-muted-foreground">JPG, PNG, PDF — Maks. 1 file</p>
              </>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isPending || !file}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Mengunggah…
              </>
            ) : (
              "Upload Bukti Transfer"
            )}
          </Button>
        </div>
      )}

      {(p.status === "waiting_verification" || done) && (
        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm space-y-3">
          {done && (
            <p className="text-emerald-600 font-medium">
              ✅ Bukti berhasil terunggah!
            </p>
          )}
          <p>
            Bukti sedang diverifikasi. Estimasi {p.estimatedVerificationHours} jam.
          </p>
          {p.proofUrl && (
            <a
              href={p.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-primary underline"
            >
              Lihat bukti
            </a>
          )}
          <a
            href="https://wa.me/6281234567890?text=Halo%20saya%20ingin%20verifikasi%20pembayaran%20lisensi"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Verifikasi Via WhatsApp
          </a>
          {done && (
            <a
              href="/"
              className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Kembali ke Halaman Awal
            </a>
          )}
        </div>
      )}

      {p.status === "rejected" && (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p>Pesanan ditolak. Silakan hubungi kami untuk bantuan.</p>
        </div>
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
                    {pkg.price > 0 && (
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
