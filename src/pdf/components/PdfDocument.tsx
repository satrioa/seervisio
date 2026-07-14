import React from "react";
import { Document, Page, StyleSheet, View } from "@react-pdf/renderer";
import { theme } from "@/lib/pdfx-theme";
import { PdfWatermark } from "./PdfWatermark";

interface BrandInfo {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface PdfDocumentProps {
  title?: string;
  brand?: BrandInfo;
  watermark?: { text: string } | null;
  fixedHeader?: React.ReactNode;
  fixedFooter?: React.ReactNode;
  pageSize?: "A4" | "LETTER";
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    fontFamily: theme.typography.body.fontFamily,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    paddingTop: theme.spacing.page.marginTop,
    paddingRight: theme.spacing.page.marginRight,
    paddingBottom: theme.spacing.page.marginBottom,
    paddingLeft: theme.spacing.page.marginLeft,
  },
  main: {
    flex: 1,
  },
});

export function PdfDocument({
  title,
  brand: _brand,
  watermark,
  fixedHeader,
  fixedFooter,
  pageSize = "A4",
  children,
}: PdfDocumentProps) {
  return (
    <Document title={title} author={_brand?.name ?? "Seervisio"}>
      <Page size={pageSize} style={styles.page}>
        {watermark && <PdfWatermark text={watermark.text} />}
        {fixedHeader}
        <View style={styles.main}>
          {children}
        </View>
        {fixedFooter}
      </Page>
    </Document>
  );
}
