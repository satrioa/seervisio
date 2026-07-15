"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageUp, Check, Loader2, Palette } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [brand, setBrand] = useState<BrandProfileData>({
    name: businessName,
    logoUrl: null,
    primaryColor: COLOR_PRESETS[0].primary,
    accentColor: COLOR_PRESETS[0].accent,
  });
  const [branchName, setBranchName] = useState("Main Branch");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  async function handleLogoUpload(file: File) {
    if (!brandId) return;
    setLogoUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const { uploadBrandLogoAction } = await import(
        "@/server/actions/welcome.actions"
      );
      const result = await uploadBrandLogoAction(brandId, fd);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        setBrand((prev) => ({ ...prev, logoUrl: result.url! }));
        setLogoPreview(URL.createObjectURL(file));
      }
    } catch (e) {
      setError("Gagal mengunggah logo.");
    } finally {
      setLogoUploading(false);
    }
  }

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

  const selectedPreset = COLOR_PRESETS.find(
    (p) => p.primary === brand.primaryColor && p.accent === brand.accentColor,
  );

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Onboarding · {packageName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Set up your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize your brand and branch before entering the dashboard.
        </p>

        <ol className="mt-6 flex gap-2">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`flex-1 rounded-full px-2 py-1 text-center text-xs font-medium ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        <div className="mt-6 space-y-4">
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          )}

          {/* Step 0: Brand Profile */}
          {step === 0 && (
            <div className="space-y-5">
              {/* Logo upload */}
              <div>
                <label className="text-sm font-medium">Brand Logo</label>
                <div className="mt-1.5 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex size-20 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 transition-colors hover:border-primary/50"
                  >
                    {logoUploading ? (
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    ) : logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="size-full object-contain"
                      />
                    ) : (
                      <ImageUp className="size-6 text-muted-foreground" />
                    )}
                  </button>
                  <div className="text-xs text-muted-foreground">
                    <p>JPG, PNG, or WebP</p>
                    <p>Max 5MB</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
              </div>

              {/* Brand name */}
              <div>
                <label htmlFor="brand-name" className="text-sm font-medium">
                  Brand Name
                </label>
                <input
                  id="brand-name"
                  value={brand.name}
                  onChange={(e) =>
                    setBrand((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Your business name"
                />
              </div>

              {/* Color theme */}
              <div>
                <label className="text-sm font-medium">Color Theme</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setBrand((prev) => ({
                          ...prev,
                          primaryColor: preset.primary,
                          accentColor: preset.accent,
                        }))
                      }
                      className={`relative flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition-colors ${
                        selectedPreset?.label === preset.label
                          ? "border-primary ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <span
                        className="size-4 shrink-0 rounded-full"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="size-4 shrink-0 rounded-full"
                        style={{ backgroundColor: preset.accent }}
                      />
                      <span className="text-foreground">{preset.label}</span>
                      {selectedPreset?.label === preset.label && (
                        <Check className="ml-auto size-3.5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom colors */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="primary-color" className="text-xs font-medium">
                    Primary Color
                  </label>
                  <div className="mt-1 flex items-center gap-2">
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
                      className="size-8 cursor-pointer rounded border"
                    />
                    <span className="text-xs text-muted-foreground">
                      {brand.primaryColor}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="accent-color" className="text-xs font-medium">
                    Accent Color
                  </label>
                  <div className="mt-1 flex items-center gap-2">
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
                      className="size-8 cursor-pointer rounded border"
                    />
                    <span className="text-xs text-muted-foreground">
                      {brand.accentColor}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveBrand}
                disabled={isPending || !brand.name.trim()}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? "Saving..." : "Continue"}
              </button>
            </div>
          )}

          {/* Step 1: Branch */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="branch-name" className="text-sm font-medium">
                  Branch Name
                </label>
                <input
                  id="branch-name"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Main Branch"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  You can add more branches later in Settings.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveBranch}
                  disabled={isPending || !branchName.trim()}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? "Saving..." : "Continue"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Done */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Palette className="size-6 text-primary" />
                </div>
                <p className="mt-3 text-base font-semibold">All Set!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your workspace{" "}
                  <span className="font-medium text-foreground">
                    {brand.name}
                  </span>{" "}
                  is ready.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 inline size-4 animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    "Go to Dashboard"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          <Link href="/license" className="underline hover:text-foreground">
            Back to License Center
          </Link>
        </div>
      </div>
    </main>
  );
}
