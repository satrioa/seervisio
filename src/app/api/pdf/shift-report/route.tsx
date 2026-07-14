import { NextRequest } from "next/server";
import type { ShiftDetailPdfInput } from "@/lib/pdf/shift-report-pdf.types";

export async function POST(req: NextRequest) {
  const input: ShiftDetailPdfInput = await req.json();

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { ShiftReportPdf } = await import("@/pdf/exports/ShiftReportPdf");

  const buffer = await renderToBuffer(
    <ShiftReportPdf data={input} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${input.shiftNumber}-ringkasan.pdf"`,
    },
  });
}
