"use client";

import {
  type PrinterSettings,
  DEFAULT_PRINTER_SETTINGS,
} from "./printer-types";

const STORAGE_KEY = "seervisio_printer_settings";

export function loadPrinterSettings(): PrinterSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PRINTER_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRINTER_SETTINGS };
    return JSON.parse(raw) as PrinterSettings;
  } catch {
    return { ...DEFAULT_PRINTER_SETTINGS };
  }
}

export function savePrinterSettings(settings: PrinterSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage full or unavailable — silently ignore */
  }
}

export function clearPrinterSettings(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
