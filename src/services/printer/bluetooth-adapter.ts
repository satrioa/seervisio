"use client";

import type {
  PrinterAdapter,
  PrinterInfo,
  PrinterCapabilities,
  ConnectionStatus,
  ConnectionType,
} from "./printer-types";

function buildEscPosTestReceipt(
  printerName: string,
  paperWidth: number,
): Uint8Array {
  const columns = paperWidth === 80 ? 48 : 32;
  const pad = (text: string, len: number) => {
    if (text.length >= len) return text;
    const total = len - text.length;
    const left = Math.floor(total / 2);
    return " ".repeat(left) + text + " ".repeat(total - left);
  };

  const lines: string[] = [];
  lines.push("\x1b\x40");
  lines.push("\x1b\x61\x01");
  lines.push(pad("=== TEST PRINT ===", columns));
  lines.push(pad(printerName || "Printer", columns));
  lines.push("");
  lines.push("\x1b\x61\x00");
  lines.push("Date: " + new Date().toLocaleString());
  lines.push("");
  lines.push("ASCII: !\"#$%&'()*+,-./0123456789:;<=>?@");
  lines.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`");
  lines.push("abcdefghijklmnopqrstuvwxyz{|}~");
  lines.push("");
  lines.push("\x1b\x61\x01");
  lines.push("--- End of Test ---");
  lines.push("\x1b\x61\x00");
  lines.push("\n\n\n");
  lines.push("\x1d\x56\x00");

  const encoder = new TextEncoder();
  return encoder.encode(lines.join("\n"));
}

export class BluetoothAdapter implements PrinterAdapter {
  readonly type: ConnectionType = "bluetooth";

  private _status: ConnectionStatus = "disconnected";
  private _device: BluetoothDevice | null = null;
  private _server: BluetoothRemoteGATTServer | null = null;
  private _service: BluetoothRemoteGATTService | null = null;
  private _characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private _info: PrinterInfo | null = null;

  getStatus(): ConnectionStatus {
    return this._status;
  }

  getInfo(): PrinterInfo | null {
    return this._info;
  }

  getCapabilities(): PrinterCapabilities {
    return {
      supportsAutoCut: true,
      supportsCashDrawer: true,
      supportsBattery: false,
    };
  }

  async discover(): Promise<PrinterInfo[]> {
    if (!("bluetooth" in navigator)) {
      throw new Error("Web Bluetooth tidak didukung di browser ini");
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
      });

      this._device = device;

      device.addEventListener("gattserverdisconnected", () => {
        this._status = "disconnected";
        this._server = null;
        this._service = null;
        this._characteristic = null;
      });

      return [
        {
          name: device.name ?? "Unknown Printer",
          id: device.id,
          connectionType: "bluetooth",
        },
      ];
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.message.includes("cancelled") || err.message.includes("canceled"))
      ) {
        return [];
      }
      const msg =
        err instanceof Error ? err.message : "Gagal mencari printer Bluetooth";
      throw new Error(msg);
    }
  }

  async connect(deviceId: string): Promise<void> {
    if (!("bluetooth" in navigator)) {
      throw new Error("Web Bluetooth tidak didukung di browser ini");
    }
    this._status = "connecting";

    try {
      if (!this._device || this._device.id !== deviceId) {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
          optionalServices: [
            "000018f0-0000-1000-8000-00805f9b34fb",
          ],
        });
        this._device = device;

        device.addEventListener("gattserverdisconnected", () => {
          this._status = "disconnected";
          this._server = null;
          this._service = null;
          this._characteristic = null;
        });
      }

      this._server = await this._device.gatt!.connect();
      this._service = await this._server.getPrimaryService(
        "000018f0-0000-1000-8000-00805f9b34fb",
      );
      const characteristics = await this._service.getCharacteristics();
      this._characteristic = characteristics[0] ?? null;

      this._info = {
        name: this._device.name ?? "Bluetooth Printer",
        id: this._device.id,
        connectionType: "bluetooth",
      };
      this._status = "connected";
    } catch (err: unknown) {
      this._status = "error";
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal terhubung ke printer Bluetooth";
      throw new Error(msg);
    }
  }

  async disconnect(): Promise<void> {
    try {
      this._characteristic = null;
      this._service = null;
      if (this._server?.connected) {
        this._server.disconnect();
      }
      this._server = null;
      this._device = null;
      this._info = null;
      this._status = "disconnected";
    } catch {
      this._status = "disconnected";
    }
  }

  async print(data: Uint8Array): Promise<void> {
    if (!this._characteristic) {
      throw new Error("Printer tidak terhubung");
    }
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this._characteristic.writeValueWithResponse(chunk);
    }
  }

  async testPrint(printerName: string, paperWidth: number): Promise<void> {
    const data = buildEscPosTestReceipt(printerName, paperWidth);
    await this.print(data);
  }
}
