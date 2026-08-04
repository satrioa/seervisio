"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Type,
  Minus,
  Receipt,
  Undo2,
  Upload,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getBrandSettingsAction,
  saveBrandSettingsAction,
} from "@/server/actions/brand-settings.actions";
import {
  getBrandProfileAction,
  type BrandProfileData,
} from "@/server/actions/brand-profile.actions";
import {
  createDefaultSections,
  migrateReceiptSections,
  SECTION_META,
  type ReceiptSection,
  type ReceiptSectionType,
} from "@/lib/receipt-sections";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/* ─── Sortable Section Card ─── */

function SortableSectionCard({
  section,
  onToggle,
  onRemove,
  onConfigChange,
  isExpanded,
  onToggleExpand,
}: {
  section: ReceiptSection;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onConfigChange: (id: string, config: Record<string, any>) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const meta = SECTION_META[section.type];

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-card transition-shadow ${isDragging ? "shadow-lg ring-2 ring-primary/20" : "shadow-sm hover:shadow-md"} ${!section.enabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          className="mt-1 flex size-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">{section.label}</span>
            {section.locked && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">wajib</span>
            )}
            {!section.enabled && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">tersembunyi</span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.description}</p>

          {section.type === "custom_text" && (
            <div className="mt-2">
              <div className="relative">
                <Type className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={section.config?.text ?? ""}
                  onChange={(e) => onConfigChange(section.id, { ...section.config, text: e.target.value })}
                  className="h-8 pl-8 text-xs"
                  placeholder="Tulis teks kustom..."
                />
              </div>
            </div>
          )}

          {section.type === "store_logo" && (
            <div className="mt-2">
              <Input
                type="file"
                accept="image/*"
                className="h-8 text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    onConfigChange(section.id, { ...section.config, logoUrl: ev.target?.result as string });
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {section.config?.logoUrl && (
                <img src={section.config.logoUrl} alt="Preview" className="mt-1 h-10 w-auto rounded border" />
              )}
            </div>
          )}

          {section.type === "divider" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Style:</span>
              <select
                value={section.config?.style ?? "dashed"}
                onChange={(e) => onConfigChange(section.id, { ...section.config, style: e.target.value })}
                className="h-7 rounded-lg border border-input bg-background px-2 text-[11px] outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="dashed">Putus-putus</option>
                <option value="solid">Garis Solid</option>
                <option value="dotted">Titik-titik</option>
                <option value="double">Garis Dobel</option>
              </select>
            </div>
          )}

          {section.type === "footer" && (
            <div className="mt-2">
              {isExpanded ? (
                <div>
                  <Input
                    value={section.config?.text ?? ""}
                    onChange={(e) => onConfigChange(section.id, { ...section.config, text: e.target.value.slice(0, 50) })}
                    className="h-8 text-xs"
                    placeholder="Teks footer..."
                    maxLength={50}
                    autoFocus
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {section.config?.text?.length ?? 0}/50 karakter
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleExpand(section.id)}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <ChevronRight className="size-3" />
                  {section.config?.text ? (
                    <span className="truncate max-w-[200px]">{section.config.text}</span>
                  ) : (
                    <span>Klik untuk menambahkan teks</span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {section.type !== "order_pricing" && (
            <Switch
              checked={section.enabled}
              onCheckedChange={() => onToggle(section.id)}
              className="scale-75"
            />
          )}
          {!section.locked && (
            <button
              type="button"
              onClick={() => onRemove(section.id)}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

/* ─── Preview ─── */

function PreviewStoreLogo({ section, brand }: { section: ReceiptSection; brand: Pick<BrandProfileData, "logoUrl"> }) {
  if (!section.enabled) return null;
  return (
    <div style={{ textAlign: "center", marginBottom: "6px" }}>
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt="Logo" style={{ display: "block", maxWidth: "120px", maxHeight: "40px", margin: "0 auto", objectFit: "contain" }} />
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 80, height: 40, background: "#f4f4f5", borderRadius: 4, margin: "0 auto" }}>
          <span style={{ fontSize: "7px", color: "#999" }}>No Logo</span>
        </div>
      )}
    </div>
  );
}

function PreviewStoreInfo({ section, brand }: { section: ReceiptSection; brand: Pick<BrandProfileData, "storeName" | "tagline" | "address" | "phone" | "email"> }) {
  if (!section.enabled) return null;
  return (
    <div style={{ textAlign: "center", marginBottom: "6px" }}>
      <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>{brand.storeName}</p>
      {brand.tagline && <p style={{ fontSize: "8px", color: "#666", margin: "2px 0 0" }}>{brand.tagline}</p>}
      {brand.address && <p style={{ fontSize: "8px", color: "#666", margin: "2px 0 0" }}>{brand.address}</p>}
      {brand.phone && <p style={{ fontSize: "8px", color: "#666", margin: 0 }}>Telp: {brand.phone}</p>}
      {brand.email && <p style={{ fontSize: "8px", color: "#666", margin: 0 }}>{brand.email}</p>}
    </div>
  );
}

function PreviewDivider({ section }: { section: ReceiptSection }) {
  if (!section.enabled) return null;
  const style = section.config?.style ?? "dashed";
  return <div style={{ borderTop: `1px ${style === "double" ? "double" : style} #333`, margin: "6px 0" }} />;
}

function PreviewCustomText({ section }: { section: ReceiptSection }) {
  if (!section.enabled || !section.config?.text) return null;
  return <p style={{ fontSize: "9px", textAlign: "center", margin: "4px 0", whiteSpace: "pre-wrap" }}>{section.config.text}</p>;
}

function PreviewOrderPricing({ section }: { section: ReceiptSection }) {
  if (!section.enabled) return null;
  return (
    <>
      <table style={{ width: "100%", fontSize: "9px" }}>
        <tbody>
          <tr><td style={{ color: "#666", width: "30%", verticalAlign: "top", padding: "1px 0" }}>No. Invoice</td><td style={{ fontWeight: 600, padding: "1px 0" }}>SRV-001</td></tr>
          <tr><td style={{ color: "#666", verticalAlign: "top", padding: "1px 0" }}>Tanggal</td><td style={{ padding: "1px 0" }}>22 Jul 2026</td></tr>
          <tr><td style={{ color: "#666", verticalAlign: "top", padding: "1px 0" }}>Pelanggan</td><td style={{ padding: "1px 0" }}>Budi Santoso</td></tr>
          <tr><td style={{ color: "#666", verticalAlign: "top", padding: "1px 0" }}>Perangkat</td><td style={{ padding: "1px 0" }}>Samsung Galaxy S24</td></tr>
          <tr><td style={{ color: "#666", verticalAlign: "top", padding: "1px 0" }}>Keluhan</td><td style={{ padding: "1px 0" }}>LCD retak, touch tidak berfungsi</td></tr>
          <tr><td style={{ color: "#666", verticalAlign: "top", padding: "1px 0" }}>Teknisi</td><td style={{ padding: "1px 0" }}>Andi Teknisi</td></tr>
        </tbody>
      </table>
      <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />
      <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
        <thead>
          <tr><th style={{ textAlign: "left", borderBottom: "1px solid #333", paddingBottom: "2px", fontSize: "8px" }}>Item</th><th style={{ textAlign: "center", borderBottom: "1px solid #333", paddingBottom: "2px", fontSize: "8px" }}>Qty</th><th style={{ textAlign: "right", borderBottom: "1px solid #333", paddingBottom: "2px", fontSize: "8px" }}>Subtotal</th></tr>
        </thead>
        <tbody>
          <tr><td style={{ paddingTop: "2px" }}>LCD Samsung S24</td><td style={{ textAlign: "center", paddingTop: "2px" }}>1</td><td style={{ textAlign: "right", paddingTop: "2px" }}>Rp850.000</td></tr>
          <tr><td style={{ paddingTop: "2px" }}>Flexible Cable</td><td style={{ textAlign: "center", paddingTop: "2px" }}>1</td><td style={{ textAlign: "right", paddingTop: "2px" }}>Rp45.000</td></tr>
        </tbody>
      </table>
      <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />
      <table style={{ width: "100%", fontSize: "9px" }}>
        <tbody>
          <tr><td style={{ fontWeight: 600, padding: "1px 0" }}>Total Biaya</td><td style={{ textAlign: "right", fontWeight: 600, padding: "1px 0" }}>Rp910.000</td></tr>
          <tr><td style={{ color: "#666", padding: "1px 0" }}>Terbayar</td><td style={{ textAlign: "right", color: "#666", padding: "1px 0" }}>Rp500.000</td></tr>
          <tr><td style={{ fontWeight: 600, color: "#333", padding: "1px 0" }}>Sisa Tagihan</td><td style={{ textAlign: "right", fontWeight: 600, color: "#333", padding: "1px 0" }}>Rp410.000</td></tr>
        </tbody>
      </table>
    </>
  );
}

function PreviewPaymentHistory({ section }: { section: ReceiptSection }) {
  if (!section.enabled) return null;
  return (
    <>
      <p style={{ fontSize: "8px", fontWeight: 600, margin: "2px 0", textTransform: "uppercase", color: "#666" }}>Riwayat Pembayaran</p>
      <p style={{ fontSize: "8px", margin: "1px 0" }}>22 Jul 2026 - Rp500.000 (Tunai)</p>
    </>
  );
}

function PreviewQrCode({ section }: { section: ReceiptSection }) {
  if (!section.enabled) return null;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, background: "#f4f4f5", borderRadius: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, background: i % 2 === 0 ? "#333" : "#fff", borderRadius: 0.5 }} />
          ))}
        </div>
      </div>
      <p style={{ fontSize: "7px", color: "#666", margin: "2px 0 0" }}>Scan untuk tracking</p>
    </div>
  );
}

