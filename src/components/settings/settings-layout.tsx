"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { BrandThemeSettings } from "@/components/settings/brand-theme-settings";
import { TargetGoalSettings } from "@/components/settings/target-goal-settings";
import { BrandProfileSettings } from "@/components/settings/brand-profile-settings";
import { PaymentSettings } from "@/components/settings/payment-settings";
import { PaymentMethodSettings } from "@/components/settings/payment-method-settings";
import { SystemSettings } from "@/components/settings/system-settings";

/* ─── Section Definition ─── */

interface SettingsSection {
  id: string;
  component: React.ElementType;
}

const SECTIONS: SettingsSection[] = [
  { id: "brand-profile", component: BrandProfileSettings },
  { id: "appearance", component: BrandThemeSettings },
  { id: "target-goal", component: TargetGoalSettings },
  { id: "payment", component: PaymentSettings },
  { id: "payment-methods", component: PaymentMethodSettings },
  { id: "system", component: SystemSettings },
];

/* ─── Component ─── */

export function SettingsLayout() {
  const searchParams = useSearchParams();
  const activeId = searchParams?.get("section") || "brand-profile";

  const activeSection = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];
  const ActiveComponent = activeSection.component;

  return (
    <div className="min-w-0 flex-1">
      <ActiveComponent />
    </div>
  );
}
