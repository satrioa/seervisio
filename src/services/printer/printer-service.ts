"use client";

import {
  type PrinterSettings,
  type PrinterInfo,
  type ConnectionStatus,
  type PrinterAdapter,
  DEFAULT_PRINTER_SETTINGS,
} from "./printer-types";
import { BluetoothAdapter } from "./bluetooth-adapter";
import { loadPrinterSettings, savePrinterSettings } from "./printer-storage";

type PrinterEventCallback = {
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: string) => void;
};

class PrinterService {
  private _adapter: PrinterAdapter | null = null;
  private _settings: PrinterSettings;
  private _callbacks: PrinterEventCallback = {};
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this._settings = loadPrinterSettings();
  }

  get settings(): PrinterSettings {
    return { ...this._settings };
  }

  get status(): ConnectionStatus {
    return this._adapter?.getStatus() ?? "disconnected";
  }

  get connected(): boolean {
    return this.status === "connected";
  }

  get printerInfo(): PrinterInfo | null {
    return this._adapter?.getInfo() ?? null;
  }

  private getOrCreateAdapter(): PrinterAdapter {
    if (!this._adapter) {
      this._adapter = new BluetoothAdapter();
    }
    return this._adapter;
  }

  private setStatus(status: ConnectionStatus) {
    this._callbacks.onStatusChange?.(status);
  }

  private emitError(msg: string) {
    this._callbacks.onError?.(msg);
  }

  on(cb: PrinterEventCallback): void {
    this._callbacks = { ...this._callbacks, ...cb };
  }

  off(): void {
    this._callbacks = {};
  }

  async discoverPrinters(): Promise<PrinterInfo[]> {
    const adapter = this.getOrCreateAdapter();
    try {
      return await adapter.discover();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal mencari printer";
      this.emitError(msg);
      throw err;
    }
  }

  async connect(deviceId: string): Promise<void> {
    const adapter = this.getOrCreateAdapter();
    try {
      this.setStatus("connecting");
      await adapter.connect(deviceId);
      this.setStatus("connected");

      this._settings.deviceId = deviceId;
      this._settings.printerName = adapter.getInfo()?.name ?? "";
      savePrinterSettings(this._settings);
    } catch (err: unknown) {
      this.setStatus("error");
      const msg =
        err instanceof Error ? err.message : "Gagal terhubung ke printer";
      this.emitError(msg);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (!this._adapter) return;
    try {
      await this._adapter.disconnect();
      this.setStatus("disconnected");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal memutuskan koneksi";
      this.emitError(msg);
    }
  }

  async testPrint(): Promise<void> {
    if (!this._adapter || !this.connected) {
      const msg = "Printer tidak terhubung";
      this.emitError(msg);
      throw new Error(msg);
    }
    try {
      if ("testPrint" in this._adapter) {
        await (
          this._adapter as BluetoothAdapter
        ).testPrint(
          this._settings.printerName,
          this._settings.paperWidth,
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Test cetak gagal";
      this.emitError(msg);
      throw err;
    }
  }

  async updateSettings(partial: Partial<PrinterSettings>): Promise<void> {
    this._settings = { ...this._settings, ...partial };
    savePrinterSettings(this._settings);

    if (partial.paperWidth && this._adapter) {
      /* paper width is used at print time, no reconnect needed */
    }
  }

  async tryAutoReconnect(): Promise<void> {
    if (
      !this._settings.autoReconnect ||
      !this._settings.deviceId ||
      this.connected
    ) {
      return;
    }
    try {
      await this.connect(this._settings.deviceId);
    } catch {
      /* auto-reconnect failure must never throw — handled silently */
    }
  }

  scheduleAutoReconnect(delayMs = 3000): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }
    this._reconnectTimer = setTimeout(() => {
      this.tryAutoReconnect();
      this._reconnectTimer = null;
    }, delayMs);
  }

  destroy(): void {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }
    this.off();
    if (this._adapter) {
      this._adapter.disconnect().catch(() => {});
    }
  }
}

export const printerService = new PrinterService();
