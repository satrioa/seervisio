"use client";

import { useCallback, useRef } from "react";

const DURATION = 300;
const GLOW_DURATION = 200;

interface UseThemeTransitionOptions {
  onToggle: () => void;
}

export function useThemeTransition({ onToggle }: UseThemeTransitionOptions) {
  const glowingRef = useRef(false);

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
      document.documentElement.style.removeProperty("--transition-origin-x");
      document.documentElement.style.removeProperty("--transition-origin-y");
    });
  }, [onToggle]);

  return { toggleTheme };
}
