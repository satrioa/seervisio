import React from "react";
import { AiDashboard } from "./ai-dashboard";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function AiPage({ params }: PageProps) {
  const { brandSlug } = await params;
  return <AiDashboard brandSlug={brandSlug} />;
}
