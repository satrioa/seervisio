"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Watches page navigations by tracking usePathname changes.
 * When the route changes, briefly shows a loading → success sequence
 * in the Dynamic Island so the user gets visual feedback.
 *
 * This is a lightweight alternative to the (unavailable) useNavigation
 * hook — it dispatches the existing custom event that the island's
 * feedback system already handles.
 */
export function RouteTransitionWatcher() {
  const pathname = usePathname();
  const prevRef = useRef(pathname);

  useEffect(() => {
    if (prevRef.current === pathname) return;
    const prev = prevRef.current;
    prevRef.current = pathname;

    // Show brief loading → success when route changes.
    const loadEv = new CustomEvent("seervis:dynamic-island-feedback", {
      detail: { type: "loading", title: "Navigasi…" },
    });
    window.dispatchEvent(loadEv);

    const timer = setTimeout(() => {
      const doneEv = new CustomEvent("seervis:dynamic-island-feedback", {
        detail: { type: "success", title: `Halaman diperbarui`, duration: 800 },
      });
      window.dispatchEvent(doneEv);
    }, 350);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

export default RouteTransitionWatcher;
