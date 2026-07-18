import { BaseEmail, EmailHeading, EmailText, EmailButton } from "./_base";

interface LicenseExpiringEmailProps {
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
export function renderLicenseExpiringEmail(props: LicenseExpiringEmailProps) {
  const { customerName, packageName, expirationDate, renewalUrl } = props;

  return (
    <BaseEmail preview="Lisensi Anda Akan Berakhir Dalam 7 Hari">
      <EmailHeading>Lisensi Anda Hampir Berakhir</EmailHeading>

      <EmailText>Halo {customerName},</EmailText>

      <EmailText>
        Lisensi <strong>{packageName}</strong> Anda akan berakhir pada:
      </EmailText>

      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <span style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "#eab308",
        }}>
          {expirationDate}
        </span>
      </div>

      <EmailText>
        Perpanjang lisensi Anda sekarang untuk menikmati layanan tanpa
        interupsi.
      </EmailText>

      <EmailButton href={renewalUrl}>Perpanjang Lisensi</EmailButton>

      <EmailText>
        Jika Anda memiliki pertanyaan, hubungi kami via{" "}
        <a href="https://wa.me/6281234567890" style={{ color: "#4ADE80" }}>
          WhatsApp
        </a>.
      </EmailText>
    </BaseEmail>
  );
}
