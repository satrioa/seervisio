import React from "react";
import { DashboardContent } from "./dashboard-content";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  const { brandSlug } = await params;
  return <DashboardContent brandSlug={brandSlug} />;
}
