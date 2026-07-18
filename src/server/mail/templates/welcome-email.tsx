import { BaseEmail, EmailHeading, EmailText, EmailButton } from "./_base";

interface WelcomeEmailProps {
  customerName: string;
  businessName: string;
  trialDays?: number;
  dashboardUrl: string;
  isLifetime?: boolean;
}

export function renderWelcomeEmail(props: WelcomeEmailProps) {
  const { customerName, businessName, trialDays = 14, dashboardUrl, isLifetime } = props;

  return (
    <BaseEmail preview="Selamat Datang di Seervisio 🎉">
      <EmailHeading>Selamat Datang di Seervisio 🎉</EmailHeading>

      <EmailText>Halo {customerName},</EmailText>

      <EmailText>
        Selamat! Akun bisnis <strong>{businessName}</strong> berhasil dibuat.
        Anda sekarang dapat mengelola layanan, inventaris, dan tim Anda
        dalam satu platform.
      </EmailText>

      {isLifetime ? (
        <EmailText>
          Lisensi Anda adalah <strong>Lisensi Lifetime</strong> — aktif selamanya, tanpa perlu perpanjangan.
          Nikmati semua fitur premium tanpa batasan.
        </EmailText>
      ) : (
        <EmailText>
          Lisensi trial Anda aktif selama <strong>{trialDays} hari</strong>.
          Nikmati semua fitur premium tanpa batasan selama masa trial.
        </EmailText>
      )}

      <EmailButton href={dashboardUrl}>Masuk Dashboard</EmailButton>

      <EmailText>
        Punya pertanyaan? Kami siap membantu di{" "}
        <a href="https://wa.me/6281234567890" style={{ color: "#4ADE80" }}>
          WhatsApp
        </a>.
      </EmailText>
    </BaseEmail>
  );
}
