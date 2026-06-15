"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, X } from "lucide-react";

export interface VariationGroup {
  id: string;
  name: string;
  options: VariationOption[];
}

export interface VariationOption {
  id: string;
  name: string;
}

export interface VariantRow {
  key: string;
  displayName: string;
  sku: string;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  initialStock: number;
}

interface VariationBuilderProps {
  groups: VariationGroup[];
  onChange: (groups: VariationGroup[]) => void;
  variants: Record<string, VariantRow>;
  onVariantsChange: (variants: Record<string, VariantRow>) => void;
  trackingType: string;
  unitCondition: string | null;
}

let _groupIdCounter = 0;
let _optionIdCounter = 0;

function genGroupId(): string {
  _groupIdCounter += 1;
  return `g_${_groupIdCounter}`;
}

function genOptionId(): string {
  _optionIdCounter += 1;
  return `o_${_optionIdCounter}`;
}

function generateCombinations(groups: VariationGroup[]): { key: string; displayName: string }[] {
  if (groups.length === 0) return [];
  if (groups.length === 1) {
    return groups[0].options.map((o) => ({
      key: o.id,
      displayName: o.name,
    }));
  }
  const [first, second] = groups;
  const result: { key: string; displayName: string }[] = [];
  for (const a of first.options) {
    for (const b of second.options) {
      result.push({
        key: `${a.id}_${b.id}`,
        displayName: `${a.name} / ${b.name}`,
      });
    }
  }
  return result;
}

