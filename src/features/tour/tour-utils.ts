/**
 * Tour utility functions for robust DOM interaction and navigation.
 * Used by TourManager to ensure elements exist before highlighting.
 */

/**
 * Wait for an element to appear in the DOM.
 * Uses MutationObserver + requestAnimationFrame for robust detection.
 * @param selector - CSS selector for the target element
 * @param timeout - Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves with the element or null if timeout
 */
export function waitForElement(
  selector: string,
  timeout = 10000,
): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const startTime = Date.now();
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;

    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const check = () => {
      const element = document.querySelector(selector);
      if (element) {
        cleanup();
        resolve(element);
        return;
      }

      if (Date.now() - startTime > timeout) {
        cleanup();
        resolve(null);
        return;
      }

      rafId = requestAnimationFrame(check);
    };

    // Use MutationObserver to detect DOM changes
    observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        cleanup();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Start polling with requestAnimationFrame
    rafId = requestAnimationFrame(check);
  });
}

/**
 * Wait for a route change to complete (Next.js router.push).
 * Monitors pathname changes and waits for rendering to settle.
 * @param targetPath - Expected pathname after navigation
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when route matches or timeout
 */
export function waitForRoute(
  targetPath: string,
  timeout = 5000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      const currentPath = window.location.pathname;
      
      // Check if we're on the target route (or a sub-route of it)
      if (currentPath === targetPath || currentPath.startsWith(targetPath + '/')) {
        // Wait a bit for rendering to settle
        setTimeout(() => resolve(true), 300);
        return;
      }

      if (Date.now() - startTime > timeout) {
        resolve(false);
        return;
      }

      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
}

/**
 * Scroll an element into view smoothly.
 * @param element - Target element to scroll to
 * @param options - ScrollIntoView options
 */
export function scrollTargetIntoView(
  element: Element,
  options: ScrollIntoViewOptions = {
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  },
): void {
  element.scrollIntoView(options);
}

/**
 * Check if an element is visible in the viewport.
 * @param element - Element to check
 * @returns true if element is visible
 */
export function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= windowHeight &&
    rect.right <= windowWidth
  );
}

/**
 * Auto-open a dialog if the target element is inside one.
 * Looks for dialog triggers and clicks them if the dialog is not open.
 * @param targetSelector - Selector of the element that should be inside the dialog
 * @returns Promise that resolves when dialog is open or not needed
 */
export async function openDialogIfNeeded(
  targetSelector: string,
): Promise<void> {
  // Check if target already exists (dialog might already be open)
  const target = document.querySelector(targetSelector);
  if (target) {
    return;
  }

  // Look for common dialog trigger patterns
  // This is heuristic-based and may need adjustment per component
  const possibleTriggers = [
    // Look for buttons that might open the dialog
    'button[data-tour="branch-create"]',
    'button[data-tour="account-create"]',
    'button[data-tour="new-service"]',
  ];

  for (const triggerSelector of possibleTriggers) {
    const trigger = document.querySelector(triggerSelector);
    if (trigger && trigger instanceof HTMLElement) {
      // Click the trigger to open the dialog
      trigger.click();
      
      // Wait for dialog to render
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Check if target now exists
      const newTarget = document.querySelector(targetSelector);
      if (newTarget) {
        return;
      }
    }
  }
}

/**
 * Auto-expand accordion/tabs/collapse if target is hidden inside.
 * Looks for common expand triggers and clicks them.
 * @param targetSelector - Selector of the element that should be visible
 * @returns Promise that resolves when element is visible or not expandable
 */
export async function expandAccordionIfNeeded(
  targetSelector: string,
): Promise<void> {
  const target = document.querySelector(targetSelector);
  if (!target) {
    return;
  }

  // Check if element is visible
  if (isElementVisible(target)) {
    return;
  }

  // Look for parent accordion/collapse containers
  const parent = target.closest('[data-state="closed"], .accordion-item:not(.open), details:not([open])');
  if (parent) {
    // Try to find and click expand trigger
    const trigger = parent.querySelector('[data-state="closed"], .accordion-trigger, summary');
    if (trigger && trigger instanceof HTMLElement) {
      trigger.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

/**
 * Wait for an element and ensure it's ready for highlighting.
 * Combines waitForElement, scrollTargetIntoView, openDialogIfNeeded, and expandAccordionIfNeeded.
 * @param selector - CSS selector for the target element
 * @param options - Configuration options
 * @returns Promise that resolves with the element or null
 */
export async function highlightAfterRender(
  selector: string,
  options: {
    timeout?: number;
    autoOpenDialog?: boolean;
    autoExpandAccordion?: boolean;
    scrollToView?: boolean;
  } = {},
): Promise<Element | null> {
  const {
    timeout = 10000,
    autoOpenDialog = true,
    autoExpandAccordion = true,
    scrollToView = true,
  } = options;

  // Try to auto-open dialog if needed
  if (autoOpenDialog) {
    await openDialogIfNeeded(selector);
  }

  // Wait for element to appear
  const element = await waitForElement(selector, timeout);
  if (!element) {
    return null;
  }

  // Auto-expand accordion if needed
  if (autoExpandAccordion) {
    await expandAccordionIfNeeded(selector);
  }

  // Scroll into view if needed
  if (scrollToView && !isElementVisible(element)) {
    scrollTargetIntoView(element);
    // Wait for scroll to complete
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return element;
}

/**
 * Check if an element exists and is ready.
 * Quick check without waiting.
 * @param selector - CSS selector
 * @returns true if element exists
 */
export function elementExists(selector: string): boolean {
  return document.querySelector(selector) !== null;
}

/**
 * Get the bounding rect of an element relative to the viewport.
 * Useful for calculating popover positioning.
 * @param element - Target element
 * @returns DOMRect or null if element doesn't exist
 */
export function getElementRect(element: Element): DOMRect | null {
  if (!element) return null;
  return element.getBoundingClientRect();
}

/**
 * Calculate optimal popover position based on element position and viewport.
 * Returns the best side (top, bottom, left, right) to place the popover.
 * @param element - Target element
 * @param popoverWidth - Expected popover width (default: 340px)
 * @param popoverHeight - Expected popover height (default: 200px)
 * @returns Optimal position: 'top' | 'bottom' | 'left' | 'right'
 */
export function calculateOptimalPosition(
  element: Element,
  popoverWidth = 340,
  popoverHeight = 200,
): 'top' | 'bottom' | 'left' | 'right' {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const spaceAbove = rect.top;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceLeft = rect.left;
  const spaceRight = viewportWidth - rect.right;

  // Check if element is near edges
  const nearTop = rect.top < popoverHeight + 20;
  const nearBottom = viewportHeight - rect.bottom < popoverHeight + 20;
  const nearLeft = rect.left < popoverWidth + 20;
  const nearRight = viewportWidth - rect.right < popoverWidth + 20;

  // Prefer bottom if there's space
  if (!nearBottom && spaceBelow > popoverHeight + 20) {
    return 'bottom';
  }

  // Try top
  if (!nearTop && spaceAbove > popoverHeight + 20) {
    return 'top';
  }

  // Try right
  if (!nearRight && spaceRight > popoverWidth + 20) {
    return 'right';
  }

  // Try left
  if (!nearLeft && spaceLeft > popoverWidth + 20) {
    return 'left';
  }

  // Fallback to bottom (most common)
  return 'bottom';
}
