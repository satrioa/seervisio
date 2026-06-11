import * as React from "react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Settings"
        breadcrumbs={[
          { label: "Dashboard", href: "./dashboard" },
          { label: "Settings" },
        ]}
      />
      <Suspense fallback={<div className="py-10 text-center text-xs text-muted-foreground">Loading settings...</div>}>
        <SettingsLayout />
      </Suspense>
    </div>
  );
}
