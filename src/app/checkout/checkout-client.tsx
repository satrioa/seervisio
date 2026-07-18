"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Building2, User, Lock, Loader2, ChevronRight, ChevronDown, Smartphone, QrCode, Building, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCurrencyIDR } from "@/lib/utils/money";

interface PlatformPaymentMethod {
  id: string;
  type: string;
  name: string;
  accountName: string;
  accountNumber: string | null;
  logoUrl: string | null;
}

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
  profile: {
    id: string;
    business_name: string | null;
    name: string;
    phone: string | null;
  } | null;
  email: string | null;
  ownerName: string | null;
  paymentMethods: PlatformPaymentMethod[];
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  transfer: { label: "Transfer Bank", icon: <Building className="size-5" /> },
  ewallet: { label: "E-Wallet", icon: <Smartphone className="size-5" /> },
  qris: { label: "QRIS", icon: <QrCode className="size-5" /> },
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
  "bank central asia": "/images/Payment/Transfer/Bank_Central_Asia.svg",
  "bank bni": "/images/Payment/Transfer/bank-negara-indonesia-(bni)-logo.svg",
  bni: "/images/Payment/Transfer/bank-negara-indonesia-(bni)-logo.svg",
  "bank negara indonesia": "/images/Payment/Transfer/bank-negara-indonesia-(bni)-logo.svg",
  "cimb niaga": "/images/Payment/Transfer/bank-cimb-niaga-logo.svg",
  "bank cimb niaga": "/images/Payment/Transfer/bank-cimb-niaga-logo.svg",
  "bank danamon": "/images/Payment/Transfer/bank-danamon-logo.svg",
  "bank permata": "/images/Payment/Transfer/bank-permata-logo.svg",
  "bank btn": "/images/Payment/Transfer/bank-btn-logo.svg",
  btn: "/images/Payment/Transfer/bank-btn-logo.svg",
  "bank ocbc": "/images/Payment/Transfer/bank-ocbc-logo.png",
  ocbc: "/images/Payment/Transfer/bank-ocbc-logo.png",
  "ocbc nisp": "/images/Payment/Transfer/bank-ocbc-logo.png",
  "bank hsbc": "/images/Payment/Transfer/bank-hsbc-logo.svg",
  hsbc: "/images/Payment/Transfer/bank-hsbc-logo.svg",
  "bank raya": "/images/Payment/Transfer/bank-raya-logo.svg",
  "bank jago": "/images/Payment/Transfer/bank-jago-logo.png",
  "bank saqu": "/images/Payment/Transfer/bank-saqu-logo.png",
  "bank bsn": "/images/Payment/Transfer/bank-bsn-logo.png",
  bsn: "/images/Payment/Transfer/bank-bsn-logo.png",
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

