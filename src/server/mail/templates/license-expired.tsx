import { BaseEmail, EmailHeading, EmailText, EmailButton, EmailDivider } from "./_base";

interface LicenseExpiredEmailProps {
  customerName: string;
  packageName: string;
  expirationDate: string;
  renewalUrl: string;
}

/**
 * WARNING: This template should ONLY be called for time-limited licenses
 * (monthly/yearly subscriptions). Lifetime licenses should NEVER trigger
 * this email as they never expire.
 */
export function renderLicenseExpiredEmail(props: LicenseExpiredEmailProps) {
  const { customerName, packageName, expirationDate, renewalUrl } = props;

  return (
    <BaseEmail preview="Lisensi Anda Telah Berakhir">
      <EmailHeading>Lisensi Anda Telah Berakhir</EmailHeading>

      <EmailText>Halo {customerName},</EmailText>

      <EmailText>
        Lisensi <strong>{packageName}</strong> Anda telah berakhir
        pada {expirationDate}.
      </EmailText>

      <EmailText>
        Untuk terus menggunakan layanan Seervisio, silakan perpanjang lisensi
        Anda sekarang.
      </EmailText>

      <EmailDivider />

      <div style={{
        textAlign: "center",
        padding: "12px 0",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderRadius: "8px",
        marginBottom: "16px",
      }}>
        <span style={{
          fontSize: "13px",
          color: "#ef4444",
          fontWeight: 600,
        }}>
          Status: Tidak Aktif
        </span>
      </div>

      <EmailButton href={renewalUrl}>Perpanjang Lisensi</EmailButton>
    </BaseEmail>
  );
}
