"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Crown, Rocket, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface PricingPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  billing_duration_enabled: boolean;
  billing_duration_type: "month" | "year" | null;
  billing_duration_value: number | null;
}

interface PricingSectionProps {
  packages?: PricingPackage[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

function formatPriceCompact(price: number): string {
  if (price === 0) return "Gratis";
  if (price >= 1_000_000) {
    const jt = price / 1_000_000;
    const formatted = jt % 1 === 0 ? jt.toString() : jt.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    return `Rp ${formatted}jt`;
  }
  if (price >= 1_000) {
    const rb = price / 1_000;
    const formatted = rb % 1 === 0 ? rb.toString() : rb.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    return `Rp ${formatted}rb`;
  }
  return `Rp ${price}`;
}

function billingLabel(pkg: PricingPackage): string {
  if (pkg.billing_duration_enabled === false) return "/seumur hidup";
  if (pkg.billing_duration_type === "year") return "/tahun";
  return "/bulan";
}

function tierIcon(slug: string) {
  const s = slug.toLowerCase();
  if (s.includes("trial") || s.includes("starter")) return Rocket;
  if (s.includes("lifetime") || s.includes("enterprise")) return Crown;
  return Sparkles;
}

export function PricingSection({ packages }: PricingSectionProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const handleChoosePlan = async (pkg: PricingPackage) => {
    setLoadingId(pkg.id);
    try {
      const mod = await import("@/server/actions/checkout.actions");
      const result = await mod.createCheckoutSessionAction({ packageId: pkg.id });
      if (!result.success) {
        console.error("Failed to create checkout session:", result.error);
        setLoadingId(null);
        return;
      }
      router.push(`/checkout?token=${encodeURIComponent(result.data.token)}`);
    } catch {
      setLoadingId(null);
    }
  };

  const fallbackPackages: PricingPackage[] = packages ?? [
    { id: "trial", name: "Trial", slug: "trial", description: "Coba semua fitur gratis 14 hari.", price: 0, billing_duration_enabled: false, billing_duration_type: null, billing_duration_value: null },
    { id: "pro", name: "Pro", slug: "pro", description: "Untuk toko servis yang sedang berkembang.", price: 299000, billing_duration_enabled: true, billing_duration_type: "month", billing_duration_value: 1 },
    { id: "lifetime", name: "Lifetime", slug: "lifetime", description: "Bayar sekali, akses selamanya.", price: 4990000, billing_duration_enabled: false, billing_duration_type: null, billing_duration_value: null },
  ];

  const sorted = [...fallbackPackages].sort((a, b) => a.price - b.price);
  const popularIndex = sorted.length > 1 ? Math.floor(sorted.length / 2) : -1;

  const featureMap: Record<string, string[]> = {
    trial: ["Akses semua fitur inti", "Hingga 50 servis", "1 cabang", "Laporan dasar", "Email support"],
    pro: ["Servis tanpa batas", "Hingga 3 cabang", "AI Command Center", "Analitik & insight", "Priority support"],
    lifetime: ["Semua fitur Pro", "Cabang & user tak terbatas", "Integrasi & API", "Account manager", "Update seumur hidup"],
  };

  return (
    <section id="pricing" className="relative overflow-hidden border-y border-white/10 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 size-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            Harga
          </motion.span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pilih paket yang tepat untuk toko Anda
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tanpa biaya tersembunyi. Bayar sekali untuk akses selamanya, atau langganan fleksibel.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-8">
          {sorted.map((pkg, i) => {
            const slug = pkg.slug.toLowerCase();
            const isPopular = i === popularIndex;
            const Icon = tierIcon(slug);
            const features = featureMap[slug] ?? ["All core features", "Email support"];
            const isFree = pkg.price === 0;

            const card = (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-2xl border shadow-xs transition-all duration-300",
                  isPopular
                    ? "border-primary/40 bg-gradient-to-b from-primary/[0.08] to-card lg:-mt-4 lg:mb-4"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                )}
              >
                {/* Header section */}
                <div className="border-b border-white/[0.06] p-6 pb-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("flex size-9 items-center justify-center rounded-lg", isPopular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                        <Icon className="size-4.5" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                    </div>
                    <AnimatePresence mode="wait">
                      {isPopular && (
                        <motion.div
                          key="popular-badge"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs font-medium"
                        >
                          <StarIcon className="size-3 fill-current text-primary" />
                          Paling Populer
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-5 flex items-end gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground">
                      {formatPriceCompact(pkg.price)}
                    </span>
                    {!isFree && (
                      <span className="mb-1 text-sm text-muted-foreground">{billingLabel(pkg)}</span>
                    )}
                  </div>

                  {pkg.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{pkg.description}</p>
                  )}
                </div>

                {/* Features */}
                <div className="flex-1 space-y-3 px-6 pt-6 pb-8">
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="size-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="border-t border-white/[0.06] p-4">
                  <Button
                    variant={isPopular ? "default" : "outline"}
                    className={cn("w-full", isPopular && "shadow-lg shadow-primary/20")}
                    onClick={() => handleChoosePlan(pkg)}
                    disabled={loadingId === pkg.id}
                  >
                    {loadingId === pkg.id ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Memproses...
                      </>
                    ) : isFree ? (
                      "Mulai Trial Gratis"
                    ) : (
                      "Pilih Paket"
                    )}
                  </Button>
                </div>
              </motion.div>
            );

            return card;
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Butuh banyak cabang?{" "}
          <a href="mailto:support@seervisio.com?subject=Custom%20Plan" className="font-medium text-primary hover:underline">
            Hubungi tim kami
          </a>{" "}
          untuk penawaran custom.
        </p>
      </div>
    </section>
  );
}

export default PricingSection;
