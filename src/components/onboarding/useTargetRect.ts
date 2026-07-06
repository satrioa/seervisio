import { useEffect, useState, useLayoutEffect } from 'react';

export function useTargetRect(selector: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(selector);
      if (element) {
        setRect(element.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    updateRect();

    let rafId: number;
    const handleResizeOrScroll = () => {
      rafId = requestAnimationFrame(updateRect);
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      cancelAnimationFrame(rafId);
    };
  }, [selector]);

  return rect;
}
