"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Palette,
  MapPin,
  PartyPopper,
  Loader2,
  Check,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeOnboardingAction } from "@/server/actions/auth.actions";

interface OnboardingWizardProps {
  profileId?: string;
}

const STEPS = [
  { id: "company", title: "Company", icon: Building2 },
  { id: "brand", title: "Brand", icon: Palette },
  { id: "branch", title: "Branch", icon: MapPin },
  { id: "done", title: "Done", icon: PartyPopper },
];

interface CompanyInfo {
  name: string;
  type: string;
  country: string;
  timezone: string;
  currency: string;
}

interface BrandInfo {
  name: string;
  primaryColor: string;
}

interface BranchInfo {
  name: string;
  address: string;
  phone: string;
}

const containerVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

export function OnboardingWizard({ profileId }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanyInfo>({
    name: "",
    type: "",
    country: "ID",
    timezone: "Asia/Jakarta",
    currency: "IDR",
  });

  const [brand, setBrand] = useState<BrandInfo>({
    name: "",
    primaryColor: "#6366f1",
  });

  const [branch, setBranch] = useState<BranchInfo>({
    name: "Main Branch",
    address: "",
    phone: "",
  });

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.name.trim()) {
      setError("Company name is required.");
      return;
    }
    setError(null);
    // Auto-fill brand name from company
    if (!brand.name) {
      setBrand((prev) => ({ ...prev, name: company.name }));
    }
    goToStep(1);
  };

  const handleBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.name.trim()) {
      setError("Brand name is required.");
      return;
    }
    setError(null);
    goToStep(2);
  };

  const handleBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch.name.trim()) {
      setError("Branch name is required.");
      return;
    }
    setError(null);
    goToStep(3);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await completeOnboardingAction();
      if (!result.success) {
        setError(result.error ?? "Failed to complete onboarding.");
        setIsSubmitting(false);
        return;
      }

      // Redirect to dashboard — will be caught by middleware/auth-check and routed correctly
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div
                    className={`flex size-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary text-primary"
                          : "border-muted-foreground/30 text-muted-foreground/50"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="size-4" />
                    ) : (
                      <StepIcon className="size-4" />
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-xs font-medium ${
                      isCurrent
                        ? "text-foreground"
                        : isCompleted
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="relative mt-4 h-1 rounded-full bg-muted">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={containerVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* Step 1: Company */}
            {currentStep === 0 && (
              <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-lg">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold tracking-tight">Company Information</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tell us about your business
                  </p>
                </div>

                <form onSubmit={handleCompanySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Acme Corp"
                      value={company.name}
                      onChange={(e) => setCompany((p) => ({ ...p, name: e.target.value }))}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyType">Business Type</Label>
                    <Select
                      value={company.type}
                      onValueChange={(v) => setCompany((p) => ({ ...p, type: v }))}
                    >
                      <SelectTrigger id="companyType" className="h-11">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={company.country}
                        onValueChange={(v) => setCompany((p) => ({ ...p, country: v }))}
                      >
                        <SelectTrigger id="country" className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ID">Indonesia</SelectItem>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="SG">Singapore</SelectItem>
                          <SelectItem value="MY">Malaysia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={company.currency}
                        onValueChange={(v) => setCompany((p) => ({ ...p, currency: v }))}
                      >
                        <SelectTrigger id="currency" className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IDR">IDR (Rp)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="SGD">SGD (S$)</SelectItem>
                          <SelectItem value="MYR">MYR (RM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={company.timezone}
                      onValueChange={(v) => setCompany((p) => ({ ...p, timezone: v }))}
                    >
                      <SelectTrigger id="timezone" className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                        <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                        <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (ET)</SelectItem>
                        <SelectItem value="America/Chicago">America/Chicago (CT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (PT)</SelectItem>
                        <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="h-11 gap-2">
                      Continue
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Brand */}
            {currentStep === 1 && (
              <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-lg">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold tracking-tight">Brand Setup</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure your first brand
                  </p>
                </div>

                <form onSubmit={handleBrandSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brandName">Brand Name</Label>
                    <Input
                      id="brandName"
                      placeholder="Acme Corp"
                      value={brand.name}
                      onChange={(e) => setBrand((p) => ({ ...p, name: e.target.value }))}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brandColor">Brand Color</Label>
                    <div className="flex items-center gap-3">
                      <div
                        className="size-10 rounded-lg border"
                        style={{ backgroundColor: brand.primaryColor }}
                      />
                      <Input
                        id="brandColor"
                        type="text"
                        placeholder="#6366f1"
                        value={brand.primaryColor}
                        onChange={(e) => setBrand((p) => ({ ...p, primaryColor: e.target.value }))}
                        className="h-11 flex-1 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 gap-2"
                      onClick={() => goToStep(0)}
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </Button>
                    <Button type="submit" className="h-11 gap-2">
                      Continue
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Branch */}
            {currentStep === 2 && (
              <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-lg">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold tracking-tight">Branch Setup</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Set up your first location
                  </p>
                </div>

                <form onSubmit={handleBranchSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="branchName">Branch Name</Label>
                    <Input
                      id="branchName"
                      placeholder="Main Branch"
                      value={branch.name}
                      onChange={(e) => setBranch((p) => ({ ...p, name: e.target.value }))}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchAddress">Address</Label>
                    <Input
                      id="branchAddress"
                      placeholder="Jl. Example No. 123"
                      value={branch.address}
                      onChange={(e) => setBranch((p) => ({ ...p, address: e.target.value }))}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchPhone">Phone</Label>
                    <Input
                      id="branchPhone"
                      type="tel"
                      placeholder="+62 812-3456-7890"
                      value={branch.phone}
                      onChange={(e) => setBranch((p) => ({ ...p, phone: e.target.value }))}
                      className="h-11"
                    />
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 gap-2"
                      onClick={() => goToStep(1)}
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </Button>
                    <Button type="submit" className="h-11 gap-2">
                      Continue
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 4: Done */}
            {currentStep === 3 && (
              <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-lg text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <PartyPopper className="size-8 text-primary" />
                </div>

                <h2 className="text-xl font-semibold tracking-tight">You&apos;re all set!</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your brand and branch are ready. Start exploring your dashboard.
                </p>

                <Button
                  className="mt-6 h-11 w-full gap-2"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
