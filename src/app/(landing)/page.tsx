import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/hero-section";
import { TrustedBy } from "@/components/landing/trusted-by";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { AiSection } from "@/components/landing/ai-section";
import { WorkflowSection } from "@/components/landing/workflow-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { TestimonialsSection } from "@/components/landing/testimonials";
import { CtaSection } from "@/components/landing/cta-section";

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

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      {/* <TrustedBy /> */}
      <FeatureGrid />
      <AiSection />
      <WorkflowSection />
      <PricingSection />
      <TestimonialsSection />
      <CtaSection />
    </>
  );
}
