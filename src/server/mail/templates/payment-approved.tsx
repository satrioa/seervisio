import { BaseEmail, EmailHeading, EmailText, EmailButton, EmailDivider } from "./_base";

interface PaymentApprovedEmailProps {
  customerName: string;
  packageName: string;
  licenseType: string;
  activationDate: string;
  expirationDate: string | null;
  dashboardUrl: string;
}

export function renderPaymentApprovedEmail(props: PaymentApprovedEmailProps) {
  const { customerName, packageName, licenseType, activationDate, expirationDate, dashboardUrl } = props;

  return (
    <BaseEmail preview="Lisensi Anda Telah Aktif 🎉">
      <EmailHeading>Lisensi Anda Telah Aktif 🎉</EmailHeading>

      <EmailText>Halo {customerName},</EmailText>

      <EmailText>
        Selamat! Pembayaran Anda telah berhasil diverifikasi.
      </EmailText>

      <EmailDivider />

      <table style={{ width: "100%", fontSize: "14px", color: "#a1a1aa", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Paket</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff", fontWeight: 600 }}>{packageName}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Tipe Lisensi</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff" }}>{licenseType}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Tanggal Aktivasi</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff" }}>{activationDate}</td>
          </tr>
          {expirationDate && (
            <tr>
              <td style={{ padding: "8px 0", color: "#666" }}>Masa Berlaku</td>
              <td style={{ padding: "8px 0", textAlign: "right", color: "#fff" }}>{expirationDate}</td>
            </tr>
          )}
        </tbody>
      </table>

      <EmailDivider />

      <EmailButton href={dashboardUrl}>Masuk Dashboard</EmailButton>

      <EmailText>
        Silakan masuk ke dashboard untuk memulai pengaturan awal bisnis Anda.
      </EmailText>
    </BaseEmail>
  );
}
