"use client";

import * as React from "react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Send, Coins, PiggyBank } from "lucide-react";
import { createServiceAction } from "@/server/actions/service.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Using inline toggle button instead of shadcn Switch
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { useRightSidebar } from "@/components/layout/right-sidebar-context";
import { CustomerSearch } from "@/components/customers/customer-search";
import type { CustomerMock } from "@/components/customers/customer-data";
import {
  MOCK_PAYMENT_METHODS,
  MOCK_PAYMENT_ACCOUNTS,
  formatCurrency,
  getDefaultPaymentAccountForMethod,
  getPaymentAccountName,
  getPaymentMethodName,
} from "@/components/services/service-data";

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

const formatNumber = (value: string) => {
  if (!value) return "";
  const number = value.replace(/\D/g, "");
  if (number === "") return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(number));
};

export interface CreateServiceFormData {
  customerId: string | undefined;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  estimatedCost: string;
  dpEnabled: boolean;
  dpAmount: string;
  dpMethodId: string;
  dpAccountId: string;
  dpNote: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber: string;
  issue: string;
  additionalNotes: string;
  branch: string;
}

const initialFormData: CreateServiceFormData = {
  customerId: undefined,
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  estimatedCost: "",
  dpEnabled: false,
  dpAmount: "",
  dpMethodId: "",
  dpAccountId: "",
  dpNote: "",
  deviceType: "",
  deviceBrand: "",
  deviceModel: "",
  serialNumber: "",
  issue: "",
  additionalNotes: "",
  branch: "",
};

interface CreateServiceFormProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  formData: CreateServiceFormData;
  onFormChange: (data: CreateServiceFormData) => void;
  onSuccess?: () => void;
}

