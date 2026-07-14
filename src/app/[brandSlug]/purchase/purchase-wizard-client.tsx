"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  getPackagesListPublicAction,
  createLicenseOrderAction,
  uploadLicenseProofAction,
  getBankTransferInfoAction,
} from "@/server/actions/license.actions";
import type { LicensePackage, BankTransferInfo } from "@/types/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, ArrowRight, Upload, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Pilih Paket" },
  { id: 2, label: "Data Perusahaan" },
  { id: 3, label: "Ringkasan" },
  { id: 4, label: "Upload Bukti" },
  { id: 5, label: "Selesai" },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

interface PurchaseWizardClientProps {
  brandSlug: string;
}

type FormData = {
  packageId: string;
  packageName: string;
  packagePrice: number;
  picName: string;
  picPhone: string;
  companyAddress: string;
  npwp: string;
  invoiceEmail: string;
  notes: string;
};

export function PurchaseWizardClient({ brandSlug }: PurchaseWizardClientProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [packages, setPackages] = React.useState<LicensePackage[]>([]);
  const [bankInfo, setBankInfo] = React.useState<BankTransferInfo | null>(null);
  const [orderId, setOrderId] = React.useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = React.useState<string | null>(null);
  const [totalAmount, setTotalAmount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [filePreview, setFilePreview] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormData>({
    packageId: "",
    packageName: "",
    packagePrice: 0,
    picName: "",
    picPhone: "",
    companyAddress: "",
    npwp: "",
    invoiceEmail: "",
    notes: "",
  });

  React.useEffect(() => {
    async function init() {
      try {
        const [pkgResult, bankResult] = await Promise.all([
          getPackagesListPublicAction(),
          getBankTransferInfoAction(),
        ]);
        if (pkgResult.success) setPackages(pkgResult.data.filter((p) => p.is_active));
        if (bankResult.success) setBankInfo(bankResult.data);
      } catch {
        toast.error("Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const selectPackage = (pkg: LicensePackage) => {
    setForm((prev) => ({
      ...prev,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price,
    }));
    setStep(2);
  };

  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canProceedToStep3 = () => {
    return form.packageId && form.picName.trim() && form.picPhone.trim() && form.invoiceEmail.trim();
  };

  const submitOrder = async () => {
    if (!canProceedToStep3()) return;
    setSubmitting(true);
    try {
      const result = await createLicenseOrderAction(brandSlug, {
        package_id: form.packageId,
        pic_name: form.picName,
        pic_phone: form.picPhone,
        company_address: form.companyAddress,
        npwp: form.npwp || undefined,
        invoice_email: form.invoiceEmail,
        notes: form.notes || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOrderId(result.data.id);
      setInvoiceNumber(result.data.invoice_number);
      setTotalAmount(result.data.total_amount);
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pesanan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 10 * 1024 * 1024) {
      toast.error("File maksimal 10MB.");
      return;
    }

    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "pdf"].includes(ext ?? "")) {
      toast.error("Format file harus JPG, PNG, atau PDF.");
      return;
    }

    setFile(f);
    if (ext !== "pdf") {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  };

  const uploadProof = async () => {
    if (!file || !orderId) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("proof", file);
      const result = await uploadLicenseProofAction(orderId, fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setStep(5);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah.");
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappNumber = "6281234567890";
  const whatsappMessage = encodeURIComponent(
    `Halo Seervisio, saya sudah melakukan pembayaran untuk invoice ${invoiceNumber} sebesar ${formatPrice(totalAmount)}. Mohon diverifikasi. Terima kasih.`
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Stepper */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors sm:size-10 sm:text-sm",
                    step > s.id
                      ? "bg-primary text-primary-foreground"
                      : step === s.id
                        ? "border-2 border-primary bg-primary/10 text-primary"
                        : "border border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {step > s.id ? <Check className="size-4" /> : s.id}
                </div>
                <span
                  className={cn(
                    "hidden text-xs sm:block",
                    step >= s.id ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1",
                    step > s.id ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Pilih Paket */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Pilih Paket License</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilih paket yang sesuai dengan kebutuhan bisnis Anda
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {packages.map((pkg) => {
              const isFree = pkg.price === 0;
              return (
                <Card
                  key={pkg.id}
                  className={cn(
                    "relative cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                    form.packageId === pkg.id && "border-primary ring-1 ring-primary",
                  )}
                  onClick={() => selectPackage(pkg)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold tracking-tight">
                      {isFree ? "Gratis" : `${formatPrice(pkg.price)}`}
                      {!isFree && <span className="text-sm font-normal text-muted-foreground">/bulan</span>}
                    </div>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-green-500" />
                        {pkg.max_branches >= 999 ? "Unlimited" : pkg.max_branches} cabang
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-green-500" />
                        {pkg.max_users >= 999 ? "Unlimited" : pkg.max_users} user
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-3.5 text-green-500" />
                        {pkg.max_storage_mb >= 10000 ? "10GB" : `${pkg.max_storage_mb}MB`} storage
                      </li>
                    </ul>
                    {isFree && (
                      <Badge variant="secondary" className="mt-2">
                        Free - Tidak perlu bayar
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Data Perusahaan */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Data Perusahaan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Lengkapi data untuk invoice
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="picName">Nama PIC *</Label>
                  <Input
                    id="picName"
                    placeholder="Nama penanggung jawab"
                    value={form.picName}
                    onChange={(e) => handleFormChange("picName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="picPhone">No. Telepon PIC *</Label>
                  <Input
                    id="picPhone"
                    placeholder="08xxx"
                    value={form.picPhone}
                    onChange={(e) => handleFormChange("picPhone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAddress">Alamat Perusahaan</Label>
                <Textarea
                  id="companyAddress"
                  placeholder="Alamat lengkap perusahaan"
                  value={form.companyAddress}
                  onChange={(e) => handleFormChange("companyAddress", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="npwp">NPWP</Label>
                  <Input
                    id="npwp"
                    placeholder="XX.XXX.XXX.X-XXX.XXX"
                    value={form.npwp}
                    onChange={(e) => handleFormChange("npwp", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceEmail">Email Invoice *</Label>
                  <Input
                    id="invoiceEmail"
                    type="email"
                    placeholder="email@example.com"
                    value={form.invoiceEmail}
                    onChange={(e) => handleFormChange("invoiceEmail", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  placeholder="Catatan tambahan (opsional)"
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-1.5 size-4" />
              Kembali
            </Button>
            <Button onClick={submitOrder} disabled={!canProceedToStep3() || submitting}>
              {submitting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-1.5 size-4" />
              )}
              Lanjut ke Pembayaran
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Ringkasan + Bank Transfer */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Ringkasan Pesanan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Transfer ke rekening di bawah ini
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detail Pesanan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-mono font-medium">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-medium">{form.packageName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Harga</span>
                  <span>{formatPrice(form.packagePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kode Unik</span>
                  <span className="font-mono font-medium">{totalAmount - form.packagePrice}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total Transfer</span>
                  <span className="font-bold text-primary">{formatPrice(totalAmount)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bank Transfer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {bankInfo && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Bank</span>
                      <p className="font-medium">{bankInfo.bank_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">No. Rekening</span>
                      <p className="font-mono text-lg font-bold tracking-wider">{bankInfo.account_number}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Atas Nama</span>
                      <p className="font-medium">{bankInfo.account_holder}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-1.5 size-4" />
              Kembali
            </Button>
            <Button onClick={() => setStep(4)}>
              Saya Sudah Transfer
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Upload Bukti */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Upload Bukti Transfer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload screenshot atau file bukti transfer Anda
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50"
                  onClick={() => document.getElementById("proof-upload")?.click()}
                >
                  <Upload className="mb-2 size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {file ? file.name : "Klik untuk upload bukti transfer"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG, atau PDF. Maks 10MB.
                  </p>
                  <input
                    id="proof-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {filePreview && (
                  <div className="overflow-hidden rounded-lg border">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-full object-contain"
                    />
                  </div>
                )}

                {file && !filePreview && (
                  <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                    File PDF siap diupload: {file.name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>
              <ArrowLeft className="mr-1.5 size-4" />
              Kembali
            </Button>
            <Button onClick={uploadProof} disabled={!file || submitting}>
              {submitting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-4" />
              )}
              Upload & Konfirmasi
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Selesai */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="size-8 text-green-500" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Pesanan Terkirim!</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Bukti transfer Anda telah terkirim. Tim kami akan memverifikasi pembayaran dan
              mengaktifkan license Anda dalam 1x24 jam.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Invoice: <span className="font-mono font-medium text-foreground">{invoiceNumber}</span>
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                Konfirmasi melalui WhatsApp untuk mempercepat proses verifikasi:
              </p>
              <Button asChild variant="default" className="w-full sm:w-auto">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1.5 size-4" />
                  Konfirmasi via WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push(`/${brandSlug}/panel/dashboard`)}>
              Ke Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
