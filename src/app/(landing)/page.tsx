import type { Metadata } from "next";
import { SeervisioHero } from "@/components/sections/hero/seervisio-hero";
import { BentoSection } from "@/components/landing/bento-section";
import { OfferSection } from "@/components/landing/offer-section";
import { FeatureSection } from "@/components/feature-section";
import { AiSection } from "@/components/landing/ai-section";
import { WorkflowSection } from "@/components/landing/workflow-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { TestimonialsSection } from "@/components/landing/testimonials";
import { SeervisioFaq } from "@/components/sections/faq/seervisio-faq";
import { SeervisioCta } from "@/components/sections/cta/seervisio-cta";
import { getActivePackages } from "@/server/repositories/license.repository";

export const metadata: Metadata = {
  title: "Seervisio — The Modern Operating System for Repair Shops",
  description:
    "Everything your repair business needs. Service management, POS, inventory, finance, CRM, and AI — all in one beautiful platform.",
  openGraph: {
    title: "Seervisio — The Modern Operating System for Repair Shops",
    description:
      "Everything your repair business needs. Service management, POS, inventory, finance, CRM, and AI — all in one beautiful platform.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seervisio — The Modern Operating System for Repair Shops",
    description:
      "Everything your repair business needs. Service management, POS, inventory, finance, CRM, and AI — all in one beautiful platform.",
  },
};

export default async function LandingPage() {
  const packages = await getActivePackages();

  return (
    <>
      <SeervisioHero />
      <BentoSection />
      <OfferSection />
      <TestimonialsSection />
      <PricingSection packages={packages} />
      <SeervisioFaq />
      <SeervisioCta />
    </>
  );
}