export function CreateServiceForm({
  currentStep,
  onStepChange,
  formData,
  onFormChange,
  onSuccess,
}: CreateServiceFormProps) {
  const { closeCreateService } = useRightSidebar();
  const params = useParams();
  const brandSlug = params.brandSlug as string;
  const [submitting, setSubmitting] = React.useState(false);
  const [deviceTypeOpen, setDeviceTypeOpen] = React.useState(false);
  const { activeBranchId, branches } = useActiveBranch();

  const selectedBranchName = React.useMemo(
    () => branches.find((b) => b.id === formData.branch)?.name ?? "",
    [branches, formData.branch],
  );

  // Auto-fill branch on mount if active branch scope is set
  React.useEffect(() => {
    if (activeBranchId && !formData.branch) {
      onFormChange({ ...formData, branch: activeBranchId });
    }
  }, [activeBranchId]);

  const updateField = (field: keyof CreateServiceFormData, value: any) => {
    onFormChange({ ...formData, [field]: value });
  };

  // Customer autofill handler
  const handleCustomerSelect = React.useCallback(
    (customer: CustomerMock | null) => {
      if (customer) {
        onFormChange({
          ...formData,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address ?? "",
        });
      } else {
        onFormChange({
          ...formData,
          customerId: undefined,
          customerName: "",
          customerPhone: "",
          customerAddress: "",
        });
      }
    },
    [formData, onFormChange],
  );

  const handleStartNewCustomer = React.useCallback(
    (_searchText: string) => {
      onFormChange({
        ...formData,
        customerId: undefined,
      });
    },
    [formData, onFormChange],
  );

  const handleManualChange = React.useCallback(
    (field: "name" | "phone" | "address", value: string) => {
      const fieldMap = { name: "customerName", phone: "customerPhone", address: "customerAddress" } as const;
      updateField(fieldMap[field], value);
    },
    [formData, onFormChange],
  );

  // DP handler: auto-fill account when method changes
  const handleDpMethodChange = (methodId: string) => {
    const defaultAccountId = getDefaultPaymentAccountForMethod(methodId);
    onFormChange({
      ...formData,
      dpMethodId: methodId,
      dpAccountId: defaultAccountId ?? formData.dpAccountId,
    });
  };

  // Filter active payment accounts for the selected method
  const availableAccounts = React.useMemo(() => {
    if (!formData.dpMethodId) return MOCK_PAYMENT_ACCOUNTS.filter(a => a.isActive);

    const selectedMethod = MOCK_PAYMENT_METHODS.find(m => m.id === formData.dpMethodId);
    if (!selectedMethod) return MOCK_PAYMENT_ACCOUNTS.filter(a => a.isActive);

    // Match accounts by type
    return MOCK_PAYMENT_ACCOUNTS.filter(a => {
      if (!a.isActive) return false;
      if (selectedMethod.type === "CASH") return a.isCashAccount;
      if (selectedMethod.type === "QRIS") return a.type === "QRIS";
      if (selectedMethod.type === "TRANSFER") return a.type === "BANK" || a.type === "TRANSFER";
      if (selectedMethod.type === "DEBIT") return a.type === "DEBIT" || a.type === "BANK";
      return true;
    });
  }, [formData.dpMethodId]);

  const handleSubmit = async () => {
    setSubmitting(true);

    const { triggerDynamicIslandFeedback } = await import("@/lib/dynamic-island/dynamic-island-events");
    triggerDynamicIslandFeedback({
      type: "loading",
      title: "Membuat servis...",
    });

    try {
      const result = await createServiceAction({
        brandSlug,
        branchId: formData.branch || undefined,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        deviceType: formData.deviceType,
        deviceBrand: formData.deviceBrand,
        deviceModel: formData.deviceModel,
        deviceSerialNumber: formData.serialNumber,
        reportedIssue: formData.issue,
        estimatedCost: formData.estimatedCost ? parseInt(formData.estimatedCost) : undefined,
        dpAmount: formData.dpEnabled && formData.dpAmount ? parseInt(formData.dpAmount) : undefined,
        dpPaymentMethodId: formData.dpEnabled ? formData.dpMethodId : undefined,
        dpPaymentAccountId: formData.dpEnabled ? formData.dpAccountId : undefined,
        dpNote: formData.dpEnabled ? formData.dpNote : undefined,
      });

      if (result.success) {
        triggerDynamicIslandFeedback({
          type: "success",
          title: "Servis berhasil dibuat",
          duration: 2200,
        });
        closeCreateService();
        console.debug("[create-service-form] success:refresh", {
          serviceId: result.data?.serviceId ?? null,
          branchId: formData.branch || null,
          hasOnSuccess: Boolean(onSuccess),
        });
        onSuccess?.();
        window.dispatchEvent(new CustomEvent("seervis:services-refresh"));
      } else {
        triggerDynamicIslandFeedback({
          type: "error",
          title: result.error ?? "Gagal membuat servis",
          duration: 2500,
        });
      }
    } catch (err: any) {
      triggerDynamicIslandFeedback({
        type: "error",
        title: err.message ?? "Gagal membuat servis",
        duration: 2500,
      });
    }

    setSubmitting(false);
  };

  // Validation per step
  const isStepValid = React.useMemo(() => {
    switch (currentStep) {
      case 1:
        return formData.customerName.trim() !== "" && formData.customerPhone.trim() !== "";
      case 2:
        return formData.deviceType !== "" && formData.deviceBrand.trim() !== "" && formData.deviceModel.trim() !== "";
      case 3:
        return formData.issue.trim() !== "";
      case 4: {
        // Branch is required
        if (formData.branch === "") return false;
        // If DP is enabled, validate DP fields
        if (formData.dpEnabled) {
          const dpAmount = parseInt(formData.dpAmount);
          const estimatedCost = parseInt(formData.estimatedCost);
          if (!dpAmount || dpAmount <= 0) return false;
          if (formData.dpMethodId === "") return false;
          if (formData.dpAccountId === "") return false;
          // DP cannot exceed estimated cost if estimated cost exists
          if (estimatedCost > 0 && dpAmount > estimatedCost) return false;
        }
        return true;
      }
      default:
        return false;
    }
  }, [currentStep, formData]);

  const dpValidationError = React.useMemo(() => {
    if (!formData.dpEnabled) return null;
    const dpAmount = parseInt(formData.dpAmount);
    const estimatedCost = parseInt(formData.estimatedCost);
    if (estimatedCost > 0 && dpAmount > estimatedCost) {
      return "DP tidak boleh melebihi estimasi biaya";
    }
    return null;
  }, [formData.dpEnabled, formData.dpAmount, formData.estimatedCost]);

  const handleNext = () => {
    if (currentStep < 4 && isStepValid) {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  };

  // Derive selected customer object for CustomerSearch
  const selectedCustomer: CustomerMock | null = React.useMemo(() => {
    if (formData.customerId) {
      return {
        id: formData.customerId,
        name: formData.customerName,
        phone: formData.customerPhone,
        address: formData.customerAddress || null,
        email: null,
        notes: null,
        totalSpend: 0,
        totalServices: 0,
        activeServices: 0,
        completedServices: 0,
        activeWarranties: 0,
        createdAt: "",
        updatedAt: "",
        brandId: 1,
        lastServiceAt: null,
      };
    }
    return null;
  }, [formData.customerId, formData.customerName, formData.customerPhone, formData.customerAddress]);

  const estimatedCostNum = parseInt(formData.estimatedCost) || 0;
  const dpAmountNum = parseInt(formData.dpAmount) || 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Scrollable form content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Step 1: Data Pelanggan */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-muted-foreground">
                Cari pelanggan yang sudah terdaftar untuk mengisi data secara otomatis,
                atau isi manual jika pelanggan baru.
              </p>
            </div>

            <CustomerSearch
              onSelect={handleCustomerSelect}
              selectedCustomer={selectedCustomer}
              onStartNewCustomer={handleStartNewCustomer}
              manualName={formData.customerId ? "" : formData.customerName}
              manualPhone={formData.customerId ? "" : formData.customerPhone}
              manualAddress={formData.customerId ? "" : formData.customerAddress}
              onManualChange={handleManualChange}
            />
          </div>
        )}

        {/* Step 2: Data Perangkat */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-device-type" className="text-xs font-medium">
                Tipe Perangkat <span className="text-destructive">*</span>
              </Label>
              <Popover open={deviceTypeOpen} onOpenChange={setDeviceTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="cs-device-type"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={deviceTypeOpen}
                    className="h-10 w-full justify-between bg-background px-3 text-left text-sm font-normal"
                  >
                    <span
                      className={
                        formData.deviceType ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {formData.deviceType || "Pilih tipe perangkat"}
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="z-[1001] w-[var(--radix-popover-trigger-width)] p-1"
                >
                  <div className="grid max-h-64 gap-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {DEVICE_TYPES.map((type) => {
                      const isSelected = formData.deviceType === type;

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            updateField("deviceType", type);
                            setDeviceTypeOpen(false);
                          }}
                          className="flex h-9 items-center justify-between rounded-md px-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <span>{type}</span>
                          {isSelected && <Check className="size-4" />}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cs-brand" className="text-xs font-medium">
                  Merk <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cs-brand"
                  value={formData.deviceBrand}
                  onChange={(e) => updateField("deviceBrand", e.target.value)}
                  className="h-10 text-sm"
                  placeholder="Contoh: Samsung"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cs-model" className="text-xs font-medium">
                  Model <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cs-model"
                  value={formData.deviceModel}
                  onChange={(e) => updateField("deviceModel", e.target.value)}
                  className="h-10 text-sm"
                  placeholder="Contoh: Galaxy S24"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-sn" className="text-xs font-medium">
                Serial Number
              </Label>
              <Input
                id="cs-sn"
                value={formData.serialNumber}
                onChange={(e) => updateField("serialNumber", e.target.value)}
                className="h-10 text-sm"
                placeholder="SN (opsional)"
              />
            </div>
          </div>
        )}

        {/* Step 3: Keluhan */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-issue" className="text-xs font-medium">
                Keluhan <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cs-issue"
                value={formData.issue}
                onChange={(e) => updateField("issue", e.target.value)}
                className="min-h-[100px] text-sm"
                placeholder="Jelaskan keluhan atau kerusakan perangkat..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-notes" className="text-xs font-medium">
                Catatan Tambahan
              </Label>
              <Textarea
                id="cs-notes"
                value={formData.additionalNotes}
                onChange={(e) => updateField("additionalNotes", e.target.value)}
                className="min-h-[80px] text-sm"
                placeholder="Catatan tambahan (opsional)"
              />
            </div>
          </div>
        )}

        {/* Step 4: Biaya & Konfirmasi */}
        {currentStep === 4 && (
          <div className="flex flex-col gap-5">
            {/* Branch */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-branch" className="text-xs font-medium">
                Cabang <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.branch}
                onValueChange={(v) => updateField("branch", v)}
              >
                <SelectTrigger className="h-10 text-sm" id="cs-branch">
                  <SelectValue placeholder={
                    activeBranchId
                      ? branches.find((b) => b.id === activeBranchId)?.name ?? "Pilih cabang"
                      : "Pilih cabang"
                  } />
                </SelectTrigger>
                <SelectContent className="z-[1001]">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-sm">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Cost */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-est-cost" className="text-xs font-medium">
                Estimasi Biaya
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="cs-est-cost"
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(formData.estimatedCost)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "");
                    updateField("estimatedCost", rawValue);
                  }}
                  className="h-10 pl-10 text-sm"
                  placeholder="0"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
            Biaya estimasi awal servis. Dapat diperbarui saat servis selesai.
          </p>
            </div>

            <Separator />

            {/* DP Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PiggyBank className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    Customer membayar DP
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.dpEnabled}
                  onClick={() => {
                    onFormChange({ ...formData, dpEnabled: !formData.dpEnabled });
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    formData.dpEnabled ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span
                    className={`pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      formData.dpEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {formData.dpEnabled && (
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                  {/* DP Amount */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cs-dp-amount" className="text-xs font-medium">
                      Nominal DP <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="cs-dp-amount"
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(formData.dpAmount)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, "");
                          updateField("dpAmount", rawValue);
                        }}
                        className="h-10 pl-10 text-sm"
                        placeholder="0"
                      />
                    </div>
                    {dpValidationError && (
                      <p className="text-[10px] text-destructive">{dpValidationError}</p>
                    )}
                    {estimatedCostNum > 0 && dpAmountNum > 0 && dpAmountNum <= estimatedCostNum && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        Sisa tagihan: {formatCurrency(estimatedCostNum - dpAmountNum)}
                      </p>
                    )}
                    {estimatedCostNum === 0 && dpAmountNum > 0 && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        ⓘ DP tanpa estimasi final
                      </p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cs-dp-method" className="text-xs font-medium">
                      Metode Pembayaran <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.dpMethodId}
                      onValueChange={handleDpMethodChange}
                    >
                      <SelectTrigger className="h-10 text-sm" id="cs-dp-method">
                        <SelectValue placeholder="Pilih metode" />
                      </SelectTrigger>
                      <SelectContent className="z-[1001]">
                        {MOCK_PAYMENT_METHODS.filter(m => m.isActive).map((method) => (
                          <SelectItem key={method.id} value={method.id} className="text-sm">
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Account */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cs-dp-account" className="text-xs font-medium">
                      Akun Pembayaran <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.dpAccountId}
                      onValueChange={(v) => updateField("dpAccountId", v)}
                    >
                      <SelectTrigger className="h-10 text-sm" id="cs-dp-account">
                        <SelectValue placeholder="Pilih akun" />
                      </SelectTrigger>
                      <SelectContent className="z-[1001]">
                        {availableAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id} className="text-sm">
                            {account.accountName}
                            {account.isCashAccount ? " (Tunai)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* DP Note */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cs-dp-note" className="text-xs font-medium">
                      Catatan DP
                    </Label>
                    <Input
                      id="cs-dp-note"
                      value={formData.dpNote}
                      onChange={(e) => updateField("dpNote", e.target.value)}
                      className="h-10 text-sm"
                      placeholder="Catatan DP (opsional)"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Summary Preview */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ringkasan Data
              </h4>
              <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Pelanggan</span>
                    <span className="font-medium text-foreground">{formData.customerName}</span>
                    <span className="text-muted-foreground">{formData.customerPhone}</span>
                    {formData.customerId && (
                      <span className="text-[10px] text-green-600">✓ Terdaftar</span>
                    )}
                    {!formData.customerId && formData.customerName && (
                      <span className="text-[10px] text-amber-600">ⓘ Baru (manual)</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Perangkat</span>
                    <span className="font-medium text-foreground">
                      {formData.deviceBrand} {formData.deviceModel}
                    </span>
                    <span className="text-muted-foreground">{formData.deviceType}</span>
                  </div>
                </div>
                {formData.issue && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground">Keluhan</span>
                      <p className="text-sm text-foreground">{formData.issue.slice(0, 100)}</p>
                    </div>
                  </>
                )}
                <Separator />
                {/* Cost Summary */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimasi Biaya</span>
                    <span className="font-medium text-foreground">
                      {estimatedCostNum > 0 ? formatCurrency(estimatedCostNum) : "—"}
                    </span>
                  </div>
                  {formData.dpEnabled && dpAmountNum > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">DP Dibayar</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {formatCurrency(dpAmountNum)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-dashed border-border pt-1.5">
                        <span className="text-muted-foreground">Sisa Tagihan</span>
                        <span className="font-medium text-foreground">
                          {estimatedCostNum > 0
                            ? formatCurrency(Math.max(0, estimatedCostNum - dpAmountNum))
                            : "Belum ditentukan"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {formData.branch && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Cabang:</span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {selectedBranchName}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex shrink-0 items-center justify-between border-t bg-background px-1 pt-4">
        <div>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="size-3.5" />
              Kembali
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            Langkah {currentStep}/4
          </span>
          {currentStep < 4 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              disabled={!isStepValid}
              className="gap-1.5 text-xs"
            >
              Lanjut
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!isStepValid || submitting}
              className="gap-1.5 text-xs"
            >
              <Send className="size-3.5" />
              {submitting ? "Menyimpan..." : "Buat Servis"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
