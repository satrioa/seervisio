"use client";

import * as React from "react";
import { Plus, Trash2, Wrench, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveServiceBillingAction,
  getServiceBillingAction,
  type BillingItemInput,
} from "@/server/actions/service-billing.actions";
import type { ServiceBillingData } from "@/server/domain/service-billing.types";
import { formatCurrency } from "@/components/services/service-data";

interface EditorItem {
  key: string;
  type: "SERVICE_FEE" | "ADDITIONAL";
  description: string;
  amount: number;
}

interface ServiceBillingEditorProps {
  brandSlug: string;
  serviceId: string;
  estimatedCost?: number;
  onSaved: (data: ServiceBillingData) => void;
  onCancel: () => void;
}

function generateKey(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function ServiceBillingEditor({
  brandSlug,
  serviceId,
  estimatedCost = 0,
  onSaved,
  onCancel,
}: ServiceBillingEditorProps) {
  const [items, setItems] = React.useState<EditorItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    getServiceBillingAction(brandSlug, serviceId).then((result) => {
      if (result.success && result.data.items.length > 0) {
        setItems(
          result.data.items.map((item) => ({
            key: generateKey(),
            type: item.type,
            description: item.description,
            amount: item.amount,
          })),
        );
      } else if (estimatedCost > 0) {
        setItems([
          { key: generateKey(), type: "SERVICE_FEE", description: "Biaya Jasa", amount: estimatedCost },
        ]);
      }
      setLoading(false);
    }).catch(() => {
      if (estimatedCost > 0) {
        setItems([
          { key: generateKey(), type: "SERVICE_FEE", description: "Biaya Jasa", amount: estimatedCost },
        ]);
      }
      setLoading(false);
    });
  }, [brandSlug, serviceId, estimatedCost]);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const isValid = items.length > 0 && items.some((i) => i.amount > 0) && Object.keys(fieldErrors).length === 0;

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { key: generateKey(), type: "ADDITIONAL", description: "", amount: 0 },
    ]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const updateItem = (key: string, field: "description" | "amount", value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const updated = { ...item, [field]: value };

        // Validate
        const newErrors = { ...fieldErrors };
        if (field === "description" && String(value).trim() === "") {
          newErrors[`${key}.description`] = "Wajib diisi";
        } else {
          delete newErrors[`${key}.description`];
        }
        if (field === "amount" && Number(value) < 0) {
          newErrors[`${key}.amount`] = "Tidak boleh negatif";
        } else {
          delete newErrors[`${key}.amount`];
        }
        setFieldErrors(newErrors);

        return updated;
      }),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const input: BillingItemInput[] = items.map((item) => ({
      type: item.type,
      description: item.description || "Biaya Tambahan",
      amount: item.amount,
    }));

    const result = await saveServiceBillingAction(brandSlug, serviceId, input);

    if (result.success) {
      onSaved(result.data);
    } else {
      setError(result.error ?? "Gagal menyimpan tagihan.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          type="button"
        >
          ← Kembali
        </button>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Atur Tagihan</h3>
        <p className="text-xs text-muted-foreground">Isi rincian biaya servis</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Item list */}
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Belum ada item. Tambah biaya untuk memulai.
          </p>
        )}
        {items.map((item, idx) => (
          <div key={item.key} className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="mt-1 shrink-0">
              {item.type === "SERVICE_FEE" ? (
                <Wrench className="size-4 text-primary" />
              ) : (
                <FileText className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                  {item.type === "SERVICE_FEE" ? "Biaya Jasa" : "Biaya Tambahan"}
                </span>
                {item.type === "SERVICE_FEE" && idx === 0 && estimatedCost > 0 && (
                  <span className="text-[9px] text-muted-foreground/60">(dari estimasi)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.key, "description", e.target.value)}
                    placeholder="Deskripsi"
                    className="h-8 text-xs"
                    aria-label={`Deskripsi item ${idx + 1}`}
                  />
                  {fieldErrors[`${item.key}.description`] && (
                    <p className="text-[10px] text-destructive mt-0.5">{fieldErrors[`${item.key}.description`]}</p>
                  )}
                </div>
                <div className="w-[120px]">
                  <Input
                    type="number"
                    value={item.amount || ""}
                    onChange={(e) => updateItem(item.key, "amount", Number(e.target.value))}
                    placeholder="0"
                    className="h-8 text-xs text-right tabular-nums"
                    min={0}
                    aria-label={`Nominal item ${idx + 1}`}
                  />
                </div>
                <button
                  onClick={() => removeItem(item.key)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  type="button"
                  aria-label={`Hapus item ${idx + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add item button */}
      <button
        onClick={addItem}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        type="button"
      >
        <Plus className="size-3.5" />
        Tambah Biaya Lain
      </button>

      {/* Total */}
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-lg font-bold tabular-nums">{formatCurrency(total)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onCancel} type="button">
          Batal
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs"
          onClick={handleSave}
          disabled={!isValid || saving}
          type="button"
        >
          {saving ? "Menyimpan..." : "Simpan Tagihan"}
        </Button>
      </div>
    </div>
  );
}
