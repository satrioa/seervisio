"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // Fallback hardcoded data for the landing page (when no packages prop)
  const fallbackPackages: PricingPackage[] = packages ?? [
    { id: "starter", name: "Starter", slug: "starter", description: "Perfect for small shops getting started.", price: 0, billing_duration_enabled: false, billing_duration_type: null, billing_duration_value: null },
    { id: "professional", name: "Professional", slug: "professional", description: "For growing repair businesses.", price: 299000, billing_duration_enabled: true, billing_duration_type: "month", billing_duration_value: 1 },
    { id: "enterprise", name: "Enterprise", slug: "enterprise", description: "For multi-location chains and franchises.", price: 0, billing_duration_enabled: false, billing_duration_type: null, billing_duration_value: null },
  ];

  // The first (cheapest) package is "Best Value", second is "Popular"
  const sorted = [...fallbackPackages].sort((a, b) => a.price - b.price);

  // Build feature lists per package
  const featureMap: Record<string, string[]> = {
    starter: [
      "All core features",
      "Up to 200 services/month",
      "1 branch",
      "Basic reports & analytics",
      "Email support",
    ],
    professional: [
      "Unlimited services",
      "Up to 3 branches",
      "AI Command Center",
      "Advanced analytics & insights",
      "Priority support",
    ],
    enterprise: [
      "Everything in Professional",
      "Unlimited branches & users",
      "Custom integrations & API",
      "Dedicated account manager",
      "SLA guarantee",
      "On-premise option",
    ],
  };

  return (
    <section className="border-y border-border/40 bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that fits your business. No hidden fees.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-8">
          {sorted.map((pkg, i) => {
            const slug = pkg.slug.toLowerCase();
            const isBestValue = i === 0;
            const isPopular = i === 1 && sorted.length > 2;
            const features = featureMap[slug] ?? [
              "All core features",
              "Email support",
            ];

            return (
              <div
                key={pkg.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 transition-all duration-200",
                  isPopular
                    ? "border-primary/50 bg-card shadow-lg shadow-primary/5 scale-[1.02]"
                    : "border-border/50 bg-card hover:shadow-md",
                )}
              >
                {/* Badges */}
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
                  onClick={() => handleChoosePlan(pkg)}
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
    </section>
  );
}
