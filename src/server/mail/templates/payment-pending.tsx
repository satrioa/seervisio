import { BaseEmail, EmailHeading, EmailText, EmailDivider } from "./_base";

interface PaymentPendingEmailProps {
  customerName: string;
  orderNumber: string;
  packageName: string;
  amount: number;
  uploadTime: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

export function renderPaymentPendingEmail(props: PaymentPendingEmailProps) {
  const { customerName, orderNumber, packageName, amount, uploadTime } = props;

  return (
    <BaseEmail preview="Pembayaran Anda Sedang Diverifikasi">
      <EmailHeading>Pembayaran Anda Sedang Diverifikasi</EmailHeading>

      <EmailText>Halo {customerName},</EmailText>

      <EmailText>
        Bukti pembayaran Anda untuk pesanan lisensi telah kami terima.
        Tim kami akan segera melakukan verifikasi.
      </EmailText>

      <EmailDivider />

      <table style={{ width: "100%", fontSize: "14px", color: "#a1a1aa", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Nomor Pesanan</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff" }}>{orderNumber}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Paket</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff" }}>{packageName}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Total</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff", fontWeight: 600 }}>{formatPrice(amount)}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Waktu Upload</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff" }}>{uploadTime}</td>
          </tr>
        </tbody>
      </table>

      <EmailDivider />

      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <span style={{
          display: "inline-block",
          backgroundColor: "rgba(234, 179, 8, 0.1)",
          color: "#eab308",
          fontSize: "12px",
          fontWeight: 600,
          padding: "6px 16px",
          borderRadius: "20px",
        }}>
          Menunggu Verifikasi Admin
        </span>
      </div>

      <EmailText>
        Anda akan menerima notifikasi setelah pembayaran berhasil diverifikasi.
      </EmailText>
    </BaseEmail>
  );
}
