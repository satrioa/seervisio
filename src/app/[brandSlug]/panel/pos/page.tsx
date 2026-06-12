import { PosPageClient } from "@/components/pos/pos-page-client";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function PosPage({ params }: PageProps) {
  const { brandSlug } = await params;
  return <PosPageClient brandSlug={brandSlug} />;
}
