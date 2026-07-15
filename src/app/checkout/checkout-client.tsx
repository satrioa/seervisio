"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Building2, User, Lock, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  profile: {
    id: string;
    business_name: string | null;
    name: string;
    phone: string | null;
  } | null;
  email: string | null;
  ownerName: string | null;
}

type PaymentMethod = "transfer" | "ewallet";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; description: string; icon: string }[] = [
  { id: "transfer", label: "Transfer Bank", description: "Mandiri, BCA, BNI, BRI", icon: "🏦" },
  { id: "ewallet", label: "E-Wallet", description: "GoPay, OVO, Dana, LinkAja", icon: "📱" },
];

const FEATURE_MAP: Record<string, string[]> = {
  starter: ["All core features", "Up to 200 services/month", "1 branch", "Basic reports & analytics", "Email support"],
  professional: ["Unlimited services", "Up to 3 branches", "AI Command Center", "Advanced analytics & insights", "Priority support"],
  enterprise: ["Unlimited branches & users", "Custom integrations & API", "Dedicated account manager", "SLA guarantee", "On-premise option"],
};

export function CheckoutClient({ session, profile, email, ownerName }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = session.packageSlug?.toLowerCase() ?? "";
  const features = FEATURE_MAP[slug] ?? ["All features included"];

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
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Payment Method</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose your preferred payment method
              </p>

              <div className="mt-6 space-y-3">
                {PAYMENT_METHODS.map((pm) => {
                  const selected = method === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setMethod(pm.id)}
                      className={
                        "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all " +
                        (selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/30 hover:bg-muted/30")
                      }
                    >
                      <span className="text-2xl">{pm.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{pm.label}</p>
                        <p className="text-xs text-muted-foreground">{pm.description}</p>
                      </div>
                      <div
                        className={
                          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 " +
                          (selected ? "border-primary bg-primary" : "border-muted-foreground/30")
                        }
                      >
                        {selected && <div className="size-2 rounded-full bg-white" />}
                      </div>
                    </button>
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
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-semibold">Order Summary</h3>

              {/* Package name */}
              <div className="mt-4 rounded-lg bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">{session.packageName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {session.billingCycle === "yearly" ? "Yearly billing" : "Monthly billing"}
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
                  disabled={isPending || method === "ewallet"}
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
                {method === "ewallet" && (
                  <p className="text-xs text-center text-muted-foreground">
                    E-Wallet belum tersedia. Pilih Transfer Bank.
                  </p>
                )}
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
