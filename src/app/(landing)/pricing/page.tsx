import type { Metadata } from "next";
import { getActivePackages } from "@/server/repositories/license.repository";
import { PricingSection } from "@/components/landing/pricing-section";
import { CtaSection } from "@/components/landing/cta-section";

export const metadata: Metadata = {
  title: "Pricing — Seervisio",
  description: "Simple, transparent pricing for repair shops of all sizes.",
};

export default async function PricingPage() {
  const packages = await getActivePackages();

  return (
    <>
      <div className="pt-24">
        <div className="mx-auto max-w-7xl px-4 pt-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Choose the plan that fits your business. No hidden fees.
          </p>
        </div>
        <PricingSection packages={packages} />
      </div>
      <CtaSection />
    </>
  );
}
