import React from "react";
import { View, StyleSheet } from "@react-pdf/renderer";
import { theme } from "@/lib/pdfx-theme";
import { Heading } from "@/components/pdfx/heading/pdfx-heading";

interface PdfSectionProps {
  title?: string;
  titleLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  spacing?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  content: {
    marginTop: 0,
  },
});

const spacingMap: Record<string, number> = {
  sm: theme.spacing.componentGap,
  md: theme.spacing.sectionGap,
  lg: theme.spacing.sectionGap + 8,
};

export function PdfSection({
  title,
  titleLevel = 2,
  spacing = "md",
  children,
}: PdfSectionProps) {
  const gap = spacingMap[spacing] ?? spacingMap.md;

  return (
    <View style={[styles.container, { marginBottom: gap }]}>
      {title && (
        <Heading level={titleLevel} noMargin keepWithNext>
          {title}
        </Heading>
      )}
      <View style={[styles.content, { marginTop: title ? theme.spacing.paragraphGap : 0 }]}>
        {children}
      </View>
    </View>
  );
}
