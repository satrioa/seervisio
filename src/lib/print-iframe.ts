"use client";

import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { toast } from "sonner";
import { getInvoiceDataAction } from "@/server/actions/invoice-data.actions";
import { ThermalReceipt } from "@/components/services/thermal-receipt";

let iframeEl: HTMLIFrameElement | null = null;
let printRoot: Root | null = null;

function getIframe(): HTMLIFrameElement {
  if (iframeEl && document.body.contains(iframeEl)) {
    return iframeEl;
  }
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none;";
  document.body.appendChild(iframe);
  iframeEl = iframe;
  return iframe;
}

function waitForImages(root: HTMLElement, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const check = () => {
      const imgs = Array.from(root.querySelectorAll("img"));
      const loaded =
        imgs.length === 0 || imgs.every((img) => img.complete && img.naturalWidth > 0);
      if (loaded || Date.now() - startedAt > timeoutMs) {
        resolve();
        return;
      }
      setTimeout(check, 120);
    };
    check();
  });
}

export async function printInvoiceDataInIframe(data: Parameters<typeof ThermalReceipt>[0]["data"]) {
  const iframe = getIframe();
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    toast.error("Gagal membuka dokumen cetak.");
    return;
  }

  doc.open();
  doc.write("<!DOCTYPE html><html><head><meta charset='utf-8' /></head><body></body></html>");
  doc.close();

  if (printRoot) {
    printRoot.unmount();
    printRoot = null;
  }

  const container = doc.createElement("div");
  doc.body.appendChild(container);
  printRoot = createRoot(container);
  printRoot.render(
    React.createElement(ThermalReceipt, {
      data,
      baseUrl: window.location.origin,
      autoPrint: false,
    })
  );

  await waitForImages(container);

  // ThermalReceipt touches the global document ref to enable its print-only
  // styles; make sure that class never lingers on the panel page.
  document.body.classList.remove("thermal-print-mode");

  win.focus();
  setTimeout(() => win.print(), 150);
}

export async function printInvoiceInIframe(brandSlug: string, serviceId: string) {
  const result = await getInvoiceDataAction(brandSlug, serviceId);
  if (!result.success) {
    toast.error(result.error ?? "Gagal memuat invoice.");
    return;
  }
  await printInvoiceDataInIframe(result.data);
}
