"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, Check, ShieldCheckIcon, ArrowRight } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { InfiniteRibbon } from "@/components/ui/infinite-ribbon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import type { LicensePackage } from "@/types/license";

const OFFER_END = new Date("2026-09-30T23:59:59+07:00");

function useCountdown(target: Date) {
  const [remaining, setRemaining] = React.useState(target.getTime() - Date.now());

  React.useEffect(() => {
    const tick = () => setRemaining(Math.max(0, target.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return { days, hours, minutes, seconds, expired: remaining <= 0 };
}

interface CountdownUnitProps {
  value: number;
  label: string;
  digits?: Record<number, { max?: number }>;
  minimumIntegerDigits?: number;
}

function CountdownUnit({ value, label, digits, minimumIntegerDigits = 2 }: CountdownUnitProps) {
  return (
    <div className="flex flex-col items-center">
      <NumberFlow
        value={value}
        format={{ minimumIntegerDigits, useGrouping: false }}
        digits={digits}
        className="font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl"
      />
      <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function getPackageFeatures(pkg: NonNullable<ReturnType<typeof usePackageData>["data"]>) {
  const features: string[] = [];
  if (pkg.billing_duration_enabled === false) {
    features.push("Akses semua fitur selamanya");
  }
  features.push(`Hingga ${pkg.max_branches} cabang toko`);
  features.push(`Hingga ${pkg.max_users} pengguna`);
  features.push(`Penyimpanan ${(pkg.max_storage_mb / 1000).toFixed(1)} GB`);
  features.push(`Hingga ${pkg.max_transactions.toLocaleString("id")} transaksi/bulan`);
  features.push("Update & upgrade gratis");
  if (pkg.slug === "enterprise") {
    features.push("Prioritas support 24/7");
  }
  features.push("Garansi 30 hari uang kembali");
  return features;
}

function usePackageData() {
  const [data, setData] = React.useState<LicensePackage | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const { getPackagesListPublicAction } = await import("@/server/actions/license.actions");
        const res = await getPackagesListPublicAction();
        if (res.success) {
          const pkg = res.data.find((p) => p.id === "e95aa2e6-0fef-41ba-9651-d2c88a603054");
          if (pkg) setData(pkg);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { data, loading };
}

export function OfferSection() {
  const router = useRouter();
  const { days, hours, minutes, seconds, expired } = useCountdown(OFFER_END);
  const [buying, setBuying] = React.useState(false);
  const pkg = usePackageData();

  const features = pkg.data ? getPackageFeatures(pkg.data) : [];

  const handleBuyLifetime = async () => {
    if (!pkg.data) return;
    setBuying(true);
    try {
      const mod = await import("@/server/actions/checkout.actions");
      const result = await mod.createCheckoutSessionAction({ packageId: pkg.data.id });
      if (!result.success) {
        console.error("Failed to create checkout session:", result.error);
        setBuying(false);
        return;
      }
      router.push(`/checkout?token=${encodeURIComponent(result.data.token)}`);
    } catch {
      setBuying(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      {/* Ribbon — full bleed */}
      <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw]">
        <InfiniteRibbon duration={18} className="text-sm font-semibold tracking-widest sm:text-base">
          ✦ Special Offer ✦ Terbatas 
        </InfiniteRibbon>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          {expired ? (
            <p className="text-lg font-medium text-muted-foreground">Penawaran telah berakhir</p>
          ) : (
            <>
              <p className="mb-4 text-sm font-medium text-muted-foreground">
                Penawaran berakhir dalam
              </p>
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <CountdownUnit value={days} label="Hari" minimumIntegerDigits={1} />
                <span className="mb-6 text-2xl font-light text-muted-foreground/40">:</span>
                <CountdownUnit value={hours} label="Jam" digits={{ 1: { max: 2 } }} />
                <span className="mb-6 text-2xl font-light text-muted-foreground/40">:</span>
                <CountdownUnit value={minutes} label="Menit" digits={{ 1: { max: 5 } }} />
                <span className="mb-6 text-2xl font-light text-muted-foreground/40">:</span>
                <CountdownUnit value={seconds} label="Detik" digits={{ 1: { max: 5 } }} />
              </div>
            </>
          )}
        </motion.div>

        {/* Offer Card — MagicCard with gradient border */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mx-auto mt-10 max-w-xl"
        >
          <MagicCard
            mode="gradient"
            gradientFrom="#2da871"
            gradientTo="#007d46"
            gradientSize={300}
            gradientOpacity={0.5}
            className="rounded-2xl"
          >
            <div className="flex flex-col gap-6 p-8">
            <hr className="via-primary absolute top-0 left-[10%] h-[1px] w-[80%] border-0 bg-linear-to-r from-transparent to-transparent" />
            
             {pkg.data ? (
              <>
              <div className="relative z-10 flex flex-col items-center gap-5 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Crown className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{pkg.data.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pkg.data.description || "Akses semua fitur selamanya, tanpa biaya berulang."}
                  </p>
                </div>
              </div>

              <hr className="border-input relative z-10" />

              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium text-muted-foreground line-through">
                    Rp {(pkg.data.price * 1.6).toLocaleString("id")}
                  </span>
                  <Badge variant="brand" size="sm">38% off</Badge>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-muted-foreground">Rp</span>
                  <span className="text-5xl font-bold">{pkg.data.price.toLocaleString("id")}</span>
                  <span className="text-sm text-muted-foreground">/seumur hidup</span>
                </div>

                <p className="text-sm text-muted-foreground">Harga spesial untuk pemesanan pertama!</p>

                <ul className="mt-2 flex flex-col gap-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                    <Button
                      size="lg"
                      className="w-full gap-2 border-0 bg-[#33c081] text-white hover:bg-[#2da871]"
                      onClick={handleBuyLifetime}
                      disabled={buying}
                    >
                   {buying ? (
                     <>
                       <span className="size-4 animate-spin inline-block border-2 border-white/30 border-t-white rounded-full" />
                       Memproses...
                     </>
                   ) : (
                    <>
                      Beli Sekarang
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>

              <div className="relative z-10 flex items-center justify-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                <ShieldCheckIcon className="size-4" />
                <span>Akses semua fitur tanpa biaya tersembunyi</span>
              </div>
              </>
            ) : null}
            </div>
          </MagicCard>
        </motion.div>
      </div>
    </section>
  );
}
