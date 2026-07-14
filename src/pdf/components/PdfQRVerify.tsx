import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { theme } from "@/lib/pdfx-theme";
import { PdfQRCode } from "@/components/pdfx/qrcode/pdfx-qrcode";

interface PdfQRVerifyProps {
  value: string;
  label?: string;
  size?: number;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    backgroundColor: theme.colors.muted,
    borderRadius: 4,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: theme.primitives.typography.xs,
    color: theme.colors.mutedForeground,
    marginBottom: 2,
  },
  hint: {
    fontSize: theme.primitives.typography.xs,
    color: theme.colors.mutedForeground,
  },
});

export function PdfQRVerify({ value, label = "Verify Document", size = 48 }: PdfQRVerifyProps) {
  return (
    <View style={styles.container}>
      <PdfQRCode value={value} size={size} />
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>Scan QR to verify authenticity</Text>
      </View>
    </View>
  );
}
