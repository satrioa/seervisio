"use client";

import * as React from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import Hero from "./default";
import { Badge } from "@/components/ui/badge";
import { IphoneMockup } from "@/components/ui/iphone-mockup";
import { BrowserWindow } from "@/components/ui/mock-browser-window";

const BADGE = (
  <Badge variant="outline" className="animate-appear gap-2">
    <Sparkles className="size-3.5" />
    <span className="text-muted-foreground">Modern Operating System for Repair Shops</span>
  </Badge>
);

const BUTTONS = [
  {
    href: "/signup",
    text: "Mulai Gratis",
    variant: "default" as const,
    iconRight: <ArrowRight className="size-4 ml-1" />,
  },
  {
    href: "/#pricing",
    text: "Lihat Paket",
    variant: "glow" as const,
  },
];

function DashboardMockup() {
  const mockupRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    let cleanup = () => {};

    (async () => {
      const gsapModule = await import("gsap");
      const scrollTriggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        gsap.fromTo(
          mockupRef.current,
          { scale: 0.95 },
          {
            scale: 1.05,
            ease: "power2.out",
            scrollTrigger: {
              trigger: document.body,
              start: "top top",
              end: "+=650",
              scrub: 0.8,
            },
          },
        );
      }, mockupRef);

      cleanup = () => ctx.revert();
    })();

    return () => cleanup();
  }, []);

  const iframe = (
    <iframe
      src="/mockup/panel/dashboard"
      className="h-full w-full border-0"
      title="Seervisio Panel Dashboard"
    />
  );

  return (
    <div ref={mockupRef} className="origin-center will-change-transform">
      <div className="hidden sm:block">
        <BrowserWindow
          variant="chrome"
          headerStyle="full"
          url="https://panel.seervisio.com/dashboard"
          theme="dark"
          className="h-[85vh] w-full max-w-full border-white/10 bg-zinc-950 shadow-2xl shadow-black/40 [&>div:first-child]:bg-sidebar [&>div:first-child]:border-white/10"
        >
          {iframe}
        </BrowserWindow>
      </div>
      <div className="block sm:hidden">
        <IphoneMockup>
          <div className="h-full pt-9">
            {iframe}
          </div>
        </IphoneMockup>
      </div>
    </div>
  );
}

export function SeervisioHero() {
  return (
    <Hero
      title={
        <span className="inline-flex flex-col gap-1">
          <span className="leading-tight">
            Solusi Cerdas untuk
          </span>
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-300 bg-clip-text text-transparent leading-tight">
            Toko Servis Gadget-mu
          </span>
        </span>
      }
      description="Semua kebutuhan operasional toko servis dalam satu platform modern. Cepat, aman, dan terlihat profesional di mata pelanggan."
      badge={BADGE}
      buttons={BUTTONS}
      mockup={<DashboardMockup />}
    />
  );
}