function PreviewBarcode({ section }: { section: ReceiptSection }) {
  if (!section.enabled) return null;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "flex-end", gap: 1, height: 28, padding: "0 4px", background: "#f4f4f5", borderRadius: 4 }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{ width: 2 + (i % 3), height: 12 + (i % 13), background: "#333", borderRadius: 0.5 }} />
        ))}
      </div>
      <p style={{ fontSize: "7px", color: "#666", margin: "2px 0 0" }}>SRV-001</p>
    </div>
  );
}

function PreviewWarranty({ section }: { section: ReceiptSection }) {
  if (!section.enabled) return null;
  return <p style={{ fontSize: "8px", textAlign: "center", color: "#666", margin: "2px 0" }}>Garansi sampai: 22 Okt 2026</p>;
}

function PreviewFooter({ section }: { section: ReceiptSection }) {
  if (!section.enabled) return null;
  return <p style={{ fontSize: "8px", textAlign: "center", color: "#666", margin: "2px 0", whiteSpace: "pre-wrap" }}>{section.config?.text || "Terima kasih telah menggunakan layanan kami"}</p>;
}

function ReceiptPreview({ sections, brand, paperWidth }: { sections: ReceiptSection[]; brand: Pick<BrandProfileData, "storeName" | "tagline" | "logoUrl" | "address" | "phone" | "email" | "receiptFooter">; paperWidth: "58mm" | "80mm" }) {
  const enabled = sections.filter((s) => s.enabled);
  const previewWidth = paperWidth === "58mm" ? "max-w-[260px]" : "max-w-[340px]";

  const render = (s: ReceiptSection) => {
    switch (s.type) {
      case "store_logo": return <PreviewStoreLogo key={s.id} section={s} brand={brand} />;
      case "store_info": return <PreviewStoreInfo key={s.id} section={s} brand={brand} />;
      case "divider": return <PreviewDivider key={s.id} section={s} />;
      case "custom_text": return <PreviewCustomText key={s.id} section={s} />;
      case "order_pricing": return <PreviewOrderPricing key={s.id} section={s} />;
      case "payment_history": return <PreviewPaymentHistory key={s.id} section={s} />;
      case "qr_code": return <PreviewQrCode key={s.id} section={s} />;
      case "barcode": return <PreviewBarcode key={s.id} section={s} />;
      case "warranty": return <PreviewWarranty key={s.id} section={s} />;
      case "footer": return <PreviewFooter key={s.id} section={s} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`w-full ${previewWidth} overflow-hidden rounded-xl border bg-white shadow-sm transition-all`}>
        <div className="border-b bg-muted/30 px-4 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pratinjau Nota</p>
        </div>
        <div className="relative p-4" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "10px", lineHeight: 1.4 }}>
          <div style={{ filter: "grayscale(1)" }}>
            {enabled.length === 0 ? (
              <p style={{ fontSize: "11px", textAlign: "center", color: "#999", padding: "20px 0" }}>Tidak ada section aktif</p>
            ) : (
              enabled.map(render)
            )}
          </div>
          <TextureOverlay texture="paperGrain" opacity={0.5} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */

