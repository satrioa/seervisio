import React from "react";
import { PdfSignatureBlock } from "@/components/pdfx/signature/pdfx-signature";

interface SignerInfo {
  label: string;
  name: string;
  title?: string;
  date?: string;
}

interface PdfSignatureProps {
  variant?: "single" | "double" | "inline";
  label?: string;
  name?: string;
  title?: string;
  date?: string;
  signers?: SignerInfo[];
}

export function PdfSignature({
  variant = "single",
  label = "Signature",
  name,
  title,
  date,
  signers,
}: PdfSignatureProps) {
  if (variant === "double" && signers && signers.length >= 2) {
    return <PdfSignatureBlock variant="double" signers={signers as any} />;
  }

  return (
    <PdfSignatureBlock
      variant={variant}
      label={label}
      name={name}
      title={title}
      date={date}
    />
  );
}
