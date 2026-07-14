"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPERATIONAL_PATHS = [
  "/panel/services",
  "/panel/pos",
  "/panel/pos-v4",
  "/panel/inventory",
  "/panel/inventory-v3",
  "/panel/inventory-v4",
  "/panel/finance",
  "/panel/technician-performance",
  "/panel/ai",
  "/panel/customers",
];

interface LicenseGuardProps {
  children: React.ReactNode;
  brandSlug: string;
  licenseStatus: string | null;
  expiresAt: string | null;
}

export function LicenseGuard({ children, brandSlug, licenseStatus, expiresAt }: LicenseGuardProps) {
  const pathname = usePathname();

  const isOperational = OPERATIONAL_PATHS.some((p) => pathname?.startsWith(`/${brandSlug}${p}`));
  if (!isOperational) return <>{children}</>;

  const isLicenseValid = licenseStatus === "active" || licenseStatus === "trial";

  if (isLicenseValid) return <>{children}</>;

  const today = new Date();
  const isExpired = expiresAt && new Date(expiresAt) < today;

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/10">
          <AlertTriangle className="size-7 text-amber-500" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">
          {isExpired ? "License Telah Berakhir" : "Akses Terbatas"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isExpired
            ? `License Anda telah berakhir pada ${new Date(expiresAt!).toLocaleDateString("id-ID")}. Perbarui license untuk melanjutkan akses.`
            : "Anda belum memiliki license aktif. Silakan beli license untuk mengakses fitur ini."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href={`/${brandSlug}/purchase`}>Beli License</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
