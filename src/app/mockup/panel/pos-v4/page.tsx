import { PosV4PageClient } from "./pos-v4-page-client";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function PosV4Page({ params }: PageProps) {
  const { brandSlug } = await params;
  return <PosV4PageClient brandSlug={brandSlug} />;
}
