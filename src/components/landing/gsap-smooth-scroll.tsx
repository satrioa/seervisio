"use client";

import * as React from "react";

export function GsapSmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanup = () => {};

    (async () => {
      const gsapModule = await import("gsap");
      const scrollToModule = await import("gsap/ScrollToPlugin");
      const gsap = gsapModule.gsap;
      const ScrollToPlugin = scrollToModule.ScrollToPlugin;

      gsap.registerPlugin(ScrollToPlugin);

      let targetY = window.scrollY;
      let currentY = window.scrollY;
      let isAnimating = false;
      const maxScroll = () =>
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

      const tick = () => {
        currentY += (targetY - currentY) * 0.14;
        if (Math.abs(targetY - currentY) < 0.5) {
          currentY = targetY;
          isAnimating = false;
          gsap.ticker.remove(tick);
        }
        window.scrollTo(0, currentY);
      };

      const startTicker = () => {
        if (isAnimating) return;
        isAnimating = true;
        gsap.ticker.add(tick);
      };

      const handleWheel = (event: WheelEvent) => {
        if (event.ctrlKey || event.metaKey || event.defaultPrevented) return;
        event.preventDefault();
        targetY = Math.min(maxScroll(), Math.max(0, targetY + event.deltaY));
        startTicker();
      };

      const handleScroll = () => {
        if (isAnimating) return;
        targetY = window.scrollY;
        currentY = window.scrollY;
      };

      const handleAnchorClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"], a[href^="/#"]');
        if (!anchor) return;

        const hash = anchor.hash;
        if (!hash) return;

        const element = document.querySelector(hash);
        if (!element) return;

        event.preventDefault();
        const y = element.getBoundingClientRect().top + window.scrollY;
        targetY = Math.min(maxScroll(), Math.max(0, y));
        currentY = window.scrollY;
        gsap.ticker.remove(tick);
        isAnimating = false;
        gsap.to(window, {
          duration: 0.9,
          ease: "power3.out",
          scrollTo: { y: targetY, autoKill: true },
          onUpdate: () => {
            currentY = window.scrollY;
          },
          onComplete: () => {
            targetY = window.scrollY;
            currentY = window.scrollY;
          },
        });
      };

      window.addEventListener("wheel", handleWheel, { passive: false });
      window.addEventListener("scroll", handleScroll, { passive: true });
      document.addEventListener("click", handleAnchorClick);

      cleanup = () => {
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("scroll", handleScroll);
        document.removeEventListener("click", handleAnchorClick);
        gsap.ticker.remove(tick);
      };
    })();

    return () => cleanup();
  }, []);

  return null;
}
