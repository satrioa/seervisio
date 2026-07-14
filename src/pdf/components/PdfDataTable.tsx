import React from "react";
import { theme } from "@/lib/pdfx-theme";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/pdfx/table/pdfx-table";

interface Column {
  key: string;
  header: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: any) => string;
}

interface PdfDataTableProps {
  columns: Column[];
  data: Record<string, any>[];
  variant?: "line" | "grid" | "minimal" | "striped" | "compact" | "bordered" | "primary-header";
  zebraStripe?: boolean;
  noWrap?: boolean;
}

export function PdfDataTable({
  columns,
  data,
  variant = "striped",
  zebraStripe = true,
  noWrap,
}: PdfDataTableProps) {
  return (
    <Table variant={variant} zebraStripe={zebraStripe} noWrap={noWrap}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableCell key={col.key} header align={col.align} width={col.width}>
              {col.header}
            </TableCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i}>
            {columns.map((col) => (
              <TableCell key={col.key} align={col.align} width={col.width}>
                {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "-")}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
