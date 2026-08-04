"use client";

import * as React from "react";
import {
  Printer,
  Search,
  Link2,
  Unlink,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  Save,
  AlertCircle,
  FileText,
  Bluetooth,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import type { ConnectionStatus, PaperWidth } from "@/services/printer/printer-types";
import { ENCODING_OPTIONS, PAPER_WIDTH_OPTIONS } from "@/services/printer/printer-types";
import { printerService } from "@/services/printer/printer-service";

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  connected: { label: "Terhubung", variant: "default", icon: CheckCircle2 },
  disconnected: { label: "Terputus", variant: "secondary", icon: XCircle },
  connecting: { label: "Menghubungkan...", variant: "outline", icon: Loader2 },
  error: { label: "Gagal", variant: "destructive", icon: AlertCircle },
};

export function PrinterSettingsPage() {
  const [status, setStatus] = React.useState<ConnectionStatus>(printerService.status);
  const [printerName, setPrinterName] = React.useState(printerService.settings.printerName);
  const [paperWidth, setPaperWidth] = React.useState<PaperWidth>(printerService.settings.paperWidth);
  const [copies, setCopies] = React.useState(printerService.settings.copies);
  const [encoding, setEncoding] = React.useState(printerService.settings.encoding);
  const [autoCut, setAutoCut] = React.useState(printerService.settings.autoCut);
  const [openCashDrawer, setOpenCashDrawer] = React.useState(printerService.settings.openCashDrawer);
  const [autoReconnect, setAutoReconnect] = React.useState(printerService.settings.autoReconnect);
  const [discovering, setDiscovering] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [knownPrinters, setKnownPrinters] = React.useState<{ id: string; name: string }[]>(() => {
    const saved = printerService.settings.deviceId ? [{ id: printerService.settings.deviceId, name: printerService.settings.printerName }] : [];
    return saved;
  });

  React.useEffect(() => {
    printerService.on({
      onStatusChange: (s) => setStatus(s),
      onError: (msg) => toast.error(msg),
    });
    return () => printerService.off();
  }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const printers = await printerService.discoverPrinters();
      if (printers.length === 0) {
        toast.info("Tidak ada printer ditemukan");
        return;
      }
      const p = printers[0];
      setKnownPrinters((prev) => {
        const exists = prev.some((kp) => kp.id === p.id);
        return exists ? prev : [...prev, { id: p.id, name: p.name }];
      });
      setPopoverOpen(true);
      toast.info(`Printer "${p.name}" ditemukan. Pilih dari daftar untuk menghubungkan.`);
    } catch {
      /* error handled by service callback */
    } finally {
      setDiscovering(false);
    }
  };

  const handleConnect = async (deviceId: string) => {
    setConnecting(true);
    try {
      await printerService.connect(deviceId);
      setPrinterName(printerService.printerInfo?.name ?? "");
      toast.success("Printer berhasil dihubungkan");
    } catch {
      /* error handled by service callback */
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await printerService.disconnect();
      setPrinterName("");
      toast.success("Printer diputuskan");
    } catch {
      /* handled */
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      await printerService.testPrint();
      toast.success("Test cetak berhasil dikirim");
    } catch {
      /* handled */
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await printerService.updateSettings({
        paperWidth,
        copies,
        encoding,
        autoCut,
        openCashDrawer,
        autoReconnect,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const StatusIcon = STATUS_CONFIG[status].icon;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Printer className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Pengaturan Printer</h2>
          <p className="text-xs text-muted-foreground">
            Konfigurasi printer thermal untuk mencetak nota dan struk
          </p>
        </div>
      </div>

      <Separator />

      {/* Connection */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold">Koneksi Printer</CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground">
            Hubungkan printer thermal Bluetooth untuk mencetak nota
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <StatusIcon className={`size-5 ${status === "connected" ? "text-emerald-400" : status === "error" ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs font-medium">{STATUS_CONFIG[status].label}</p>
                {printerName && (
                  <p className="text-[11px] text-muted-foreground">{printerName}</p>
                )}
              </div>
            </div>
            {status === "connected" ? (
              <Badge variant="default" className="text-[10px]">Terhubung</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Putus</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {status !== "connected" ? (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="gap-2"
                    disabled={discovering || connecting}
                  >
                    {discovering || connecting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    {discovering ? "Mencari..." : connecting ? "Menghubungkan..." : "Cari Printer Bluetooth"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-2">
                  <PopoverHeader className="px-1 pb-1">
                    <PopoverTitle className="flex items-center gap-1.5 text-xs font-semibold">
                      <Bluetooth className="size-3.5" />
                      Printer Tersedia
                    </PopoverTitle>
                  </PopoverHeader>

                  <div className="flex flex-col gap-0.5">
                    {knownPrinters.length > 0 ? (
                      knownPrinters.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent disabled:opacity-50"
                          onClick={async () => {
                            setPopoverOpen(false);
                            setPrinterName(p.name);
                            await handleConnect(p.id);
                          }}
                          disabled={connecting}
                        >
                          <Printer className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-2.5 py-3 text-center text-[11px] text-muted-foreground">
                        Belum ada printer tersimpan.
                      </p>
                    )}

                    <Separator className="my-1" />

                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent"
                      onClick={async () => {
                        setPopoverOpen(false);
                        await handleDiscover();
                      }}
                    >
                      <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium">Cari Printer Baru</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Printer className="size-4" />
                      {printerName || "Terhubung"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="px-2.5 py-2">
                        <p className="text-xs font-medium">{printerName}</p>
                        <p className="text-[11px] text-muted-foreground">Status: Terhubung</p>
                      </div>
                      <Separator className="my-1" />
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-destructive transition-colors hover:bg-destructive/10"
                        onClick={() => {
                          handleDisconnect();
                        }}
                      >
                        <Unlink className="size-3.5" />
                        <span className="font-medium">Putuskan Koneksi</span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold">Preferensi Cetak</CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground">
            Atur lebar kertas, jumlah salinan, dan pengaturan cetak lainnya
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Lebar Kertas</label>
              <Select
                value={String(paperWidth)}
                onValueChange={(v) => setPaperWidth(Number(v) as PaperWidth)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_WIDTH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Jenis kertas yang digunakan printer thermal
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Jumlah Salinan</label>
              <Select
                value={String(copies)}
                onValueChange={(v) => setCopies(Number(v))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">
                      {n} {n > 1 ? "salinan" : "salinan"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Jumlah cetakan untuk setiap nota
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Encoding</label>
              <Select value={encoding} onValueChange={setEncoding}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENCODING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Encoding karakter untuk printer
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Auto Cut</p>
                <p className="text-[11px] text-muted-foreground">
                  Potong kertas secara otomatis setelah cetak
                </p>
              </div>
              <Switch checked={autoCut} onCheckedChange={setAutoCut} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Auto Reconnect</p>
                <p className="text-[11px] text-muted-foreground">
                  Hubungkan kembali secara otomatis saat aplikasi dimulai
                </p>
              </div>
              <Switch checked={autoReconnect} onCheckedChange={setAutoReconnect} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold">Uji Coba</CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground">
            Cetak halaman uji untuk memverifikasi koneksi dan kualitas cetak
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium">Cetak Test</p>
                <p className="text-[11px] text-muted-foreground">
                  Mencetak halaman uji dengan informasi printer dan karakter
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={handleTestPrint}
              disabled={status !== "connected" || testing}
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              {testing ? "Mencetak..." : "Test Cetak"}
            </Button>
          </div>

          {status !== "connected" && (
            <Alert variant="default" className="border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="size-4 text-amber-500" />
              <AlertDescription className="text-[11px] text-amber-600">
                Hubungkan printer terlebih dahulu sebelum melakukan uji coba
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end border-t pt-4">
        <Button
          type="button"
          size="sm"
          className="gap-2"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4 text-emerald-400" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Menyimpan..." : saved ? "Tersimpan" : "Simpan"}
        </Button>
      </div>
    </div>
  );
}
