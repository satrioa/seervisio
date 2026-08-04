"use client";

export type ConnectionType = "bluetooth" | "usb" | "network";
export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error";
export type PaperWidth = 58 | 80;

export interface PrinterSettings {
  connectionType: ConnectionType;
  printerName: string;
  deviceId: string;
  paperWidth: PaperWidth;
  copies: number;
  encoding: string;
  autoCut: boolean;
  openCashDrawer: boolean;
  autoReconnect: boolean;
}

export interface PrinterInfo {
  name: string;
  id: string;
  connectionType: ConnectionType;
}

export interface PrinterCapabilities {
  supportsAutoCut: boolean;
  supportsCashDrawer: boolean;
  supportsBattery: boolean;
  batteryLevel?: number;
  firmwareVersion?: string;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  connectionType: "bluetooth",
  printerName: "",
  deviceId: "",
  paperWidth: 58,
  copies: 1,
  encoding: "UTF-8",
  autoCut: true,
  openCashDrawer: false,
  autoReconnect: true,
};

export const ENCODING_OPTIONS = [
  { value: "UTF-8", label: "UTF-8" },
  { value: "CP437", label: "CP437 (US/Europe)" },
  { value: "CP858", label: "CP858 (Multilingual)" },
];

export const PAPER_WIDTH_OPTIONS = [
  { value: 58 as PaperWidth, label: "58 mm" },
  { value: 80 as PaperWidth, label: "80 mm" },
];

export interface PrinterAdapter {
  readonly type: ConnectionType;

  discover(): Promise<PrinterInfo[]>;

  connect(deviceId: string): Promise<void>;

  disconnect(): Promise<void>;

  getStatus(): ConnectionStatus;

  getInfo(): PrinterInfo | null;

  getCapabilities(): PrinterCapabilities;

  print(data: Uint8Array): Promise<void>;
}
