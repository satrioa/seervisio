"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Palette, Building2, ArrowRight, ArrowLeft, Check, RotateCw, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { uploadBrandLogoAction } from "@/server/actions/welcome.actions";

interface Props {
  profileId: string;
  brandId: number | null;
  brandSlug: string | null;
  branchId: string | null;
  ownerName: string;
  businessName: string;
  packageName: string;
}

const STEPS = ["Brand", "Branch", "Done"] as const;

const COLOR_PRESETS = [
  { label: "Ocean", primary: "#2563eb", accent: "#7c3aed" },
  { label: "Emerald", primary: "#059669", accent: "#d97706" },
  { label: "Rose", primary: "#e11d48", accent: "#7c3aed" },
  { label: "Amber", primary: "#d97706", accent: "#2563eb" },
  { label: "Slate", primary: "#1e293b", accent: "#64748b" },
  { label: "Violet", primary: "#7c3aed", accent: "#ec4899" },
];

type BrandProfileData = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
};

export function WelcomeWizardClient({
  profileId,
  brandId,
  brandSlug,
  branchId,
  businessName,
  packageName,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [brand, setBrand] = useState<BrandProfileData>({
    name: businessName,
    logoUrl: null,
    primaryColor: COLOR_PRESETS[0].primary,
    accentColor: COLOR_PRESETS[0].accent,
  });
  const [branchName, setBranchName] = useState("Main Branch");

  const logoDropzone = useDropzone<string, string>({
    validation: {
      accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
      maxFiles: 1,
      maxSize: 5 * 1024 * 1024,
    },
    onDropFile: async (file) => {
      if (!brandId) return { status: "error", error: "Brand tidak ditemukan." };
      try {
        const fd = new FormData();
        fd.set("file", file);
        const result = await uploadBrandLogoAction(brandId, fd);
        if (result.error) return { status: "error", error: result.error };
        return { status: "success", result: result.url ?? "" };
      } catch {
        return { status: "error", error: "Gagal mengunggah logo." };
      }
    },
    onFileUploaded: (url) => setBrand((prev) => ({ ...prev, logoUrl: url })),
    onRemoveFile: () => setBrand((prev) => ({ ...prev, logoUrl: null })),
    shapeUploadError: (e) => e,
  });

  function handleSaveBrand() {
    setError(null);
    startTransition(async () => {
      try {
        const { saveOnboardingBrandProfileAction } = await import(
          "@/server/actions/welcome.actions"
        );
        if (!brandId) throw new Error("Brand not found.");
        const result = await saveOnboardingBrandProfileAction(brandId, brand);
        if (result.error) {
          setError(result.error);
          return;
        }
        setStep(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan brand.");
      }
    });
  }

  function handleSaveBranch() {
    setError(null);
    startTransition(async () => {
      try {
        const { saveOnboardingBranchAction } = await import(
          "@/server/actions/welcome.actions"
        );
        if (!branchId) throw new Error("Branch not found.");
        const result = await saveOnboardingBranchAction(branchId, {
          name: branchName,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setStep(2);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan cabang.");
      }
    });
  }

  function handleFinish() {
    setError(null);
    startTransition(async () => {
      try {
        const { completeOnboardingAction } = await import(
          "@/server/actions/welcome.actions"
        );
        await completeOnboardingAction(profileId);
        router.push(brandSlug ? `/${brandSlug}/panel/dashboard` : "/");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyelesaikan pengaturan.");
      }
    });
  }

  const selectedPresetLabel =
    COLOR_PRESETS.find(
      (p) =>
        p.primary === brand.primaryColor && p.accent === brand.accentColor,
    )?.label ?? "";

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardDescription className="flex items-center gap-2">
                Onboarding
                <Badge variant="secondary" className="font-normal">
                  {packageName}
                </Badge>
              </CardDescription>
              <CardTitle className="text-2xl">Set up your workspace</CardTitle>
            </div>
            <Badge variant="outline" className="shrink-0">
              Step {step + 1}/{STEPS.length}
            </Badge>
          </div>
          <Progress value={progress} className="mt-4" />
          <div className="mt-2 flex gap-1.5">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Terjadi kesalahan</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 0: Brand Profile */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Brand Logo</Label>
                <Dropzone {...logoDropzone}>
                  <DropZoneArea className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-center transition-colors hover:border-primary/50">
                    <Avatar className="size-16">
                      {brand.logoUrl ? (
                        <AvatarImage src={brand.logoUrl} alt="Logo preview" />
                      ) : null}
                      <AvatarFallback>
                        <ImageUp className="size-6 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DropzoneTrigger className="cursor-pointer">
                        <span className="text-sm font-medium text-primary">
                          Pilih logo
                        </span>
                      </DropzoneTrigger>
                      <p className="mt-1 text-xs text-muted-foreground">
                        JPG, PNG, atau WebP · Maks 5MB
                      </p>
                    </div>
                  </DropZoneArea>
                  <DropzoneMessage />
                  <DropzoneFileList className="mt-2">
                    {logoDropzone.fileStatuses.map((fs) => (
                      <DropzoneFileListItem key={fs.id} file={fs}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium">
                            {fs.fileName}
                          </span>
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-name">Brand Name</Label>
                <Input
                  id="brand-name"
                  value={brand.name}
                  onChange={(e) =>
                    setBrand((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nama bisnis Anda"
                />
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <Label>Color Theme</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={selectedPresetLabel}
                  onValueChange={(v) => {
                    if (!v) return;
                    const preset = COLOR_PRESETS.find((p) => p.label === v);
                    if (preset) {
                      setBrand((prev) => ({
                        ...prev,
                        primaryColor: preset.primary,
                        accentColor: preset.accent,
                      }));
                    }
                  }}
                  className="grid w-full grid-cols-2 gap-2"
                >
                  {COLOR_PRESETS.map((preset) => (
                    <ToggleGroupItem
                      key={preset.label}
                      value={preset.label}
                      className="flex items-center justify-start gap-2"
                    >
                      <span
                        className="size-4 shrink-0 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="size-4 shrink-0 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: preset.accent }}
                      />
                      <span className="text-xs font-medium">{preset.label}</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="primary-color"
                      type="color"
                      value={brand.primaryColor}
                      onChange={(e) =>
                        setBrand((prev) => ({
                          ...prev,
                          primaryColor: e.target.value,
                        }))
                      }
                      className="size-9 cursor-pointer rounded-md border border-input"
                    />
                    <span className="text-xs text-muted-foreground">
                      {brand.primaryColor}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="accent-color"
                      type="color"
                      value={brand.accentColor}
                      onChange={(e) =>
                        setBrand((prev) => ({
                          ...prev,
                          accentColor: e.target.value,
                        }))
                      }
                      className="size-9 cursor-pointer rounded-md border border-input"
                    />
                    <span className="text-xs text-muted-foreground">
                      {brand.accentColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Branch */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="branch-name">Branch Name</Label>
                <Input
                  id="branch-name"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Contoh: Main Branch"
                />
                <p className="text-xs text-muted-foreground">
                  Anda dapat menambahkan cabang lainnya nanti di Pengaturan.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Palette className="size-7 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold">All Set!</p>
                <p className="text-sm text-muted-foreground">
                  Workspace{" "}
                  <span className="font-medium text-foreground">
                    {brand.name}
                  </span>{" "}
                  sudah siap digunakan.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <Building2 className="size-4 text-muted-foreground" />
                <span className="font-medium">{brand.name}</span>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={isPending}
            >
              <ArrowLeft />
              Back
            </Button>
          ) : (
            <span />
          )}

          {step === 0 && (
            <Button
              type="button"
              onClick={handleSaveBrand}
              disabled={isPending || !brand.name.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight />
                </>
              )}
            </Button>
          )}

          {step === 1 && (
            <Button
              type="button"
              onClick={handleSaveBranch}
              disabled={isPending || !branchName.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight />
                </>
              )}
            </Button>
          )}

          {step === 2 && (
            <Button type="button" onClick={handleFinish} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Finishing...
                </>
              ) : (
                "Go to Dashboard"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      <Link
        href="/license"
        className="text-center text-xs text-muted-foreground underline hover:text-foreground"
      >
        Back to License Center
      </Link>
    </main>
  );
}
