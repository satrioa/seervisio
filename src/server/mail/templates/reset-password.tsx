import { BaseEmail, EmailHeading, EmailText, EmailButton } from "./_base";

interface ResetPasswordEmailProps {
  customerName: string;
  resetLink: string;
}

export function renderResetPasswordEmail(props: ResetPasswordEmailProps) {
  const { customerName, resetLink } = props;

  return (
    <BaseEmail preview="Reset Password Seervisio">
      <EmailHeading>Reset Password</EmailHeading>

      <EmailText>Halo {customerName},</EmailText>

      <EmailText>
        Kami menerima permintaan reset password untuk akun Seervisio Anda.
        Klik tombol di bawah untuk membuat password baru.
      </EmailText>

      <EmailButton href={resetLink}>Reset Password</EmailButton>

      <EmailText>
        Link ini berlaku selama 1 jam. Jika Anda tidak meminta reset password,
        abaikan email ini.
      </EmailText>
    </BaseEmail>
  );
}