function BankLogo({ name, type, logoUrl }: { name: string; type: string; logoUrl?: string | null }) {
  const key = name.toLowerCase().trim();
  const resolvedUrl = logoUrl || BANK_LOGOS[key];
  const [failed, setFailed] = useState(false);

  if (resolvedUrl && !failed) {
    return (
      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-white">
        <img
          src={resolvedUrl}
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
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${color}`}>
      {type === "qris" ? "QR" : initials}
    </span>
  );
}

const FEATURE_MAP: Record<string, string[]> = {
  starter: ["All core features", "Up to 200 services/month", "1 branch", "Basic reports & analytics", "Email support"],
  professional: ["Unlimited services", "Up to 3 branches", "AI Command Center", "Advanced analytics & insights", "Priority support"],
  enterprise: ["Unlimited branches & users", "Custom integrations & API", "Dedicated account manager", "SLA guarantee", "On-premise option"],
};

export function CheckoutClient({ session: initialSession, profile, email, ownerName, paymentMethods }: Props) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const slug = session.packageSlug?.toLowerCase() ?? "";
  const features = FEATURE_MAP[slug] ?? ["All features included"];

  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethodId) {
      setSelectedMethodId(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedMethodId]);

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;

    setCouponStatus("loading");
    setCouponMessage(null);

    try {
      const { applyCouponToSessionAction } = await import("@/server/actions/checkout.actions");
      const result = await applyCouponToSessionAction(session.token, code);

      if (!result.success) {
        setCouponStatus("error");
        setCouponMessage(result.error || "Kupon tidak valid.");
        return;
      }

      setSession(result.data!);
      setCouponStatus("success");
      setCouponMessage(`Kupon ${code} berhasil diterapkan!`);
      setCouponInput("");
    } catch (err: any) {
      setCouponStatus("error");
      setCouponMessage(err.message || "Gagal menerapkan kupon.");
    }
  }

  async function handleRemoveCoupon() {
    setCouponStatus("loading");
    setCouponMessage(null);

    try {
      const { applyCouponToSessionAction } = await import("@/server/actions/checkout.actions");
      const result = await applyCouponToSessionAction(session.token, null);

      if (!result.success) {
        setCouponStatus("error");
        setCouponMessage(result.error || "Gagal menghapus kupon.");
        return;
      }

      setSession(result.data!);
      setCouponStatus("idle");
      setCouponMessage(null);
    } catch (err: any) {
      setCouponStatus("error");
      setCouponMessage(err.message || "Gagal menghapus kupon.");
    }
  }

  async function handleConfirm() {
    setIsPending(true);
    setError(null);

    try {
      const { createLicensePaymentAction } = await import("@/server/actions/license.actions");
      const result = await createLicensePaymentAction({
        token: session.token,
        picName: profile?.name ?? "",
        picPhone: profile?.phone ?? "",
        companyAddress: "",
        invoiceEmail: email ?? "",
        paymentMethodId: selectedMethodId ?? undefined,
      });

      if (!result.success) {
        setError(result.error || "Gagal membuat pesanan.");
        setIsPending(false);
        return;
      }

      router.push("/license");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/license")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Configure your plan
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-5">

          {/* ── LEFT: Payment Method + Contact Info ── */}
          <div className="lg:col-span-3 space-y-6" data-tour="checkout-payment">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Payment Method</h2>

              <div className="mt-6 space-y-2">
                {(["transfer", "ewallet", "qris"] as const).map((type) => {
                  const group = paymentMethods.filter((pm) => pm.type === type);
                  if (group.length === 0) return null;
                  const meta = TYPE_META[type] ?? { label: type, icon: <Building className="size-5" /> };
                  return (
                    <details key={type} className="group rounded-xl border border-border overflow-hidden [&>summary]:open:rounded-b-none" open>
                      <summary className="flex w-full cursor-pointer items-center gap-3 bg-muted/20 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
                        {meta.label}
                        <span className="ml-auto text-xs text-muted-foreground">{group.length}</span>
                        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="divide-y divide-border">
                        {group.map((pm) => {
                          const selected = selectedMethodId === pm.id;
                          return (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setSelectedMethodId(pm.id)}
                              className={cn(
                                "flex w-full items-center gap-4 px-4 py-3.5 text-left transition-all",
                                selected ? "bg-primary/5" : "hover:bg-muted/20",
                              )}
                            >
                              <BankLogo name={pm.name} type={pm.type} logoUrl={pm.logoUrl} />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{pm.name}</p>
                              </div>
                              <div
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                                  selected ? "border-primary bg-primary" : "border-muted-foreground/30",
                                )}
                              >
                                {selected && <div className="size-2 rounded-full bg-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>

            {/* Contact info (separate card) */}
            {profile && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Contact Information</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your account details
                </p>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Business Name</Label>
                    <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 text-sm">
                      <Building2 className="size-4 text-muted-foreground" />
                      <span className="font-medium">{profile.business_name || profile.name || "—"}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">PIC Name</Label>
                    <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 text-sm">
                      <User className="size-4 text-muted-foreground" />
                      <span className="font-medium">{ownerName || profile.name || "—"}</span>
                    </div>
                  </div>
                  {email && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 text-sm">
                        <span className="text-muted-foreground">✉</span>
                        <span className="font-medium">{email}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div className="lg:col-span-2" data-tour="checkout-package">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-semibold">Order Summary</h3>

              {/* Package name */}
              <div className="mt-4 rounded-lg bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">{session.packageName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {session.billingCycle === "lifetime" ? "1x Bayar, Akses Selamanya" : "1x Bayar, 1 Bulan"}
                </p>
              </div>

              {/* Features */}
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                  What&apos;s included
                </p>
                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Coupon code input */}
              <div className="mt-6 border-t border-border pt-4" data-tour="checkout-coupon">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  <Tag className="mr-1 inline size-3" />
                  Coupon Code
                </p>
                {session.couponCode ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {session.couponCode}
                      </span>
                      {session.discountAmount > 0 && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-500">
                          (-{formatCurrencyIDR(session.discountAmount)})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      disabled={couponStatus === "loading"}
                      className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-emerald-200 hover:text-foreground dark:hover:bg-emerald-800 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }}
                      placeholder="Masukkan kode kupon"
                      className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 shrink-0"
                      onClick={handleApplyCoupon}
                      disabled={couponStatus === "loading" || !couponInput.trim()}
                    >
                      {couponStatus === "loading" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                )}
                {couponMessage && (
                  <p className={cn(
                    "mt-1.5 text-xs",
                    couponStatus === "error" ? "text-destructive" : "text-emerald-600",
                  )}>
                    {couponMessage}
                  </p>
                )}
              </div>

              {/* Price breakdown */}
              <dl className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Package Price</dt>
                  <dd className="font-medium">{formatCurrencyIDR(session.price)}</dd>
                </div>
                {session.couponCode && session.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <dt>Discount {session.couponCode}</dt>
                    <dd>-{formatCurrencyIDR(session.discountAmount)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatCurrencyIDR(session.totalAmount)}</dd>
                </div>
              </dl>

              {/* Confirm button */}
              <div className="mt-6 flex flex-col gap-2">
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleConfirm}
                  disabled={isPending}
                  data-tour="checkout-button"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Konfirmasi Pembayaran
                      <ChevronRight className="size-4" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Lock className="size-3" />
                  Secure checkout
                </p>
              </div>

              {/* Need help */}
              <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Need help?</p>
                <p>
                  Contact our team via{" "}
                  <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="underline">
                    WhatsApp
                  </a>{" "}
                  or email{" "}
                  <a href="mailto:support@seervisio.com" className="underline">
                    support@seervisio.com
                  </a>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
