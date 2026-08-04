"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, Globe, Save, Loader2, Check, AlertCircle, ImageUp, RotateCw, X } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dropzone,
  DropZoneArea,
  DropzoneTrigger,
  DropzoneMessage,
  DropzoneFileList,
  DropzoneFileListItem,
  DropzoneFileMessage,
  DropzoneRemoveFile,
  DropzoneRetryFile,
  InfiniteProgress,
  useDropzone,
} from "@/components/ui/dropzone";
import {
  getBrandProfileAction,
  updateBrandProfileAction,
  uploadBrandLogoFileAction,
  type BrandProfileData,
} from "@/server/actions/brand-profile.actions";

export function BrandProfileSettings() {
  const params = useParams<{ brandSlug: string }>();
  const router = useRouter();
  const brandSlug = params?.brandSlug ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<BrandProfileData>({
    storeName: "",
    tagline: null,
    phone: null,
    email: null,
    address: null,
    logoUrl: null,
    whatsappNumber: null,
    invoiceFooter: null,
    receiptFooter: null,
    slug: "",
  });

  useEffect(() => {
    if (!brandSlug) return;
    setLoading(true);
    getBrandProfileAction(brandSlug).then((result) => {
      if (result.success) {
        setForm(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [brandSlug]);

  const handleChange = (field: keyof BrandProfileData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const logoDropzone = useDropzone<string, string>({
    validation: {
      accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
      maxFiles: 1,
      maxSize: 5 * 1024 * 1024,
    },
    onDropFile: async (file) => {
      try {
        const fd = new FormData();
        fd.set("file", file);
        const result = await uploadBrandLogoFileAction(brandSlug, fd);
        if (result.error) return { status: "error", error: result.error };
        return { status: "success", result: result.url ?? "" };
      } catch {
        return { status: "error", error: "Gagal mengunggah logo." };
      }
    },
    onFileUploaded: (url) => setForm((prev) => ({ ...prev, logoUrl: url || null })),
    onRemoveFile: () => setForm((prev) => ({ ...prev, logoUrl: null })),
    shapeUploadError: (e) => e,
  });

  const handleSave = async () => {
    if (!brandSlug) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateBrandProfileAction(brandSlug, form);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (result.data?.newSlug) {
        router.replace(`/${result.data.newSlug}/panel/settings`);
      }
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="size-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Brand Profile</h2>
            <p className="text-xs text-muted-foreground">Kelola profil brand, informasi toko, dan kontak.</p>
          </div>
        </div>
        <Card className="shadow-xs">
          <CardContent className="space-y-4 py-6">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="size-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Brand Profile</h2>
          <p className="text-xs text-muted-foreground">Kelola profil brand, informasi toko, dan kontak.</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Informasi Brand</CardTitle>
          <CardDescription className="text-xs">
            Data brand yang akan ditampilkan di invoice dan receipt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logoUrl" className="text-xs font-medium">Logo Brand</Label>
            <Dropzone {...logoDropzone}>
              <DropZoneArea className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-center transition-colors hover:border-primary/50">
                <Avatar className="size-16">
                  {form.logoUrl ? (
                    <AvatarImage src={form.logoUrl} alt="Logo brand" />
                  ) : null}
                  <AvatarFallback>
                    <ImageUp className="size-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DropzoneTrigger className="cursor-pointer">
                    <span className="text-sm font-medium text-primary">
                      {form.logoUrl ? "Ganti logo" : "Pilih logo"}
                    </span>
                  </DropzoneTrigger>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG, WebP · Maks 5MB
                  </p>
                </div>
              </DropZoneArea>
              <DropzoneMessage />
              <DropzoneFileList className="mt-2">
                {logoDropzone.fileStatuses.map((fs) => (
                  <DropzoneFileListItem key={fs.id} file={fs}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium">{fs.fileName}</span>
                      <div className="flex items-center gap-1">
                        <DropzoneRetryFile>
                          <RotateCw className="size-4" />
                        </DropzoneRetryFile>
                        <DropzoneRemoveFile>
                          <X className="size-4" />
                        </DropzoneRemoveFile>
                      </div>
                    </div>
                    <InfiniteProgress status={fs.status} />
                    <DropzoneFileMessage />
                  </DropzoneFileListItem>
                ))}
              </DropzoneFileList>
            </Dropzone>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName" className="text-xs font-medium">
                Nama Brand <span className="text-destructive">*</span>
              </Label>
              <Input
                id="storeName"
                value={form.storeName}
                onChange={(e) => handleChange("storeName", e.target.value)}
                className="h-9 text-xs"
                placeholder="Nama brand"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline" className="text-xs font-medium">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline ?? ""}
                onChange={(e) => handleChange("tagline", e.target.value)}
                className="h-9 text-xs"
                placeholder="Tagline brand"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-xs font-medium">Alamat</Label>
            <Input
              id="address"
              value={form.address ?? ""}
              onChange={(e) => handleChange("address", e.target.value)}
              className="h-9 text-xs"
              placeholder="Alamat toko"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-xs font-medium">Tautan URL</Label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => handleChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="h-9 pl-8 text-xs font-mono"
                placeholder="nama-toko"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              URL: /<span className="font-mono font-medium text-foreground">{form.slug || "..."}</span>/panel/...
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-medium">Telepon</Label>
              <Input
                id="phone"
                value={form.phone ?? ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="h-9 text-xs"
                placeholder="No. telepon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-9 text-xs"
                placeholder="Email brand"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-xs font-medium">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={form.whatsappNumber ?? ""}
              onChange={(e) => handleChange("whatsappNumber", e.target.value)}
              className="h-9 text-xs"
              placeholder="No. WhatsApp"
            />
          </div>


          <div className="flex justify-end pt-2">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={handleSave}
              disabled={saving || !form.storeName.trim()}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : saved ? (
                <Check className="size-4 text-emerald-400" />
              ) : (
                <Save className="size-4" />
              )}
              {saving ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan Profil"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
