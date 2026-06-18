"use client";

import * as React from "react";
import { Camera, Loader2, Trash2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Cropper, CropperArea, CropperImage } from "@/components/ui/cropper";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cropImageToBlob, type CropArea } from "@/lib/crop-image";
import { uploadProfileAvatarAction, deleteProfileAvatarAction } from "@/server/actions/avatar.actions";
import { toast } from "sonner";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface AvatarUploadCropperProps {
  value?: string | null;
  name?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  profileId?: string;
  brandSlug?: string;
}

export function AvatarUploadCropper({
  value,
  name = "User",
  onChange,
  disabled = false,
  profileId,
  brandSlug,
}: AvatarUploadCropperProps) {
  const [cropperDialogOpen, setCropperDialogOpen] = React.useState(false);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<CropArea | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const [fileState, fileActions] = useFileUpload({
    accept: "image/*",
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    onFilesAdded: (files) => {
      if (files.length > 0 && files[0].preview) {
        setPreviewUrl(files[0].preview);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setCroppedAreaPixels(null);
        setCropperDialogOpen(true);
      }
    },
    onError: (errors) => {
      for (const err of errors) {
        if (err.toLowerCase().includes("exceeds the maximum size")) {
          toast.error("File terlalu besar. Maksimal 5MB.");
        } else {
          toast.error(err || "Format file tidak didukung.");
        }
      }
    },
  });

  const handleSaveCropped = React.useCallback(async () => {
    if (!previewUrl || !croppedAreaPixels || !profileId || !brandSlug) return;

    setUploading(true);
    try {
      const blob = await cropImageToBlob(previewUrl, croppedAreaPixels);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const file = new File([blob], `avatar.${ext}`, { type: blob.type });

      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadProfileAvatarAction(brandSlug, profileId, formData);

      if (result.success) {
        onChange(result.data.avatarUrl);
        setCropperDialogOpen(false);
        fileActions.clearFiles();
        toast.success("Foto profil berhasil diperbarui.");
      } else {
        toast.error(result.error || "Gagal mengunggah foto profil.");
      }
    } catch {
      toast.error("Gagal memproses gambar.");
    } finally {
      setUploading(false);
    }
  }, [previewUrl, croppedAreaPixels, profileId, brandSlug, onChange, fileActions]);

  const handleDelete = React.useCallback(async () => {
    if (!profileId || !brandSlug) return;

    if (!value) {
      onChange(null);
      return;
    }

    setUploading(true);
    try {
      const result = await deleteProfileAvatarAction(brandSlug, profileId, value);
      if (result.success) {
        onChange(null);
        toast.success("Foto profil berhasil dihapus.");
      } else {
        toast.error(result.error || "Gagal menghapus foto profil.");
      }
    } catch {
      toast.error("Gagal menghapus foto profil.");
    } finally {
      setUploading(false);
    }
  }, [profileId, brandSlug, value, onChange]);

  const selectedFile = fileState.files.length > 0 ? fileState.files[0] : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar className="size-20 ring-2 ring-amber-200/50">
        {value ? (
          <AvatarImage src={value} alt={name} />
        ) : null}
        <AvatarFallback className="bg-amber-50 text-lg font-semibold text-amber-600">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={disabled || uploading}
          onClick={() => fileActions.openFileDialog()}
        >
          {uploading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Camera className="size-3" />
          )}
          {value ? "Ganti Foto" : "Upload Foto"}
        </Button>

        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
            disabled={disabled || uploading}
            onClick={handleDelete}
          >
            <Trash2 className="size-3" />
            Hapus
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
        Upload gambar JPG/PNG/WebP, lalu sesuaikan crop avatar.
      </p>

      <input
        {...fileActions.getInputProps()}
        className="hidden"
        id="avatar-upload-input"
      />

      {/* Crop Dialog */}
      <Dialog open={cropperDialogOpen} onOpenChange={setCropperDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Sesuaikan Foto Profil</DialogTitle>
            <DialogDescription>
              Geser dan zoom untuk menyesuaikan posisi foto profil.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-lg bg-black/5">
              {selectedFile?.preview && (
                <Cropper
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspectRatio={1}
                  shape="circle"
                  withGrid
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={(_croppedArea, croppedAreaPixels) => {
                    setCroppedAreaPixels(croppedAreaPixels as CropArea);
                  }}
                >
                  <CropperImage src={selectedFile.preview} />
                  <CropperArea />
                </Cropper>
              )}
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Zoom</Label>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomOut className="size-3.5 text-muted-foreground shrink-0" />
                  <Slider
                    value={[zoom]}
                    onValueChange={([v]) => setZoom(v)}
                    min={1}
                    max={3}
                    step={0.01}
                    className="flex-1"
                  />
                  <ZoomIn className="size-3.5 text-muted-foreground shrink-0" />
                </div>
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Rotasi</Label>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {rotation}°
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCw className="size-3.5 text-muted-foreground shrink-0" />
                  <Slider
                    value={[rotation]}
                    onValueChange={([v]) => setRotation(v)}
                    min={0}
                    max={360}
                    step={1}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCropperDialogOpen(false);
                fileActions.clearFiles();
              }}
              disabled={uploading}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCropped}
              disabled={uploading}
            >
              {uploading && <Loader2 className="mr-1.5 size-3 animate-spin" />}
              Simpan Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
