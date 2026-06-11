"use client";

import * as React from "react";
import {
  TrendingUp,
  Target,
  RotateCcw,
  Save,
  Building2,
  Store,
  Info,
  CheckCircle2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

/* ─── Types ─── */

type TargetScope = "brand" | "branch";
type TargetPeriod = "monthly" | "yearly";

interface BranchTarget {
  name: string;
  monthly: number;
  yearly: number;
}

/* ─── Constants ─── */

const SCOPE_OPTIONS: { value: TargetScope; label: string; icon: React.ElementType }[] = [
  { value: "brand", label: "Semua Cabang / Brand", icon: Building2 },
  { value: "branch", label: "Per Cabang", icon: Store },
];

const PERIOD_OPTIONS: { value: TargetPeriod; label: string }[] = [
  { value: "monthly", label: "Bulanan" },
  { value: "yearly", label: "Tahunan" },
];

const DEFAULT_BRANCHES: BranchTarget[] = [
  { name: "Semarang Pusat", monthly: 40_000_000, yearly: 480_000_000 },
  { name: "Salatiga", monthly: 20_000_000, yearly: 240_000_000 },
  { name: "Sragen", monthly: 10_000_000, yearly: 120_000_000 },
];

/* ─── Helpers ─── */

function formatRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function parseNumberInput(value: string): number {
  return parseInt(value.replace(/\D/g, ""), 10) || 0;
}

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export function TargetGoalSettings() {
  const [scope, setScope] = React.useState<TargetScope>("brand");
  const [period, setPeriod] = React.useState<TargetPeriod>("monthly");
  const [brandMonthly, setBrandMonthly] = React.useState(70_000_000);
  const [brandYearly, setBrandYearly] = React.useState(840_000_000);
  const [branches, setBranches] = React.useState<BranchTarget[]>(DEFAULT_BRANCHES);
  const [saved, setSaved] = React.useState(false);

  const previewRevenue = 42_500_000;
  const previewTarget = scope === "brand" ? brandMonthly : branches.reduce((sum, b) => sum + b.monthly, 0);
  const previewProgress = Math.round((previewRevenue / previewTarget) * 100);
  const previewRemaining = previewTarget - previewRevenue;

  const handleBranchChange = (index: number, field: "monthly" | "yearly", value: string) => {
    setBranches((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: parseNumberInput(value) };
      return next;
    });
  };

  const handleReset = () => {
    setScope("brand");
    setPeriod("monthly");
    setBrandMonthly(70_000_000);
    setBrandYearly(840_000_000);
    setBranches(DEFAULT_BRANCHES.map((b) => ({ ...b })));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Segmented button class helper ──
  const segClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
      active
        ? "border-primary bg-primary/5 text-primary shadow-xs"
        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col gap-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Target className="size-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Target &amp; Goal</h2>
          <p className="text-xs text-muted-foreground">
            Atur target revenue brand dan cabang untuk digunakan pada Dashboard Revenue vs Target.
          </p>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ══ LEFT COLUMN: Settings Form ══ */}
        <div className="flex flex-col gap-6">
          {/* ── Target Scope ── */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Target Scope</CardTitle>
              <CardDescription className="text-xs">
                Pilih scope target: berlaku untuk seluruh brand atau per cabang.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {SCOPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = scope === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScope(opt.value)}
                      className={segClass(active)}
                    >
                      <Icon className="size-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Target Period ── */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Target Period</CardTitle>
              <CardDescription className="text-xs">
                Periode target yang akan ditampilkan sebagai acuan di dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {PERIOD_OPTIONS.map((opt) => {
                  const active = period === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPeriod(opt.value)}
                      className={segClass(active)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Brand Target (scope = brand) ── */}
          {scope === "brand" && (
            <Card className="shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Brand Target</CardTitle>
                <CardDescription className="text-xs">
                  Target revenue untuk seluruh brand (semua cabang).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-monthly" className="text-xs font-medium">
                    Target Bulanan
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      id="brand-monthly"
                      type="text"
                      inputMode="numeric"
                      value={brandMonthly.toLocaleString("id-ID")}
                      onChange={(e) => setBrandMonthly(parseNumberInput(e.target.value))}
                      className="h-9 pl-9 text-xs tabular-nums"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-yearly" className="text-xs font-medium">
                    Target Tahunan
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      id="brand-yearly"
                      type="text"
                      inputMode="numeric"
                      value={brandYearly.toLocaleString("id-ID")}
                      onChange={(e) => setBrandYearly(parseNumberInput(e.target.value))}
                      className="h-9 pl-9 text-xs tabular-nums"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Branch Targets (scope = branch) ── */}
          {scope === "branch" && (
            <Card className="shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Branch Targets</CardTitle>
                <CardDescription className="text-xs">
                  Atur target revenue per cabang.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {branches.map((branch, index) => (
                  <div key={branch.name}>
                    {index > 0 && <Separator className="mb-4" />}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Store className="size-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{branch.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`branch-${index}-monthly`}
                            className="text-[10px] font-medium text-muted-foreground"
                          >
                            Target Bulanan
                          </Label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[10px] text-muted-foreground">
                              Rp
                            </span>
                            <Input
                              id={`branch-${index}-monthly`}
                              type="text"
                              inputMode="numeric"
                              value={branch.monthly.toLocaleString("id-ID")}
                              onChange={(e) =>
                                handleBranchChange(index, "monthly", e.target.value)
                              }
                              className="h-8 pl-8 text-xs tabular-nums"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`branch-${index}-yearly`}
                            className="text-[10px] font-medium text-muted-foreground"
                          >
                            Target Tahunan
                          </Label>
                          <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[10px] text-muted-foreground">
                              Rp
                            </span>
                            <Input
                              id={`branch-${index}-yearly`}
                              type="text"
                              inputMode="numeric"
                              value={branch.yearly.toLocaleString("id-ID")}
                              onChange={(e) =>
                                handleBranchChange(index, "yearly", e.target.value)
                              }
                              className="h-8 pl-8 text-xs tabular-nums"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ══ RIGHT COLUMN: Preview + Actions ══ */}
        <div className="flex flex-col gap-6">
          {/* ── Preview Card ── */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Preview</CardTitle>
              <CardDescription className="text-xs">
                Dashboard Revenue vs Target
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue value */}
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold tabular-nums">
                  {formatRp(previewRevenue)}
                </span>
                <span className="text-xs text-muted-foreground">
                  dari target {formatRp(previewTarget)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium tabular-nums">{previewProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${previewProgress}%` }}
                  />
                </div>
              </div>

              {/* Remaining */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sisa target</span>
                <span className="font-medium tabular-nums">{formatRp(previewRemaining)}</span>
              </div>

              {/* Daily estimate insight */}
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <TrendingUp className="size-3.5 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground">
                  Estimasi perlu{" "}
                  <span className="font-medium text-foreground">
                    {formatRp(Math.round(previewRemaining / 22))}
                  </span>{" "}
                  per hari kerja untuk mencapai target
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ── Actions ── */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full gap-2"
              onClick={handleSave}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Tersimpan
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Simpan Target
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleReset}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>

          {/* ── Helper Explanation ── */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">
                  Bagaimana Target Digunakan di Dashboard
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span>
                    Jika dashboard menampilkan <strong>Semua Cabang</strong>, target <strong>brand</strong> digunakan.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span>
                    Jika dashboard menampilkan <strong>cabang tertentu</strong>, target <strong>cabang</strong> digunakan.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span>
                    Untuk <strong>Hari Ini</strong> dan <strong>Minggu Ini</strong>, target dihitung prorata dari target bulanan.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                  <span>
                    Untuk <strong>Bulan Ini</strong>, target bulanan digunakan. Untuk <strong>Tahun Ini</strong> dan <strong>Per Tahun</strong>, target tahunan digunakan.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
