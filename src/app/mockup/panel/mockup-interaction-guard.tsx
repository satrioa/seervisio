"use client";

import * as React from "react";

function isDashboardTabInteraction(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-slot="tabs-trigger"]'));
}

export function MockupInteractionGuard() {
  React.useEffect(() => {
    const blockNonTabInteraction = (event: Event) => {
      if (isDashboardTabInteraction(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const blockNonTabKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (isDashboardTabInteraction(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("click", blockNonTabInteraction, true);
    document.addEventListener("pointerdown", blockNonTabInteraction, true);
    document.addEventListener("submit", blockNonTabInteraction, true);
    document.addEventListener("keydown", blockNonTabKeyboard, true);

    return () => {
      document.removeEventListener("click", blockNonTabInteraction, true);
      document.removeEventListener("pointerdown", blockNonTabInteraction, true);
      document.removeEventListener("submit", blockNonTabInteraction, true);
      document.removeEventListener("keydown", blockNonTabKeyboard, true);
    };
  }, []);

  return null;
}
