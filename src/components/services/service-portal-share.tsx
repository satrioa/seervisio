"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Check, Phone, ExternalLink, QrCode, Loader2 } from "lucide-react";
import { getServicePortalShareDataAction } from "@/server/actions/customer-portal.actions";

interface Props {
  serviceId: string;
  serviceNumber: string;
  customerName: string;
  deviceInfo: string;
}

export function ServicePortalShare({
  serviceId,
  serviceNumber,
  customerName,
  deviceInfo,
}: Props) {
  const [data, setData] = useState<{
    trackingToken: string | null;
    brandName: string;
    brandSlug: string;
    whatsappNumber: string | null;
    customerPhone: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"link" | "invoice" | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    getServicePortalShareDataAction(serviceId).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [serviceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 p-6">
        <Loader2 className="size-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) return null;

  const { trackingToken, brandName, brandSlug, whatsappNumber, customerPhone } = data;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const trackingUrl = trackingToken ? `${baseUrl}/t/${trackingToken}` : null;

  const message = `Halo ${customerName} 👋

Servis perangkat Anda di *${brandName}* sedang diproses.

📱 ${deviceInfo}
🧾 ${serviceNumber}

Silakan pantau progress servis dan invoice digital melalui tautan berikut:

${trackingUrl}

Melalui halaman tersebut Anda dapat melihat:

✅ Status servis realtime
✅ Timeline pengerjaan
✅ Invoice digital
✅ Riwayat pembayaran
✅ Garansi

Terima kasih 🙏

${brandName}`;

  const waUrl = customerPhone
    ? `https://wa.me/${customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    : whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    : null;

  const copyToClipboard = async (type: "link" | "invoice") => {
    let text: string;
    if (type === "link") {
      text = trackingUrl || `${baseUrl}/track/${brandSlug}?invoice=${serviceNumber}`;
    } else {
      text = `${baseUrl}/track/${brandSlug}?invoice=${serviceNumber}`;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  if (!trackingToken) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-4">
        <p className="text-center text-xs text-gray-400">
          Tracking token belum tersedia. Simpan servis untuk menghasilkan tautan.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center gap-2">
        <Share2 className="size-4 text-gray-500" />
        <h3 className="text-sm font-bold">Bagikan ke Pelanggan</h3>
      </div>

      {!waUrl && (
        <p className="mb-3 text-xs text-gray-400">
          Tambahkan nomor WhatsApp pelanggan untuk mengirim pesan.
        </p>
      )}

      <div className="space-y-2">
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: "#25D366" }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.92)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            <Phone className="size-4" />
            Kirim via WhatsApp
          </a>
        )}

        <button
          type="button"
          onClick={() => copyToClipboard("link")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {copied === "link" ? (
            <>
              <Check className="size-4 text-emerald-500" />
              <span className="text-emerald-600">Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Salin Tautan Tracking
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => copyToClipboard("invoice")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {copied === "invoice" ? (
            <>
              <Check className="size-4 text-emerald-500" />
              <span className="text-emerald-600">Tersalin!</span>
            </>
          ) : (
            <>
              <ExternalLink className="size-4" />
              Salin Tautan Invoice
            </>
          )}
        </button>

        {trackingUrl && (
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <QrCode className="size-4" />
            {showQr ? "Sembunyikan QR Code" : "Tampilkan QR Code"}
          </button>
        )}

        {showQr && trackingUrl && (
          <div className="flex justify-center rounded-xl bg-gray-50 p-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackingUrl)}`}
              alt="QR Code"
              className="size-40 rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
