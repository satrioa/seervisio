"use client";

import * as React from "react";
import { Smartphone, User, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";

const DEVICE_TYPES = [
  "Smartphone",
  "Laptop",
  "Tablet",
  "Desktop",
  "Printer",
  "Monitor",
  "Headphone",
  "Konsol",
  "Lainnya",
];

const BRANCHES = ["Semarang Pusat", "Salatiga", "Sragen"];

interface FormData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber: string;
  issue: string;
  branch: string;
}

const initialFormData: FormData = {
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  deviceType: "",
  deviceBrand: "",
  deviceModel: "",
  serialNumber: "",
  issue: "",
  branch: "",
};

export function NewServiceForm() {
  const [form, setForm] = React.useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = React.useState(false);
  const { showOverview } = useRightSidebar();

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitting(false);
    setForm(initialFormData);
    showOverview();
  };

  const isFormValid =
    form.customerName.trim() !== "" &&
    form.customerPhone.trim() !== "" &&
    form.deviceType !== "" &&
    form.deviceBrand.trim() !== "" &&
    form.deviceModel.trim() !== "" &&
    form.issue.trim() !== "" &&
    form.branch !== "";

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {/* Data Pelanggan */}
        <div className="flex flex-col gap-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <User className="size-3.5" />
            Data Pelanggan
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="customerName" className="text-xs">
                Nama Pelanggan <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerName"
                value={form.customerName}
                onChange={(e) => updateField("customerName", e.target.value)}
                className="h-9 text-xs"
                placeholder="Masukkan nama pelanggan"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customerPhone" className="text-xs">
                No. Telepon <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerPhone"
                value={form.customerPhone}
                onChange={(e) => updateField("customerPhone", e.target.value)}
                className="h-9 text-xs"
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customerAddress" className="text-xs">
                Alamat
              </Label>
              <Input
                id="customerAddress"
                value={form.customerAddress}
                onChange={(e) => updateField("customerAddress", e.target.value)}
                className="h-9 text-xs"
                placeholder="Alamat (opsional)"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Data Perangkat */}
        <div className="flex flex-col gap-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Smartphone className="size-3.5" />
            Data Perangkat
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deviceType" className="text-xs">
                Tipe Perangkat <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.deviceType}
                onValueChange={(v) => updateField("deviceType", v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deviceBrand" className="text-xs">
                Merk <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deviceBrand"
                value={form.deviceBrand}
                onChange={(e) => updateField("deviceBrand", e.target.value)}
                className="h-9 text-xs"
                placeholder="Contoh: Samsung"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deviceModel" className="text-xs">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deviceModel"
                value={form.deviceModel}
                onChange={(e) => updateField("deviceModel", e.target.value)}
                className="h-9 text-xs"
                placeholder="Contoh: Galaxy S24"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serialNumber" className="text-xs">
                Serial Number
              </Label>
              <Input
                id="serialNumber"
                value={form.serialNumber}
                onChange={(e) => updateField("serialNumber", e.target.value)}
                className="h-9 text-xs"
                placeholder="SN (opsional)"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Keluhan */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="issue" className="text-xs">
            Keluhan <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="issue"
            value={form.issue}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField("issue", e.target.value)}
            className="min-h-[80px] text-xs"
            placeholder="Jelaskan keluhan pelanggan..."
          />
        </div>

        <Separator />

        {/* Cabang */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="branch" className="text-xs">
            Cabang <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.branch}
            onValueChange={(v) => updateField("branch", v)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Pilih cabang" />
            </SelectTrigger>
            <SelectContent>
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b} className="text-xs">
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 border-t bg-background px-6 py-3">
        <Button
          type="submit"
          className="w-full gap-2 text-xs"
          disabled={!isFormValid || submitting}
        >
          <Send className="size-3.5" />
          {submitting ? "Menyimpan..." : "Buat Servis"}
        </Button>
      </div>
    </form>
  );
}
