"use client";

import { RefObject, useEffect, useRef } from "react";

export function useMousePositionRef(
  containerRef?: RefObject<HTMLElement | null>
) {
  const mouseRef = useRef({ x: -1, y: -1 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      } else {
        mouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [containerRef]);

  return mouseRef;
}
