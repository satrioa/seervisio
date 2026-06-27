"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Settings, Loader2 } from "lucide-react";
import {
  getPlatformSettingsAction,
  updatePlatformSettingsAction,
} from "@/server/actions/platform-settings.actions";
import type { PlatformSettings } from "@/server/repositories/platform-settings.repository";

export function SettingsContent() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getPlatformSettingsAction();
    if ("error" in result) {
      toast.error(result.error ?? "Failed to load settings");
      return;
    }
    if (result.data) {
      setSettings(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!settings || !dirty) return;
    setSaving(true);
    const result = await updatePlatformSettingsAction(settings);
    if ("error" in result) {
      toast.error(result.error ?? "Failed to save settings");
    } else {
      toast.success("Settings saved");
      setDirty(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">Manage system-wide configuration</p>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Platform Settings</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Settings not available. Ensure migration 094 has been applied.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">Manage system-wide configuration</p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Platform identity and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Label htmlFor="systemName">System Name</Label>
            <Input
              id="systemName"
              value={settings.systemName}
              onChange={(e) => handleChange("systemName", e.target.value)}
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="systemEmail">System Email</Label>
            <Input
              id="systemEmail"
              type="email"
              value={settings.systemEmail ?? ""}
              onChange={(e) => handleChange("systemEmail", e.target.value || null)}
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={settings.supportEmail ?? ""}
              onChange={(e) => handleChange("supportEmail", e.target.value || null)}
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
            <Input
              id="invoicePrefix"
              value={settings.invoicePrefix}
              onChange={(e) => handleChange("invoicePrefix", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Defaults</CardTitle>
          <CardDescription>Default limits for new tenant subscriptions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Label htmlFor="defaultTrialDays">Trial Period (days)</Label>
            <Input
              id="defaultTrialDays"
              type="number"
              min={0}
              value={settings.defaultTrialDays}
              onChange={(e) => handleChange("defaultTrialDays", Number(e.target.value))}
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="defaultMaxBranches">Default Max Branches</Label>
            <Input
              id="defaultMaxBranches"
              type="number"
              min={0}
              value={settings.defaultMaxBranches}
              onChange={(e) => handleChange("defaultMaxBranches", Number(e.target.value))}
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="defaultMaxUsers">Default Max Users</Label>
            <Input
              id="defaultMaxUsers"
              type="number"
              min={0}
              value={settings.defaultMaxUsers}
              onChange={(e) => handleChange("defaultMaxUsers", Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access Control</CardTitle>
          <CardDescription>Platform-wide access toggles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, only platform owners can access the system
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(v) => handleChange("maintenanceMode", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Allow New Registrations</Label>
              <p className="text-xs text-muted-foreground">
                Allow new tenant sign-ups on the platform
              </p>
            </div>
            <Switch
              checked={settings.allowNewRegistrations}
              onCheckedChange={(v) => handleChange("allowNewRegistrations", v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
