import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Img,
} from "@react-email/components";

interface BaseEmailProps {
  preview: string;
  children: React.ReactNode;
}

const primaryColor = "#4ADE80";

const mainStyle: React.CSSProperties = {
  backgroundColor: "#0a0a0a",
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0,
};

const containerStyle: React.CSSProperties = {
  maxWidth: "520px",
  margin: "0 auto",
  padding: "32px 24px",
};

const headerStyle: React.CSSProperties = {
  textAlign: "center" as const,
  padding: "24px 0 32px",
};

const logoText: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#ffffff",
  letterSpacing: "-0.5px",
  margin: 0,
};

const logoAccent: React.CSSProperties = {
  color: primaryColor,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#141414",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.06)",
  padding: "32px",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: primaryColor,
  color: "#0a0a0a",
  fontWeight: 600,
  fontSize: "14px",
  padding: "14px 32px",
  borderRadius: "12px",
  textDecoration: "none",
  textAlign: "center" as const,
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#666666",
  textAlign: "center" as const,
  margin: "24px 0 0",
};

const hrStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  margin: "24px 0",
};

export function BaseEmail({ preview, children }: BaseEmailProps) {
  return (
    <Html>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={logoText}>
              <span style={logoAccent}>S</span>eervisio
            </Text>
          </Section>

          <Section style={cardStyle}>{children}</Section>

          <Hr style={hrStyle} />

          <Text style={footerText}>
            PT Seervisio Teknologi Indonesia
            <br />
            Jl. Contoh No. 123, Jakarta
            <br />
            © 2026 Seervisio. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#ffffff",
        margin: "0 0 8px",
        lineHeight: "1.3",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailText({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: "14px",
        color: "#a1a1aa",
        margin: "0 0 16px",
        lineHeight: "1.6",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: "center" as const, padding: "8px 0" }}>
      <Link href={href} style={buttonStyle}>
        {children}
      </Link>
    </Section>
  );
}

export function EmailDivider() {
  return <Hr style={hrStyle} />;
}

export { primaryColor };