let uidCounter = 0;
function genId(type: string): string {
  uidCounter++;
  return `${type}-${uidCounter}-${Date.now().toString(36)}`;
}

export function ReceiptSettingsPage() {
  const params = useParams<{ brandSlug: string }>();
  const brandSlug = params?.brandSlug ?? "";

  const [sections, setSections] = React.useState<ReceiptSection[]>([]);
  const [brand, setBrand] = React.useState<Pick<BrandProfileData, "storeName" | "tagline" | "logoUrl" | "address" | "phone" | "email" | "receiptFooter">>({
    storeName: "",
    tagline: null,
    logoUrl: null,
    address: null,
    phone: null,
    email: null,
    receiptFooter: null,
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previewPaperSize, setPreviewPaperSize] = React.useState<"58mm" | "80mm">("80mm");
  const [expandedSectionId, setExpandedSectionId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  React.useEffect(() => {
    if (!brandSlug) return;
    setLoading(true);
    Promise.all([
      getBrandSettingsAction(brandSlug),
      getBrandProfileAction(brandSlug),
    ]).then(([settingsResult, profileResult]) => {
      if (settingsResult.success) {
        setSections(migrateReceiptSections(settingsResult.data.receiptSections));
      } else {
        setError(settingsResult.error);
        setSections(createDefaultSections());
      }
      if (profileResult.success) {
        setBrand({
          storeName: profileResult.data.storeName,
          tagline: profileResult.data.tagline,
          logoUrl: profileResult.data.logoUrl,
          address: profileResult.data.address,
          phone: profileResult.data.phone,
          email: profileResult.data.email,
          receiptFooter: profileResult.data.receiptFooter,
        });
      }
      setLoading(false);
    });
  }, [brandSlug]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleToggle = (id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const handleRemove = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConfigChange = (id: string, config: Record<string, any>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, config } : s)));
  };

  const handleAdd = (type: ReceiptSectionType) => {
    const meta = SECTION_META[type];
    const section: ReceiptSection = {
      id: genId(type),
      type,
      label: meta.label,
      enabled: true,
      locked: type === "order_pricing",
      config: {},
    };
    setSections((prev) => [...prev, section]);
  };

  const handleAddAt = (type: ReceiptSectionType, index: number) => {
    const meta = SECTION_META[type];
    const section: ReceiptSection = {
      id: genId(type),
      type,
      label: meta.label,
      enabled: true,
      locked: false,
      config: {},
    };
    setSections((prev) => {
      const next = [...prev];
      next.splice(index, 0, section);
      return next;
    });
  };

  const handleSave = async () => {
    if (!brandSlug) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveBrandSettingsAction(brandSlug, "receipt_sections", sections);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  const handleResetDefault = () => {
    setSections(createDefaultSections());
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Receipt className="size-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Pengaturan Nota / Receipt</h2>
            <p className="text-xs text-muted-foreground">Sesuaikan tampilan nota cetak untuk servis dan POS.</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const sectionIds = sections.map((s) => s.id);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Receipt className="size-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Pengaturan Nota / Receipt</h2>
             <p className="text-xs text-muted-foreground">
               Atur urutan dan tampilan section pada nota cetak. 
               <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">Rincian Order</span> bersifat wajib.
             </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleResetDefault}>
            <Undo2 className="size-3.5" />
            Reset Default
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4 text-emerald-400" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        {/* Left: Editor */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Susunan Section</p>
                  <p className="text-[11px] text-muted-foreground">Seret untuk mengurutkan. Gunakan toggle untuk menampilkan/menyembunyikan.</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Eye className="size-3.5" />
                  <span>{sections.filter((s) => s.enabled).length}/{sections.length} aktif</span>
                </div>
              </div>
            </div>

            <div className="p-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {sections.map((section, index) => (
                      <React.Fragment key={section.id}>
                        <SortableSectionCard
                          section={section}
                          onToggle={handleToggle}
                          onRemove={handleRemove}
                          onConfigChange={handleConfigChange}
                          isExpanded={expandedSectionId === section.id}
                          onToggleExpand={(id) => setExpandedSectionId(expandedSectionId === id ? null : id)}
                        />
                        {index < sections.length - 1 && (
                          <Popover>
                            <div className="group relative flex h-4 items-center justify-center">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-dashed border-transparent transition-colors group-hover:border-muted-foreground/20" />
                              </div>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="relative z-10 flex size-5 items-center justify-center rounded-full border border-transparent bg-transparent text-transparent opacity-0 transition-all group-hover:border-muted-foreground/30 group-hover:bg-background group-hover:text-muted-foreground group-hover:opacity-100 hover:border-primary hover:text-primary"
                                >
                                  <Plus className="size-3" />
                                </button>
                              </PopoverTrigger>
                            </div>
                            <PopoverContent side="top" align="center" className="w-auto p-1">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() => handleAddAt("custom_text", index + 1)}
                                >
                                  <Type className="size-3" />
                                  Teks Kustom
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs"
                                  onClick={() => handleAddAt("divider", index + 1)}
                                >
                                  <Minus className="size-3" />
                                  Garis Pembatas
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
             </div>
             </div>

         </div>

         {/* Right: Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ReceiptPreview sections={sections} brand={brand} paperWidth={previewPaperSize} />
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-[10px] text-muted-foreground">Ukuran Nota:</span>
            <select
              value={previewPaperSize}
              onChange={(e) => setPreviewPaperSize(e.target.value as "58mm" | "80mm")}
              className="h-7 rounded-md border border-input bg-background px-2 text-[11px] outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="80mm">80 mm</option>
              <option value="58mm">58 mm</option>
            </select>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Pratinjau hanya perkiraan. Tampilan asli menyesuaikan data.</p>
        </div>
      </div>
    </div>
  );
}
