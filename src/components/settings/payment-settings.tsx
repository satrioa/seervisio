"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function PaymentSettings() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <CreditCard className="size-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Payment Settings</h2>
          <p className="text-xs text-muted-foreground">
            Konfigurasi pengaturan pembayaran dan kebijakan transaksi.
          </p>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Pengaturan Pembayaran</CardTitle>
          <CardDescription className="text-xs">
            Pengaturan pembayaran akan tersedia setelah integrasi database.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <CreditCard className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Bagian ini akan menampilkan pengaturan kebijakan pembayaran,
            termin invoice, deposit, dan MDR.
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Menunggu implementasi integrasi data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
