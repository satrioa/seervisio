"use client";

interface PaymentHeaderProps {
  packageName: string;
  billingCycle: string;
}

export function PaymentHeader({ packageName, billingCycle }: PaymentHeaderProps) {
  return (
    <div className="text-center">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Selesaikan Pembayaran
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
        Pesanan Anda telah dibuat.
        <br />
        Silakan selesaikan pembayaran untuk mengaktifkan lisensi.
      </p>
    </div>
  );
}
