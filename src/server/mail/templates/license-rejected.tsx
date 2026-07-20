import { BaseEmail, EmailHeading, EmailText, EmailButton } from "./_base";

interface LicenseRejectedEmailProps {
  customerName: string;
  packageName: string;
  rejectionReason: string;
  renewUrl: string;
}

export function renderLicenseRejectedEmail(props: LicenseRejectedEmailProps) {
  const { customerName, packageName, rejectionReason, renewUrl } = props;

  return (
    <BaseEmail preview="Pesanan Lisensi Ditolak">
      <EmailHeading>Pesanan Lisensi Ditolak</EmailHeading>

      <EmailText>Halo {customerName},</EmailText>

      <EmailText>
        Pesanan lisensi <strong>{packageName}</strong> Anda kami tolak.
      </EmailText>

      <EmailText>
        <strong>Alasan:</strong> {rejectionReason}
      </EmailText>

      <EmailText>
        Anda dapat mengunggah ulang bukti transfer pada pesanan yang sama
        melalui halaman lisensi.
      </EmailText>

      <EmailButton href={renewUrl}>Lihat Pesanan</EmailButton>
    </BaseEmail>
  );
}
