import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getBillingLabel } from "@/lib/billing/billing-helpers";

function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `INV-${y}${m}${d}-${seq}`;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    padding: 40,
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 32,
    borderBottomWidth: 2,
    borderBottomColor: "#4ADE80",
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    color: "#666",
    fontSize: 10,
  },
  value: {
    fontWeight: "bold",
    fontSize: 10,
  },
  table: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
    fontSize: 9,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 10,
    fontSize: 10,
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right" },
  totalSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 3,
  },
  totalLabel: { fontSize: 10, color: "#666", marginRight: 40 },
  totalValue: { fontSize: 10, fontWeight: "bold", width: 80, textAlign: "right" },
  grandTotal: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#1a1a1a",
    borderTopWidth: 2,
    borderTopColor: "#4ADE80",
    paddingTop: 8,
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  companyName: string;
  packageName: string;
  amount: number;
  billingCycle: string;
  issueDate: string;
  paymentMethod: string;
}

function InvoiceDocument({
  invoiceNumber,
  customerName,
  customerEmail,
  companyName,
  packageName,
  amount,
  billingCycle,
  issueDate,
  paymentMethod,
}: InvoiceData) {
  const billingLabel = getBillingLabel(billingCycle);

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>INVOICE</Text>
        <Text style={styles.subtitle}>{invoiceNumber}</Text>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 24 }}>
        <View>
          <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
            PT Seervisio Teknologi Indonesia
          </Text>
          <Text style={{ fontSize: 9, color: "#666" }}>
            Jl. Contoh No. 123
          </Text>
          <Text style={{ fontSize: 9, color: "#666" }}>Jakarta, Indonesia</Text>
          <Text style={{ fontSize: 9, color: "#666" }}>hello@seervisio.com</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
            {companyName}
          </Text>
          <Text style={{ fontSize: 9, color: "#666" }}>{customerName}</Text>
          <Text style={{ fontSize: 9, color: "#666" }}>{customerEmail}</Text>
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <View style={styles.row}>
          <Text style={styles.label}>Issue Date</Text>
          <Text style={styles.value}>{issueDate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Method</Text>
          <Text style={styles.value}>{paymentMethod}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Billing Type</Text>
          <Text style={styles.value}>{billingLabel}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Price</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={styles.colDesc}>{packageName}</Text>
          <Text style={styles.colQty}>1</Text>
          <Text style={styles.colPrice}>{formatPrice(amount)}</Text>
          <Text style={styles.colTotal}>{formatPrice(amount)}</Text>
        </View>
      </View>

      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatPrice(amount)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax</Text>
          <Text style={styles.totalValue}>Rp0</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text style={[styles.totalLabel, { fontWeight: "bold", color: "#1a1a1a" }]}>
            Total
          </Text>
          <Text
            style={[
              styles.totalValue,
              { fontWeight: "bold", fontSize: 14, width: 80, textAlign: "right" },
            ]}
          >
            {formatPrice(amount)}
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>
        PT Seervisio Teknologi Indonesia | {invoiceNumber} | Thank you for your business!
      </Text>
    </Page>
  );
}

export interface InvoiceResult {
  invoiceNumber: string;
  pdfBuffer: Buffer;
  fileUrl: string | null;
}

export async function generateInvoice(data: {
  customerName: string;
  customerEmail: string;
  companyName: string;
  packageName: string;
  amount: number;
  billingCycle: string;
  paymentMethod: string;
}): Promise<InvoiceResult> {
  const invoiceNumber = generateInvoiceNumber();
  const now = new Date();
  const issueDate = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const invoiceData: InvoiceData = {
    invoiceNumber,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    companyName: data.companyName,
    packageName: data.packageName,
    amount: data.amount,
    billingCycle: data.billingCycle,
    issueDate,
    paymentMethod: data.paymentMethod,
  };

  const pdfBuffer = await renderToBuffer(
    React.createElement(Document, null, React.createElement(InvoiceDocument, invoiceData)),
  );

  const supabase = createServiceRoleSupabaseClient();
  const filePath = `invoices/${invoiceNumber}.pdf`;
  const { error: uploadError } = await (supabase as any).storage
    .from("invoices")
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("[Invoice] Upload error:", uploadError.message);
    return { invoiceNumber, pdfBuffer, fileUrl: null };
  }

  const { data: publicUrl } = (supabase as any).storage
    .from("invoices")
    .getPublicUrl(filePath);

  return { invoiceNumber, pdfBuffer, fileUrl: publicUrl?.publicUrl ?? null };
}
