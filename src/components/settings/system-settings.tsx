"use client";

import * as React from "react";
import { Settings2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SystemSettings() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Settings2 className="size-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">System</h2>
          <p className="text-xs text-muted-foreground">
            Pengaturan sistem, notifikasi, dan preferensi aplikasi.
          </p>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Pengaturan Sistem</CardTitle>
          <CardDescription className="text-xs">
            Konfigurasi sistem akan tersedia setelah integrasi database.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Settings2 className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Bagian ini akan menampilkan pengaturan notifikasi, log sistem,
            backup, dan preferensi aplikasi lainnya.
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Menunggu implementasi integrasi data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
