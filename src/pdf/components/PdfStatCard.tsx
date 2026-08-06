import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { theme } from "@/lib/pdfx-theme";

interface PdfStatCardProps {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    backgroundColor: theme.colors.muted,
    borderRadius: 4,
  },
  label: {
    fontSize: theme.primitives.typography.xs,
    color: theme.colors.mutedForeground,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  value: {
    fontFamily: theme.typography.heading.fontFamily,
    fontSize: theme.primitives.typography.lg,
    color: theme.colors.foreground,
    lineHeight: 1.2,
  },
  subtext: {
    fontSize: theme.primitives.typography.xs,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
});

export function PdfStatCard({ label, value, subtext, color }: PdfStatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : {}]}>{value}</Text>
      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
    </View>
  );
}
