"use client";

type ToggleHandler = () => void;

let activeToggle: ToggleHandler | null = null;
let listenerAttached = false;

function handleKeyDown(event: KeyboardEvent) {
  if (event.repeat) return;
  if (event.altKey || event.shiftKey) return;
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.key.toLowerCase() !== "k") return;
  event.preventDefault();
  event.stopPropagation();
  activeToggle?.();
}

/**
 * Registers the global Ctrl/Cmd+K command palette toggle.
 * The most recently registered callback wins, guaranteeing exactly one
 * palette responds to the shortcut even when several are mounted.
 * Returns an unsubscribe function.
 */
export function registerCommandPaletteShortcut(toggle: ToggleHandler): () => void {
  activeToggle = toggle;
  if (!listenerAttached) {
    document.addEventListener("keydown", handleKeyDown);
    listenerAttached = true;
  }
  return () => {
    if (activeToggle === toggle) {
      activeToggle = null;
      if (listenerAttached) {
        document.removeEventListener("keydown", handleKeyDown);
        listenerAttached = false;
      }
    }
  };
}
