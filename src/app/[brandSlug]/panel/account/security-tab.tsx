"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Shield, Clock, LogOut, AlertCircle, Loader2, Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSecurityInfoAction,
  logoutAllDevicesAction,
} from "@/server/actions/account-settings.actions";

interface Props {
  brandSlug: string;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SecurityTab({ brandSlug }: Props) {
  const [loading, setLoading] = useState(true);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutDone, setLogoutDone] = useState(false);

  useEffect(() => {
    getSecurityInfoAction(brandSlug).then((result) => {
      if (result.success) {
        setLastLoginAt(result.data.lastLoginAt);
        setActiveSession(result.data.activeSession);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [brandSlug]);

  const handleLogoutAll = async () => {
    setLoggingOut(true);
    setError(null);

    const result = await logoutAllDevicesAction(brandSlug);
    if (result.success) {
      setLogoutDone(true);
    } else {
      setError(result.error);
    }
    setLoggingOut(false);
  };

  if (loading) {
    return (
      <Card className="shadow-xs">
        <CardContent className="space-y-4 py-6">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {logoutDone && (
        <Alert className="border-emerald-200 bg-emerald-50 py-2 dark:border-emerald-800 dark:bg-emerald-950">
          <Check className="size-4 text-emerald-500" />
          <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-300">
            Semua perangkat berhasil logout. Anda akan diarahkan ke halaman login.
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Aktivitas Login</CardTitle>
          <CardDescription className="text-xs">Informasi sesi akun Anda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="size-4.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium">Terakhir Login</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(lastLoginAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Shield className="size-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium">Sesi Aktif</p>
              <p className="text-xs text-muted-foreground">
                {activeSession ? "Sesi aktif" : "Tidak ada sesi aktif"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Kelola Sesi</CardTitle>
          <CardDescription className="text-xs">Kelola perangkat yang terhubung ke akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-red-600"
            onClick={handleLogoutAll}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            {loggingOut ? "Memproses..." : "Logout Semua Perangkat"}
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Fitur ini akan logout dari semua perangkat yang terhubung ke akun Anda.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Yang Akan Datang</CardTitle>
          <CardDescription className="text-xs">Fitur keamanan tambahan dalam pengembangan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Autentikasi Dua Faktor (2FA)",
            "Token API",
            "Riwayat Login",
            "Perangkat Terhubung",
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-lg border border-dashed p-3 opacity-60"
            >
              <Shield className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{feature}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
