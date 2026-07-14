import React from "react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { PurchaseWizardClient } from "./purchase-wizard-client";

interface PurchasePageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function PurchasePage({ params }: PurchasePageProps) {
  const { brandSlug } = await params;
  const authResult = await getCurrentUser();

  if (!authResult.user) {
    redirect(`/login?redirect=/${brandSlug}/purchase`);
  }

  return <PurchaseWizardClient brandSlug={brandSlug} />;
}
