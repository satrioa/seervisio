"use client";

import { useCallback, useRef } from "react";

const DURATION = 350;
const GLOW_DURATION = 200;

interface UseThemeTransitionOptions {
  onToggle: () => void;
}

export function useThemeTransition({ onToggle }: UseThemeTransitionOptions) {
  const glowingRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const cleanupOverlay = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.remove();
      overlayRef.current = null;
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const island = document.querySelector<HTMLElement>("[data-island-root]");
    const supportsViewTransition = "startViewTransition" in document;

    if (!island || !supportsViewTransition) {
      onToggle();
      return;
    }

    const rect = island.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    document.documentElement.style.setProperty("--transition-origin-x", `${cx}px`);
    document.documentElement.style.setProperty("--transition-origin-y", `${cy}px`);

    // Blur-pulse overlay
    const overlay = document.createElement("div");
    overlayRef.current = overlay;
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      clip-path: circle(0% at ${cx}px ${cy}px);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      background: radial-gradient(circle at ${cx}px ${cy}px, rgba(255,255,255,0.06) 0%, transparent 60%);
      animation: blur-pulse-expand ${DURATION}ms ease-in-out forwards;
    `;
    document.body.appendChild(overlay);

    // Start glow
    glowingRef.current = true;
    island.dataset.islandGlow = "true";

    const transition = (document as any).startViewTransition(() => {
      onToggle();
    });

    // Fade glow during the reveal
    const glowTimer = setTimeout(() => {
      if (island.dataset.islandGlow) {
        island.dataset.islandGlow = "fading";
      }
    }, GLOW_DURATION);

    transition.finished.finally(() => {
      glowingRef.current = false;
      delete island.dataset.islandGlow;
      clearTimeout(glowTimer);
      cleanupOverlay();
      document.documentElement.style.removeProperty("--transition-origin-x");
      document.documentElement.style.removeProperty("--transition-origin-y");
    });
  }, [onToggle, cleanupOverlay]);

  return { toggleTheme };
}
