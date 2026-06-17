"use client";

import * as React from "react";
import { Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function UserAccessSettings() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-start sm:items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Users className="size-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">User &amp; Access</h2>
          <p className="text-xs text-muted-foreground">
            Kelola pengguna, peran (role), dan hak akses ke sistem.
          </p>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Manajemen Pengguna</CardTitle>
          <CardDescription className="text-xs">
            Data pengguna dan role akan tersedia setelah integrasi database.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Users className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Bagian ini akan menampilkan daftar pengguna, manajemen role permission,
            dan pengaturan akses per cabang.
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Menunggu implementasi integrasi data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
