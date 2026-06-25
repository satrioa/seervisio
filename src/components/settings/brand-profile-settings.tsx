"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Building2, Save, Loader2, Check, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBrandProfileAction,
  updateBrandProfileAction,
  type BrandProfileData,
} from "@/server/actions/brand-profile.actions";

export function BrandProfileSettings() {
  const params = useParams<{ brandSlug: string }>();
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

  const handleChange = (field: keyof BrandProfileData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value || null }));
  };

  const handleSave = async () => {
    if (!brandSlug) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateBrandProfileAction(brandSlug, form);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName" className="text-xs font-medium">
                Nama Toko / Brand <span className="text-destructive">*</span>
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

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="logoUrl" className="text-xs font-medium">Logo URL</Label>
              <Input
                id="logoUrl"
                value={form.logoUrl ?? ""}
                onChange={(e) => handleChange("logoUrl", e.target.value)}
                className="h-9 text-xs"
                placeholder="URL logo brand"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoiceFooter" className="text-xs font-medium">Footer Invoice</Label>
              <Input
                id="invoiceFooter"
                value={form.invoiceFooter ?? ""}
                onChange={(e) => handleChange("invoiceFooter", e.target.value)}
                className="h-9 text-xs"
                placeholder="Teks footer invoice"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptFooter" className="text-xs font-medium">Footer Receipt</Label>
              <Input
                id="receiptFooter"
                value={form.receiptFooter ?? ""}
                onChange={(e) => handleChange("receiptFooter", e.target.value)}
                className="h-9 text-xs"
                placeholder="Teks footer receipt"
              />
            </div>
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
