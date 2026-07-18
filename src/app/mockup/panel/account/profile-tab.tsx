"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Camera, Loader2, Check, AlertCircle, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAccountProfileAction,
  updateAccountProfileAction,
  type AccountProfileData,
} from "@/server/actions/account-settings.actions";
import { uploadProfileAvatarAction, deleteProfileAvatarAction } from "@/server/actions/avatar.actions";

interface Props {
  brandSlug: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileTab({ brandSlug }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<AccountProfileData>({
    profileId: "",
    name: "",
    email: "",
    avatarUrl: null,
  });

  useEffect(() => {
    getAccountProfileAction(brandSlug).then((result) => {
      if (result.success) {
        setForm(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [brandSlug]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    const result = await uploadProfileAvatarAction(brandSlug, form.profileId, fd);
    if (result.success) {
      setForm((prev) => ({ ...prev, avatarUrl: result.data.avatarUrl }));
    } else {
      setError(result.error);
    }
    setUploading(false);
  };

  const handleAvatarRemove = async () => {
    if (!form.avatarUrl) return;
    setUploading(true);
    setError(null);

    const result = await deleteProfileAvatarAction(brandSlug, form.profileId, form.avatarUrl);
    if (result.success) {
      setForm((prev) => ({ ...prev, avatarUrl: null }));
    } else {
      setError(result.error);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateAccountProfileAction(brandSlug, {
      name: form.name,
      email: form.email,
    });

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
      <Card className="shadow-xs">
        <CardContent className="space-y-4 py-6">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Profil</CardTitle>
        <CardDescription className="text-xs">Informasi pribadi Anda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-20">
              <AvatarImage src={form.avatarUrl ?? undefined} />
              <AvatarFallback className="text-lg">{getInitials(form.name)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              disabled={uploading}
              className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full border bg-background shadow-xs transition-colors hover:bg-muted disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{form.name || "User"}</p>
            <p className="text-xs text-muted-foreground">{form.email}</p>
            {form.avatarUrl && (
              <button
                type="button"
                disabled={uploading}
                className="flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-50"
                onClick={handleAvatarRemove}
              >
                <Trash2 className="size-3" />
                Hapus foto
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-medium">
            Nama Lengkap <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="h-9 text-xs"
            placeholder="Nama lengkap"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-medium">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="h-9 text-xs"
            placeholder="Email"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            size="sm"
            className="gap-2"
            onClick={handleSave}
            disabled={saving || uploading || !form.name.trim()}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4 text-emerald-400" />
            ) : (
              <Check className="size-4" />
            )}
            {saving ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
