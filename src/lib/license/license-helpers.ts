export type LicenseStatus =
  | "trial"
  | "active"
  | "expired"
  | "cancelled"
  | "pending"
  | "pending_payment"
  | "waiting_verification"
  | "rejected";

export function getLicenseStatusLabel(status: string): string {
  switch (status) {
    case "trial":
      return "Trial";
    case "active":
      return "Aktif";
    case "expired":
      return "Kedaluwarsa";
    case "cancelled":
      return "Dibatalkan";
    case "pending":
      return "Tertunda";
    case "pending_payment":
      return "Menunggu Pembayaran";
    case "waiting_verification":
      return "Menunggu Verifikasi";
    case "rejected":
      return "Ditolak";
    default:
      return status;
  }
}

export function getLicenseStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "trial":
      return "secondary";
    case "expired":
    case "cancelled":
    case "rejected":
      return "destructive";
    case "pending":
    case "pending_payment":
    case "waiting_verification":
      return "outline";
    default:
      return "secondary";
  }
}

export interface LicenseExpiryInfo {
  isLifetime: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  expiresAt: string | null;
}

export function getLicenseExpiryInfo(
  expiresAt: string | null,
  billingDurationEnabled?: boolean,
): LicenseExpiryInfo {
  const isLifetime = billingDurationEnabled === false || expiresAt === null;

  if (isLifetime) {
    return {
      isLifetime: true,
      isExpired: false,
      daysRemaining: null,
      expiresAt: null,
    };
  }

  if (!expiresAt) {
    return {
      isLifetime: false,
      isExpired: false,
      daysRemaining: null,
      expiresAt: null,
    };
  }

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const isExpired = diffMs <= 0;
  const daysRemaining = isExpired ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    isLifetime: false,
    isExpired,
    daysRemaining,
    expiresAt,
  };
}
