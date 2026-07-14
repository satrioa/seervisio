import React from "react";
import { View, StyleSheet } from "@react-pdf/renderer";
import { theme } from "@/lib/pdfx-theme";
import { PdfStatCard } from "./PdfStatCard";

interface StatItem {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}

interface PdfSummaryBoxProps {
  items: StatItem[];
  columns?: number;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
});

export function PdfSummaryBox({ items, columns = 4 }: PdfSummaryBoxProps) {
  return (
    <View style={[styles.row, { gap: 8 }]}>
      {items.map((item, i) => (
        <View key={i} style={{ flex: 1 }}>
          <PdfStatCard
            label={item.label}
            value={item.value}
            subtext={item.subtext}
            color={item.color}
          />
        </View>
      ))}
    </View>
  );
}
