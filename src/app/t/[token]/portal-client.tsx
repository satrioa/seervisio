"use client";

import { useState, useMemo, useEffect, Fragment, type CSSProperties } from "react";
import type { PortalData } from "@/server/actions/customer-portal.actions";
import { ServiceActivityTimeline } from "@/components/services/service-activity-timeline";
import type { TimelineEvent, TimelineEventType } from "@/components/services/service-data";
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
  Phone,
  MapPin,
  Calendar,
  Package,
  User,
  Smartphone,
  Award,
  Activity,
  LifeBuoy,
  MessageCircle,
} from "lucide-react";
import { submitTestimonialAction, checkTestimonialExistsAction } from "@/server/actions/customer-portal.actions";

interface Props {
  data: PortalData;
}

const CARD_CLASS = "rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm";

function SectionHeader({
  icon: Icon,
  title,
  primaryColor,
}: {
  icon: any;
  title: string;
  primaryColor: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
      >
        <Icon className="size-4" />
      </span>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
    </div>
  );
}

function formatShortDay(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
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
    <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/70 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        {logoUrl ? (
          <img src={logoUrl} alt={brand.name} className="size-9 rounded-xl object-contain" />
        ) : (
          <div
            className="flex size-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <Wrench className="size-5" style={{ color: primaryColor }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-gray-900">
            {brand.settings?.storeName || brand.name}
          </h1>
          <p className="truncate text-[11px] text-gray-500">Portal Servis</p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm"
          style={{
            backgroundColor: STATUS_COLORS[service.currentStatus] + "15",
            color: STATUS_COLORS[service.currentStatus],
            borderColor: STATUS_COLORS[service.currentStatus] + "40",
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

function ProgressTimeline({
  service,
  primaryColor,
}: {
  service: PortalData["service"];
  primaryColor: string;
}) {
  const statusSet = new Set(service.statusTimeline.map((t) => t.status));
  const isCancelled = service.currentStatus === "CANCELLED";
  const currentIdx = STATUS_ORDER.indexOf(service.currentStatus);
  const lastReachedIdx = service.statusTimeline.reduce((acc, t) => {
    const i = STATUS_ORDER.indexOf(t.status);
    return i > acc ? i : acc;
  }, -1);
  const cancelIdx = isCancelled ? Math.max(0, lastReachedIdx) : -1;

  return (
    <div className={CARD_CLASS}>
      <SectionHeader icon={Activity} title="Progress Pengerjaan" primaryColor={primaryColor} />
      <div className="flex items-start">
        {STATUS_ORDER.map((status, idx) => {
          const timelineEntry = service.statusTimeline.find((t) => t.status === status);
          const isReached = statusSet.has(status) || status === "INTAKE";
          const isCurrent = idx === currentIdx && !isCancelled;
          const showX = idx === cancelIdx;
          const reached = isReached && !isCancelled;

          return (
            <Fragment key={status}>
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                    showX
                      ? "bg-red-500"
                      : isCurrent
                      ? "bg-emerald-500 ring-4 ring-emerald-100"
                      : reached
                      ? "bg-emerald-400"
                      : "border-2 border-gray-300 bg-white"
                  }`}
                >
                  {showX ? (
                    <XCircle className="size-3.5 text-white" />
                  ) : reached ? (
                    <CheckCircle2 className="size-3.5 text-white" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-gray-300" />
                  )}
                </div>
                <p
                  className={`mt-1.5 px-0.5 text-center text-[10px] leading-tight ${
                    showX
                      ? "font-semibold text-red-600"
                      : isCurrent
                      ? "font-bold text-emerald-700"
                      : reached
                      ? "font-medium text-gray-700"
                      : "font-medium text-gray-400"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </p>
                {timelineEntry && (
                  <p className="mt-0.5 text-center text-[9px] text-gray-400">
                    {formatShortDay(timelineEntry.timestamp)}
                  </p>
                )}
              </div>
              {idx < STATUS_ORDER.length - 1 && (
                <div
                  className={`mt-3.5 h-0.5 flex-1 rounded-full ${
                    isReached && !isCancelled ? "bg-emerald-300" : "bg-gray-200"
                  }`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
      <div className="mt-5">
        <ServiceActivityBlock service={service} />
      </div>
    </div>
  );
}

type TimelineEntry = PortalData["service"]["statusTimeline"][number];

const LIGHT_TIMELINE_THEME: CSSProperties = {
  "--background": "oklch(1 0 0)",
  "--foreground": "oklch(0.145 0 0)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.145 0 0)",
  "--muted": "oklch(0.97 0 0)",
  "--muted-foreground": "oklch(0.556 0 0)",
  "--border": "oklch(0.922 0 0)",
  "--color-background": "oklch(1 0 0)",
  "--color-foreground": "oklch(0.145 0 0)",
  "--color-card": "oklch(1 0 0)",
  "--color-card-foreground": "oklch(0.145 0 0)",
  "--color-muted": "oklch(0.97 0 0)",
  "--color-muted-foreground": "oklch(0.556 0 0)",
  "--color-border": "oklch(0.922 0 0)",
} as CSSProperties;

function derivePortalEventType(entry: TimelineEntry): TimelineEventType {
  const reason = entry.reason ?? "";
  if (reason.startsWith("Teknisi dihapus")) return "TECHNICIAN_UNASSIGNED";
  if (reason.startsWith("Teknisi ditugaskan") || reason.startsWith("Teknisi berubah")) return "TECHNICIAN_ASSIGNED";
  if (reason.startsWith("DP diterima")) return "PAYMENT_CREATED";
  if (reason.startsWith("Sparepart")) return "SPAREPART_ADDED";
  if (reason.startsWith("Pembayaran")) return "PAYMENT_RECEIVED";
  if (reason.startsWith("Tagihan")) return "BILLING_SET";
  if (reason.startsWith("Unit diserahkan")) return "SERVICE_PICKED_UP";
  if (!entry.fromStatus) return "SERVICE_CREATED";
  if (entry.fromStatus === "CANCELLED" && entry.toStatus === "INTAKE") return "SERVICE_REOPENED";
  return "STATUS_CHANGED";
}

function buildTimelineEvents(timeline: TimelineEntry[]): TimelineEvent[] {
  return timeline
    .filter((entry) => {
      const eventType = derivePortalEventType(entry);
      return eventType !== "SPAREPART_ADDED" && eventType !== "SPAREPART_REMOVED";
    })
    .map((entry, idx) => {
      const eventType = derivePortalEventType(entry);
      const actor = entry.actor ?? "Sistem";
      const createdAt = entry.timestamp ?? new Date().toISOString();
      const fromLabel = entry.fromStatus ? STATUS_LABELS[entry.fromStatus] || entry.fromStatus : null;
      const toLabel = entry.toStatus ? STATUS_LABELS[entry.toStatus] || entry.toStatus : null;

      let title: string;
      let description: string;

      switch (eventType) {
        case "SERVICE_CREATED":
          title = "Servis dibuat";
          description = "Servis baru dibuat.";
          break;
        case "STATUS_CHANGED":
          title = "Status berubah";
          description =
            fromLabel && toLabel && fromLabel !== toLabel
              ? `${fromLabel} → ${toLabel}`
              : entry.reason || "Status servis berubah.";
          break;
        case "TECHNICIAN_ASSIGNED": {
          title = "Teknisi ditugaskan";
          const name = (entry.reason ?? "")
            .replace(/^Teknisi (ditugaskan|berubah):\s*/, "")
            .replace(/\s*→.*$/, "")
            .trim();
          description = name ? `${name} ditugaskan sebagai teknisi.` : "Teknisi ditugaskan.";
          break;
        }
        case "TECHNICIAN_UNASSIGNED":
          title = "Teknisi dihapus";
          description = "Teknisi dihapus dari servis.";
          break;
        case "PAYMENT_CREATED":
          title = "Tagihan dibuat";
          description = entry.reason || "Tagihan dibuat.";
          break;
        case "PAYMENT_RECEIVED":
          title = "Pembayaran diterima";
          description = entry.reason || "Pembayaran diterima.";
          break;
        case "SPAREPART_ADDED":
          title = "Sparepart ditambahkan";
          description = entry.reason || "Sparepart ditambahkan.";
          break;
        case "BILLING_SET":
          title = "Tagihan diperbarui";
          description = entry.reason || "Tagihan diperbarui.";
          break;
        case "SERVICE_PICKED_UP":
          title = "Perangkat diambil";
          description = entry.reason || "Perangkat telah diserahkan kepada pelanggan.";
          break;
        case "SERVICE_REOPENED":
          title = "Servis dibuka kembali";
          description = "Servis dibuka kembali untuk diproses.";
          break;
        default:
          title = "Aktivitas";
          description = entry.reason || "Aktivitas servis.";
      }

      return {
        id: `${idx}-${eventType}-${entry.toStatus ?? entry.status}`,
        eventType,
        title,
        description,
        actor,
        createdAt,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

function ServiceActivityBlock({ service }: { service: PortalData["service"] }) {
  const events = useMemo(() => buildTimelineEvents(service.statusTimeline), [service.statusTimeline]);

  return (
    <div style={LIGHT_TIMELINE_THEME}>
      <ServiceActivityTimeline events={events} />
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  primaryColor,
}: {
  icon: any;
  label: string;
  value: string;
  primaryColor: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-gray-900">{value || "-"}</p>
      </div>
    </div>
  );
}

function DigitalInvoice({
  service,
  primaryColor,
}: {
  service: PortalData["service"];
  primaryColor: string;
}) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className={CARD_CLASS}>
      <SectionHeader icon={FileText} title="Invoice Digital" primaryColor={primaryColor} />

      <div className="space-y-2">
        <InfoCard icon={FileText} label="Nomor Invoice" value={service.serviceNumber} primaryColor={primaryColor} />
        <InfoCard icon={Smartphone} label="Perangkat" value={`${service.deviceBrand || ""} ${service.deviceModel || ""}`.trim() || "-"} primaryColor={primaryColor} />
        <InfoCard icon={Package} label="Tipe" value={service.deviceType || "-"} primaryColor={primaryColor} />
        <InfoCard icon={Award} label="IMEI / Serial" value={service.deviceImei || service.deviceSerialNumber || "-"} primaryColor={primaryColor} />
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
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <InfoCard icon={MessageSquare} label="Keluhan" value={service.reportedIssue} primaryColor={primaryColor} />
          {service.diagnosisResult && (
            <InfoCard icon={Wrench} label="Diagnosa" value={service.diagnosisResult} primaryColor={primaryColor} />
          )}
          {service.solutionNotes && (
            <InfoCard icon={FileText} label="Solusi" value={service.solutionNotes} primaryColor={primaryColor} />
          )}
          <InfoCard icon={User} label="Teknisi" value={service.technicianName || "-"} primaryColor={primaryColor} />
          <InfoCard icon={Calendar} label="Tanggal Masuk" value={formatDateTime(service.intakeAt)} primaryColor={primaryColor} />
          {service.doneAt && (
            <InfoCard icon={Calendar} label="Selesai" value={formatDateTime(service.doneAt)} primaryColor={primaryColor} />
          )}
          <InfoCard icon={Clock} label="Estimasi Biaya" value={formatCurrency(service.estimatedCost)} primaryColor={primaryColor} />
          <InfoCard icon={CreditCard} label="Total Biaya" value={formatCurrency(service.finalCost || service.estimatedCost)} primaryColor={primaryColor} />
        </div>
      )}

      {service.spareparts.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
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
    <div className={CARD_CLASS}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
          <CreditCard className="size-4" />
        </span>
        <h3 className="text-sm font-bold text-gray-900">Pembayaran</h3>
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
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200/60 bg-white px-4 py-3">
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
    <div className={CARD_CLASS}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
          <Shield className="size-4" />
        </span>
        <h3 className="text-sm font-bold text-gray-900">Garansi</h3>
      </div>

      <div className={`rounded-xl border p-4 ${isExpired ? "border-gray-200/60 bg-gray-50" : "border-emerald-200/60 bg-emerald-50"}`}>
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
    <div className={CARD_CLASS}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
          <MessageSquare className="size-4" />
        </span>
        <h3 className="text-sm font-bold text-gray-900">Catatan Servis</h3>
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
  primaryColor,
}: {
  service: PortalData["service"];
  brandId: number;
  primaryColor: string;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);

  useEffect(() => {
    if (service.currentStatus === "DONE") {
      checkTestimonialExistsAction(service.id).then(setAlreadyExists);
    }
  }, [service.id, service.currentStatus]);

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
    <div className={CARD_CLASS}>
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
        >
          <Star className="size-4" />
        </span>
        <h3 className="text-sm font-bold text-gray-900">Beri Penilaian</h3>
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
            className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-300 focus:ring-0"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
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
    <div className={CARD_CLASS}>
      <h3 className="mb-4 text-sm font-bold text-gray-900">Pertanyaan Umum</h3>
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

function HelpSection({
  brand,
  service,
}: {
  brand: PortalData["brand"];
  service: PortalData["service"];
}) {
  const s = brand.settings;
  const primaryColor = s?.themePrimaryColor ?? "#3B82F6";
  const whatsappNumber = s?.whatsappNumber;
  const phone = s?.phone;
  const storeName = s?.storeName || brand.name;

  const message = `Halo ${storeName}, saya ingin bertanya tentang servis saya (${service.serviceNumber}).`;
  const waUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <div className={CARD_CLASS}>
      <SectionHeader icon={LifeBuoy} title="Butuh Bantuan?" primaryColor={primaryColor} />
      <p className="text-sm text-gray-500">
        Ada pertanyaan seputar status servis, pembayaran, atau garansi? Tim kami siap membantu
        Anda.
      </p>
      <div className="mt-4 space-y-2">
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-95"
            style={{ backgroundColor: "#25D366" }}
          >
            <MessageCircle className="size-4" />
            Chat Admin via WhatsApp
          </a>
        ) : phone ? (
          <a
            href={`tel:${phone}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-95"
            style={{ backgroundColor: "#25D366" }}
          >
            <Phone className="size-4" />
            Hubungi Admin
          </a>
        ) : null}
      </div>
    </div>
  );
}

function BrandFooter({ brand }: { brand: PortalData["brand"] }) {
  const s = brand.settings;
  const primaryColor = s?.themePrimaryColor ?? "#3B82F6";

  return (
    <footer className="border-t border-gray-200/60 bg-white py-8">
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

        <div className="mt-6 border-t border-gray-200/60 pt-4">
          <p className="text-[10px] text-gray-400">&copy; 2026 {brand.name}. All rights reserved.</p>
          <p className="mt-0.5 text-[10px] text-gray-300">Powered by Seervisio</p>
        </div>
      </div>
    </footer>
  );
}

function ServiceSummaryCard({
  service,
  primaryColor,
}: {
  service: PortalData["service"];
  primaryColor: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}66)` }}
      />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Nomor Invoice</p>
            <p className="text-lg font-bold" style={{ color: primaryColor }}>
              {service.serviceNumber}
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm"
            style={{
              backgroundColor: STATUS_COLORS[service.currentStatus] + "15",
              color: STATUS_COLORS[service.currentStatus],
              borderColor: STATUS_COLORS[service.currentStatus] + "40",
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
            <User className="size-4" style={{ color: `${primaryColor}88` }} />
            <span className="text-sm text-gray-700">{service.customerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="size-4" style={{ color: `${primaryColor}88` }} />
            <span className="text-sm text-gray-700">
              {[service.deviceBrand, service.deviceModel].filter(Boolean).join(" ") || "-"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4" style={{ color: `${primaryColor}88` }} />
            <span className="text-sm text-gray-400">
              Estimasi selesai: <span className="text-gray-700">{formatDate(service.estimatedCompletion)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortalClient({ data }: Props) {
  const { service, brand, payments, paymentSummary, publicNotes, faqs } = data;
  const primaryColor = brand.settings?.themePrimaryColor ?? "#3B82F6";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 text-gray-900">
      <style>{`
        :root { --brand-primary: ${primaryColor}; }
      `}</style>

      <PortalHeader brand={brand} service={service} />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="space-y-4">
          <ServiceSummaryCard service={service} primaryColor={primaryColor} />
          <ProgressTimeline service={service} primaryColor={primaryColor} />
          <DigitalInvoice service={service} primaryColor={primaryColor} />
          <PaymentSection summary={paymentSummary} payments={payments} />
          <WarrantySection service={service} />
          <PublicNotesSection notes={publicNotes} />
          <TestimonialSection service={service} brandId={brand.id} primaryColor={primaryColor} />
          <FaqSection faqs={faqs} />
          <HelpSection brand={brand} service={service} />
        </div>
      </main>

      <BrandFooter brand={brand} />
    </div>
  );
}
