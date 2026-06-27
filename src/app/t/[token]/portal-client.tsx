"use client";

import { useState, useMemo } from "react";
import type { PortalData } from "@/server/actions/customer-portal.actions";
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_ORDER,
} from "@/lib/customer-portal/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  ChevronDown,
  ChevronUp,
  Star,
  Send,
  CreditCard,
  Shield,
  FileText,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Phone,
  ChevronRight,
  MapPin,
  Building,
  Calendar,
  Package,
  User,
  Smartphone,
  Award,
} from "lucide-react";
import { submitTestimonialAction, checkTestimonialExistsAction } from "@/server/actions/customer-portal.actions";

interface Props {
  data: PortalData;
}

function PortalHeader({
  brand,
  service,
}: {
  brand: PortalData["brand"];
  service: PortalData["service"];
}) {
  const primaryColor = brand.settings?.themePrimaryColor ?? "#3B82F6";
  const logoUrl = brand.settings?.logoUrl ?? null;

  return (
    <header
      className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm"
      style={{ borderColor: primaryColor + "20" }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        {logoUrl ? (
          <img src={logoUrl} alt={brand.name} className="size-9 rounded-xl object-contain" />
        ) : (
          <div
            className="flex size-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: primaryColor + "15" }}
          >
            <Wrench className="size-5" style={{ color: primaryColor }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">
            {brand.settings?.storeName || brand.name}
          </h1>
          <p className="text-[11px] text-gray-500 truncate">Portal Servis</p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{
            backgroundColor: STATUS_COLORS[service.currentStatus] + "15",
            color: STATUS_COLORS[service.currentStatus],
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[service.currentStatus] }}
          />
          {STATUS_LABELS[service.currentStatus] || service.currentStatus}
        </span>
      </div>
    </header>
  );
}

function ProgressTimeline({ service }: { service: PortalData["service"] }) {
  const primaryColor = "#10B981";
  const statusSet = new Set(service.statusTimeline.map((t) => t.status));

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <h3 className="mb-4 text-sm font-bold">Progress Pengerjaan</h3>
      <div className="space-y-0">
        {STATUS_ORDER.map((status, idx) => {
          const timelineEntry = service.statusTimeline.find((t) => t.status === status);
          const isReached = statusSet.has(status) || status === "INTAKE";
          const isCurrent = status === service.currentStatus;
          const isCancelled = service.currentStatus === "CANCELLED";

          return (
            <div key={status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                    isCancelled && isCurrent
                      ? "bg-red-500"
                      : isCurrent
                      ? "bg-emerald-500 shadow-md shadow-emerald-200"
                      : isReached
                      ? "bg-emerald-400"
                      : "bg-gray-100"
                  }`}
                >
                  {isCancelled && isCurrent ? (
                    <XCircle className="size-3.5 text-white" />
                  ) : isReached ? (
                    <CheckCircle2 className="size-3.5 text-white" />
                  ) : (
                    <div className="size-2 rounded-full bg-gray-300" />
                  )}
                </div>
                {idx < STATUS_ORDER.length - 1 && (
                  <div
                    className={`w-px flex-1 ${
                      isReached && !isCancelled ? "bg-emerald-200" : "bg-gray-100"
                    }`}
                    style={{ minHeight: "24px" }}
                  />
                )}
              </div>
              <div className={`pb-4 ${idx === STATUS_ORDER.length - 1 ? "pb-0" : ""}`}>
                <p
                  className={`text-sm font-medium ${
                    isCancelled && isCurrent
                      ? "text-red-600"
                      : isCurrent
                      ? "text-emerald-700"
                      : isReached
                      ? "text-gray-700"
                      : "text-gray-400"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </p>
                {timelineEntry && (
                  <p className="text-xs text-gray-400">{formatDateTime(timelineEntry.timestamp)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
      <div className="mt-0.5 shrink-0">
        <Icon className="size-4 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-gray-900 break-words">{value || "-"}</p>
      </div>
    </div>
  );
}

function DigitalInvoice({ service }: { service: PortalData["service"] }) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="size-4 text-gray-500" />
        <h3 className="text-sm font-bold">Invoice Digital</h3>
      </div>

      <div className="space-y-2">
        <InfoCard icon={FileText} label="Nomor Invoice" value={service.serviceNumber} />
        <InfoCard icon={Smartphone} label="Perangkat" value={`${service.deviceBrand || ""} ${service.deviceModel || ""}`.trim() || "-"} />
        <InfoCard icon={Package} label="Tipe" value={service.deviceType || "-"} />
        <InfoCard icon={Award} label="IMEI / Serial" value={service.deviceImei || service.deviceSerialNumber || "-"} />
      </div>

      <div className="mt-3">
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
        >
          {showAll ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {showAll ? "Sembunyikan detail" : "Lihat detail lengkap"}
        </button>
      </div>

      {showAll && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <InfoCard icon={MessageSquare} label="Keluhan" value={service.reportedIssue} />
          {service.diagnosisResult && (
            <InfoCard icon={Wrench} label="Diagnosa" value={service.diagnosisResult} />
          )}
          {service.solutionNotes && (
            <InfoCard icon={FileText} label="Solusi" value={service.solutionNotes} />
          )}
          <InfoCard icon={User} label="Teknisi" value={service.technicianName || "-"} />
          <InfoCard icon={Calendar} label="Tanggal Masuk" value={formatDateTime(service.intakeAt)} />
          {service.doneAt && (
            <InfoCard icon={Calendar} label="Selesai" value={formatDateTime(service.doneAt)} />
          )}
          <InfoCard icon={Clock} label="Estimasi Biaya" value={formatCurrency(service.estimatedCost)} />
          <InfoCard icon={CreditCard} label="Total Biaya" value={formatCurrency(service.finalCost || service.estimatedCost)} />
        </div>
      )}

      {service.spareparts.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 text-xs font-semibold text-gray-600">Sparepart Digunakan</p>
          <div className="space-y-1">
            {service.spareparts.map((sp, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-700">
                  {sp.name} <span className="text-xs text-gray-400">x{sp.qty}</span>
                </span>
                <span className="font-medium text-gray-900">{formatCurrency(sp.totalPrice)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentSection({
  summary,
  payments,
}: {
  summary: PortalData["paymentSummary"];
  payments: PortalData["payments"];
}) {
  const statusConfig = {
    PAID: { label: "Lunas", color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
    PARTIAL: { label: "Angsuran", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" },
    UNPAID: { label: "Belum Dibayar", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500" },
  };

  const cfg = statusConfig[summary.status];

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="size-4 text-gray-500" />
        <h3 className="text-sm font-bold">Pembayaran</h3>
      </div>

      <div className={`rounded-xl p-4 ${cfg.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Status Pembayaran</p>
            <p className={`mt-0.5 text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
          </div>
          <div className={`size-3 rounded-full ${cfg.dot}`} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-gray-400">Total</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(summary.totalBill)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Dibayar</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(summary.totalPaid)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Sisa</p>
            <p className={`text-sm font-bold ${summary.remaining > 0 ? "text-red-600" : "text-gray-400"}`}>
              {formatCurrency(summary.remaining)}
            </p>
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-gray-600">Riwayat Pembayaran</p>
          <div className="space-y-2">
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-gray-700">{p.paymentNumber}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{p.paymentMethod || "-"}</span>
                    {p.paidAt && (
                      <>
                        <span>•</span>
                        <span>{formatDate(p.paidAt)}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(p.grossAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WarrantySection({ service }: { service: PortalData["service"] }) {
  if (!service.warrantyUntil) return null;

  const warrantyDate = new Date(service.warrantyUntil);
  const isExpired = warrantyDate < new Date();

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="size-4 text-gray-500" />
        <h3 className="text-sm font-bold">Garansi</h3>
      </div>

      <div className={`rounded-xl border p-4 ${isExpired ? "border-gray-200 bg-gray-50" : "border-emerald-200 bg-emerald-50"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Status Garansi</p>
            <p className={`mt-0.5 text-sm font-bold ${isExpired ? "text-gray-500" : "text-emerald-700"}`}>
              {isExpired ? "Kedaluwarsa" : "Aktif"}
            </p>
          </div>
          <div className={`size-3 rounded-full ${isExpired ? "bg-gray-300" : "bg-emerald-500"}`} />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Berlaku hingga: {formatDate(service.warrantyUntil)}
        </p>
      </div>
    </div>
  );
}

function PublicNotesSection({ notes }: { notes: PortalData["publicNotes"] }) {
  if (!notes.length) return null;

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="size-4 text-gray-500" />
        <h3 className="text-sm font-bold">Catatan Servis</h3>
      </div>
      <div className="space-y-3">
        {notes.map((note, i) => (
          <div key={i} className="rounded-xl bg-gray-50 p-3">
            <p className="text-sm text-gray-700">{note.note}</p>
            {note.createdAt && (
              <p className="mt-1 text-[10px] text-gray-400">{formatDateTime(note.createdAt)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialSection({
  service,
  brandId,
}: {
  service: PortalData["service"];
  brandId: number;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);

  useState(() => {
    if (service.currentStatus === "DONE") {
      checkTestimonialExistsAction(service.id).then(setAlreadyExists);
    }
  });

  if (service.currentStatus !== "DONE" || alreadyExists || submitted) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);

    const result = await submitTestimonialAction(
      service.id,
      brandId,
      service.customerName,
      rating,
      comment || undefined,
    );

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <div className="mb-3 flex items-center gap-2">
        <Star className="size-4 text-gray-500" />
        <h3 className="text-sm font-bold">Beri Penilaian</h3>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600">
          {error}
        </div>
      )}

      {submitted ? (
        <div className="rounded-xl bg-emerald-50 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700">Terima kasih atas penilaian Anda!</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`size-7 ${
                    star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tulis komentar Anda (opsional)..."
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none transition-colors focus:border-gray-300 focus:ring-0"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: "#10B981" }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.92)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
          >
            {submitting ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="size-4" />
            )}
            {submitting ? "Mengirim..." : "Kirim Penilaian"}
          </button>
        </>
      )}
    </div>
  );
}

function FaqSection({ faqs }: { faqs: PortalData["faqs"] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!faqs.length) return null;

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <h3 className="mb-4 text-sm font-bold">Pertanyaan Umum</h3>
      <div className="space-y-2">
        {faqs.map((faq) => (
          <div key={faq.id} className="rounded-xl border border-gray-100">
            <button
              type="button"
              onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700"
            >
              <span>{faq.question}</span>
              <ChevronDown
                className={`size-4 shrink-0 text-gray-400 transition-transform ${
                  openId === faq.id ? "rotate-180" : ""
                }`}
              />
            </button>
            {openId === faq.id && (
              <div className="border-t border-gray-100 px-4 pb-3 pt-2">
                <p className="text-sm text-gray-500">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppShareSection({
  brand,
  service,
}: {
  brand: PortalData["brand"];
  service: PortalData["service"];
}) {
  const [copied, setCopied] = useState<"link" | "invoice" | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const trackingUrl = `${baseUrl}/t/${service.trackingToken}`;

  const whatsappNumber = brand.settings?.whatsappNumber;
  const brandName = brand.settings?.storeName || brand.name;

  const message = `Halo ${service.customerName} 👋

Servis perangkat Anda di *${brandName}* sedang diproses.

📱 ${service.deviceBrand || ""} ${service.deviceModel || ""}
🧾 ${service.serviceNumber}

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

  const waUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    : null;

  const copyToClipboard = async (type: "link" | "invoice") => {
    const text = type === "link" ? trackingUrl : `${baseUrl}/track/${brand.slug}?invoice=${service.serviceNumber}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center gap-2">
        <Share2 className="size-4 text-gray-500" />
        <h3 className="text-sm font-bold">Bagikan ke Pelanggan</h3>
      </div>

      <div className="space-y-2">
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-95"
            style={{ backgroundColor: "#25D366" }}
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
              <Copy className="size-4" />
              Salin Tautan Invoice
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function BrandFooter({ brand }: { brand: PortalData["brand"] }) {
  const s = brand.settings;
  const primaryColor = s?.themePrimaryColor ?? "#3B82F6";

  return (
    <footer className="border-t bg-white py-8">
      <div className="mx-auto max-w-lg px-4 text-center">
        {s?.logoUrl && (
          <img src={s.logoUrl} alt={brand.name} className="mx-auto mb-3 h-8 object-contain" />
        )}

        <p className="text-sm font-bold text-gray-800">{s?.storeName || brand.name}</p>
        {s?.tagline && <p className="mt-0.5 text-xs text-gray-400">{s.tagline}</p>}

        <div className="mt-4 space-y-1.5 text-xs text-gray-500">
          {s?.address && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(s.address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 hover:text-gray-700">
              <MapPin className="size-3" /> {s.address}
            </a>
          )}
          {s?.phone && (
            <a href={`tel:${s.phone}`} className="flex items-center justify-center gap-1.5 hover:text-gray-700">
              <Phone className="size-3" /> {s.phone}
            </a>
          )}
          {s?.whatsappNumber && (
            <a href={`https://wa.me/${s.whatsappNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 hover:text-gray-700">
              <Phone className="size-3" /> WhatsApp
            </a>
          )}
        </div>

        <div className="mt-6 border-t pt-4">
          <p className="text-[10px] text-gray-400">&copy; 2026 {brand.name}. All rights reserved.</p>
          <p className="mt-0.5 text-[10px] text-gray-300">Powered by Seervisio</p>
        </div>
      </div>
    </footer>
  );
}

function ServiceSummaryCard({ service }: { service: PortalData["service"] }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Nomor Invoice</p>
          <p className="text-lg font-bold text-gray-900">{service.serviceNumber}</p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{
            backgroundColor: STATUS_COLORS[service.currentStatus] + "15",
            color: STATUS_COLORS[service.currentStatus],
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[service.currentStatus] }}
          />
          {STATUS_LABELS[service.currentStatus] || service.currentStatus}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="size-4 text-gray-400" />
          <span className="text-sm text-gray-700">{service.customerName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className="size-4 text-gray-400" />
          <span className="text-sm text-gray-700">
            {[service.deviceBrand, service.deviceModel].filter(Boolean).join(" ") || "-"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-gray-400" />
          <span className="text-sm text-gray-400">
            Estimasi selesai: <span className="text-gray-700">{formatDate(service.estimatedCompletion)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function PortalClient({ data }: Props) {
  const { service, brand, payments, paymentSummary, publicNotes, faqs } = data;
  const primaryColor = brand.settings?.themePrimaryColor ?? "#3B82F6";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <style>{`
        :root { --brand-primary: ${primaryColor}; }
      `}</style>

      <PortalHeader brand={brand} service={service} />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="space-y-4">
          <ServiceSummaryCard service={service} />
          <ProgressTimeline service={service} />
          <DigitalInvoice service={service} />
          <PaymentSection summary={paymentSummary} payments={payments} />
          <WarrantySection service={service} />
          <PublicNotesSection notes={publicNotes} />
          <TestimonialSection service={service} brandId={brand.id} />
          <FaqSection faqs={faqs} />
          <WhatsAppShareSection brand={brand} service={service} />
        </div>
      </main>

      <BrandFooter brand={brand} />
    </div>
  );
}
