import { BaseEmail, EmailHeading, EmailText, EmailDivider } from "./_base";

interface InvoiceEmailProps {
  customerName: string;
  invoiceNumber: string;
  packageName: string;
  amount: number;
  invoiceDate: string;
  paymentMethod: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

export function renderInvoiceEmail(props: InvoiceEmailProps) {
  const { customerName, invoiceNumber, packageName, amount, invoiceDate, paymentMethod } = props;

  return (
    <BaseEmail preview="Invoice Pembayaran Seervisio">
      <EmailHeading>Invoice Pembayaran</EmailHeading>

      <EmailText>Halo {customerName},</EmailText>

      <EmailText>
        Terima kasih telah melakukan pembayaran. Berikut adalah invoice untuk
        referensi pembayaran Anda.
      </EmailText>

      <EmailDivider />

      <table style={{ width: "100%", fontSize: "14px", color: "#a1a1aa", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>No. Invoice</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff", fontWeight: 600 }}>{invoiceNumber}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Paket</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff" }}>{packageName}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Total</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff", fontWeight: 700, fontSize: "16px" }}>{formatPrice(amount)}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Tanggal</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff" }}>{invoiceDate}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#666" }}>Pembayaran</td>
            <td style={{ padding: "8px 0", textAlign: "right", color: "#fff" }}>{paymentMethod}</td>
          </tr>
        </tbody>
      </table>

      <EmailDivider />

      <EmailText>
        Invoice PDF terlampir dalam email ini. Simpan untuk keperluan
        pembukuan Anda.
      </EmailText>
    </BaseEmail>
  );
}
