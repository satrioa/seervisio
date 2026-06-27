"use client";

import { useState } from "react";
import { Search, Smartphone, ClipboardList, ChevronDown, ChevronUp, Wrench, Clock, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

import { trackServiceAction, type TrackedServiceData } from "@/server/actions/tracking.actions";

interface Props {
  brandSlug: string;
  brandName: string;
  primaryColor: string;
  logoUrl: string | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

const STATUS_LABELS: Record<string, string> = {
  INTAKE: "Diterima",
  DIAGNOSIS: "Diagnosa",
  WAITING_APPROVAL: "Menunggu Persetujuan",
  REPAIRING: "Perbaikan",
  QC: "Quality Control",
  DONE: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_COLORS: Record<string, string> = {
  INTAKE: "bg-blue-500",
  DIAGNOSIS: "bg-purple-500",
  WAITING_APPROVAL: "bg-orange-500",
  REPAIRING: "bg-amber-500",
  QC: "bg-cyan-500",
  DONE: "bg-emerald-500",
  CANCELLED: "bg-red-500",
};

const STATUS_ORDER = ["INTAKE", "DIAGNOSIS", "WAITING_APPROVAL", "REPAIRING", "QC", "DONE"];

export default function TrackingClient({ brandSlug, brandName, primaryColor, logoUrl }: Props) {
  const [invoice, setInvoice] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TrackedServiceData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice.trim() && !phone.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    const result = await trackServiceAction(brandSlug, {
      invoice: invoice.trim() || undefined,
      phone: phone.trim() || undefined,
    });

    if (result.success) {
      setResults(result.data);
      if (result.data.length === 0) {
        setError("Tidak ditemukan perbaikan dengan data tersebut.");
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <style>{`
        :root { --brand-primary: ${primaryColor}; }
        .btn-primary { background-color: ${primaryColor}; }
        .btn-primary:hover { filter: brightness(0.92); }
        .text-brand { color: ${primaryColor}; }
        .border-brand { border-color: ${primaryColor}; }
      `}</style>

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: primaryColor + "15" }}>
            <Wrench className="size-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <h1 className="text-sm font-bold">{brandName}</h1>
            <p className="text-[11px] text-gray-500">Tracking Perbaikan</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-lg font-semibold">Cek Status Perbaikan</h2>
          <p className="mt-1 text-sm text-gray-500">
            Masukkan nomor invoice atau nomor WhatsApp untuk melacak progress perbaikan.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-8 space-y-3">
          <div className="relative">
            <ClipboardList className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Nomor Invoice (contoh: SRV-001)"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/10"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">ATAU</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="relative">
            <Smartphone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              placeholder="Nomor WhatsApp (contoh: 08123456789)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!invoice.trim() && !phone.trim())}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-xs transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Search className="size-4" />
            )}
            {loading ? "Mencari..." : "Cari Perbaikan"}
          </button>
        </form>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-medium text-gray-500">
              Ditemukan {results.length} perbaikan
            </p>

            {results.map((service) => {
              const isExpanded = expandedId === service.id;
              const statusColor = STATUS_COLORS[service.currentStatus] || "bg-gray-500";

              return (
                <div key={service.id} className="overflow-hidden rounded-2xl border bg-white shadow-xs">
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold">{service.serviceNumber}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{service.customerName}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusColor.replace("bg-", "bg-").replace("-500", "-100")} ${statusColor.replace("bg-", "text-").replace("-500", "-700")}`}>
                        <span className={`size-1.5 rounded-full ${statusColor}`} />
                        {STATUS_LABELS[service.currentStatus] || service.currentStatus}
                    </span>
                  </div>

                  {service.trackingToken && (
                    <a
                      href={`/t/${service.trackingToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition-all"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <ExternalLink className="size-3.5" />
                      Buka Portal Servis
                    </a>
                  )}

                  <div className="mb-4 flex items-center gap-4 text-xs text-gray-500">
                      <span>{service.deviceBrand || service.deviceType || "-"}</span>
                      {service.deviceModel && <span>{service.deviceModel}</span>}
                      {service.branchName && <span>{service.branchName}</span>}
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      {STATUS_ORDER.map((status, idx) => {
                        const currentIdx = STATUS_ORDER.indexOf(service.currentStatus);
                        const isActive = idx <= currentIdx;
                        const isCancelled = service.currentStatus === "CANCELLED";

                        return (
                          <div key={status} className="flex items-center gap-2">
                            {idx > 0 && (
                              <div className={`h-px w-4 ${isActive && !isCancelled ? "bg-emerald-400" : "bg-gray-200"}`} />
                            )}
                            <div className={`flex size-6 items-center justify-center rounded-full ${
                              isCancelled && idx > currentIdx
                                ? "bg-gray-100"
                                : isActive
                                ? service.currentStatus === "CANCELLED" && idx === currentIdx
                                  ? "bg-red-100"
                                  : "bg-emerald-100"
                                : "bg-gray-100"
                            }`}>
                              {isActive && !isCancelled ? (
                                <CheckCircle2 className={`size-3.5 ${idx === currentIdx ? "text-emerald-500" : "text-emerald-400"}`} />
                              ) : isCancelled && idx === currentIdx ? (
                                <XCircle className="size-3.5 text-red-500" />
                              ) : (
                                <div className="size-2 rounded-full bg-gray-300" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="size-3.5" />
                      <span>Masuk: {formatDateTime(service.intakeAt)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : service.id)}
                    className="flex w-full items-center justify-center gap-1.5 border-t px-4 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
                  >
                    {isExpanded ? (
                      <>Sembunyikan detail <ChevronUp className="size-3.5" /></>
                    ) : (
                      <>Lihat detail <ChevronDown className="size-3.5" /></>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t bg-gray-50/50 px-4 pb-4 pt-3">
                      <div className="space-y-3">
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Informasi Perangkat</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-gray-400">Tipe:</span> {service.deviceType || "-"}</div>
                            <div><span className="text-gray-400">Brand:</span> {service.deviceBrand || "-"}</div>
                            <div><span className="text-gray-400">Model:</span> {service.deviceModel || "-"}</div>
                            {service.deviceImei && <div><span className="text-gray-400">IMEI:</span> {service.deviceImei}</div>}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Keluhan</p>
                          <p className="text-xs text-gray-700">{service.reportedIssue}</p>
                        </div>

                        {service.diagnosisResult && (
                          <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Diagnosa</p>
                            <p className="text-xs text-gray-700">{service.diagnosisResult}</p>
                          </div>
                        )}

                        {service.spareparts.length > 0 && (
                          <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Sparepart Digunakan</p>
                            <div className="space-y-1">
                              {service.spareparts.map((sp, i) => (
                                <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                                  <span>{sp.name} x{sp.qty}</span>
                                  <span className="font-medium">{formatCurrency(sp.totalPrice)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {service.statusTimeline.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Timeline</p>
                            <div className="space-y-0">
                              {service.statusTimeline.map((entry, i) => (
                                <div key={i} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`size-2 rounded-full ${STATUS_COLORS[entry.status] || "bg-gray-300"}`} />
                                    {i < service.statusTimeline.length - 1 && <div className="w-px flex-1 bg-gray-200" />}
                                  </div>
                                  <div className="pb-3">
                                    <p className="text-xs font-medium">{STATUS_LABELS[entry.status] || entry.status}</p>
                                    <p className="text-[10px] text-gray-400">{formatDateTime(entry.timestamp)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                            <span className="text-xs font-medium">Total Biaya</span>
                            <span className="text-sm font-bold" style={{ color: primaryColor }}>
                              {formatCurrency(service.finalCost || service.estimatedCost)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-2.5">
                            <span className="text-xs font-medium">Terbayar</span>
                            <span className={`text-sm font-semibold ${service.remainingAmount <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                              {formatCurrency(service.paidAmount)}
                            </span>
                          </div>
                          {service.remainingAmount > 0 && (
                            <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-2.5">
                              <span className="text-xs font-medium text-red-700">Sisa Tagihan</span>
                              <span className="text-sm font-bold text-red-600">
                                {formatCurrency(service.remainingAmount)}
                              </span>
                            </div>
                          )}
                        </div>

                        {service.technicianName && (
                          <p className="text-center text-[10px] text-gray-400">
                            Ditangani oleh: {service.technicianName}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t bg-white py-6 text-center text-xs text-gray-400">
        <p>&copy; 2026 {brandName}. All rights reserved.</p>
        <p className="mt-1">Powered by Seervisio</p>
      </footer>
    </div>
  );
}