export function VariationBuilder({
  groups,
  onChange,
  variants,
  onVariantsChange,
  trackingType,
}: VariationBuilderProps) {
  const combinations = React.useMemo(() => generateCombinations(groups), [groups]);

  const addGroup = () => {
    if (groups.length >= 2) return;
    const newGroups = [...groups, { id: genGroupId(), name: "", options: [] }];
    onChange(newGroups);
  };

  const removeGroup = (groupId: string) => {
    onChange(groups.filter((g) => g.id !== groupId));
  };

  const updateGroupName = (groupId: string, name: string) => {
    onChange(groups.map((g) => (g.id === groupId ? { ...g, name } : g)));
  };

  const addOption = (groupId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, options: [...g.options, { id: genOptionId(), name: "" }] }
          : g,
      ),
    );
  };

  const removeOption = (groupId: string, optionId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optionId) }
          : g,
      ),
    );
  };

  const updateOptionName = (groupId: string, optionId: string, name: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((o) => (o.id === optionId ? { ...o, name } : o)),
            }
          : g,
      ),
    );
  };

  // Sync variants when combinations change
  React.useEffect(() => {
    const newVariants: Record<string, VariantRow> = {};
    for (const combo of combinations) {
      const existing = variants[combo.key];
      newVariants[combo.key] = {
        key: combo.key,
        displayName: combo.displayName,
        sku: existing?.sku ?? "",
        barcode: existing?.barcode ?? "",
        costPrice: existing?.costPrice ?? 0,
        sellingPrice: existing?.sellingPrice ?? 0,
        initialStock: existing?.initialStock ?? 0,
      };
    }
    if (JSON.stringify(newVariants) !== JSON.stringify(variants)) {
      onVariantsChange(newVariants);
    }
  }, [combinations.length, JSON.stringify(combinations.map((c) => c.key))]);

  const updateVariantField = (
    key: string,
    field: keyof VariantRow,
    value: string | number,
  ) => {
    onVariantsChange({
      ...variants,
      [key]: { ...variants[key], [field]: value },
    });
  };

  const bulkApplyCostPrice = () => {
    const firstVariant = Object.values(variants)[0];
    if (!firstVariant) return;
    const val = firstVariant.costPrice;
    const next: Record<string, VariantRow> = {};
    for (const [k, v] of Object.entries(variants)) {
      next[k] = { ...v, costPrice: val };
    }
    onVariantsChange(next);
  };

  const bulkApplySellingPrice = () => {
    const firstVariant = Object.values(variants)[0];
    if (!firstVariant) return;
    const val = firstVariant.sellingPrice;
    const next: Record<string, VariantRow> = {};
    for (const [k, v] of Object.entries(variants)) {
      next[k] = { ...v, sellingPrice: val };
    }
    onVariantsChange(next);
  };

  const variantList = Object.values(variants);
  const isSerialized = trackingType === "SERIALIZED";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Variasi Item</Label>
        {groups.length < 2 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={addGroup}
          >
            <Plus className="mr-1 size-3" />
            Tambah Variasi
          </Button>
        )}
      </div>

      {groups.length === 0 && (
        <p className="text-[10px] text-muted-foreground">
          Aktifkan variasi untuk menambahkan varian warna, ukuran, penyimpanan, dll.
        </p>
      )}

      {groups.map((group, gi) => (
        <div key={group.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              Variasi {gi + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => removeGroup(group.id)}
            >
              <Trash2 className="size-3 text-destructive" />
            </Button>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Nama Variasi</Label>
            <Input
              type="text"
              value={group.name}
              onChange={(e) => updateGroupName(group.id, e.target.value)}
              className="h-8 text-xs"
              placeholder="Contoh: Warna"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Opsi</Label>
            {group.options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-1.5">
                <Input
                  type="text"
                  value={opt.name}
                  onChange={(e) => updateOptionName(group.id, opt.id, e.target.value)}
                  className="h-8 flex-1 text-xs"
                  placeholder="Contoh: Hitam"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => removeOption(group.id, opt.id)}
                >
                  <X className="size-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => addOption(group.id)}
            >
              <Plus className="mr-1 size-3" />
              Tambah opsi
            </Button>
          </div>
        </div>
      ))}

      {variantList.length > 0 && (
        <>
          <Separator />
          <Label className="text-xs font-medium">Daftar Varian</Label>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1.5 pr-2 text-left font-medium">Nama Variasi</th>
                  <th className="py-1.5 px-2 text-left font-medium">SKU</th>
                  <th className="py-1.5 px-2 text-left font-medium">Barcode</th>
                  <th className="py-1.5 px-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      Harga Modal
                      <button
                        type="button"
                        onClick={bulkApplyCostPrice}
                        className="text-[10px] text-primary underline"
                        title="Terapkan ke semua"
                      >
                        semua
                      </button>
                    </span>
                  </th>
                  <th className="py-1.5 px-2 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      Harga Jual
                      <button
                        type="button"
                        onClick={bulkApplySellingPrice}
                        className="text-[10px] text-primary underline"
                        title="Terapkan ke semua"
                      >
                        semua
                      </button>
                    </span>
                  </th>
                  {!isSerialized && (
                    <th className="py-1.5 pl-2 text-right font-medium">Stok Awal</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {variantList.map((v) => (
                  <tr key={v.key} className="border-b border-dashed">
                    <td className="py-1.5 pr-2 text-xs font-medium">
                      {v.displayName}
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        type="text"
                        value={v.sku}
                        onChange={(e) =>
                          updateVariantField(v.key, "sku", e.target.value)
                        }
                        className="h-7 w-full min-w-[80px] text-[11px] font-mono"
                        placeholder="SKU"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        type="text"
                        value={v.barcode}
                        onChange={(e) =>
                          updateVariantField(v.key, "barcode", e.target.value)
                        }
                        className="h-7 w-full min-w-[80px] text-[11px] font-mono"
                        placeholder="Barcode"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        type="number"
                        min={0}
                        value={v.costPrice}
                        onChange={(e) =>
                          updateVariantField(
                            v.key,
                            "costPrice",
                            Number(e.target.value) || 0,
                          )
                        }
                        className="h-7 w-full min-w-[70px] text-[11px] text-right"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        type="number"
                        min={0}
                        value={v.sellingPrice}
                        onChange={(e) =>
                          updateVariantField(
                            v.key,
                            "sellingPrice",
                            Number(e.target.value) || 0,
                          )
                        }
                        className="h-7 w-full min-w-[70px] text-[11px] text-right"
                      />
                    </td>
                    {!isSerialized && (
                      <td className="py-1.5 pl-2">
                        <Input
                          type="number"
                          min={0}
                          value={v.initialStock}
                          onChange={(e) =>
                            updateVariantField(
                              v.key,
                              "initialStock",
                              Number(e.target.value) || 0,
                            )
                          }
                          className="h-7 w-full min-w-[60px] text-[11px] text-right"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
