import React from "react";
import { PdfWatermark as WatermarkComponent } from "@/components/pdfx/watermark/pdfx-watermark";

interface PdfWatermarkProps {
  text: string;
  opacity?: number;
  fontSize?: number;
}

export function PdfWatermark({ text, opacity = 0.12, fontSize = 56 }: PdfWatermarkProps) {
  return (
    <WatermarkComponent
      text={text}
      opacity={opacity}
      fontSize={fontSize}
      color="mutedForeground"
      angle={-45}
      position="center"
      fixed
    />
  );
}
